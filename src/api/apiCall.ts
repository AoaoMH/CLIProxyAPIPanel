import { apiClient } from './client'
import type { ApiCallRequest, ApiCallResponse } from '@/types'

export const apiCallApi = {
  async request(params: ApiCallRequest): Promise<ApiCallResponse> {
    const res = await apiClient.post<ApiCallResponse>('/api-call', params)
    return normalizeApiCallResponse(res)
  }
}

function normalizeApiCallResponse(input: ApiCallResponse): ApiCallResponse {
  const any = input as unknown as Record<string, unknown>
  const statusCodeRaw = any.statusCode ?? any.status_code
  const statusCode =
    typeof statusCodeRaw === 'number'
      ? statusCodeRaw
      : typeof statusCodeRaw === 'string'
        ? parseInt(statusCodeRaw, 10)
        : NaN
  const bodyText =
    typeof any.bodyText === 'string'
      ? any.bodyText
      : typeof any.body_text === 'string'
        ? any.body_text
        : undefined

  return {
    ...input,
    statusCode: Number.isFinite(statusCode) ? statusCode : input.statusCode,
    bodyText: bodyText ?? input.bodyText,
  }
}

function tryParseJson(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function extractNestedErrorMessage(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>

  // Common upstream shapes
  // { error: { message, code, type }, status }
  const err = obj.error
  if (err && typeof err === 'object' && !Array.isArray(err)) {
    const errObj = err as Record<string, unknown>
    if (typeof errObj.message === 'string' && errObj.message.trim()) return errObj.message
    if (typeof errObj.error === 'string' && errObj.error.trim()) return errObj.error
  }

  // { message: "..." }
  if (typeof obj.message === 'string' && obj.message.trim()) return obj.message
  // { error: "..." }
  if (typeof obj.error === 'string' && obj.error.trim()) return obj.error
  return null
}

function extractErrorCode(parsed: unknown): string | null {
  const obj = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null
  if (!obj) return null
  const err = obj.error
  if (err && typeof err === 'object' && !Array.isArray(err)) {
    const errObj = err as Record<string, unknown>
    const code = typeof errObj.code === 'string' ? errObj.code.trim() : ''
    if (code) return code
  }
  const code = typeof obj.code === 'string' ? obj.code.trim() : ''
  return code || null
}

function decodeBase64Json(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    // API often uses standard base64; tolerate URL-safe too.
    const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const jsonText = atob(padded)
    return tryParseJson(jsonText)
  } catch {
    return null
  }
}

function readHeaderCaseInsensitive(headers: unknown, key: string): unknown {
  const obj = headers && typeof headers === 'object' ? (headers as Record<string, unknown>) : null
  if (!obj) return undefined
  const target = key.toLowerCase()
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase() === target) return v
  }
  return undefined
}

export function getApiCallErrorMessage(response: ApiCallResponse): string {
  const res = normalizeApiCallResponse(response)
  if (res.error) return res.error

  const tryExtractFromWrapper = (wrapper: Record<string, unknown>): string | null => {
    // 1) direct message fields
    const wrapperMsg = extractNestedErrorMessage(wrapper)
    if (wrapperMsg) return wrapperMsg

    // 2) headers may contain structured error json (base64)
    const headers = (wrapper.header ?? wrapper.headers) as unknown
    const xErrorJson = readHeaderCaseInsensitive(headers, 'x-error-json')
    const xIdeErrorCode = readHeaderCaseInsensitive(headers, 'x-openai-ide-error-code')

    const decodeHeaderValue = (val: unknown): string | null => {
      const str = typeof val === 'string' ? val : Array.isArray(val) && typeof val[0] === 'string' ? val[0] : null
      if (!str) return null
      const decoded = decodeBase64Json(str)
      const decodedMsg = extractNestedErrorMessage(decoded)
      if (decodedMsg) return decodedMsg
      return null
    }

    const msgFromHeader = decodeHeaderValue(xErrorJson)
    if (msgFromHeader) return msgFromHeader

    const ideCode =
      typeof xIdeErrorCode === 'string'
        ? xIdeErrorCode.trim()
        : Array.isArray(xIdeErrorCode) && typeof xIdeErrorCode[0] === 'string'
          ? xIdeErrorCode[0].trim()
          : ''
    if (ideCode) return `认证失败：${ideCode}`

    // 3) wrapper.body may contain upstream JSON
    const innerBody = wrapper.body
    if (typeof innerBody === 'string') {
      const innerParsed = tryParseJson(innerBody)
      const innerMsg = extractNestedErrorMessage(innerParsed)
      const code = extractErrorCode(innerParsed)
      if (innerMsg) {
        if (code === 'token_invalidated') {
          return `${innerMsg}（token_invalidated，需重新登录）`
        }
        return code ? `${innerMsg}（${code}）` : innerMsg
      }
      if (innerBody.trim()) return innerBody.slice(0, 200)
    }

    return null
  }

  // Case A: backend provides bodyText
  const rawText = res.bodyText
  if (rawText) {
    const parsed = tryParseJson(rawText)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const msg = tryExtractFromWrapper(parsed as Record<string, unknown>)
      if (msg) return msg
    }

    const directMsg = extractNestedErrorMessage(parsed)
    const directCode = extractErrorCode(parsed)
    if (directMsg) {
      if (directCode === 'token_invalidated') {
        return `${directMsg}（token_invalidated，需重新登录）`
      }
      return directCode ? `${directMsg}（${directCode}）` : directMsg
    }
    return rawText.slice(0, 200)
  }

  // Case B: backend provides body (string/object)
  if (typeof res.body === 'string') {
    const parsed = tryParseJson(res.body)
    const directMsg = extractNestedErrorMessage(parsed)
    const directCode = extractErrorCode(parsed)
    if (directMsg) {
      if (directCode === 'token_invalidated') {
        return `${directMsg}（token_invalidated，需重新登录）`
      }
      return directCode ? `${directMsg}（${directCode}）` : directMsg
    }
    const trimmed = res.body.trim()
    if (trimmed) return trimmed.slice(0, 200)
  } else if (res.body && typeof res.body === 'object' && !Array.isArray(res.body)) {
    const msg = tryExtractFromWrapper(res.body as Record<string, unknown>)
    if (msg) return msg
    const directMsg = extractNestedErrorMessage(res.body)
    const directCode = extractErrorCode(res.body)
    if (directMsg) {
      if (directCode === 'token_invalidated') {
        return `${directMsg}（token_invalidated，需重新登录）`
      }
      return directCode ? `${directMsg}（${directCode}）` : directMsg
    }
  }

  // Case C: headers may be on response itself (direct wrapper responses)
  const headerCandidate = (response as unknown as Record<string, unknown>).header
  const headersCandidate = (response as unknown as Record<string, unknown>).headers
  const msgFromHeader = tryExtractFromWrapper({ header: headerCandidate, headers: headersCandidate })
  if (msgFromHeader) return msgFromHeader

  return `HTTP ${res.statusCode}`
}
