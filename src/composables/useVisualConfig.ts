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
  usageRecordsRetentionDays: '',
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
  payloadFilterRules: [],
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

function hasOwn(obj: unknown, key: string): obj is Record<string, unknown> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    Object.prototype.hasOwnProperty.call(obj, key)
  )
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function extractApiKeyValue(raw: unknown): string | null {
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed ? trimmed : null
  }

  const record = asRecord(raw)
  if (!record) return null

  const candidates = [
    record['api-key'],
    record.apiKey,
    record.key,
    record.Key,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (trimmed) return trimmed
    }
  }

  return null
}

function parseApiKeysText(raw: unknown): string {
  if (!Array.isArray(raw)) return ''

  const keys: string[] = []
  for (const item of raw) {
    const key = extractApiKeyValue(item)
    if (key) keys.push(key)
  }
  return keys.join('\n')
}

function ensureRecord(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  const existing = asRecord(parent[key])
  if (existing) return existing
  const next: Record<string, unknown> = {}
  parent[key] = next
  return next
}

function deleteIfEmpty(parent: Record<string, unknown>, key: string): void {
  const value = asRecord(parent[key])
  if (!value) return
  if (Object.keys(value).length === 0) delete parent[key]
}

function setBoolean(obj: Record<string, unknown>, key: string, value: boolean): void {
  if (value) {
    obj[key] = true
    return
  }
  if (hasOwn(obj, key)) obj[key] = false
}

function setString(obj: Record<string, unknown>, key: string, value: unknown): void {
  const safe = typeof value === 'string' ? value : ''
  const trimmed = safe.trim()
  if (trimmed !== '') {
    obj[key] = safe
    return
  }
  if (hasOwn(obj, key)) delete obj[key]
}

function setIntFromString(obj: Record<string, unknown>, key: string, value: unknown): void {
  const safe = typeof value === 'string' ? value : ''
  const trimmed = safe.trim()
  if (trimmed === '') {
    if (hasOwn(obj, key)) delete obj[key]
    return
  }
  const parsed = Number.parseInt(trimmed, 10)
  if (Number.isFinite(parsed)) {
    obj[key] = parsed
    return
  }
  if (hasOwn(obj, key)) delete obj[key]
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

export function useVisualConfig() {
  const visualValues = ref<VisualConfigValues>({ ...DEFAULT_VISUAL_VALUES })
  const originalYaml = ref('')
  const baselineValues = ref<VisualConfigValues>({ ...DEFAULT_VISUAL_VALUES })
  
  const visualDirty = computed(() => {
    // 脏检查：比较当前值与最后一次从 YAML 加载的基线值
    return JSON.stringify(visualValues.value) !== JSON.stringify(baselineValues.value)
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
        rmPanelRepo: parsed['remote-management']?.['panel-github-repository'] || parsed['remote-management']?.['panel-repo'] || '',
        
        // 认证配置
        authDir: parsed['auth-dir'] || '',
        apiKeysText: parseApiKeysText(parsed['api-keys']),
        
        // 系统配置
        debug: Boolean(parsed.debug),
        commercialMode: Boolean(parsed['commercial-mode']),
        loggingToFile: Boolean(parsed['logging-to-file']),
        logsMaxTotalSizeMb: String(parsed['logs-max-total-size-mb'] || ''),
        usageStatisticsEnabled: Boolean(parsed['usage-statistics-enabled']),
        usageRecordsRetentionDays: String(parsed['usage-records-retention-days'] ?? ''),
        
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
        
        // OAuth 模型映射（兼容 oauth-model-alias / oauth-model-mappings）
        oauthModelMappings: parseOauthModelMappings(
          parsed['oauth-model-alias'] ?? parsed['oauth-model-mappings']
        ),
        
        // Payload 配置
        payloadDefaultRules: parsePayloadRules(parsed.payload?.default),
        payloadOverrideRules: parsePayloadRules(parsed.payload?.override),
        payloadFilterRules: parsePayloadFilterRules(parsed.payload?.filter),
        
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
      baselineValues.value = deepClone(newValues)
    } catch (error) {
      // 如果 YAML 解析失败，使用默认值
      visualValues.value = { ...DEFAULT_VISUAL_VALUES }
      baselineValues.value = deepClone(DEFAULT_VISUAL_VALUES)
    }
  }

  /**
   * 将可视化配置值应用到 YAML 字符串
   * Requirement: 20.8
   */
  const applyVisualChangesToYaml = (currentYaml: string): string => {
    try {
      const parsed = (parseYaml(currentYaml) || {}) as Record<string, unknown>
      const values = visualValues.value

      // 应用基础配置
      setString(parsed, 'host', values.host)
      setIntFromString(parsed, 'port', values.port)
      
      // TLS 配置
      if (hasOwn(parsed, 'tls') || values.tlsEnable || values.tlsCert.trim() || values.tlsKey.trim()) {
        const tls = ensureRecord(parsed, 'tls')
        setBoolean(tls, 'enable', values.tlsEnable)
        setString(tls, 'cert', values.tlsCert)
        setString(tls, 'key', values.tlsKey)
        deleteIfEmpty(parsed, 'tls')
      }

      // 远程管理配置
      if (
        hasOwn(parsed, 'remote-management') ||
        values.rmAllowRemote ||
        values.rmSecretKey.trim() ||
        values.rmDisableControlPanel ||
        values.rmPanelRepo.trim()
      ) {
        const rm = ensureRecord(parsed, 'remote-management')
        setBoolean(rm, 'allow-remote', values.rmAllowRemote)
        setString(rm, 'secret-key', values.rmSecretKey)
        setBoolean(rm, 'disable-control-panel', values.rmDisableControlPanel)
        setString(rm, 'panel-github-repository', values.rmPanelRepo)
        if (hasOwn(rm, 'panel-repo')) delete rm['panel-repo']
        deleteIfEmpty(parsed, 'remote-management')
      }

      // 其他配置
      setString(parsed, 'auth-dir', values.authDir)
      if (values.apiKeysText !== baselineValues.value.apiKeysText) {
        const apiKeys = values.apiKeysText
          .split('\n')
          .map((key) => key.trim())
          .filter(Boolean)
        if (apiKeys.length > 0) {
          parsed['api-keys'] = apiKeys
        } else if (hasOwn(parsed, 'api-keys')) {
          delete parsed['api-keys']
        }
      }

      setBoolean(parsed, 'debug', values.debug)
      setBoolean(parsed, 'commercial-mode', values.commercialMode)
      setBoolean(parsed, 'logging-to-file', values.loggingToFile)
      setIntFromString(parsed, 'logs-max-total-size-mb', values.logsMaxTotalSizeMb)
      setBoolean(parsed, 'usage-statistics-enabled', values.usageStatisticsEnabled)
      setIntFromString(parsed, 'usage-records-retention-days', values.usageRecordsRetentionDays)
      setString(parsed, 'proxy-url', values.proxyUrl)
      setBoolean(parsed, 'force-model-prefix', values.forceModelPrefix)
      setIntFromString(parsed, 'request-retry', values.requestRetry)
      setIntFromString(parsed, 'max-retry-interval', values.maxRetryInterval)
      setBoolean(parsed, 'ws-auth', values.wsAuth)

      // 配额回退配置
      if (hasOwn(parsed, 'quota-exceeded') || !values.quotaSwitchProject || !values.quotaSwitchPreviewModel) {
        const quota = ensureRecord(parsed, 'quota-exceeded')
        quota['switch-project'] = values.quotaSwitchProject
        quota['switch-preview-model'] = values.quotaSwitchPreviewModel
        deleteIfEmpty(parsed, 'quota-exceeded')
      }

      // 路由策略
      if (hasOwn(parsed, 'routing') || values.routingStrategy !== 'round-robin') {
        const routing = ensureRecord(parsed, 'routing')
        routing.strategy = values.routingStrategy
        deleteIfEmpty(parsed, 'routing')
      }

      // Streaming 配置 (Requirement 20.8)
      const keepaliveSeconds = typeof values.streaming?.keepaliveSeconds === 'string' ? values.streaming.keepaliveSeconds : ''
      const bootstrapRetries = typeof values.streaming?.bootstrapRetries === 'string' ? values.streaming.bootstrapRetries : ''
      const nonstreamKeepaliveInterval =
        typeof values.streaming?.nonstreamKeepaliveInterval === 'string'
          ? values.streaming.nonstreamKeepaliveInterval
          : ''

      const streamingDefined =
        hasOwn(parsed, 'streaming') || keepaliveSeconds.trim() || bootstrapRetries.trim()
      if (streamingDefined) {
        const streaming = ensureRecord(parsed, 'streaming')
        setIntFromString(streaming, 'keepalive-seconds', keepaliveSeconds)
        setIntFromString(streaming, 'bootstrap-retries', bootstrapRetries)
        deleteIfEmpty(parsed, 'streaming')
      }

      // Non-streaming keepalive interval (顶层配置)
      setIntFromString(parsed, 'nonstream-keepalive-interval', nonstreamKeepaliveInterval)

      // Gemini API 密钥配置 (Requirement 20.8)
      if (values.geminiApiKeys.length > 0) {
        parsed['gemini-api-key'] = serializeApiKeyEntries(values.geminiApiKeys)
      } else if (hasOwn(parsed, 'gemini-api-key')) {
        delete parsed['gemini-api-key']
      }

      // Codex API 密钥配置 (Requirement 20.8)
      if (values.codexApiKeys.length > 0) {
        parsed['codex-api-key'] = serializeApiKeyEntries(values.codexApiKeys)
      } else if (hasOwn(parsed, 'codex-api-key')) {
        delete parsed['codex-api-key']
      }

      // Claude API 密钥配置 (Requirement 20.8)
      if (values.claudeApiKeys.length > 0) {
        parsed['claude-api-key'] = serializeApiKeyEntries(values.claudeApiKeys)
      } else if (hasOwn(parsed, 'claude-api-key')) {
        delete parsed['claude-api-key']
      }

      // Vertex API 密钥配置 (Requirement 20.8)
      if (values.vertexApiKeys.length > 0) {
        parsed['vertex-api-key'] = serializeApiKeyEntries(values.vertexApiKeys)
      } else if (hasOwn(parsed, 'vertex-api-key')) {
        delete parsed['vertex-api-key']
      }

      // OpenAI 兼容配置 (Requirement 20.8)
      if (values.openaiCompatibility.length > 0) {
        parsed['openai-compatibility'] = serializeOpenAICompatibility(values.openaiCompatibility)
      } else if (hasOwn(parsed, 'openai-compatibility')) {
        delete parsed['openai-compatibility']
      }

      // Ampcode 配置
      const ampDefined =
        hasOwn(parsed, 'ampcode') ||
        values.ampUpstreamUrl.trim() ||
        values.ampUpstreamApiKey.trim() ||
        values.ampRestrictManagementToLocalhost ||
        values.ampForceModelMappings ||
        values.ampModelMappings.length > 0 ||
        values.ampUpstreamApiKeys.length > 0
      if (ampDefined) {
        const amp = ensureRecord(parsed, 'ampcode')
        setString(amp, 'upstream-url', values.ampUpstreamUrl)
        setString(amp, 'upstream-api-key', values.ampUpstreamApiKey)
        setBoolean(amp, 'restrict-management-to-localhost', values.ampRestrictManagementToLocalhost)
        setBoolean(amp, 'force-model-mappings', values.ampForceModelMappings)

        if (values.ampModelMappings.length > 0) {
          amp['model-mappings'] = values.ampModelMappings.map((mapping) => ({
            from: mapping.from,
            to: mapping.to,
          }))
        } else if (hasOwn(amp, 'model-mappings')) {
          delete amp['model-mappings']
        }

        if (values.ampUpstreamApiKeys.length > 0) {
          amp['upstream-api-keys'] = serializeAmpUpstreamApiKeys(values.ampUpstreamApiKeys)
        } else if (hasOwn(amp, 'upstream-api-keys')) {
          delete amp['upstream-api-keys']
        }

        deleteIfEmpty(parsed, 'ampcode')
      }

      // OAuth 模型映射
      if (values.oauthModelMappings.length > 0) {
        parsed['oauth-model-alias'] = {}
        for (const channelMapping of values.oauthModelMappings) {
          if (channelMapping.channel && channelMapping.entries.length > 0) {
            parsed['oauth-model-alias'][channelMapping.channel] = channelMapping.entries
              .filter(entry => entry.name)
              .map(entry => {
                const obj: Record<string, any> = { name: entry.name }
                if (entry.alias && entry.alias !== entry.name) obj.alias = entry.alias
                if (entry.fork) obj.fork = true
                return obj
              })
          }
        }

        if (hasOwn(parsed, 'oauth-model-mappings')) {
          delete parsed['oauth-model-mappings']
        }
      } else {
        if (hasOwn(parsed, 'oauth-model-alias')) {
          delete parsed['oauth-model-alias']
        }
        if (hasOwn(parsed, 'oauth-model-mappings')) {
          delete parsed['oauth-model-mappings']
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
      } else if (hasOwn(parsed, 'oauth-excluded-models')) {
        delete parsed['oauth-excluded-models']
      }

      // Payload 配置
      if (
        hasOwn(parsed, 'payload') ||
        values.payloadDefaultRules.length > 0 ||
        values.payloadOverrideRules.length > 0 ||
        values.payloadFilterRules.length > 0
      ) {
        const payload = ensureRecord(parsed, 'payload')
        if (values.payloadDefaultRules.length > 0) {
          payload.default = serializePayloadRulesForYaml(values.payloadDefaultRules)
        } else if (hasOwn(payload, 'default')) {
          delete payload.default
        }
        if (values.payloadOverrideRules.length > 0) {
          payload.override = serializePayloadRulesForYaml(values.payloadOverrideRules)
        } else if (hasOwn(payload, 'override')) {
          delete payload.override
        }
        if (values.payloadFilterRules.length > 0) {
          payload.filter = serializePayloadFilterRulesForYaml(values.payloadFilterRules)
        } else if (hasOwn(payload, 'filter')) {
          delete payload.filter
        }
        deleteIfEmpty(parsed, 'payload')
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
    const next: VisualConfigValues = { ...visualValues.value, ...newValues }

    if (newValues.streaming) {
      next.streaming = {
        ...visualValues.value.streaming,
        ...newValues.streaming,
      }
    }

    visualValues.value = next
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

function parsePayloadFilterRules(rules: any): any[] {
  if (!Array.isArray(rules)) return []

  return rules.map((rule, index) => ({
    id: `payload-filter-rule-${index}`,
    models: Array.isArray(rule.models)
      ? rule.models.map((model: any, modelIndex: number) => ({
          id: `filter-model-${index}-${modelIndex}`,
          name: typeof model === 'string' ? model : model.name || '',
          protocol: typeof model === 'object' ? model.protocol : undefined,
        }))
      : [],
    params: Array.isArray(rule.params) ? rule.params.map(String) : [],
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

function serializePayloadFilterRulesForYaml(rules: any[]): any[] {
  return rules
    .map((rule) => {
      const models = (rule.models || [])
        .filter((m: any) => m.name?.trim())
        .map((m: any) => {
          const obj: Record<string, any> = { name: m.name.trim() }
          if (m.protocol) obj.protocol = m.protocol
          return obj
        })

      const params = (Array.isArray(rule.params) ? rule.params : [])
        .map((path: any) => String(path).trim())
        .filter(Boolean)

      return { models, params }
    })
    .filter((rule) => rule.models.length > 0)
}
