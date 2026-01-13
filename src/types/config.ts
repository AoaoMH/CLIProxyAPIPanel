/**
 * 配置相关类型定义
 * 与基线 /config 返回结构保持一致（内部使用驼峰形式）
 */

export interface ProviderKeyConfig {
  id?: string
  key: string
  name?: string
  enabled?: boolean
  models?: string[]
  baseUrl?: string
  organization?: string
  project?: string
}

export interface GeminiKeyConfig extends ProviderKeyConfig {
  region?: string
  projectId?: string
}

export interface OpenAIProviderConfig {
  id?: string
  name: string
  baseUrl: string
  apiKey?: string
  models?: string[]
  enabled?: boolean
}

export interface AmpcodeConfig {
  enabled?: boolean
  upstreamUrl?: string
  upstreamApiKey?: string
  restrictManagementToLocalhost?: boolean
  forceModelMappings?: boolean
  modelMappings?: AmpcodeModelMapping[]
}

export interface AmpcodeModelMapping {
  id?: string
  from: string
  to: string
}

export interface QuotaExceededConfig {
  switchProject?: boolean
  switchPreviewModel?: boolean
}

export interface Config {
  debug?: boolean
  proxyUrl?: string
  requestRetry?: number
  quotaExceeded?: QuotaExceededConfig
  usageStatisticsEnabled?: boolean
  requestLog?: boolean
  loggingToFile?: boolean
  logsMaxTotalSizeMb?: number
  wsAuth?: boolean
  forceModelPrefix?: boolean
  routingStrategy?: string
  apiKeys?: string[]
  ampcode?: AmpcodeConfig
  geminiApiKeys?: GeminiKeyConfig[]
  codexApiKeys?: ProviderKeyConfig[]
  claudeApiKeys?: ProviderKeyConfig[]
  vertexApiKeys?: ProviderKeyConfig[]
  openaiCompatibility?: OpenAIProviderConfig[]
  oauthExcludedModels?: Record<string, string[]>
  raw?: Record<string, any>
}

export type RawConfigSection =
  | 'debug'
  | 'proxy-url'
  | 'request-retry'
  | 'quota-exceeded'
  | 'usage-statistics-enabled'
  | 'request-log'
  | 'logging-to-file'
  | 'logs-max-total-size-mb'
  | 'ws-auth'
  | 'force-model-prefix'
  | 'routing/strategy'
  | 'api-keys'
  | 'ampcode'
  | 'gemini-api-key'
  | 'codex-api-key'
  | 'claude-api-key'
  | 'vertex-api-key'
  | 'openai-compatibility'
  | 'oauth-excluded-models'

// Visual Config Types for Config Editor
export type AmpModelMappingEntry = { id: string; from: string; to: string }

export type OauthModelMappingEntry = { id: string; name: string; alias: string; fork: boolean }

export type OauthChannelMappings = {
  id: string
  channel: string
  originalChannel: string
  entries: OauthModelMappingEntry[]
}

// Payload configuration types
export type PayloadParamValueType = 'string' | 'number' | 'boolean' | 'json'

export type PayloadParamEntry = {
  id: string
  path: string
  valueType: PayloadParamValueType
  value: string
}

export type PayloadModelEntry = {
  id: string
  name: string
  protocol?: 'openai' | 'gemini' | 'claude' | 'codex'
}

export type PayloadRule = {
  id: string
  models: PayloadModelEntry[]
  params: PayloadParamEntry[]
}

// Streaming configuration (Requirement 19.1)
export interface StreamingConfig {
  keepaliveSeconds: string
  bootstrapRetries: string
  nonstreamKeepaliveInterval: string
}

// Header entry for API key configurations
export interface HeaderEntry {
  id: string
  key: string
  value: string
}

// Model mapping entry for API key configurations
export interface ModelMappingEntry {
  id: string
  name: string
  alias: string
}

// API Key Entry - shared structure for Gemini, Codex, Claude, Vertex (Requirements 19.2, 19.3, 19.4, 19.6)
export interface ApiKeyEntry {
  id: string
  apiKey: string
  prefix?: string
  baseUrl?: string
  proxyUrl?: string
  headers: HeaderEntry[]
  models: ModelMappingEntry[]
  excludedModels: string[]
}

// API Key Sub Entry for OpenAI Compatibility providers
export interface ApiKeySubEntry {
  id: string
  apiKey: string
  proxyUrl?: string
}

// OpenAI Compatibility Entry (Requirement 19.5)
export interface OpenAICompatibilityEntry {
  id: string
  name: string
  prefix?: string
  baseUrl: string
  headers: HeaderEntry[]
  apiKeyEntries: ApiKeySubEntry[]
  models: ModelMappingEntry[]
}

// Ampcode Upstream API Key Mapping (Requirement 19.8)
export interface AmpUpstreamApiKeyMapping {
  id: string
  upstreamApiKey: string
  apiKeys: string[]
}

// OAuth Excluded Models Config (Requirement 19.7)
export interface OAuthExcludedModelsConfig {
  [channel: string]: string[]
}

export type VisualConfigValues = {
  host: string
  port: string
  tlsEnable: boolean
  tlsCert: string
  tlsKey: string
  rmAllowRemote: boolean
  rmSecretKey: string
  rmDisableControlPanel: boolean
  rmPanelRepo: string
  authDir: string
  apiKeysText: string
  debug: boolean
  commercialMode: boolean
  loggingToFile: boolean
  logsMaxTotalSizeMb: string
  usageStatisticsEnabled: boolean
  proxyUrl: string
  forceModelPrefix: boolean
  requestRetry: string
  maxRetryInterval: string
  quotaSwitchProject: boolean
  quotaSwitchPreviewModel: boolean
  routingStrategy: 'round-robin' | 'fill-first'
  wsAuth: boolean
  ampUpstreamUrl: string
  ampUpstreamApiKey: string
  ampRestrictManagementToLocalhost: boolean
  ampForceModelMappings: boolean
  ampModelMappings: AmpModelMappingEntry[]
  oauthModelMappings: OauthChannelMappings[]
  payloadDefaultRules: PayloadRule[]
  payloadOverrideRules: PayloadRule[]
  // New fields for extended configuration (Requirements 19.1-19.8)
  streaming: StreamingConfig
  geminiApiKeys: ApiKeyEntry[]
  codexApiKeys: ApiKeyEntry[]
  claudeApiKeys: ApiKeyEntry[]
  vertexApiKeys: ApiKeyEntry[]
  openaiCompatibility: OpenAICompatibilityEntry[]
  ampUpstreamApiKeys: AmpUpstreamApiKeyMapping[]
  oauthExcludedModels: OAuthExcludedModelsConfig
}

export const makeClientId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export const DEFAULT_VISUAL_VALUES: VisualConfigValues = {
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