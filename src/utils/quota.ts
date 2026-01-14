import type {
  ThemeColors,
  TypeColorSet,
  GeminiCliQuotaGroupDefinition,
  AntigravityQuotaGroupDefinition,
  AuthFileItem
} from '@/types'
import dayjs from 'dayjs'

// Type colors definition
export const TYPE_COLORS: Record<string, TypeColorSet> = {
  antigravity: {
    light: { bg: '#e0f7fa', text: '#006064', border: '#b2ebf2' },
    dark: { bg: 'rgba(0, 96, 100, 0.3)', text: '#80deea', border: 'rgba(178, 235, 242, 0.2)' }
  },
  codex: {
    light: { bg: '#fff3e0', text: '#ef6c00', border: '#ffe0b2' },
    dark: { bg: 'rgba(239, 108, 0, 0.3)', text: '#ffcc80', border: 'rgba(255, 224, 178, 0.2)' }
  },
  'gemini-cli': {
    light: { bg: '#e7efff', text: '#1e4fa3', border: '#c5d9ff' },
    dark: { bg: 'rgba(30, 79, 163, 0.3)', text: '#9cbdfc', border: 'rgba(197, 217, 255, 0.2)' }
  },
  gemini: {
    light: { bg: '#e3f2fd', text: '#1565c0', border: '#bbdefb' },
    dark: { bg: 'rgba(21, 101, 192, 0.3)', text: '#90caf9', border: 'rgba(187, 222, 251, 0.2)' }
  },
  claude: {
    light: { bg: '#fce4ec', text: '#c2185b', border: '#f8bbd0' },
    dark: { bg: 'rgba(194, 24, 91, 0.3)', text: '#f48fb1', border: 'rgba(248, 187, 208, 0.2)' }
  },
  qwen: {
    light: { bg: '#e8f5e9', text: '#2e7d32', border: '#c8e6c9' },
    dark: { bg: 'rgba(46, 125, 50, 0.3)', text: '#a5d6a7', border: 'rgba(200, 230, 201, 0.2)' }
  },
  aistudio: {
    light: { bg: '#f0f2f5', text: '#2f343c', border: '#e0e0e0' },
    dark: { bg: 'rgba(55, 60, 66, 0.3)', text: '#cfd3db', border: 'rgba(224, 224, 224, 0.2)' }
  },
  iflow: {
    light: { bg: '#f3e5f5', text: '#7b1fa2', border: '#e1bee7' },
    dark: { bg: 'rgba(123, 31, 162, 0.3)', text: '#ce93d8', border: 'rgba(225, 190, 231, 0.2)' }
  },
  vertex: {
    light: { bg: '#e8eaf6', text: '#3f51b5', border: '#c5cae9' },
    dark: { bg: 'rgba(63, 81, 181, 0.3)', text: '#9fa8da', border: 'rgba(197, 202, 233, 0.2)' }
  },
  default: {
    light: { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0' },
    dark: { bg: 'rgba(97, 97, 97, 0.3)', text: '#eeeeee', border: 'rgba(224, 224, 224, 0.2)' }
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
  const metadata = typeof fileAny.metadata === 'object' && fileAny.metadata !== null
    ? fileAny.metadata as Record<string, unknown>
    : null

  const candidates = [
    fileAny.plan_type,
    fileAny.planType,
    metadata?.plan_type,
    metadata?.planType
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

export const ANTIGRAVITY_GROUPS: AntigravityQuotaGroupDefinition[] = [
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

export const GEMINI_CLI_GROUPS: GeminiCliQuotaGroupDefinition[] = [
  {
    id: 'gemini-2-5-flash-series',
    label: 'Gemini 2.5 Flash Series',
    modelIds: ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
  },
  {
    id: 'gemini-2-5-pro',
    label: 'Gemini 2.5 Pro',
    modelIds: ['gemini-2.5-pro']
  },
  {
    id: 'gemini-3-pro-preview',
    label: 'Gemini 3 Pro Preview',
    modelIds: ['gemini-3-pro-preview']
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    modelIds: ['gemini-3-flash-preview']
  }
]

export const GEMINI_CLI_IGNORED_MODEL_PREFIXES = ['gemini-2.0-flash']

export function isIgnoredGeminiCliModel(modelId: string): boolean {
  return GEMINI_CLI_IGNORED_MODEL_PREFIXES.some(
    prefix => modelId === prefix || modelId.startsWith(`${prefix}-`)
  )
}
