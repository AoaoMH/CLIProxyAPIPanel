<template>
  <div class="space-y-6 pb-8">
    <!-- 活跃度热图 + 请求间隔时间线 -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ActivityHeatmapCard
        :data="activityHeatmapData"
        title="总体活跃天数"
        :is-loading="isLoadingHeatmap"
        :has-error="heatmapError"
      />
      <IntervalTimelineCard
        title="请求间隔时间线"
        :hours="24"
      />
    </div>

    <!-- 分析统计 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UsageModelTable
        :data="enhancedModelStats"
      />
      <UsageProviderTable
        :data="providerStats"
      />
    </div>

    <!-- KPI 概览 -->
    <UsageKpiCards
      :kpis="usageKpis"
      :loading="isLoadingRecords"
    />

    <!-- 请求详情 -->
    <UsageRecordsTable
      :records="currentRecords"
      :loading="isLoadingRecords"
      :selected-period="selectedPeriod"
      :filter-search="filterSearch"
      :filter-model="filterModel"
      :filter-provider="filterProvider"
      :filter-status="filterStatus"
      :available-models="availableModels"
      :available-providers="availableProviders"
      :current-page="currentPage"
      :page-size="pageSize"
      :total-records="totalRecords"
      :page-size-options="pageSizeOptions"
      :auto-refresh="autoRefresh"
      @update:selected-period="handlePeriodChange"
      @update:filter-search="handleFilterSearchChange"
      @update:filter-model="handleFilterModelChange"
      @update:filter-provider="handleFilterProviderChange"
      @update:filter-status="handleFilterStatusChange"
      @update:current-page="handlePageChange"
      @update:page-size="handlePageSizeChange"
      @update:auto-refresh="handleAutoRefreshChange"
      @refresh="refreshData"
      @show-detail="showRequestDetail"
    />

    <!-- 请求详情抽屉 -->
    <RecordDetailDrawer
      :record="selectedRecord"
      :loading="isLoadingDetail"
      @close="closeDetailDrawer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from '@/composables/useToast'
import {
  ActivityHeatmapCard,
  IntervalTimelineCard,
  UsageKpiCards,
  UsageModelTable,
  UsageProviderTable,
  UsageRecordsTable,
  RecordDetailDrawer
} from '@/components/analytics'
import { 
  usageRecordsApi, 
  type UsageRecord, 
  type ActivityHeatmap,
  type UsageKPIs,
  type ModelStats,
  type ProviderStats,
} from '@/api/usageRecords'
import type { PeriodValue, FilterStatusValue } from '@/features/usage/types'
import { getDateRangeFromPeriod } from '@/features/usage/composables'

const { warning } = useToast()

// 时间段选择
const selectedPeriod = ref<PeriodValue>('today')

// 分页状态
const currentPage = ref(1)
const pageSize = ref(20)
const pageSizeOptions = [10, 20, 50, 100]

// 筛选状态
const filterSearch = ref('')
const filterModel = ref('__all__')
const filterProvider = ref('__all__')
const filterStatus = ref<FilterStatusValue>('__all__')

// 自动刷新状态
const autoRefresh = ref(true)
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null
const AUTO_REFRESH_BASE_INTERVAL = 2000 // 2秒tick（有进行中请求时每2秒刷新）
const AUTO_REFRESH_IDLE_TICKS = 5 // 无进行中请求时每10秒刷新（2s * 5）
let autoRefreshTick = 0
let autoRefreshInFlight = false

// 数据状态
const isLoadingRecords = ref(false)
const isLoadingHeatmap = ref(false)
const heatmapError = ref(false)
const activityHeatmapData = ref<ActivityHeatmap | null>(null)
const modelStats = ref<ModelStats[]>([])
const providerStats = ref<ProviderStats[]>([])
const usageKpis = ref<UsageKPIs | null>(null)
const currentRecords = ref<UsageRecord[]>([])
const totalRecords = ref(0)
const availableModels = ref<string[]>([])
const availableProviders = ref<string[]>([])
const hasActiveRequests = computed(() => currentRecords.value.some(r => r.status_code === 0))

// 详情弹窗状态
const selectedRecord = ref<UsageRecord | null>(null)
const isLoadingDetail = ref(false)

// 增强的模型统计（添加效率分析）
const enhancedModelStats = computed(() => {
  return modelStats.value.map(model => {
    const costPerToken = model.total_tokens > 0 
      ? (model.total_tokens / 1000000).toFixed(4)
      : '0.0000'
    return {
      ...model,
      costPerToken: `${costPerToken}/M`
    }
  })
})

// 加载热力图数据
async function loadHeatmapData() {
  isLoadingHeatmap.value = true
  heatmapError.value = false
  try {
    activityHeatmapData.value = await usageRecordsApi.getHeatmap(365)
  } catch (error) {
    console.error('加载热力图数据失败:', error)
    heatmapError.value = true
  } finally {
    isLoadingHeatmap.value = false
  }
}

// 加载统计数据
async function loadStats(dateRange: { start_time?: string; end_time?: string }) {
  try {
    const [modelData, providerData, optionsData] = await Promise.all([
      usageRecordsApi.getModelStats(dateRange.start_time, dateRange.end_time),
      usageRecordsApi.getProviderStats(dateRange.start_time, dateRange.end_time),
      usageRecordsApi.getOptions(dateRange.start_time, dateRange.end_time)
    ])

    modelStats.value = modelData.models || []
    providerStats.value = providerData.providers || []
    availableModels.value = optionsData.models || []
    availableProviders.value = optionsData.providers || []
  } catch (error) {
    console.error('加载统计数据失败:', error)
    warning('统计数据加载失败，请刷新重试')
  }
}

// 加载记录
async function loadRecords(pagination: { page: number; pageSize: number }, filters: Record<string, any>) {
  isLoadingRecords.value = true
  try {
    const dateRange = getDateRangeFromPeriod(selectedPeriod.value)
    const result = await usageRecordsApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      start_time: dateRange.start_time,
      end_time: dateRange.end_time,
      include_kpis: true,
      ...filters
    })

    currentRecords.value = result.records || []
    totalRecords.value = result.total || 0
    usageKpis.value = result.kpis || null
  } catch (error) {
    console.error('加载记录失败:', error)
    usageKpis.value = null
  } finally {
    isLoadingRecords.value = false
  }
}

// 获取当前筛选参数
function getCurrentFilters() {
  const status =
    filterStatus.value === '__all__'
      ? undefined
      : filterStatus.value === 'success'
        ? true
        : false

  return {
    search: filterSearch.value.trim() || undefined,
    model: filterModel.value !== '__all__' ? filterModel.value : undefined,
    provider: filterProvider.value !== '__all__' ? filterProvider.value : undefined,
    success: status,
  }
}

// 处理时间段变化
async function handlePeriodChange(value: string) {
  selectedPeriod.value = value as PeriodValue
  currentPage.value = 1

  const dateRange = getDateRangeFromPeriod(selectedPeriod.value)
  await loadStats(dateRange)
  await loadRecords({ page: 1, pageSize: pageSize.value }, getCurrentFilters())
}

// 处理分页变化
async function handlePageChange(page: number) {
  currentPage.value = page
  await loadRecords({ page, pageSize: pageSize.value }, getCurrentFilters())
}

// 处理每页大小变化
async function handlePageSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
  await loadRecords({ page: 1, pageSize: size }, getCurrentFilters())
}

// 处理筛选变化
async function handleFilterSearchChange(value: string) {
  filterSearch.value = value
  currentPage.value = 1
  await loadRecords({ page: 1, pageSize: pageSize.value }, getCurrentFilters())
}

async function handleFilterModelChange(value: string) {
  filterModel.value = value
  currentPage.value = 1
  await loadRecords({ page: 1, pageSize: pageSize.value }, getCurrentFilters())
}

async function handleFilterProviderChange(value: string) {
  filterProvider.value = value
  currentPage.value = 1
  await loadRecords({ page: 1, pageSize: pageSize.value }, getCurrentFilters())
}

async function handleFilterStatusChange(value: string) {
  filterStatus.value = value as FilterStatusValue
  currentPage.value = 1
  await loadRecords({ page: 1, pageSize: pageSize.value }, getCurrentFilters())
}

// 刷新数据
async function refreshData() {
  const dateRange = getDateRangeFromPeriod(selectedPeriod.value)
  await loadStats(dateRange)
  await loadRecords({ page: currentPage.value, pageSize: pageSize.value }, getCurrentFilters())
}

// 显示请求详情
async function showRequestDetail(id: string) {
  isLoadingDetail.value = true
  try {
    // 获取详细记录
    const record = await usageRecordsApi.getById(parseInt(id))
    selectedRecord.value = record
  } catch (error) {
    console.error('加载请求详情失败:', error)
    warning('加载请求详情失败，请重试')
  } finally {
    isLoadingDetail.value = false
  }
}

// 关闭详情抽屉
function closeDetailDrawer() {
  selectedRecord.value = null
}

// 自动刷新功能
function startAutoRefresh() {
  if (autoRefreshTimer) return
  autoRefreshTick = 0
  autoRefreshTimer = setInterval(async () => {
    if (autoRefreshInFlight) return
    autoRefreshTick++

    const shouldRefresh = hasActiveRequests.value || (autoRefreshTick % AUTO_REFRESH_IDLE_TICKS === 0)
    if (!shouldRefresh) return

    autoRefreshInFlight = true
    try {
      await refreshData()
    } finally {
      autoRefreshInFlight = false
    }
  }, AUTO_REFRESH_BASE_INTERVAL)
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

function handleAutoRefreshChange(value: boolean) {
  autoRefresh.value = value
  if (value) {
    refreshData() // 立即刷新一次
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

// 初始化加载
onMounted(async () => {
  const dateRange = getDateRangeFromPeriod(selectedPeriod.value)

  // 并行加载统计数据和热力图
  try {
    await Promise.all([
      loadStats(dateRange),
      loadHeatmapData()
    ])
  } catch (error) {
    console.error('加载数据失败:', error)
    warning('数据加载失败，请刷新重试')
  }

  // 加载记录
  await loadRecords({ page: currentPage.value, pageSize: pageSize.value }, getCurrentFilters())

  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

// 组件卸载时清理定时器
onUnmounted(() => {
  stopAutoRefresh()
})
</script>
