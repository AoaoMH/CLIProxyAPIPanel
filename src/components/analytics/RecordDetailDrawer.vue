<template>
  <Drawer
    :open="!!record"
    title="请求详情"
    :description="`ID: ${record?.request_id || ''}`"
    size="xl"
    @update:open="$emit('close')"
  >
    <div v-if="internalLoading || props.loading" class="flex items-center justify-center h-64">
      <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
    </div>

    <div v-else-if="error" class="p-6">
      <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
        <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      </div>
    </div>

    <div v-else-if="record" class="space-y-6">
      <!-- Status Banner -->
      <div 
        class="p-4 rounded-lg border flex items-center gap-3"
        :class="record.status_code === 0
          ? 'bg-slate-50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800/30'
          : record.status_code >= 200 && record.status_code < 300 
            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' 
            : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'"
      >
        <div 
          class="w-2 h-2 rounded-full"
          :class="record.status_code === 0 ? 'bg-blue-500' : (record.status_code >= 200 && record.status_code < 300 ? 'bg-green-500' : 'bg-red-500')"
        />
        <div class="flex-1">
          <div
            class="font-medium"
            :class="record.status_code === 0
              ? 'text-slate-700 dark:text-slate-200'
              : (record.status_code >= 200 && record.status_code < 300 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300')"
          >
            {{ record.status_code === 0 ? '进行中' : `${record.status_code} ${record.status_code >= 200 && record.status_code < 300 ? '成功' : '失败'}` }}
          </div>
          <div class="text-xs opacity-80 mt-0.5">
            {{ formatTimestamp(record.timestamp) }}
          </div>
        </div>
        <div class="text-right">
          <div class="font-mono font-bold">{{ displayDurationMs }}ms</div>
          <div class="text-xs opacity-80">耗时</div>
        </div>
      </div>

      <!-- Meta Info -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <div class="text-xs text-muted-foreground uppercase tracking-wider">模型</div>
          <div class="font-medium font-mono text-sm bg-muted/50 p-2 rounded border border-border/50 break-all">
            {{ record.model }}
          </div>
        </div>
        <div class="space-y-1">
          <div class="text-xs text-muted-foreground uppercase tracking-wider">提供商</div>
          <div class="font-medium font-mono text-sm bg-muted/50 p-2 rounded border border-border/50 capitalize">
            {{ record.provider }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-1">
          <div class="text-xs text-muted-foreground uppercase tracking-wider">Tokens</div>
          <div class="font-mono text-sm p-1">{{ record.total_tokens }}</div>
        </div>
        <div class="space-y-1">
          <div class="text-xs text-muted-foreground uppercase tracking-wider">输入/输出</div>
          <div class="font-mono text-sm p-1">{{ record.input_tokens }} / {{ record.output_tokens }}</div>
        </div>
        <div class="space-y-1">
          <div class="text-xs text-muted-foreground uppercase tracking-wider">IP</div>
          <div class="font-mono text-sm p-1">{{ record.ip || '-' }}</div>
        </div>
      </div>

      <!-- API Key Info with Eye Button -->
      <div class="space-y-1">
        <div class="text-xs text-muted-foreground uppercase tracking-wider">API密钥</div>
        <div class="flex items-center gap-2">
          <div class="font-mono text-sm bg-muted/50 p-2 rounded border border-border/50 flex-1">
            {{ showFullApiKey ? record.api_key : record.api_key_masked }}
          </div>
          <button
            @click="toggleApiKeyVisibility"
            class="p-2 rounded border border-border/50 bg-muted/50 hover:bg-muted transition-colors"
            :title="showFullApiKey ? '隐藏完整密钥' : '显示完整密钥'"
          >
            <Eye v-if="!showFullApiKey" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Request Info -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <div class="text-xs text-muted-foreground uppercase tracking-wider">请求方法</div>
          <div class="font-mono text-sm bg-muted/50 p-2 rounded border border-border/50">
            {{ record.request_method }}
          </div>
        </div>
        <div class="space-y-1">
          <div class="text-xs text-muted-foreground uppercase tracking-wider">请求类型</div>
          <div class="font-mono text-sm bg-muted/50 p-2 rounded border border-border/50">
            {{ record.is_streaming ? '流式' : '标准' }}
          </div>
        </div>
      </div>

      <!-- Request URL -->
      <div class="space-y-1">
        <div class="text-xs text-muted-foreground uppercase tracking-wider">请求URL</div>
        <div class="font-mono text-sm bg-muted/50 p-2 rounded border border-border/50 break-all">
          {{ record.request_url }}
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="!record.success" class="space-y-2">
        <div class="text-xs text-muted-foreground uppercase tracking-wider">请求失败</div>
        <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 font-mono break-all">
          HTTP {{ record.status_code }}
        </div>
      </div>

      <!-- Request Timeline -->
      <RequestTimeline 
        v-if="record.id"
        :request-id="record.id"
        :override-status-code="record.status_code"
      />

      <!-- Tabs for Request/Response Content -->
      <div class="bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
        <div class="p-4">
          <!-- Tab Headers with Controls -->
          <div class="flex items-center justify-between border-b pb-2 mb-3">
            <div class="flex items-center">
              <button
                v-for="tab in availableTabs"
                :key="tab.key"
                @click="activeTab = tab.key"
                class="px-3 py-1.5 text-sm transition-colors border-b-2 -mb-[9px]"
                :class="activeTab === tab.key
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'"
              >
                {{ tab.label }}
              </button>
            </div>
            
            <!-- Control Buttons -->
            <div class="flex items-center gap-0.5">
              <!-- Expand/Collapse -->
              <button
                @click="currentExpandDepth === 0 ? expandAll() : collapseAll()"
                :title="currentExpandDepth === 0 ? '展开全部' : '收缩全部'"
                class="p-1.5 rounded transition-colors text-muted-foreground hover:bg-muted"
              >
                <Maximize2 v-if="currentExpandDepth === 0" class="w-4 h-4" />
                <Minimize2 v-else class="w-4 h-4" />
              </button>
              
              <!-- Copy -->
              <button
                @click="copyCurrentTabContent"
                :title="copiedStates[activeTab] ? '已复制' : '复制'"
                class="p-1.5 rounded transition-colors text-muted-foreground hover:bg-muted"
              >
                <Check v-if="copiedStates[activeTab]" class="w-4 h-4 text-green-500" />
                <Copy v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Tab Content -->
          <div class="tab-content">
            <ContentFormatter
              v-if="activeTab === 'request-headers'"
              :data="record.request_headers"
              :expand-depth="currentExpandDepth"
              :is-dark="isDark"
              empty-message="无请求头信息"
            />
            
            <ContentFormatter
              v-else-if="activeTab === 'request-body'"
              :data="record.request_body"
              :expand-depth="currentExpandDepth"
              :is-dark="isDark"
              empty-message="无请求体信息"
            />
            
            <ContentFormatter
              v-else-if="activeTab === 'response-headers'"
              :data="record.response_headers"
              :expand-depth="currentExpandDepth"
              :is-dark="isDark"
              empty-message="无响应头信息"
            />
            
            <ContentFormatter
              v-else-if="activeTab === 'response-body'"
              :data="record.response_body"
              :expand-depth="currentExpandDepth"
              :is-dark="isDark"
              empty-message="无响应体信息"
            />
          </div>
        </div>
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Drawer } from '../ui/drawer'
import { Loader2, Eye, EyeOff, Maximize2, Minimize2, Copy, Check } from 'lucide-vue-next'
import { usageRecordsApi, type UsageRecord, type RequestCandidate } from '../../api/usageRecords'
import { ContentFormatter, RequestTimeline } from '../analytics'

interface RequestTrace {
  provider: string
  api_key_masked: string
  status_code: number
  success: boolean
  duration_ms: number
  error_message?: string
}

const props = defineProps<{
  record: UsageRecord | null
  requestTrace?: RequestTrace[]
  loading?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

// State
const internalLoading = ref(false)
const error = ref<string | null>(null)
const showFullApiKey = ref(false)
const activeTab = ref('request-body')
const currentExpandDepth = ref(1)
const copiedStates = ref<Record<string, boolean>>({})

const nowMs = ref(Date.now())
let nowTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  nowTimer = setInterval(() => {
    nowMs.value = Date.now()
  }, 200)
})

onUnmounted(() => {
  if (nowTimer) {
    clearInterval(nowTimer)
    nowTimer = null
  }
})

const displayDurationMs = computed(() => {
  const r = props.record
  if (!r) return 0
  if (r.status_code === 0) {
    const t = Date.parse(r.timestamp)
    if (Number.isFinite(t)) {
      return Math.max(0, nowMs.value - t)
    }
    return 0
  }
  return r.duration_ms ?? 0
})

// Computed
const isDark = computed(() => {
  return document.documentElement.classList.contains('dark')
})

const availableTabs = computed(() => {
  if (!props.record) return []
  
  const tabs = []
  
  if (props.record.request_headers && Object.keys(props.record.request_headers).length > 0) {
    tabs.push({ key: 'request-headers', label: '请求头' })
  }
  
  if (props.record.request_body) {
    tabs.push({ key: 'request-body', label: '请求体' })
  }
  
  if (props.record.response_headers && Object.keys(props.record.response_headers).length > 0) {
    tabs.push({ key: 'response-headers', label: '响应头' })
  }
  
  if (props.record.response_body) {
    tabs.push({ key: 'response-body', label: '响应体' })
  }
  
  return tabs
})

// Watch for record changes to set default tab
watch(() => props.record, (newRecord) => {
  if (newRecord && availableTabs.value.length > 0) {
    // Default to request-body if available, otherwise first available tab
    const hasRequestBody = availableTabs.value.some(tab => tab.key === 'request-body')
    activeTab.value = hasRequestBody ? 'request-body' : availableTabs.value[0].key
  }
}, { immediate: true })

// Methods
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const toggleApiKeyVisibility = () => {
  showFullApiKey.value = !showFullApiKey.value
}

const expandAll = () => {
  currentExpandDepth.value = 999
}

const collapseAll = () => {
  currentExpandDepth.value = 0
}

const copyCurrentTabContent = async () => {
  if (!props.record) return
  
  let data: any = null
  
  switch (activeTab.value) {
    case 'request-headers':
      data = props.record.request_headers
      break
    case 'request-body':
      data = props.record.request_body
      break
    case 'response-headers':
      data = props.record.response_headers
      break
    case 'response-body':
      data = props.record.response_body
      break
  }
  
  if (data) {
    try {
      const textToCopy = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      await navigator.clipboard.writeText(textToCopy)
      
      copiedStates.value[activeTab.value] = true
      setTimeout(() => {
        copiedStates.value[activeTab.value] = false
      }, 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }
}
</script>
