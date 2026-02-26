import type {
  TypeColorSet,
  GeminiCliQuotaGroupDefinition,
  AntigravityQuotaGroupDefinition,
  AuthFileItem
} from '@/types'
import dayjs from 'dayjs'

// Type colors definition
export const TYPE_COLORS: Record<string, TypeColorSet> = {
  qwen: {
    light: { bg: '#e8f5e9', text: '#2e7d32' },
    dark: { bg: '#1b5e20', text: '#81c784' }
  },
  kimi: {
    light: { bg: '#fff4e5', text: '#ad6800' },
    dark: { bg: '#7c4a03', text: '#ffd591' }
  },
  gemini: {
    light: { bg: '#e3f2fd', text: '#1565c0' },
    dark: { bg: '#0d47a1', text: '#64b5f6' }
  },
  'gemini-cli': {
    light: { bg: '#e7efff', text: '#1e4fa3' },
    dark: { bg: '#1c3f73', text: '#a8c7ff' }
  },
  aistudio: {
    light: { bg: '#f0f2f5', text: '#2f343c' },
    dark: { bg: '#373c42', text: '#cfd3db' }
  },
  claude: {
    light: { bg: '#fce4ec', text: '#c2185b' },
    dark: { bg: '#880e4f', text: '#f48fb1' }
  },
  codex: {
    light: { bg: '#fff3e0', text: '#ef6c00' },
    dark: { bg: '#e65100', text: '#ffb74d' }
  },
  antigravity: {
    light: { bg: '#e0f7fa', text: '#006064' },
    dark: { bg: '#004d40', text: '#80deea' }
  },
  iflow: {
    light: { bg: '#f3e5f5', text: '#7b1fa2' },
    dark: { bg: '#4a148c', text: '#ce93d8' }
  },
  empty: {
    light: { bg: '#f5f5f5', text: '#616161' },
    dark: { bg: '#424242', text: '#bdbdbd' }
  },
  unknown: {
    light: { bg: '#f0f0f0', text: '#666666', border: '1px dashed #999999' },
    dark: { bg: '#3a3a3a', text: '#aaaaaa', border: '1px dashed #666666' }
  }
}

// =====================
// API Configuration - matching reference implementation
// =====================

// Antigravity default project ID (fallback value)
export const DEFAULT_ANTIGRAVITY_PROJECT_ID = 'bamboo-precept-lgxtn'

// Antigravity API (POST method with fallback URLs)
export const ANTIGRAVITY_QUOTA_URLS = [
  'https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels',
  'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:fetchAvailableModels',
  'https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels'
]

export const ANTIGRAVITY_REQUEST_HEADERS = {
  'Authorization': 'Bearer $TOKEN$',
  'Content-Type': 'application/json',
  'User-Agent': 'antigravity/1.11.5 windows/amd64'
}

// Codex API (GET method)
export const CODEX_USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage'

export const CODEX_REQUEST_HEADERS = {
  'Authorization': 'Bearer $TOKEN$',
  'Content-Type': 'application/json',
  'User-Agent': 'codex_cli_rs/0.76.0 (Debian 13.0.0; x86_64) WindowsTerminal'
}

// Gemini CLI API (POST method)
export const GEMINI_CLI_QUOTA_URL = 'https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota'

export const GEMINI_CLI_REQUEST_HEADERS = {
  'Authorization': 'Bearer $TOKEN$',
  'Content-Type': 'application/json'
}

// Claude API configuration
export const CLAUDE_USAGE_URL = 'https://api.anthropic.com/api/oauth/usage'

export const CLAUDE_REQUEST_HEADERS = {
  'Authorization': 'Bearer $TOKEN$',
  'Content-Type': 'application/json',
  'anthropic-beta': 'oauth-2025-04-20'
}

export const CLAUDE_USAGE_WINDOW_KEYS = [
  { key: 'five_hour', id: 'five-hour', labelKey: 'claude_quota.five_hour' },
  { key: 'seven_day', id: 'seven-day', labelKey: 'claude_quota.seven_day' },
  {
    key: 'seven_day_oauth_apps',
    id: 'seven-day-oauth-apps',
    labelKey: 'claude_quota.seven_day_oauth_apps'
  },
  { key: 'seven_day_opus', id: 'seven-day-opus', labelKey: 'claude_quota.seven_day_opus' },
  {
    key: 'seven_day_sonnet',
    id: 'seven-day-sonnet',
    labelKey: 'claude_quota.seven_day_sonnet'
  },
  {
    key: 'seven_day_cowork',
    id: 'seven-day-cowork',
    labelKey: 'claude_quota.seven_day_cowork'
  },
  { key: 'iguana_necktie', id: 'iguana-necktie', labelKey: 'claude_quota.iguana_necktie' }
] as const

// =====================
// Normalization & Parsing Functions
// =====================

export function normalizeAuthIndexValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'number' && Number.isFinite(val)) return val.toString()
  if (typeof val === 'string') {
    const trimmed = val.trim()
    return trimmed || ''
  }
  return ''
}

export function normalizeNumberValue(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return null
    const parsed = parseFloat(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function normalizeQuotaFraction(val: unknown): number | null {
  const num = normalizeNumberValue(val)
  if (num !== null) return num
  // Handle percentage strings like "50%"
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed.endsWith('%')) {
      const parsed = parseFloat(trimmed.slice(0, -1))
      if (Number.isFinite(parsed)) return parsed / 100
    }
  }
  return null
}

export function normalizeStringValue(val: unknown): string | null {
  if (typeof val === 'string') {
    const trimmed = val.trim()
    return trimmed || null
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val.toString()
  }
  return null
}

// =====================
// Validators
// =====================

export function isAntigravityFile(file: AuthFileItem): boolean {
  const provider = (file.type || file.provider || '').toString().toLowerCase()
  return provider === 'antigravity'
}

export function isCodexFile(file: AuthFileItem): boolean {
  const provider = (file.type || file.provider || '').toString().toLowerCase()
  return provider === 'codex'
}

export function isGeminiCliFile(file: AuthFileItem): boolean {
  const provider = (file.type || file.provider || '').toString().toLowerCase()
  return provider === 'gemini-cli'
}

export function isRuntimeOnlyAuthFile(file: AuthFileItem): boolean {
  const raw = (file as Record<string, unknown>)['runtime_only'] ?? file.runtimeOnly
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') return raw.trim().toLowerCase() === 'true'
  return false
}

// =====================
// Formatters
// =====================

export function formatQuotaResetTime(dateStr?: string): string {
  if (!dateStr) return ''
  const d = dayjs(dateStr)
  if (!d.isValid()) return ''
  
  const now = dayjs()
  if (d.isSame(now, 'day')) {
    return d.format('HH:mm')
  }
  if (d.isSame(now, 'year')) {
    return d.format('M/D HH:mm')
  }
  return d.format('YYYY/MM/DD')
}

export function formatUnixSeconds(val: number | null): string {
  if (!val) return ''
  const d = dayjs.unix(val)
  if (!d.isValid()) return ''
  return d.format('MM/DD HH:mm')
}

export function formatCodexResetLabel(resetAt?: number | null, resetAfterSeconds?: number | null): string {
  if (resetAt && resetAt > 0) {
    return formatUnixSeconds(resetAt)
  }
  if (resetAfterSeconds && resetAfterSeconds > 0) {
    const targetSeconds = Math.floor(Date.now() / 1000 + resetAfterSeconds)
    return formatUnixSeconds(targetSeconds)
  }
  return ''
}

// =====================
// Resolver Functions (extract data from auth files)
// =====================

function decodeBase64UrlPayload(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return atob(padded)
  } catch {
    return null
  }
}

function parseIdTokenPayload(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  // Try JSON parse first
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    // Continue to JWT parsing
  }
  // JWT parsing
  const segments = trimmed.split('.')
  if (segments.length < 2) return null
  const decoded = decodeBase64UrlPayload(segments[1])
  if (!decoded) return null
  try {
    const parsed = JSON.parse(decoded)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    return null
  }
  return null
}

export function resolveCodexChatgptAccountId(file: AuthFileItem): string | null {
  const fileAny = file as Record<string, unknown>
  const metadata = typeof fileAny.metadata === 'object' && fileAny.metadata !== null
    ? fileAny.metadata as Record<string, unknown>
    : null
  const attributes = typeof fileAny.attributes === 'object' && fileAny.attributes !== null
    ? fileAny.attributes as Record<string, unknown>
    : null

  const candidates = [fileAny.id_token, metadata?.id_token, attributes?.id_token]

  for (const candidate of candidates) {
    const payload = parseIdTokenPayload(candidate)
    if (payload) {
      const accountId = normalizeStringValue(payload.chatgpt_account_id ?? payload.chatgptAccountId)
      if (accountId) return accountId
    }
  }
  return null
}

export function resolveCodexPlanType(file: AuthFileItem): string | null {
  const fileAny = file as Record<string, unknown>
  const metadata =
    typeof fileAny.metadata === 'object' && fileAny.metadata !== null
      ? (fileAny.metadata as Record<string, unknown>)
      : null
  const attributes =
    typeof fileAny.attributes === 'object' && fileAny.attributes !== null
      ? (fileAny.attributes as Record<string, unknown>)
      : null

  const idToken = parseIdTokenPayload(fileAny.id_token)
  const metadataIdToken = parseIdTokenPayload(metadata?.id_token)
  const attributesIdToken = parseIdTokenPayload(attributes?.id_token)

  const candidates = [
    fileAny.plan_type,
    fileAny.planType,
    fileAny['plan_type'],
    fileAny['planType'],
    idToken?.plan_type,
    idToken?.planType,
    metadata?.plan_type,
    metadata?.planType,
    metadataIdToken?.plan_type,
    metadataIdToken?.planType,
    attributes?.plan_type,
    attributes?.planType,
    attributesIdToken?.plan_type,
    attributesIdToken?.planType
  ]

  for (const candidate of candidates) {
    const planType = normalizeStringValue(candidate)
    if (planType) return planType.toLowerCase()
  }

  return null
}

function extractGeminiCliProjectId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  // Look for project ID in parentheses, e.g., "email@gmail.com (project-id)"
  const matches = Array.from(value.matchAll(/\(([^()]+)\)/g))
  if (matches.length === 0) return null
  const candidate = matches[matches.length - 1]?.[1]?.trim()
  return candidate || null
}

export function resolveGeminiCliProjectId(file: AuthFileItem): string | null {
  const fileAny = file as Record<string, unknown>
  const metadata = typeof fileAny.metadata === 'object' && fileAny.metadata !== null
    ? fileAny.metadata as Record<string, unknown>
    : null
  const attributes = typeof fileAny.attributes === 'object' && fileAny.attributes !== null
    ? fileAny.attributes as Record<string, unknown>
    : null

  const candidates = [
    fileAny.account,
    metadata?.account,
    attributes?.account
  ]

  for (const candidate of candidates) {
    const projectId = extractGeminiCliProjectId(candidate)
    if (projectId) return projectId
  }
  return null
}

// =====================
// Group Definitions for Quota Aggregation
// =====================

export const ANTIGRAVITY_QUOTA_GROUPS: AntigravityQuotaGroupDefinition[] = [
  {
    id: 'claude-gpt',
    label: 'Claude/GPT',
    identifiers: [
      'claude-sonnet-4-5-thinking',
      'claude-opus-4-5-thinking',
      'claude-sonnet-4-5',
      'gpt-oss-120b-medium'
    ]
  },
  {
    id: 'gemini-3-pro',
    label: 'Gemini 3 Pro',
    identifiers: ['gemini-3-pro-high', 'gemini-3-pro-low']
  },
  {
    id: 'gemini-2-5-flash',
    label: 'Gemini 2.5 Flash',
    identifiers: ['gemini-2.5-flash', 'gemini-2.5-flash-thinking']
  },
  {
    id: 'gemini-2-5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    identifiers: ['gemini-2.5-flash-lite']
  },
  {
    id: 'gemini-2-5-cu',
    label: 'Gemini 2.5 CU',
    identifiers: ['rev19-uic3-1p']
  },
  {
    id: 'gemini-3-flash',
    label: 'Gemini 3 Flash',
    identifiers: ['gemini-3-flash']
  },
  {
    id: 'gemini-image',
    label: 'gemini-3-pro-image',
    identifiers: ['gemini-3-pro-image'],
    labelFromModel: true
  }
]

export const GEMINI_CLI_QUOTA_GROUPS: GeminiCliQuotaGroupDefinition[] = [
  {
    id: 'gemini-flash-lite-series',
    label: 'Gemini Flash Lite Series',
    preferredModelId: 'gemini-2.5-flash-lite',
    modelIds: ['gemini-2.5-flash-lite']
  },
  {
    id: 'gemini-flash-series',
    label: 'Gemini Flash Series',
    preferredModelId: 'gemini-3-flash-preview',
    modelIds: ['gemini-3-flash-preview', 'gemini-2.5-flash']
  },
  {
    id: 'gemini-pro-series',
    label: 'Gemini Pro Series',
    preferredModelId: 'gemini-3-1-pro-preview',
    modelIds: ['gemini-3-1-pro-preview', 'gemini-3-pro-preview', 'gemini-2.5-pro']
  }
]

export const GEMINI_CLI_GROUP_ORDER = new Map(
  GEMINI_CLI_QUOTA_GROUPS.map((group, index) => [group.id, index] as const)
)

export const GEMINI_CLI_GROUP_LOOKUP = new Map(
  GEMINI_CLI_QUOTA_GROUPS.flatMap((group) =>
    group.modelIds.map((modelId) => [modelId, group] as const)
  )
)

export const GEMINI_CLI_IGNORED_MODEL_PREFIXES = ['gemini-2.0-flash']

export function isIgnoredGeminiCliModel(modelId: string): boolean {
  return GEMINI_CLI_IGNORED_MODEL_PREFIXES.some(
    prefix => modelId === prefix || modelId.startsWith(`${prefix}-`)
  )
}
