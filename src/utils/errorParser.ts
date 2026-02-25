import type { ApiError } from '@/types'

function tryParseJson(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function extractMessageFromPayload(payload: unknown): string | null {
  const obj = asRecord(payload)
  if (!obj) return null

  const errorObj = asRecord(obj.error)
  if (errorObj) {
    const msg = typeof errorObj.message === 'string' ? errorObj.message.trim() : ''
    if (msg) return msg
    const err = typeof errorObj.error === 'string' ? errorObj.error.trim() : ''
    if (err) return err
  }

  const msg = typeof obj.message === 'string' ? obj.message.trim() : ''
  if (msg) return msg
  const err = typeof obj.error === 'string' ? obj.error.trim() : ''
  if (err) return err

  // Wrapped upstream response: { status_code, header, body: "{...}" }
  const inner = obj.body
  if (typeof inner === 'string') {
    const parsedInner = tryParseJson(inner)
    const innerMsg = extractMessageFromPayload(parsedInner)
    if (innerMsg) return innerMsg
    const trimmed = inner.trim()
    if (trimmed) return trimmed.slice(0, 200)
  }

  return null
}

/**
 * Normalize any thrown error into a user-facing message.
 *
 * NOTE: keep it side-effect free (no toast here).
 */
export function parseApiError(error: unknown, fallback = '操作失败'): string {
  if (error instanceof Error) {
    // ApiClient.handleError sets `details/data` for Axios errors.
    const apiError = error as ApiError
    const fromDetails = extractMessageFromPayload(apiError.details ?? apiError.data)
    if (fromDetails) return fromDetails

    const msg = error.message?.trim()
    if (msg) return msg
  }

  // Some callers may throw raw objects/strings
  if (typeof error === 'string') {
    const trimmed = error.trim()
    return trimmed || fallback
  }
  const obj = asRecord(error)
  if (obj) {
    const fromPayload = extractMessageFromPayload(obj)
    if (fromPayload) return fromPayload
  }

  return fallback
}
