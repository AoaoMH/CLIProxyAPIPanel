<template>
  <div
    class="group relative flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20"
    :class="[
      themeClasses.bg,
      themeClasses.border
    ]"
  >
    <!-- Header -->
    <div>
      <div class="flex items-start gap-3">
        <!-- Type Badge -->
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm"
          :style="{ backgroundColor: typeColor.bg, color: typeColor.text }"
        >
          <component :is="getIconForType(file.type)" class="h-5 w-5" />
        </div>
        
        <!-- File Info - Two Rows -->
        <div class="min-w-0 flex-1">
          <!-- First Row: File Name -->
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-semibold text-foreground truncate" :title="file.name">
              {{ file.name }}
            </h3>
            <span
              v-if="codexPlanLabel"
              class="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
              :class="codexPlanBadgeClass"
              title="Codex 套餐类型"
            >
              套餐: {{ codexPlanLabel }}
            </span>
            <span v-if="file.disabled" class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 shrink-0">
              已禁用
            </span>
          </div>
          
          <!-- Second Row: Size, Date and Action Buttons -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{{ formatFileSize(file.size) }}</span>
              <span class="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
              <span>{{ formatDate(file.modified ?? file.modtime ?? file.updated_at ?? file.created_at) }}</span>
            </div>
            
            <div class="flex items-center gap-2 shrink-0">
              <div v-if="canToggleDisabled" class="flex items-center gap-1">
                <Switch
                  class="scale-90 origin-right"
                  :model-value="!isDisabled"
                  :disabled="toggling"
                  :title="isDisabled ? '启用凭证' : '禁用凭证'"
                  @update:model-value="onToggleEnabled"
                />
              </div>

              <!-- Actions Buttons -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Button v-if="showQuota" variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-110 transition-all duration-200" aria-label="支持模型" title="支持模型" @click="$emit('show-models')">
                  <Bot class="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:scale-110 transition-all duration-200" aria-label="凭证信息" title="凭证信息" @click="$emit('show-info')">
                  <Info class="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:scale-110 transition-all duration-200" aria-label="下载" @click="$emit('download', file.name)">
                  <Download class="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-110 transition-all duration-200" aria-label="删除" @click="$emit('delete', file.name)">
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success/Failure + Recent status bar -->
    <div v-if="hasStats" class="mb-4 space-y-2">
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="inline-flex items-center rounded-full px-2 py-0.5 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
          成功: {{ fileStats.success }}
        </span>
        <span class="inline-flex items-center rounded-full px-2 py-0.5 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          失败: {{ fileStats.failure }}
        </span>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex h-1.5 flex-1 gap-0.5 overflow-hidden rounded-full bg-muted/30" title="最近24小时（每格=30分钟；颜色按异常率分级）">
          <div
            v-for="(stat, i) in statusBarBlocks"
            :key="i"
            class="h-full flex-1 rounded-sm transition-colors duration-300"
            :class="{
              'bg-green-500': stat === 'success',
              'bg-red-500': stat === 'failure',
              'bg-yellow-500': stat === 'mixed',
              'bg-gray-200 dark:bg-gray-700': stat === 'idle'
            }"
          ></div>
        </div>
        <span class="text-xs font-medium tabular-nums" :class="statusRateColor" title="最近24小时异常率">{{ statusRateText }}</span>
      </div>
    </div>

    <!-- Quota Section -->
    <div v-if="showQuota" class="flex-1 flex flex-col pt-4 border-t border-border/50 mt-4">
      <div class="flex items-center justify-between mb-4">
        <span class="text-xs font-medium text-muted-foreground">配额使用情况</span>
        <Button 
          variant="ghost" 
          size="sm" 
          class="h-6 px-2 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary hover:scale-105 transition-all duration-200 p-0"
          :disabled="loading"
          aria-label="刷新配额"
          @click="loadQuota"
        >
          <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': loading }" />
          {{ loading ? '加载中...' : '刷新' }}
        </Button>
      </div>

      <!-- Error State -->
      <div v-if="quotaState?.status === 'error'" class="flex-1 flex items-center justify-center">
        <div class="w-full rounded bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-600 dark:text-red-400 text-center">
          {{ quotaState.error || '配额加载失败' }}
        </div>
      </div>

      <!-- Antigravity Quota -->
      <div v-else-if="file.type === 'antigravity' && quotaState?.status === 'success'" class="space-y-3">
        <div v-for="group in quotaState.groups" :key="group.id">
           <div class="flex justify-between text-xs mb-1">
             <span class="text-foreground/80">{{ group.label }}</span>
             <div class="flex items-center gap-2">
               <span class="font-mono">{{ (group.remainingFraction * 100).toFixed(0) }}%</span>
               <span v-if="group.resetTime" class="text-[10px] text-muted-foreground">{{ formatQuotaResetTime(group.resetTime) }}</span>
             </div>
           </div>
           <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
             <div 
               class="h-full transition-all duration-500 rounded-full"
               :class="getProgressColor(group.remainingFraction)"
               :style="{ width: `${group.remainingFraction * 100}%` }"
             ></div>
           </div>
        </div>
        <div v-if="quotaState.groups.length === 0" class="text-xs text-muted-foreground text-center py-2">
          暂无配额信息
        </div>
      </div>

      <!-- Codex Quota -->
      <div v-else-if="file.type === 'codex' && quotaState?.status === 'success'" class="space-y-3">
        <div v-for="win in quotaState.windows" :key="win.id">
           <div class="flex justify-between text-xs mb-1">
             <span class="text-foreground/80">{{ win.label }}</span>
             <div class="flex items-center gap-2">
               <span class="font-mono">{{ win.usedPercent !== null ? (100 - win.usedPercent).toFixed(1) + '%' : 'N/A' }}</span>
               <span v-if="win.resetLabel" class="text-[10px] text-muted-foreground">{{ win.resetLabel }}</span>
             </div>
           </div>
           <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
             <!-- Show remaining quota (100 - used), green = full -->
             <div 
               class="h-full transition-all duration-500 rounded-full"
               :class="getProgressColor((100 - (win.usedPercent || 0)) / 100)"
               :style="{ width: `${Math.max(100 - (win.usedPercent || 0), 0)}%` }"
             ></div>
           </div>
        </div>
      </div>

      <!-- Gemini CLI Quota -->
      <div v-else-if="file.type === 'gemini-cli' && quotaState?.status === 'success'" class="space-y-3">
         <div v-for="bucket in quotaState.buckets" :key="bucket.id">
           <div class="flex justify-between text-xs mb-1">
             <span class="text-foreground/80">{{ bucket.label }}</span>
             <div class="flex items-center gap-2">
               <span class="font-mono">{{ bucket.remainingFraction !== null ? (bucket.remainingFraction * 100).toFixed(0) + '%' : 'N/A' }}</span>
               <span v-if="bucket.resetTime" class="text-[10px] text-muted-foreground">{{ formatQuotaResetTime(bucket.resetTime) }}</span>
             </div>
           </div>
           <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
             <div 
               v-if="bucket.remainingFraction !== null"
               class="h-full transition-all duration-500 rounded-full"
               :class="getProgressColor(bucket.remainingFraction)"
               :style="{ width: `${bucket.remainingFraction * 100}%` }"
             ></div>
           </div>
        </div>
      </div>

      <!-- Default / Idle State -->
      <div v-else-if="!loading && quotaState?.status === 'idle'" class="flex-1 flex items-center justify-center text-xs text-muted-foreground py-8">
        点击刷新加载配额
      </div>
    </div>
    
    <!-- No Quota support -->
    <div v-else class="mt-auto pt-4 border-t border-border/50 text-xs text-muted-foreground text-center py-1">
      此类型不支持配额查询
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits, inject, watch, onMounted, type Ref } from 'vue'
import { 
  FileJson, 
  Download, 
  Trash2, 
  RefreshCw, 
  Code, 
  Cpu, 
  Box, 
  Zap,
  Bot,
  Info
} from 'lucide-vue-next'
import Button from '@/components/ui/button.vue'
import Switch from '@/components/ui/switch.vue'
import type { AuthFileItem, AntigravityQuotaState, CodexQuotaState, GeminiCliQuotaState } from '@/types'
import { TYPE_COLORS, formatQuotaResetTime, resolveCodexPlanType } from '@/utils/quota'
import { useQuota } from '@/composables/useQuota'
import { useAuthStatsStore } from '@/stores/authStats'
import { formatUnixTimestamp, formatDateOnly } from '@/utils/format'

const props = defineProps<{
  file: AuthFileItem
  toggling?: boolean
}>()

const emit = defineEmits<{
  (e: 'download', name: string): void
  (e: 'delete', name: string): void
  (e: 'show-models'): void
  (e: 'show-info'): void
  (e: 'toggle-disabled', payload: { file: AuthFileItem; disabled: boolean }): void
}>()

const { quotaState, loading, loadQuota, resetQuota } = useQuota(props.file)

const codexPlanType = computed(() => {
  const provider = (props.file.type || '').toString().toLowerCase()
  if (provider !== 'codex') return null

  const fromQuota = (quotaState.value as Partial<CodexQuotaState> | null | undefined)?.planType
  const candidate = typeof fromQuota === 'string' ? fromQuota : resolveCodexPlanType(props.file)
  if (typeof candidate !== 'string') return null
  const trimmed = candidate.trim().toLowerCase()
  return trimmed || null
})

const codexPlanLabel = computed(() => {
  const plan = codexPlanType.value
  if (!plan) return null
  if (plan === 'plus') return 'Plus'
  if (plan === 'team') return 'Team'
  if (plan === 'free') return 'Free'
  return plan
})

const codexPlanBadgeClass = computed(() => {
  const plan = codexPlanType.value
  if (!plan) return ''
  if (plan === 'free') return 'bg-muted text-muted-foreground'
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
})

const isDisabled = computed(() => Boolean(props.file.disabled))
const toggling = computed(() => Boolean(props.toggling))
const canToggleDisabled = computed(() => {
  const raw = props.file.runtimeOnly ?? props.file.runtime_only
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase()
    return !(v === '1' || v === 'true' || v === 'yes' || v === 'on')
  }
  return !Boolean(raw)
})

function onToggleEnabled(enabled: boolean) {
  emit('toggle-disabled', { file: props.file, disabled: !enabled })
}

// Subscribe to batch refresh trigger from parent
const refreshTrigger = inject<Ref<Set<string>>>('quotaRefreshTrigger', undefined)

if (refreshTrigger) {
  watch(refreshTrigger, (newTrigger) => {
    if (newTrigger && newTrigger.size > 0 && newTrigger.has(props.file.name)) {
      loadQuota()
    }
  })
}

// Helper: Format file size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '未知大小'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Helper: Format date (handles Unix timestamp in milliseconds or seconds, or ISO string)
const formatDate = (dateValue?: number | string) => {
  if (!dateValue) return ''
  if (typeof dateValue === 'number') {
    return formatUnixTimestamp(dateValue) || ''
  }
  return formatDateOnly(dateValue) || ''
}

// Theme colors
const typeColor = computed(() => {
  const type = (props.file.type || 'default').toLowerCase()
  const colorSet = TYPE_COLORS[type] || TYPE_COLORS['default']
  // We'll return light/dark depending on system preference later, 
  // but for now let's use CSS variables or a computed based on document class?
  // Tailwind handles dark mode via class, so we can't easily switch JS objects dynamically without a store.
  // Instead, let's use the 'light' values for light mode and handle dark via CSS classes if possible, 
  // OR just assume a specific look.
  // Better: Return the object and use inline styles carefully or map to Tailwind classes if possible.
  // Since we have custom hex codes, let's use inline styles for the badge background/text.
  
  // For dark mode compatibility, we might need to check "dark" class on html.
  // But Vue component doesn't inherently know this without a store.
  // Let's rely on a simpler approach: Use the "light" definitions by default, 
  // but maybe modify them to be CSS variables or just use them as-is.
  // The provided TYPE_COLORS has 'light' and 'dark'.
  // Let's pick one based on a simple check or just default to light for the 'style' binding,
  // and hope it looks okay or use CSS classes.
  
  // ACTUALLY: Let's use Tailwind classes for the card background (bg-card) 
  // and use the custom colors ONLY for the badge.
  // We can return the color set.
  return colorSet.light // Default to light for badge colors which are usually pastels. 
                        // If we want dark mode specific badge colors, we'd need a theme store.
})

// Dynamic classes for card border/bg tint based on type
const themeClasses = computed(() => {
  // We can add a very subtle tint to the card based on type
  // But let's keep it clean: just bg-card and standard border.
  return {
    bg: '',
    border: ''
  }
})

// Icons
const getIconForType = (type?: string) => {
  switch (type?.toLowerCase()) {
    case 'antigravity': return Zap
    case 'codex': return Code
    case 'gemini': return Bot
    case 'gemini-cli': return Bot
    case 'claude': return Cpu
    case 'qwen': return Box
    default: return FileJson
  }
}

// Stats from authStats store
const authStatsStore = useAuthStatsStore()

const authIdKey = computed(() => {
  const raw = props.file.id ?? (props.file as Record<string, unknown>)['id']
  return typeof raw === 'string' ? raw.trim() : null
})

// 获取 authIndex（兼容两种命名方式）
const authIndexKey = computed(() => {
  const rawAuthIndex = props.file.authIndex ?? (props.file as Record<string, unknown>)['auth_index']
  return authStatsStore.normalizeAuthIndex(rawAuthIndex)
})

// 获取统计数据
const fileStats = computed(() => {
  // 优先通过稳定的 authId 匹配（跨重启可保持一致）
  if (authIdKey.value) {
    const stats = authStatsStore.getStatsByAuthId(authIdKey.value)
    if (stats.success > 0 || stats.failure > 0) {
      return stats
    }
  }
  // 首先通过 authIndex 匹配
  if (authIndexKey.value) {
    const stats = authStatsStore.getStatsByAuthIndex(authIndexKey.value)
    if (stats.success > 0 || stats.failure > 0) {
      return stats
    }
  }
  // 然后通过 source (文件名) 匹配
  return authStatsStore.getStatsBySource(props.file.name)
})

// 获取状态栏数据
const statusBarData = computed(() => {
  if (authIdKey.value) {
    const stats = authStatsStore.getStatusBarDataByAuthId(authIdKey.value)
    if (stats.totalSuccess + stats.totalFailure > 0) {
      return stats
    }
  }
  if (authIndexKey.value) {
    return authStatsStore.getStatusBarData(authIndexKey.value)
  }
  return {
    blocks: new Array(48).fill('idle'),
    successRate: 100,
    totalSuccess: 0,
    totalFailure: 0
  }
})

// 是否显示统计栏（加载完成后始终显示，没有数据时显示全灰色）
const hasStats = computed(() => {
  return authStatsStore.loaded
})

const statusRateText = computed(() => {
  const total = statusBarData.value.totalSuccess + statusBarData.value.totalFailure
  if (total === 0) return '--'
  const failureRate = (statusBarData.value.totalFailure / total) * 100
  return `${failureRate.toFixed(1)}%`
})

// 异常(失败)率颜色（最近 24 小时）
const statusRateColor = computed(() => {
  const total = statusBarData.value.totalSuccess + statusBarData.value.totalFailure
  if (total === 0) return 'text-muted-foreground'
  const failureRate = statusBarData.value.totalFailure / total
  if (failureRate > 0.5) return 'text-red-500'
  if (failureRate >= 0.2) return 'text-yellow-500'
  return 'text-green-500'
})

// 状态栏块数据
const statusBarBlocks = computed(() => statusBarData.value.blocks)

// 组件挂载时加载统计数据
onMounted(() => {
  authStatsStore.loadStats()
})

// Quota visibility
const showQuota = computed(() => {
  return ['antigravity', 'codex', 'gemini-cli'].includes(props.file.type || '')
})

// Progress bar colors
const getProgressColor = (fraction: number) => {
  if (fraction > 0.6) return 'bg-green-500'
  if (fraction > 0.2) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getUsageColor = (percent: number) => {
  if (percent < 60) return 'bg-green-500'
  if (percent < 90) return 'bg-yellow-500'
  return 'bg-red-500'
}
</script>
