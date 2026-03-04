<template>
  <PageContainer padding="aether">
    <div class="flex flex-col min-h-0 flex-1">
      <h1 class="text-2xl font-bold text-foreground mb-6">日志管理</h1>

      <!-- Tab Bar -->
      <div class="flex gap-1 mb-6 border-b border-border">
        <button
          type="button"
          :class="[
            'px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 -mb-px',
            activeTab === 'logs'
              ? 'text-primary border-primary'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          ]"
          @click="activeTab = 'logs'"
        >
          日志内容
        </button>
        <button
          type="button"
          :class="[
            'px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 -mb-px',
            activeTab === 'errors'
              ? 'text-primary border-primary'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          ]"
          @click="activeTab = 'errors'"
        >
          错误日志
        </button>
      </div>

      <!-- Logs Tab -->
      <div v-if="activeTab === 'logs'" class="flex flex-col flex-1 min-h-0">
        <CardSection class="flex flex-col flex-1 min-h-0" padding="md">
          <!-- Error Display -->
          <div v-if="error" class="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {{ error }}
          </div>

          <!-- Filters -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 flex-wrap">
            <!-- Search Input -->
            <div class="relative flex-1 min-w-56 max-w-md">
              <Input
                v-model="searchQuery"
                placeholder="搜索日志内容..."
                class="pr-10"
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Search v-if="!searchQuery" class="w-4 h-4 text-muted-foreground" />
                <button
                  v-else
                  type="button"
                  class="p-1 hover:bg-muted rounded-full transition-colors pointer-events-auto"
                  @click="searchQuery = ''"
                >
                  <X class="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>

            <!-- Hide Management Logs Toggle -->
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                v-model="hideManagementLogs"
                class="rounded border-border"
              />
              <EyeOff class="w-4 h-4 text-muted-foreground" />
              <span class="text-sm text-foreground">隐藏管理日志</span>
            </label>

            <!-- Toolbar -->
            <div class="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                @click="fetchLogs"
                :disabled="loading"
              >
                <RefreshCw class="w-4 h-4 mr-2" />
                刷新
              </Button>
              
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="autoRefresh"
                  class="rounded border-border"
                />
                <Timer class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm text-foreground">自动刷新</span>
              </label>

              <Button
                variant="outline"
                size="sm"
                @click="downloadLogs"
                :disabled="logs.length === 0"
              >
                <Download class="w-4 h-4 mr-2" />
                下载
              </Button>

              <Button
                variant="destructive"
                size="sm"
                @click="clearLogs"
              >
                <Trash2 class="w-4 h-4 mr-2" />
                清空
              </Button>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading && logs.length === 0" class="flex items-center justify-center py-12">
            <Loader2 class="w-8 h-8 animate-spin text-primary" />
            <span class="ml-2 text-muted-foreground">加载中...</span>
          </div>

          <!-- Log Panel -->
          <div
            v-else-if="logs.length > 0 && filteredLogs.length > 0"
            ref="logViewerRef"
            class="flex-1 min-h-72 max-h-[calc(100vh-20rem)] overflow-auto bg-muted/30 border border-border rounded-xl relative"
            @scroll="handleLogScroll"
          >
            <!-- Load More Banner -->
            <div
              v-if="canLoadMore"
              class="sticky top-0 z-10 flex items-center justify-between gap-4 px-3 py-2 border-b border-border bg-card text-sm"
            >
              <span class="text-muted-foreground">向上滚动加载更多日志</span>
              <div class="flex items-center gap-4 text-xs text-muted-foreground">
                <span>已显示 {{ filteredLogs.length }} 条</span>
                <span v-if="removedCount > 0">已过滤 {{ removedCount }} 条</span>
                <span>隐藏 {{ visibleFrom }} 条</span>
              </div>
            </div>

            <!-- Log List -->
            <div class="flex flex-col">
              <div
                v-for="(line, index) in parsedVisibleLines"
                :key="`${visibleFrom + index}-${line.raw}`"
                :class="[
                  'grid grid-cols-[170px_1fr] gap-4 px-3 py-2.5 border-b border-border/50 border-l-3 border-l-transparent cursor-copy font-mono text-xs leading-relaxed text-foreground hover:bg-primary/5 transition-colors',
                  line.level === 'warn' && 'border-l-yellow-500',
                  (line.level === 'error' || line.level === 'fatal') && 'border-l-destructive'
                ]"
                @dblclick="copyLogLine(line.raw)"
                :title="'双击复制'"
              >
                <!-- Timestamp -->
                <div class="text-muted-foreground whitespace-nowrap pt-0.5">
                  {{ line.timestamp || '' }}
                </div>

                <!-- Main Content -->
                <div class="flex flex-wrap items-baseline gap-1.5 min-w-0">
                  <!-- Level Badge -->
                  <Badge
                    v-if="line.level"
                    :variant="getLogLevelVariant(line.level)"
                    class="text-[10px] font-bold uppercase"
                  >
                    {{ line.level }}
                  </Badge>

                  <!-- Source -->
                  <span
                    v-if="line.source"
                    class="text-muted-foreground text-xs max-w-60 truncate"
                    :title="line.source"
                  >
                    {{ line.source }}
                  </span>

                  <!-- Request ID -->
                  <Badge
                    v-if="line.requestId"
                    variant="outline"
                    class="text-[10px] font-mono text-cyan-600 bg-cyan-50 border-cyan-200"
                    :title="line.requestId"
                  >
                    {{ line.requestId }}
                  </Badge>

                  <!-- Status Code -->
                  <Badge
                    v-if="typeof line.statusCode === 'number'"
                    :variant="getStatusCodeVariant(line.statusCode)"
                    class="text-[10px] font-bold tabular-nums"
                  >
                    {{ line.statusCode }}
                  </Badge>

                  <!-- Latency -->
                  <span
                    v-if="line.latency"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-border bg-card text-muted-foreground"
                  >
                    {{ line.latency }}
                  </span>

                  <!-- IP -->
                  <span
                    v-if="line.ip"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-border bg-card text-muted-foreground"
                  >
                    {{ line.ip }}
                  </span>

                  <!-- HTTP Method -->
                  <Badge
                    v-if="line.method"
                    variant="outline"
                    class="text-[10px] font-bold text-foreground bg-primary/10 border-primary/30"
                  >
                    {{ line.method }}
                  </Badge>

                  <!-- Path -->
                  <span
                    v-if="line.path"
                    class="font-bold text-foreground max-w-[32rem] truncate"
                    :title="line.path"
                  >
                    {{ line.path }}
                  </span>

                  <!-- Message -->
                  <span
                    v-if="line.message"
                    class="text-muted-foreground break-words"
                  >
                    {{ line.message }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty States -->
          <div v-else-if="logs.length > 0" class="flex flex-col items-center justify-center py-12 text-center">
            <Search class="w-12 h-12 text-muted-foreground mb-4" />
            <h3 class="text-lg font-semibold text-foreground mb-2">未找到匹配的日志</h3>
            <p class="text-muted-foreground">尝试调整搜索条件或过滤器</p>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-12 text-center">
            <ScrollText class="w-12 h-12 text-muted-foreground mb-4" />
            <h3 class="text-lg font-semibold text-foreground mb-2">暂无日志</h3>
            <p class="text-muted-foreground">服务器日志将显示在这里</p>
          </div>
        </CardSection>
      </div>

      <!-- Error Logs Tab -->
      <div v-if="activeTab === 'errors'" class="flex flex-col flex-1 min-h-0">
        <CardSection class="flex flex-col flex-1 min-h-0" padding="md">
          <template #actions>
            <Button
              variant="outline"
              size="sm"
              @click="loadErrorLogs"
              :disabled="loadingErrors"
            >
              <RefreshCw class="w-4 h-4 mr-2" />
              刷新
            </Button>
          </template>

          <div class="space-y-4">
            <div class="text-sm text-muted-foreground">
              错误日志文件列表，包含系统运行时产生的错误信息。
            </div>

            <div v-if="requestLogEnabled" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div class="text-sm text-yellow-800">
                请求日志功能已启用，详细的请求日志将保存到文件中。
              </div>
            </div>

            <div v-if="errorLogsError" class="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {{ errorLogsError }}
            </div>

            <!-- Error Logs List -->
            <div class="h-96 overflow-auto border border-border rounded-xl">
              <div v-if="loadingErrors" class="flex items-center justify-center py-12">
                <Loader2 class="w-8 h-8 animate-spin text-primary" />
                <span class="ml-2 text-muted-foreground">加载中...</span>
              </div>

              <div v-else-if="errorLogs.length === 0" class="flex items-center justify-center py-12 text-center">
                <div>
                  <FileText class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p class="text-muted-foreground">暂无错误日志文件</p>
                </div>
              </div>

              <div v-else class="divide-y divide-border">
                <div
                  v-for="item in errorLogs"
                  :key="item.name"
                  class="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-foreground truncate">{{ item.name }}</div>
                    <div class="text-sm text-muted-foreground">
                      <span v-if="item.size">{{ (item.size / 1024).toFixed(1) }} KB</span>
                      <span v-if="item.size && item.modified"> • </span>
                      <span v-if="item.modified">{{ formatUnixTimestamp(item.modified) }}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="downloadErrorLog(item.name)"
                  >
                    <Download class="w-4 h-4 mr-2" />
                    下载
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardSection>
      </div>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, watchEffect, nextTick } from 'vue'
import { apiClient } from '@/api/client'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import PageContainer from '@/components/layout/PageContainer.vue'
import CardSection from '@/components/layout/CardSection.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import Input from '@/components/ui/input.vue'
import {
  ScrollText,
  Trash2,
  Loader2,
  Search,
  X,
  EyeOff,
  RefreshCw,
  Timer,
  Download,
  FileText,
} from 'lucide-vue-next'
import { formatTime as formatTimeUtil } from '@/utils/format'

// Types
interface LogResponse {
  lines: string[]
  'line-count': number
  'latest-timestamp': number
}

interface ErrorLogItem {
  name: string
  size?: number
  modified?: number
}

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'
type TabType = 'logs' | 'errors'

interface ParsedLogLine {
  raw: string
  timestamp?: string
  level?: LogLevel
  source?: string
  requestId?: string
  statusCode?: number
  latency?: string
  ip?: string
  method?: HttpMethod
  path?: string
  message: string
}

interface LogState {
  buffer: string[]
  visibleFrom: number
}

// Constants
const INITIAL_DISPLAY_LINES = 100
const LOAD_MORE_LINES = 200
const MAX_BUFFER_LINES = 10000
const LOAD_MORE_THRESHOLD_PX = 72
const MANAGEMENT_API_PREFIX = '/v0/management/'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const
const HTTP_METHOD_REGEX = new RegExp(`\\b(${HTTP_METHODS.join('|')})\\b`)

const LOG_TIMESTAMP_REGEX = /^\[?(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)\]?/
const LOG_LEVEL_REGEX = /^\[?(trace|debug|info|warn|warning|error|fatal)\s*\]?(?=\s|\[|$)\s*/i
const LOG_SOURCE_REGEX = /^\[([^\]]+)\]/
const LOG_LATENCY_REGEX = /\b(?:\d+(?:\.\d+)?\s*(?:µs|us|ms|s|m))(?:\s*\d+(?:\.\d+)?\s*(?:µs|us|ms|s|m))*\b/i
const LOG_IPV4_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/
const LOG_IPV6_REGEX = /\b(?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}\b/i
const LOG_REQUEST_ID_REGEX = /^([a-f0-9]{8}|--------)$/i
const LOG_TIME_OF_DAY_REGEX = /^\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?$/

const HTTP_STATUS_PATTERNS: RegExp[] = [
  /\|\s*([1-5]\d{2})\s*\|/,
  /\b([1-5]\d{2})\s*-/,
  new RegExp(`\\b(?:${HTTP_METHODS.join('|')})\\s+\\S+\\s+([1-5]\\d{2})\\b`),
  /\b(?:status|code|http)[:\s]+([1-5]\d{2})\b/i,
  /\b([1-5]\d{2})\s+(?:OK|Created|Accepted|No Content|Moved|Found|Bad Request|Unauthorized|Forbidden|Not Found|Method Not Allowed|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)\b/i,
]

const { toast } = useToast()
const { confirmDanger } = useConfirm()

// State
const activeTab = ref<TabType>('logs')
const logState = ref<LogState>({ buffer: [], visibleFrom: 0 })
const loading = ref(true)
const error = ref('')
const autoRefresh = ref(false)
const searchQuery = ref('')
const deferredSearchQuery = computed(() => searchQuery.value)
const hideManagementLogs = ref(true)
const errorLogs = ref<ErrorLogItem[]>([])
const loadingErrors = ref(false)
const errorLogsError = ref('')
const requestLogEnabled = ref(false)

const logViewerRef = ref<HTMLDivElement | null>(null)
const pendingScrollToBottomRef = ref(false)
const pendingPrependScrollRef = ref<{ scrollHeight: number; scrollTop: number } | null>(null)
const latestTimestampRef = ref<number>(0)

let refreshInterval: number | null = null

// Utility functions
const detectHttpStatusCode = (text: string): number | undefined => {
  for (const pattern of HTTP_STATUS_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue
    const code = Number.parseInt(match[1], 10)
    if (!Number.isFinite(code)) continue
    if (code >= 100 && code <= 599) return code
  }
  return undefined
}

const extractIp = (text: string): string | undefined => {
  const ipv4Match = text.match(LOG_IPV4_REGEX)
  if (ipv4Match) return ipv4Match[0]

  const ipv6Match = text.match(LOG_IPV6_REGEX)
  if (!ipv6Match) return undefined

  const candidate = ipv6Match[0]
  if (LOG_TIME_OF_DAY_REGEX.test(candidate)) return undefined
  if (!candidate.includes('::') && candidate.split(':').length !== 8) return undefined

  return candidate
}

const extractLatency = (text: string): string | undefined => {
  const match = text.match(LOG_LATENCY_REGEX)
  if (!match) return undefined
  return match[0].replace(/\s+/g, '')
}

const extractLogLevel = (value: string): LogLevel | undefined => {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'warning') return 'warn'
  if (normalized === 'warn') return 'warn'
  if (normalized === 'info') return 'info'
  if (normalized === 'error') return 'error'
  if (normalized === 'fatal') return 'fatal'
  if (normalized === 'debug') return 'debug'
  if (normalized === 'trace') return 'trace'
  return undefined
}

const inferLogLevel = (line: string): LogLevel | undefined => {
  const lowered = line.toLowerCase()
  if (/\bfatal\b/.test(lowered)) return 'fatal'
  if (/\berror\b/.test(lowered)) return 'error'
  if (/\bwarn(?:ing)?\b/.test(lowered) || line.includes('警告')) return 'warn'
  if (/\binfo\b/.test(lowered)) return 'info'
  if (/\bdebug\b/.test(lowered)) return 'debug'
  if (/\btrace\b/.test(lowered)) return 'trace'
  return undefined
}

const extractHttpMethodAndPath = (text: string): { method?: HttpMethod; path?: string } => {
  const match = text.match(HTTP_METHOD_REGEX)
  if (!match) return {}

  const method = match[1] as HttpMethod
  const index = match.index ?? 0
  const after = text.slice(index + match[0].length).trim()
  const path = after ? after.split(/\s+/)[0] : undefined
  return { method, path }
}

const parseLogLine = (raw: string): ParsedLogLine => {
  let remaining = raw.trim()

  let timestamp: string | undefined
  const tsMatch = remaining.match(LOG_TIMESTAMP_REGEX)
  if (tsMatch) {
    timestamp = tsMatch[1]
    remaining = remaining.slice(tsMatch[0].length).trim()
  }

  let requestId: string | undefined
  const requestIdMatch = remaining.match(/^\[([a-f0-9]{8}|--------)\]\s*/i)
  if (requestIdMatch) {
    const id = requestIdMatch[1]
    if (!/^-+$/.test(id)) {
      requestId = id
    }
    remaining = remaining.slice(requestIdMatch[0].length).trim()
  }

  let level: LogLevel | undefined
  const lvlMatch = remaining.match(LOG_LEVEL_REGEX)
  if (lvlMatch) {
    level = extractLogLevel(lvlMatch[1])
    remaining = remaining.slice(lvlMatch[0].length).trim()
  }

  let source: string | undefined
  const sourceMatch = remaining.match(LOG_SOURCE_REGEX)
  if (sourceMatch) {
    source = sourceMatch[1]
    remaining = remaining.slice(sourceMatch[0].length).trim()
  }

  let statusCode: number | undefined
  let latency: string | undefined
  let ip: string | undefined
  let method: HttpMethod | undefined
  let path: string | undefined
  let message = remaining

  if (remaining.includes('|')) {
    const segments = remaining
      .split('|')
      .map((segment) => segment.trim())
      .filter(Boolean)
    const consumed = new Set<number>()

    // Parse various segments
    const statusIndex = segments.findIndex((segment) => /^\d{3}$/.test(segment))
    if (statusIndex >= 0) {
      const code = Number.parseInt(segments[statusIndex], 10)
      if (code >= 100 && code <= 599) {
        statusCode = code
        consumed.add(statusIndex)
      }
    }

    const latencyIndex = segments.findIndex((segment) => LOG_LATENCY_REGEX.test(segment))
    if (latencyIndex >= 0) {
      const extracted = extractLatency(segments[latencyIndex])
      if (extracted) {
        latency = extracted
        consumed.add(latencyIndex)
      }
    }

    const ipIndex = segments.findIndex((segment) => Boolean(extractIp(segment)))
    if (ipIndex >= 0) {
      const extracted = extractIp(segments[ipIndex])
      if (extracted) {
        ip = extracted
        consumed.add(ipIndex)
      }
    }

    const methodIndex = segments.findIndex((segment) => {
      const { method: parsedMethod } = extractHttpMethodAndPath(segment)
      return Boolean(parsedMethod)
    })
    if (methodIndex >= 0) {
      const parsed = extractHttpMethodAndPath(segments[methodIndex])
      method = parsed.method
      path = parsed.path
      consumed.add(methodIndex)
    }

    message = segments.filter((_, index) => !consumed.has(index)).join(' | ')
  } else {
    statusCode = detectHttpStatusCode(remaining)
    const extracted = extractLatency(remaining)
    if (extracted) latency = extracted
    ip = extractIp(remaining)
    const parsed = extractHttpMethodAndPath(remaining)
    method = parsed.method
    path = parsed.path
  }

  if (!level) level = inferLogLevel(raw)

  return {
    raw,
    timestamp,
    level,
    source,
    requestId,
    statusCode,
    latency,
    ip,
    method,
    path,
    message,
  }
}

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (typeof err !== 'object' || err === null) return ''
  if (!('message' in err)) return ''

  const message = (err as { message?: unknown }).message
  return typeof message === 'string' ? message : ''
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      textarea.style.left = '-9999px'
      textarea.style.top = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      return ok
    } catch {
      return false
    }
  }
}

const formatUnixTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString()
}

// Computed
const isNearBottom = (node: HTMLDivElement | null) => {
  if (!node) return true
  const threshold = 24
  return node.scrollHeight - node.scrollTop - node.clientHeight <= threshold
}

const visibleLines = computed(() => logState.value.buffer.slice(logState.value.visibleFrom))

const trimmedSearchQuery = computed(() => deferredSearchQuery.value.trim())
const isSearching = computed(() => trimmedSearchQuery.value.length > 0)
const baseLines = computed(() => isSearching.value ? logState.value.buffer : visibleLines.value)

const filteredLogsData = computed(() => {
  let working = baseLines.value
  let removed = 0

  if (hideManagementLogs.value) {
    const next: string[] = []
    for (const line of working) {
      if (line.includes(MANAGEMENT_API_PREFIX)) {
        removed += 1
      } else {
        next.push(line)
      }
    }
    working = next
  }

  if (trimmedSearchQuery.value) {
    const queryLowered = trimmedSearchQuery.value.toLowerCase()
    const next: string[] = []
    for (const line of working) {
      if (line.toLowerCase().includes(queryLowered)) {
        next.push(line)
      } else {
        removed += 1
      }
    }
    working = next
  }

  return { filteredLogs: working, removedCount: removed }
})

const filteredLogs = computed(() => filteredLogsData.value.filteredLogs)
const removedCount = computed(() => filteredLogsData.value.removedCount)

const parsedVisibleLines = computed(() => filteredLogs.value.map((line) => parseLogLine(line)))

const canLoadMore = computed(() => !isSearching.value && logState.value.visibleFrom > 0)

const visibleFrom = computed(() => logState.value.visibleFrom)

const logs = computed(() => logState.value.buffer)

// Methods
function getLogLevelVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' {
  switch (level.toLowerCase()) {
    case 'error':
    case 'fatal':
      return 'destructive'
    case 'warn':
      return 'warning'
    case 'info':
      return 'default'
    default:
      return 'secondary'
  }
}

function getStatusCodeVariant(statusCode: number): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  if (statusCode >= 200 && statusCode < 300) return 'success'
  if (statusCode >= 300 && statusCode < 400) return 'default'
  if (statusCode >= 400 && statusCode < 500) return 'warning'
  return 'destructive'
}

const scrollToBottom = () => {
  const node = logViewerRef.value
  if (!node) return
  node.scrollTop = node.scrollHeight
}

async function fetchLogs(incremental = false) {
  if (!incremental) {
    loading.value = true
  }
  error.value = ''

  try {
    pendingScrollToBottomRef.value = !incremental || isNearBottom(logViewerRef.value)

    const params = incremental && latestTimestampRef.value > 0 ? { after: latestTimestampRef.value } : {}
    const data = await apiClient.get<LogResponse>('/logs', { params })

    if (data?.['latest-timestamp']) {
      latestTimestampRef.value = data['latest-timestamp']
    }

    const newLines = Array.isArray(data?.lines) ? data.lines : []

    if (incremental && newLines.length > 0) {
      const prev = logState.value
      const prevRenderedCount = prev.buffer.length - prev.visibleFrom
      const combined = [...prev.buffer, ...newLines]
      const dropCount = Math.max(combined.length - MAX_BUFFER_LINES, 0)
      const buffer = dropCount > 0 ? combined.slice(dropCount) : combined
      let visibleFrom = Math.max(prev.visibleFrom - dropCount, 0)

      if (pendingScrollToBottomRef.value) {
        visibleFrom = Math.max(buffer.length - prevRenderedCount, 0)
      }

      logState.value = { buffer, visibleFrom }
    } else if (!incremental) {
      const buffer = newLines.slice(-MAX_BUFFER_LINES)
      const visibleFrom = Math.max(buffer.length - INITIAL_DISPLAY_LINES, 0)
      logState.value = { buffer, visibleFrom }
    }
  } catch (err: unknown) {
    console.error('Failed to load logs:', err)
    if (!incremental) {
      error.value = getErrorMessage(err) || '加载日志失败'
    }
  } finally {
    if (!incremental) {
      loading.value = false
    }
  }
}

async function clearLogs() {
  if (!await confirmDanger('确定要清空所有日志吗？')) return
  try {
    await apiClient.delete('/logs')
    logState.value = { buffer: [], visibleFrom: 0 }
    latestTimestampRef.value = 0
    toast({ title: '日志已清空' })
  } catch (err: unknown) {
    const message = getErrorMessage(err)
    toast({ 
      title: `清空日志失败${message ? `: ${message}` : ''}`, 
      variant: 'destructive' 
    })
  }
}

function downloadLogs() {
  const text = logState.value.buffer.join('\n')
  const blob = new Blob([text], { type: 'text/plain' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'logs.txt'
  a.click()
  window.URL.revokeObjectURL(url)
  toast({ title: '日志下载成功' })
}

async function loadErrorLogs() {
  loadingErrors.value = true
  errorLogsError.value = ''
  try {
    const res = await apiClient.get<{ files: ErrorLogItem[] }>('/logs/errors')
    errorLogs.value = Array.isArray(res?.files) ? res.files : []
  } catch (err: unknown) {
    console.error('Failed to load error logs:', err)
    errorLogs.value = []
    const message = getErrorMessage(err)
    errorLogsError.value = message ? `加载错误日志失败: ${message}` : '加载错误日志失败'
  } finally {
    loadingErrors.value = false
  }
}

async function downloadErrorLog(name: string) {
  try {
    const response = await apiClient.get(`/logs/errors/${name}`, { responseType: 'blob' })
    const blob = new Blob([response.data], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    window.URL.revokeObjectURL(url)
    toast({ title: '错误日志下载成功' })
  } catch (err: unknown) {
    const message = getErrorMessage(err)
    toast({ 
      title: `下载失败${message ? `: ${message}` : ''}`, 
      variant: 'destructive' 
    })
  }
}

async function copyLogLine(raw: string) {
  const ok = await copyToClipboard(raw)
  if (ok) {
    toast({ title: '已复制到剪贴板' })
  } else {
    toast({ title: '复制失败', variant: 'destructive' })
  }
}

function handleLogScroll() {
  const node = logViewerRef.value
  if (!node) return
  if (isSearching.value) return
  if (!canLoadMore.value) return
  if (pendingPrependScrollRef.value) return
  if (node.scrollTop > LOAD_MORE_THRESHOLD_PX) return

  pendingPrependScrollRef.value = {
    scrollHeight: node.scrollHeight,
    scrollTop: node.scrollTop,
  }
  logState.value = {
    ...logState.value,
    visibleFrom: Math.max(logState.value.visibleFrom - LOAD_MORE_LINES, 0),
  }
}

// Watchers
watch(autoRefresh, (enabled) => {
  if (enabled) {
    refreshInterval = window.setInterval(() => fetchLogs(true), 8000)
  } else if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})

watch(activeTab, (tab) => {
  if (tab === 'errors') {
    loadErrorLogs()
  }
})

watchEffect(() => {
  if (!pendingScrollToBottomRef.value) return
  if (loading.value) return
  if (!logViewerRef.value) return

  nextTick(() => {
    scrollToBottom()
    pendingScrollToBottomRef.value = false
  })
})

watchEffect(() => {
  const node = logViewerRef.value
  const pending = pendingPrependScrollRef.value
  if (!node || !pending) return

  nextTick(() => {
    const delta = node.scrollHeight - pending.scrollHeight
    node.scrollTop = pending.scrollTop + delta
    pendingPrependScrollRef.value = null
  })
})

// Lifecycle
onMounted(() => {
  fetchLogs(false)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
