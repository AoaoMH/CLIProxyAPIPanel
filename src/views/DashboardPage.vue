<template>
  <PageContainer>
    <!-- 直接显示内容，去掉页面标题 -->
    <div class="space-y-6">
      <!-- 统计卡片区域 -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <template v-if="loading && !unifiedData">
          <Card
            v-for="i in 4"
            :key="'skeleton-' + i"
            class="p-5"
          >
            <Skeleton class="h-4 w-20 mb-4" />
            <Skeleton class="h-8 w-32 mb-2" />
            <Skeleton class="h-4 w-16" />
          </Card>
        </template>
        <Card
          v-for="(stat, index) in stats"
          v-else
          :key="stat.name"
          class="relative overflow-hidden p-3 sm:p-5"
          :class="statCardBorders[index % statCardBorders.length]"
        >
          <div
            class="pointer-events-none absolute -right-4 -top-6 h-28 w-28 rounded-full blur-3xl opacity-40"
            :class="statCardGlows[index % statCardGlows.length]"
          />
          <!-- 图标固定在右上角 -->
          <div
            class="absolute top-3 right-3 sm:top-5 sm:right-5 rounded-xl sm:rounded-2xl border border-border bg-card/50 p-2 sm:p-3 shadow-inner backdrop-blur-sm text-muted-foreground"
          >
            <component
              :is="stat.icon"
              class="h-4 w-4 sm:h-5 sm:w-5"
            />
          </div>
          <!-- 内容区域 -->
          <div>
            <p class="text-[9px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.4em] text-muted-foreground pr-10 sm:pr-14">
              {{ stat.name }}
            </p>
            <p class="mt-2 sm:mt-4 text-xl sm:text-3xl font-semibold text-foreground">
              {{ stat.value }}
            </p>
            <p
              v-if="stat.subValue"
              class="mt-0.5 sm:mt-1 text-[10px] sm:text-sm text-muted-foreground"
            >
              {{ stat.subValue }}
            </p>
            <div
              v-if="stat.extraBadge"
              class="mt-1.5 sm:mt-2 flex items-center gap-1 sm:gap-1.5 flex-wrap"
            >
              <Badge
                variant="secondary"
                class="text-[9px] sm:text-xs"
              >
                {{ stat.extraBadge }}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <!-- 趋势图表区域 -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- 请求次数趋势 -->
        <Card class="p-5">
          <h4 class="mb-3 text-xs font-semibold text-foreground uppercase tracking-wider">
            请求次数趋势
          </h4>
          <div
            v-if="loading"
            class="flex items-center justify-center h-[280px]"
          >
            <Skeleton class="h-full w-full" />
          </div>
          <div
            v-else
            style="height: 280px;"
          >
            <ELineChart
              v-if="hasRequestTrendData"
              :data="requestTrendData"
              :options="requestTrendOptions"
            />
            <div
              v-else
              class="flex h-full items-center justify-center text-xs text-muted-foreground"
            >
              暂无数据
            </div>
          </div>
        </Card>

        <!-- 模型使用数量 -->
        <Card class="p-5">
          <h4 class="mb-3 text-xs font-semibold text-foreground uppercase tracking-wider">
            模型使用数量
          </h4>
          <div
            v-if="loading"
            class="flex items-center justify-center h-[280px]"
          >
            <Skeleton class="h-full w-full" />
          </div>
          <div
            v-else
            style="height: 280px;"
          >
            <EBarChart
              v-if="hasModelCountData"
              :data="modelCountData"
              :options="modelCountOptions"
            />
            <div
              v-else
              class="flex h-full items-center justify-center text-xs text-muted-foreground"
            >
              暂无数据
            </div>
          </div>
        </Card>
      </div>

      <!-- 每日统计表格 -->
      <Card class="overflow-hidden mt-6">
        <!-- 移动端：卡片列表 -->
        <div class="sm:hidden">
          <div class="px-4 py-3 border-b border-border/60">
            <h3 class="text-sm font-semibold">
              每日统计
            </h3>
          </div>
          <div
            v-if="loading"
            class="flex items-center justify-center py-8"
          >
            <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
            <span class="ml-2 text-muted-foreground text-xs">加载中...</span>
          </div>
          <div
            v-else-if="dailyStats.length === 0"
            class="py-8 text-center text-muted-foreground text-xs"
          >
            暂无数据
          </div>
          <div
            v-else
            class="divide-y divide-border/60"
          >
            <div
              v-for="stat in dailyStats.slice().reverse()"
              :key="stat.date"
              class="p-4 space-y-2"
            >
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm">{{ formatDate(stat.date) }}</span>
                <Badge
                  variant="outline"
                  class="text-[10px]"
                >
                  {{ stat.requests.toLocaleString() }} 请求
                </Badge>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">令牌数</span>
                  <span>{{ formatTokens(stat.tokens) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">响应</span>
                  <span>{{ formatResponseTime(stat.avg_response_time) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">模型</span>
                  <span>{{ stat.unique_models }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 桌面端：表格 -->
        <Table class="hidden sm:table">
          <TableHeader>
            <TableRow>
              <TableHead class="text-left">
                日期
              </TableHead>
              <TableHead class="text-center">
                请求次数
              </TableHead>
              <TableHead class="text-center">
                令牌数
              </TableHead>
              <TableHead class="text-center">
                平均响应
              </TableHead>
              <TableHead class="text-center">
                使用模型
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading">
              <TableCell
                colspan="5"
                class="text-center py-8"
              >
                <div class="flex items-center justify-center gap-2">
                  <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
                  <span class="text-muted-foreground text-xs">加载中...</span>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="dailyStats.length === 0">
              <TableCell
                colspan="5"
                class="text-center py-8 text-muted-foreground text-xs"
              >
                暂无数据
              </TableCell>
            </TableRow>
            <template v-else>
              <TableRow
                v-for="stat in dailyStats.slice().reverse()"
                :key="stat.date"
              >
                <TableCell class="font-medium text-xs">
                  {{ formatDate(stat.date) }}
                </TableCell>
                <TableCell class="text-center text-xs">
                  {{ stat.requests.toLocaleString() }}
                </TableCell>
                <TableCell class="text-center">
                  <Badge
                    variant="secondary"
                    class="text-[10px]"
                  >
                    {{ formatTokens(stat.tokens) }}
                  </Badge>
                </TableCell>
                <TableCell class="text-center">
                  <Badge
                    variant="outline"
                    class="text-[10px]"
                  >
                    {{ formatResponseTime(stat.avg_response_time) }}
                  </Badge>
                </TableCell>
                <TableCell class="text-center text-xs">
                  {{ stat.unique_models }}
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
      </Card>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { dashboardApi, type UnifiedDashboardStats, type DailyStatsItem } from '@/api/dashboard'
import { usageRecordsApi } from '@/api/usageRecords'
import {
  Card,
  Badge,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui'
import PageContainer from '@/components/layout/PageContainer.vue'
import ELineChart from '@/components/charts/ELineChart.vue'
import EBarChart from '@/components/charts/EBarChart.vue'
import {
  Activity,
  Database,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-vue-next'
import { formatTokens, formatRelativeDate, formatDateForChart as formatDateForChartUtil } from '@/utils/format'

const authStore = useAuthStore()
const loading = ref(false)
const unifiedData = ref<UnifiedDashboardStats | null>(null)
const dailyStats = ref<DailyStatsItem[]>([])

const statCardBorders = [
  'border-book-cloth/30 dark:border-book-cloth/25',
  'border-kraft/30 dark:border-kraft/25',
  'border-manilla/40 dark:border-manilla/30',
  'border-book-cloth/25 dark:border-kraft/25'
]

const statCardGlows = [
  'bg-book-cloth/30',
  'bg-kraft/30',
  'bg-manilla/35',
  'bg-kraft/30'
]

// 统计卡片数据
const stats = computed(() => {
  if (!unifiedData.value) return []
  const { overview, system_health } = unifiedData.value

  return [
    {
      name: '总请求',
      value: overview.total_requests.toLocaleString(),
      subValue: `有效 ${overview.success_requests} / 异常 ${overview.failure_requests}`,
      icon: Activity,
    },
    {
      name: '总Token',
      value: formatTokens(overview.total_tokens),
      subValue: `输入 ${formatTokens(overview.input_tokens)} / 输出 ${formatTokens(overview.output_tokens)}`,
      icon: Database,
    },
    {
      name: '平均响应',
      value: `${system_health.avg_response_time.toFixed(2)}s`,
      subValue: '近7天平均',
      icon: Clock,
    },
    {
      name: '错误率',
      value: `${system_health.error_rate.toFixed(2)}%`,
      subValue: '近7天错误率',
      icon: AlertTriangle,
      extraBadge: system_health.error_rate > 5 ? '偏高' : undefined
    }
  ]
})

// 请求趋势图表数据
const requestTrendData = computed(() => {
  if (!unifiedData.value || unifiedData.value.request_trend.length === 0) return { labels: [], datasets: [] }
  
  const trends = unifiedData.value.request_trend
  return {
    labels: trends.map(t => formatDateForChart(t.date)),
    datasets: [
      {
        label: '请求次数',
        data: trends.map(t => t.requests),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }
})

// Computed flags for v-if conditions (objects are always truthy, need explicit checks)
const hasRequestTrendData = computed(() => 
  unifiedData.value && unifiedData.value.request_trend.length > 0
)

const hasModelCountData = computed(() =>
  unifiedData.value && unifiedData.value.model_counts.length > 0
)

const requestTrendOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      title: { display: true, text: '请求次数', color: 'rgb(107, 114, 128)', font: { size: 10 } }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => `请求次数: ${context.parsed.y}`
      }
    }
  }
}

// 模型使用数量（近7天，柱状图）
// 注意：API 返回的是 period 内的总计数，非每日分布。这里展示 period 内各模型的总量对比。
const modelCountData = computed(() => {
  if (!unifiedData.value || unifiedData.value.model_counts.length === 0) return { labels: [], datasets: [] }

  const counts = unifiedData.value.model_counts
  // 按请求数排序
  const sortedCounts = [...counts].sort((a, b) => b.requests - a.requests)

  return {
    labels: sortedCounts.map(c => c.model),
    datasets: [
      {
        label: '请求次数',
        data: sortedCounts.map(c => c.requests),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderRadius: 4,
        barPercentage: 0.6,
      }
    ]
  }
})

const modelCountOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y', // 横向柱状图，方便显示长模型名
  scales: {
    x: {
      beginAtZero: true,
      title: { display: true, text: '请求次数', color: 'rgb(107, 114, 128)', font: { size: 10 } }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => `请求次数: ${context.parsed.x}`
      }
    }
  }
}

onMounted(async () => {
  if (authStore.isConnected) {
    loadData()
  }
})

watch(() => authStore.isConnected, (connected) => {
  if (connected) {
    loadData()
  } else {
    unifiedData.value = null
    dailyStats.value = []
  }
})

async function loadData() {
  loading.value = true
  try {
    const data = await dashboardApi.getUnifiedStats(7)
    const modelCounts = await (async () => {
      const dateRange = getLastDaysRange(7)
      const modelStats = await usageRecordsApi.getModelStats(dateRange.start_time, dateRange.end_time)
      const modelCountMap = new Map<string, number>()
      for (const item of modelStats.models || []) {
        modelCountMap.set(item.model, (modelCountMap.get(item.model) || 0) + item.request_count)
      }
      return Array.from(modelCountMap.entries()).map(([model, requests]) => ({ model, requests }))
    })().catch(() => null)
    if (modelCounts) {
      data.model_counts = modelCounts
    }
    unifiedData.value = data
    dailyStats.value = data.daily_stats
  } catch (err) {
    console.error('Failed to load dashboard data:', err)
  } finally {
    loading.value = false
  }
}

function getLastDaysRange(days: number): { start_time: string; end_time: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1))
  return {
    start_time: Math.floor(start.getTime() / 1000).toString(),
    end_time: Math.floor(now.getTime() / 1000).toString()
  }
}

function formatDate(dateString: string): string {
  return formatRelativeDate(dateString) || dateString
}

function formatDateForChart(dateString: string): string {
  return formatDateForChartUtil(dateString) || dateString
}

function formatResponseTime(seconds: number): string {
  if (seconds === 0) return '-'
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`
  return `${seconds.toFixed(2)}s`
}
</script>
