/**
 * 可视化配置编辑器 Composable
 * 从 CPAMA 项目迁移并适配 Vue 3
 */

import { ref, computed } from 'vue'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { 
  VisualConfigValues, 
  ApiKeyEntry, 
  HeaderEntry, 
  ModelMappingEntry,
  OpenAICompatibilityEntry,
  ApiKeySubEntry,
  AmpUpstreamApiKeyMapping,
  OAuthExcludedModelsConfig
} from '@/types/config'
import { makeClientId } from '@/types/config'

const DEFAULT_VISUAL_VALUES: VisualConfigValues = {
  host: '',
  port: '',
  tlsEnable: false,
  tlsCert: '',
  tlsKey: '',
  rmAllowRemote: false,
  rmSecretKey: '',
  rmDisableControlPanel: false,
  rmPanelRepo: '',
  authDir: '',
  apiKeysText: '',
  debug: false,
  commercialMode: false,
  loggingToFile: false,
  logsMaxTotalSizeMb: '',
  usageStatisticsEnabled: false,
  proxyUrl: '',
  forceModelPrefix: false,
  requestRetry: '',
  maxRetryInterval: '',
  quotaSwitchProject: true,
  quotaSwitchPreviewModel: true,
  routingStrategy: 'round-robin',
  wsAuth: false,
  ampUpstreamUrl: '',
  ampUpstreamApiKey: '',
  ampRestrictManagementToLocalhost: false,
  ampForceModelMappings: false,
  ampModelMappings: [],
  oauthModelMappings: [],
  payloadDefaultRules: [],
  payloadOverrideRules: [],
  // New fields default values (Requirements 19.1-19.8)
  streaming: {
    keepaliveSeconds: '',
    bootstrapRetries: '',
    nonstreamKeepaliveInterval: '',
  },
  geminiApiKeys: [],
  codexApiKeys: [],
  claudeApiKeys: [],
  vertexApiKeys: [],
  openaiCompatibility: [],
  ampUpstreamApiKeys: [],
  oauthExcludedModels: {},
}

export function useVisualConfig() {
  const visualValues = ref<VisualConfigValues>({ ...DEFAULT_VISUAL_VALUES })
  const originalYaml = ref('')
  
  const visualDirty = computed(() => {
    // 简单的脏检查 - 比较当前值与默认值
    return JSON.stringify(visualValues.value) !== JSON.stringify(DEFAULT_VISUAL_VALUES)
  })

  /**
   * 从 YAML 字符串加载可视化配置值
   */
  const loadVisualValuesFromYaml = (yamlContent: string): void => {
    originalYaml.value = yamlContent
    
    try {
      const parsed = parseYaml(yamlContent) || {}
      
      // 提取各个配置项，按照实际的YAML结构解析
      const newValues: VisualConfigValues = {
        // 服务器配置
        host: parsed.host || '',
        port: String(parsed.port || ''),
        
        // TLS 配置
        tlsEnable: Boolean(parsed.tls?.enable),
        tlsCert: parsed.tls?.cert || '',
        tlsKey: parsed.tls?.key || '',
        
        // 远程管理配置
        rmAllowRemote: Boolean(parsed['remote-management']?.['allow-remote']),
        rmSecretKey: parsed['remote-management']?.['secret-key'] || '',
        rmDisableControlPanel: Boolean(parsed['remote-management']?.['disable-control-panel']),
        rmPanelRepo: parsed['remote-management']?.['panel-github-repository'] || '',
        
        // 认证配置
        authDir: parsed['auth-dir'] || '',
        apiKeysText: Array.isArray(parsed['api-keys']) ? parsed['api-keys'].join('\n') : '',
        
        // 系统配置
        debug: Boolean(parsed.debug),
        commercialMode: Boolean(parsed['commercial-mode']),
        loggingToFile: Boolean(parsed['logging-to-file']),
        logsMaxTotalSizeMb: String(parsed['logs-max-total-size-mb'] || ''),
        usageStatisticsEnabled: Boolean(parsed['usage-statistics-enabled']),
        
        // 网络配置
        proxyUrl: parsed['proxy-url'] || '',
        forceModelPrefix: Boolean(parsed['force-model-prefix']),
        requestRetry: String(parsed['request-retry'] || ''),
        maxRetryInterval: String(parsed['max-retry-interval'] || ''),
        
        // 配额回退配置
        quotaSwitchProject: Boolean(parsed['quota-exceeded']?.['switch-project'] ?? true),
        quotaSwitchPreviewModel: Boolean(parsed['quota-exceeded']?.['switch-preview-model'] ?? true),
        
        // 路由策略
        routingStrategy: (parsed.routing?.strategy || 'round-robin') as 'round-robin' | 'fill-first',
        
        // WebSocket 认证
        wsAuth: Boolean(parsed['ws-auth']),
        
        // Ampcode 配置
        ampUpstreamUrl: parsed.ampcode?.['upstream-url'] || '',
        ampUpstreamApiKey: parsed.ampcode?.['upstream-api-key'] || '',
        ampRestrictManagementToLocalhost: Boolean(parsed.ampcode?.['restrict-management-to-localhost']),
        ampForceModelMappings: Boolean(parsed.ampcode?.['force-model-mappings']),
        ampModelMappings: parseAmpModelMappings(parsed.ampcode?.['model-mappings']),
        
        // OAuth 模型映射
        oauthModelMappings: parseOauthModelMappings(parsed['oauth-model-mappings']),
        
        // Payload 配置
        payloadDefaultRules: parsePayloadRules(parsed.payload?.default),
        payloadOverrideRules: parsePayloadRules(parsed.payload?.override),
        
        // New fields (Requirements 19.1-19.8)
        // Streaming 配置 (Requirement 20.1)
        streaming: {
          keepaliveSeconds: String(parsed.streaming?.['keepalive-seconds'] ?? ''),
          bootstrapRetries: String(parsed.streaming?.['bootstrap-retries'] ?? ''),
          nonstreamKeepaliveInterval: String(parsed['nonstream-keepalive-interval'] ?? ''),
        },
        
        // Gemini API 密钥配置 (Requirement 20.2)
        geminiApiKeys: parseApiKeyEntries(parsed['gemini-api-key']),
        
        // Codex API 密钥配置 (Requirement 20.3)
        codexApiKeys: parseApiKeyEntries(parsed['codex-api-key']),
        
        // Claude API 密钥配置 (Requirement 20.4)
        claudeApiKeys: parseApiKeyEntries(parsed['claude-api-key']),
        
        // Vertex API 密钥配置 (Requirement 20.6)
        vertexApiKeys: parseApiKeyEntries(parsed['vertex-api-key']),
        
        // OpenAI 兼容配置 (Requirement 20.5)
        openaiCompatibility: parseOpenAICompatibility(parsed['openai-compatibility']),
        
        // Ampcode 上游 API 密钥映射
        ampUpstreamApiKeys: parseAmpUpstreamApiKeys(parsed.ampcode?.['upstream-api-keys']),
        
        // OAuth 排除模型 (Requirement 20.7)
        oauthExcludedModels: parseOAuthExcludedModels(parsed['oauth-excluded-models']),
      }
      
      visualValues.value = newValues
    } catch (error) {
      // 如果 YAML 解析失败，使用默认值
      visualValues.value = { ...DEFAULT_VISUAL_VALUES }
    }
  }

  /**
   * 将可视化配置值应用到 YAML 字符串
   * Requirement: 20.8
   */
  const applyVisualChangesToYaml = (currentYaml: string): string => {
    try {
      const parsed = parseYaml(currentYaml) || {}
      const values = visualValues.value

      // 应用基础配置
      if (values.host) parsed.host = values.host
      if (values.port) parsed.port = parseInt(values.port, 10) || undefined
      
      // TLS 配置
      if (values.tlsEnable || values.tlsCert || values.tlsKey) {
        parsed.tls = parsed.tls || {}
        if (values.tlsEnable) parsed.tls.enable = true
        if (values.tlsCert) parsed.tls.cert = values.tlsCert
        if (values.tlsKey) parsed.tls.key = values.tlsKey
      }

      // 远程管理配置
      if (values.rmAllowRemote || values.rmSecretKey || values.rmDisableControlPanel || values.rmPanelRepo) {
        parsed['remote-management'] = parsed['remote-management'] || {}
        if (values.rmAllowRemote) parsed['remote-management']['allow-remote'] = true
        if (values.rmSecretKey) parsed['remote-management']['secret-key'] = values.rmSecretKey
        if (values.rmDisableControlPanel) parsed['remote-management']['disable-control-panel'] = true
        if (values.rmPanelRepo) parsed['remote-management']['panel-repo'] = values.rmPanelRepo
      }

      // 其他配置
      if (values.authDir) parsed['auth-dir'] = values.authDir
      if (values.apiKeysText) {
        parsed['api-keys'] = values.apiKeysText.split('\n').filter(key => key.trim())
      }
      if (values.debug) parsed.debug = true
      if (values.commercialMode) parsed['commercial-mode'] = true
      if (values.loggingToFile) parsed['logging-to-file'] = true
      if (values.logsMaxTotalSizeMb) {
        parsed['logs-max-total-size-mb'] = parseInt(values.logsMaxTotalSizeMb, 10) || undefined
      }
      if (values.usageStatisticsEnabled) parsed['usage-statistics-enabled'] = true
      if (values.proxyUrl) parsed['proxy-url'] = values.proxyUrl
      if (values.forceModelPrefix) parsed['force-model-prefix'] = true
      if (values.requestRetry) parsed['request-retry'] = parseInt(values.requestRetry, 10) || undefined
      if (values.maxRetryInterval) parsed['max-retry-interval'] = parseInt(values.maxRetryInterval, 10) || undefined
      if (values.wsAuth) parsed['ws-auth'] = true

      // 配额回退配置
      if (!values.quotaSwitchProject || !values.quotaSwitchPreviewModel) {
        parsed['quota-exceeded'] = parsed['quota-exceeded'] || {}
        parsed['quota-exceeded']['switch-project'] = values.quotaSwitchProject
        parsed['quota-exceeded']['switch-preview-model'] = values.quotaSwitchPreviewModel
      }

      // 路由策略
      if (values.routingStrategy !== 'round-robin') {
        parsed.routing = parsed.routing || {}
        parsed.routing.strategy = values.routingStrategy
      }

      // Streaming 配置 (Requirement 20.8)
      const hasStreamingConfig = values.streaming.keepaliveSeconds || values.streaming.bootstrapRetries
      if (hasStreamingConfig) {
        parsed.streaming = parsed.streaming || {}
        if (values.streaming.keepaliveSeconds) {
          parsed.streaming['keepalive-seconds'] = parseInt(values.streaming.keepaliveSeconds, 10) || undefined
        }
        if (values.streaming.bootstrapRetries) {
          parsed.streaming['bootstrap-retries'] = parseInt(values.streaming.bootstrapRetries, 10) || undefined
        }
      }

      // Non-streaming keepalive interval (顶层配置)
      if (values.streaming.nonstreamKeepaliveInterval) {
        const interval = parseInt(values.streaming.nonstreamKeepaliveInterval, 10)
        if (interval > 0) {
          parsed['nonstream-keepalive-interval'] = interval
        }
      }

      // Gemini API 密钥配置 (Requirement 20.8)
      if (values.geminiApiKeys.length > 0) {
        parsed['gemini-api-key'] = serializeApiKeyEntries(values.geminiApiKeys)
      }

      // Codex API 密钥配置 (Requirement 20.8)
      if (values.codexApiKeys.length > 0) {
        parsed['codex-api-key'] = serializeApiKeyEntries(values.codexApiKeys)
      }

      // Claude API 密钥配置 (Requirement 20.8)
      if (values.claudeApiKeys.length > 0) {
        parsed['claude-api-key'] = serializeApiKeyEntries(values.claudeApiKeys)
      }

      // Vertex API 密钥配置 (Requirement 20.8)
      if (values.vertexApiKeys.length > 0) {
        parsed['vertex-api-key'] = serializeApiKeyEntries(values.vertexApiKeys)
      }

      // OpenAI 兼容配置 (Requirement 20.8)
      if (values.openaiCompatibility.length > 0) {
        parsed['openai-compatibility'] = serializeOpenAICompatibility(values.openaiCompatibility)
      }

      // Ampcode 配置
      if (values.ampUpstreamUrl || values.ampUpstreamApiKey || values.ampRestrictManagementToLocalhost || 
          values.ampForceModelMappings || values.ampModelMappings.length > 0 || values.ampUpstreamApiKeys.length > 0) {
        parsed.ampcode = parsed.ampcode || {}
        if (values.ampUpstreamUrl) parsed.ampcode['upstream-url'] = values.ampUpstreamUrl
        if (values.ampUpstreamApiKey) parsed.ampcode['upstream-api-key'] = values.ampUpstreamApiKey
        if (values.ampRestrictManagementToLocalhost) parsed.ampcode['restrict-management-to-localhost'] = true
        if (values.ampForceModelMappings) parsed.ampcode['force-model-mappings'] = true
        if (values.ampModelMappings.length > 0) {
          parsed.ampcode['model-mappings'] = values.ampModelMappings.map(mapping => ({
            from: mapping.from,
            to: mapping.to
          }))
        }
        // Ampcode 上游 API 密钥映射 (Requirement 20.8)
        if (values.ampUpstreamApiKeys.length > 0) {
          parsed.ampcode['upstream-api-keys'] = serializeAmpUpstreamApiKeys(values.ampUpstreamApiKeys)
        }
      }

      // OAuth 模型映射
      if (values.oauthModelMappings.length > 0) {
        parsed['oauth-model-mappings'] = {}
        for (const channelMapping of values.oauthModelMappings) {
          if (channelMapping.channel && channelMapping.entries.length > 0) {
            parsed['oauth-model-mappings'][channelMapping.channel] = channelMapping.entries
              .filter(entry => entry.name)
              .map(entry => {
                const obj: Record<string, any> = { name: entry.name }
                if (entry.alias && entry.alias !== entry.name) obj.alias = entry.alias
                if (entry.fork) obj.fork = true
                return obj
              })
          }
        }
      }

      // OAuth 排除模型配置 (Requirement 20.8)
      if (Object.keys(values.oauthExcludedModels).length > 0) {
        parsed['oauth-excluded-models'] = {}
        for (const [channel, models] of Object.entries(values.oauthExcludedModels)) {
          if (models.length > 0) {
            parsed['oauth-excluded-models'][channel] = models
          }
        }
      }

      // Payload 配置
      if (values.payloadDefaultRules.length > 0 || values.payloadOverrideRules.length > 0) {
        parsed.payload = parsed.payload || {}
        if (values.payloadDefaultRules.length > 0) {
          parsed.payload.default = serializePayloadRulesForYaml(values.payloadDefaultRules)
        }
        if (values.payloadOverrideRules.length > 0) {
          parsed.payload.override = serializePayloadRulesForYaml(values.payloadOverrideRules)
        }
      }

      return stringifyYaml(parsed, { 
        indent: 2,
        lineWidth: 120,
        minContentWidth: 0
      })
    } catch (error) {
      return currentYaml
    }
  }

  const setVisualValues = (newValues: Partial<VisualConfigValues>): void => {
    visualValues.value = { ...visualValues.value, ...newValues }
  }

  return {
    visualValues,
    visualDirty,
    loadVisualValuesFromYaml,
    applyVisualChangesToYaml,
    setVisualValues
  }
}

// 辅助函数
function parseAmpModelMappings(mappings: any): any[] {
  if (!mappings || !Array.isArray(mappings)) return []
  
  return mappings.map((mapping, index) => ({
    id: `amp-${index}`,
    from: mapping.from || '',
    to: mapping.to || ''
  }))
}

function parseOauthModelMappings(mappings: any): any[] {
  if (!mappings || typeof mappings !== 'object') return []
  
  return Object.entries(mappings).map(([channel, models], channelIndex) => ({
    id: `oauth-channel-${channelIndex}`,
    channel,
    originalChannel: channel,
    entries: Array.isArray(models) ? models.map((model: any, entryIndex: number) => ({
      id: `oauth-entry-${channelIndex}-${entryIndex}`,
      name: model.name || '',
      alias: model.alias || '',
      fork: Boolean(model.fork)
    })) : []
  }))
}

function parsePayloadRules(rules: any): any[] {
  if (!Array.isArray(rules)) return []
  
  return rules.map((rule, index) => ({
    id: `payload-rule-${index}`,
    models: Array.isArray(rule.models) ? rule.models.map((model: any, modelIndex: number) => ({
      id: `model-${index}-${modelIndex}`,
      name: typeof model === 'string' ? model : model.name || '',
      protocol: typeof model === 'object' ? model.protocol : undefined
    })) : [],
    params: rule.params ? Object.entries(rule.params).map(([path, value], paramIndex) => ({
      id: `param-${index}-${paramIndex}`,
      path,
      valueType: typeof value === 'number' ? 'number' : 
                 typeof value === 'boolean' ? 'boolean' :
                 typeof value === 'object' ? 'json' : 'string',
      value: String(value)
    })) : []
  }))
}

/**
 * 解析 API 密钥条目列表 (gemini-api-key, codex-api-key, claude-api-key, vertex-api-key)
 * Requirements: 20.2, 20.3, 20.4, 20.6
 */
function parseApiKeyEntries(entries: any): ApiKeyEntry[] {
  if (!Array.isArray(entries)) return []
  
  return entries.map((entry) => ({
    id: makeClientId(),
    apiKey: entry['api-key'] || '',
    prefix: entry.prefix || undefined,
    baseUrl: entry['base-url'] || undefined,
    proxyUrl: entry['proxy-url'] || undefined,
    headers: parseHeaders(entry.headers),
    models: parseModelMappings(entry.models),
    excludedModels: Array.isArray(entry['excluded-models']) ? entry['excluded-models'] : []
  }))
}

/**
 * 解析 headers 对象为 HeaderEntry 数组
 */
function parseHeaders(headers: any): HeaderEntry[] {
  if (!headers || typeof headers !== 'object') return []
  
  return Object.entries(headers).map(([key, value]) => ({
    id: makeClientId(),
    key,
    value: String(value)
  }))
}

/**
 * 解析 models 数组为 ModelMappingEntry 数组
 */
function parseModelMappings(models: any): ModelMappingEntry[] {
  if (!Array.isArray(models)) return []
  
  return models.map((model) => ({
    id: makeClientId(),
    name: model.name || '',
    alias: model.alias || ''
  }))
}

/**
 * 解析 OpenAI 兼容提供商配置
 * Requirement: 20.5
 */
function parseOpenAICompatibility(providers: any): OpenAICompatibilityEntry[] {
  if (!Array.isArray(providers)) return []
  
  return providers.map((provider) => ({
    id: makeClientId(),
    name: provider.name || '',
    prefix: provider.prefix || undefined,
    baseUrl: provider['base-url'] || '',
    headers: parseHeaders(provider.headers),
    apiKeyEntries: parseApiKeySubEntries(provider['api-key-entries']),
    models: parseModelMappings(provider.models)
  }))
}

/**
 * 解析 OpenAI 兼容提供商的 api-key-entries
 */
function parseApiKeySubEntries(entries: any): ApiKeySubEntry[] {
  if (!Array.isArray(entries)) return []
  
  return entries.map((entry) => ({
    id: makeClientId(),
    apiKey: entry['api-key'] || '',
    proxyUrl: entry['proxy-url'] || undefined
  }))
}

/**
 * 解析 Ampcode 上游 API 密钥映射
 */
function parseAmpUpstreamApiKeys(mappings: any): AmpUpstreamApiKeyMapping[] {
  if (!Array.isArray(mappings)) return []
  
  return mappings.map((mapping) => ({
    id: makeClientId(),
    upstreamApiKey: mapping['upstream-api-key'] || '',
    apiKeys: Array.isArray(mapping['api-keys']) ? mapping['api-keys'] : []
  }))
}

/**
 * 解析 OAuth 排除模型配置
 * Requirement: 20.7
 */
function parseOAuthExcludedModels(config: any): OAuthExcludedModelsConfig {
  if (!config || typeof config !== 'object') return {}
  
  const result: OAuthExcludedModelsConfig = {}
  for (const [channel, models] of Object.entries(config)) {
    if (Array.isArray(models)) {
      result[channel] = models.map(String)
    }
  }
  return result
}

/**
 * 序列化 API 密钥条目列表为 YAML 格式
 * Requirement: 20.8
 */
function serializeApiKeyEntries(entries: ApiKeyEntry[]): any[] {
  return entries.map(entry => {
    const obj: Record<string, any> = {
      'api-key': entry.apiKey
    }
    if (entry.prefix) obj.prefix = entry.prefix
    if (entry.baseUrl) obj['base-url'] = entry.baseUrl
    if (entry.proxyUrl) obj['proxy-url'] = entry.proxyUrl
    if (entry.headers.length > 0) {
      obj.headers = serializeHeaders(entry.headers)
    }
    if (entry.models.length > 0) {
      obj.models = serializeModelMappingsForYaml(entry.models)
    }
    if (entry.excludedModels.length > 0) {
      obj['excluded-models'] = entry.excludedModels
    }
    return obj
  })
}

/**
 * 序列化 headers 数组为对象格式
 */
function serializeHeaders(headers: HeaderEntry[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const header of headers) {
    if (header.key) {
      result[header.key] = header.value
    }
  }
  return result
}

/**
 * 序列化 models 数组为 YAML 格式
 */
function serializeModelMappingsForYaml(models: ModelMappingEntry[]): any[] {
  return models
    .filter(model => model.name)
    .map(model => {
      const obj: Record<string, string> = { name: model.name }
      if (model.alias) obj.alias = model.alias
      return obj
    })
}

/**
 * 序列化 OpenAI 兼容提供商配置为 YAML 格式
 * Requirement: 20.8
 */
function serializeOpenAICompatibility(providers: OpenAICompatibilityEntry[]): any[] {
  return providers.map(provider => {
    const obj: Record<string, any> = {
      name: provider.name,
      'base-url': provider.baseUrl
    }
    if (provider.prefix) obj.prefix = provider.prefix
    if (provider.headers.length > 0) {
      obj.headers = serializeHeaders(provider.headers)
    }
    if (provider.apiKeyEntries.length > 0) {
      obj['api-key-entries'] = provider.apiKeyEntries.map(entry => {
        const entryObj: Record<string, string> = { 'api-key': entry.apiKey }
        if (entry.proxyUrl) entryObj['proxy-url'] = entry.proxyUrl
        return entryObj
      })
    }
    if (provider.models.length > 0) {
      obj.models = serializeModelMappingsForYaml(provider.models)
    }
    return obj
  })
}

/**
 * 序列化 Ampcode 上游 API 密钥映射为 YAML 格式
 * Requirement: 20.8
 */
function serializeAmpUpstreamApiKeys(mappings: AmpUpstreamApiKeyMapping[]): any[] {
  return mappings
    .filter(mapping => mapping.upstreamApiKey && mapping.apiKeys.length > 0)
    .map(mapping => ({
      'upstream-api-key': mapping.upstreamApiKey,
      'api-keys': mapping.apiKeys
    }))
}

/**
 * 序列化 Payload 规则为 YAML 格式
 * Requirement: 20.8
 */
function serializePayloadRulesForYaml(rules: any[]): any[] {
  return rules.map(rule => {
    const models = (rule.models || [])
      .filter((m: any) => m.name?.trim())
      .map((m: any) => {
        const obj: Record<string, any> = { name: m.name.trim() }
        if (m.protocol) obj.protocol = m.protocol
        return obj
      })

    const params: Record<string, any> = {}
    for (const param of (rule.params || [])) {
      if (!param.path?.trim()) continue
      let value: any = param.value
      if (param.valueType === 'number') {
        const num = Number(param.value)
        value = Number.isFinite(num) ? num : param.value
      } else if (param.valueType === 'boolean') {
        value = param.value === 'true'
      } else if (param.valueType === 'json') {
        try {
          value = JSON.parse(param.value)
        } catch {
          value = param.value
        }
      }
      params[param.path.trim()] = value
    }

    return { models, params }
  }).filter(rule => rule.models.length > 0)
}