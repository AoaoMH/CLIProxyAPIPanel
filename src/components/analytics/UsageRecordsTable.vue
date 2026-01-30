<template>
  <TableCard title="使用记录">
    <template #actions>
      <!-- 时间段筛选 -->
      <SearchableSelect
        :model-value="selectedPeriod"
        :options="[
          { value: 'today', label: '今天' },
          { value: 'yesterday', label: '昨天' },
          { value: 'last7days', label: '最近7天' },
          { value: 'last30days', label: '最近30天' },
          { value: 'last90days', label: '最近90天' }
        ]"
        placeholder="选择时间段"
        search-placeholder="搜索时间段..."
        :searchable="false"
        class="w-24 sm:w-32 h-8 text-xs"
        @update:model-value="$emit('update:selectedPeriod', $event)"
      />

      <!-- 分隔线 -->
      <div class="hidden sm:block h-4 w-px bg-border" />

      <!-- 通用搜索 -->
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10 pointer-events-none" />
        <Input
          :model-value="filterSearch"
          @update:model-value="$emit('update:filterSearch', $event)"
          placeholder="搜索密钥/模型/提供商"
          class="w-32 sm:w-48 h-8 text-xs border-border/60 pl-8"
        />
      </div>

      <!-- 模型筛选 -->
      <SearchableSelect
        :model-value="filterModel"
        :options="[
          { value: '__all__', label: '全部模型' },
          ...availableModels.map(model => ({ value: model, label: model }))
        ]"
        placeholder="全部模型"
        search-placeholder="搜索模型..."
        class="w-24 sm:w-40 h-8 text-xs"
        @update:model-value="$emit('update:filterModel', $event)"
      />

      <!-- 提供商筛选 -->
      <SearchableSelect
        :model-value="filterProvider"
        :options="[
          { value: '__all__', label: '全部提供商' },
          ...availableProviders.map(provider => ({ value: provider, label: provider }))
        ]"
        placeholder="全部提供商"
        search-placeholder="搜索提供商..."
        class="w-24 sm:w-32 h-8 text-xs"
        @update:model-value="$emit('update:filterProvider', $event)"
      />

      <!-- 状态筛选 -->
      <SearchableSelect
        :model-value="filterStatus"
        :options="[
          { value: '__all__', label: '全部状态' },
          { value: 'success', label: '成功' },
          { value: 'error', label: '失败' }
        ]"
        placeholder="全部状态"
        search-placeholder="搜索状态..."
        :searchable="false"
        class="w-20 sm:w-28 h-8 text-xs"
        @update:model-value="$emit('update:filterStatus', $event)"
      />

      <!-- 自动刷新按钮 -->
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :class="autoRefresh ? 'text-primary' : ''"
        :title="autoRefresh ? '点击关闭自动刷新' : '点击开启自动刷新（进行中每2秒，否则10秒）'"
        @click="$emit('update:autoRefresh', !autoRefresh)"
      >
        <RefreshCcw
          class="w-3.5 h-3.5"
          :class="autoRefresh ? 'animate-spin' : ''"
        />
      </Button>

      <!-- 分隔线 -->
      <div class="hidden sm:block h-4 w-px bg-border" />

      <!-- 刷新按钮 -->
      <RefreshButton
        :loading="loading"
        @click="$emit('refresh')"
      />
    </template>

    <Table>
      <TableHeader>
        <TableRow class="border-b border-border/60 hover:bg-transparent">
          <TableHead class="h-12 font-semibold w-[70px]">
            时间
          </TableHead>
          <TableHead class="h-12 font-semibold w-[100px]">
            密钥
          </TableHead>
          <TableHead class="h-12 font-semibold w-[140px]">
            模型
          </TableHead>
          <TableHead class="h-12 font-semibold w-[160px]">
            提供商/凭证
          </TableHead>
          <TableHead class="h-12 font-semibold w-[50px] text-center">
            类型
          </TableHead>
          <TableHead class="h-12 font-semibold w-[140px] text-right">
            Tokens
          </TableHead>
          <TableHead class="h-12 font-semibold w-[70px] text-right">
            耗时
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="records.length === 0">
          <TableCell
            :colspan="7"
            class="text-center py-12 text-muted-foreground"
          >
            暂无请求记录
          </TableCell>
        </TableRow>
        <TableRow
          v-for="record in records"
          v-else
          :key="record.id"
          class="cursor-pointer border-b border-border/40 hover:bg-muted/30 transition-colors h-[72px]"
          @click="handleRowClick(record.id)"
        >
          <TableCell class="text-xs py-4 w-[70px]">
            {{ formatDateTime(record.timestamp) }}
          </TableCell>
          <TableCell
            class="py-4 w-[100px]"
            :title="record.api_key_masked"
          >
            <div class="flex flex-col text-xs gap-0.5">
              <span class="truncate">{{ record.api_key_masked }}</span>
            </div>
          </TableCell>
          <TableCell
            class="font-medium py-4 w-[140px]"
            :title="record.model"
          >
            <span class="truncate block">{{ record.model }}</span>
          </TableCell>
          <TableCell
            class="py-4 w-[160px]"
            :title="record.upstream_provider || record.provider || '-'"
          >
            <div class="flex flex-col text-xs gap-0.5">
              <div class="flex items-center gap-1">
                <span class="truncate capitalize">{{ record.upstream_provider || record.provider || '-' }}</span>
                <Badge
                  v-if="record.upstream_candidate_count && record.upstream_candidate_count > 1"
                  variant="outline"
                  class="h-4 px-1 text-[10px] leading-none border-border/60 text-muted-foreground"
                  :title="`共 ${record.upstream_candidate_count} 次尝试`"
                >
                  ×{{ record.upstream_candidate_count }}
                </Badge>
              </div>
              <span
                v-if="record.upstream_api_key_masked"
                class="text-muted-foreground truncate font-mono"
                :title="record.upstream_api_key_masked"
              >
                {{ record.upstream_api_key_masked }}
              </span>
              <span
                v-else
                class="text-muted-foreground"
              >-</span>
            </div>
          </TableCell>
          <TableCell class="text-center py-4 w-[50px]">
            <Badge
              v-if="record.status_code === 0"
              variant="secondary"
              class="whitespace-nowrap"
            >
              进行中
            </Badge>
            <Badge
              v-else-if="!record.success"
              variant="destructive"
              class="whitespace-nowrap"
            >
              失败
            </Badge>
            <Badge
              v-else-if="record.is_streaming"
              variant="secondary"
              class="whitespace-nowrap"
            >
              流式
            </Badge>
            <Badge
              v-else
              variant="outline"
              class="whitespace-nowrap border-border/60 text-muted-foreground"
            >
              标准
            </Badge>
          </TableCell>
          <TableCell class="text-right py-4 w-[140px]">
            <div class="flex flex-col items-end text-xs gap-0.5">
              <div class="flex items-center gap-1">
                <span>{{ formatTokens(record.input_tokens || 0) }}</span>
                <span class="text-muted-foreground">/</span>
                <span>{{ formatTokens(record.output_tokens || 0) }}</span>
              </div>
            </div>
          </TableCell>
          <TableCell class="text-right py-4 w-[70px]">
            <span
              v-if="getDisplayDurationMs(record) != null"
              class="text-muted-foreground tabular-nums"
            >{{ (getDisplayDurationMs(record)! / 1000).toFixed(2) }}s</span>
            <span
              v-else
              class="text-muted-foreground"
            >-</span>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <!-- 分页控件 -->
    <template #pagination>
      <Pagination
        v-if="totalRecords > 0"
        :current="currentPage"
        :total="totalRecords"
        :page-size="pageSize"
        :page-size-options="pageSizeOptions"
        @update:current="$emit('update:currentPage', $event)"
        @update:page-size="$emit('update:pageSize', $event)"
      />
    </template>
  </TableCard>
</template>

<script setup lang="ts">
import {
  TableCard,
  Badge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SearchableSelect,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
  RefreshButton,
} from '@/components/ui'
import { RefreshCcw, Search } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { formatTokens } from '@/utils/format'
import type { UsageRecord } from '@/api/usageRecords'

defineProps<{
  records: UsageRecord[]
  loading: boolean
  selectedPeriod: string
  filterSearch: string
  filterModel: string
  filterProvider: string
  filterStatus: string
  availableModels: string[]
  availableProviders: string[]
  currentPage: number
  pageSize: number
  totalRecords: number
  pageSizeOptions: number[]
  autoRefresh: boolean
}>()

const emit = defineEmits<{
  'update:selectedPeriod': [value: string]
  'update:filterSearch': [value: string]
  'update:filterModel': [value: string]
  'update:filterProvider': [value: string]
  'update:filterStatus': [value: string]
  'update:currentPage': [value: number]
  'update:pageSize': [value: number]
  'update:autoRefresh': [value: boolean]
  'refresh': []
  'showDetail': [id: string]
}>()

function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

function handleRowClick(id: number) {
  emit('showDetail', String(id))
}

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

function getDisplayDurationMs(record: UsageRecord): number | null {
  if (!record) return null

  // In-flight record: compute elapsed from timestamp so the UI can show a live timer.
  if (record.status_code === 0) {
    const t = Date.parse(record.timestamp)
    if (Number.isFinite(t)) {
      return Math.max(0, nowMs.value - t)
    }
    return null
  }

  return record.duration_ms ?? null
}
</script>
