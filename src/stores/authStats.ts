import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/api/client'

/**
 * 成功/失败统计桶
 */
export interface KeyStatBucket {
  success: number
  failure: number
}

/**
 * 按 authIndex 和 source 分别统计的数据
 */
export interface KeyStats {
  bySource: Record<string, KeyStatBucket>
  byAuthIndex: Record<string, KeyStatBucket>
  byAuthId: Record<string, KeyStatBucket>
}

/**
 * 状态栏单个格子的状态
 */
export type StatusBlockState = 'success' | 'failure' | 'mixed' | 'idle'

/**
 * 状态栏数据
 */
export interface StatusBarData {
  blocks: StatusBlockState[]
  successRate: number
  totalSuccess: number
  totalFailure: number
}

const STATUS_BLOCK_COUNT = 48
const STATUS_BLOCK_DURATION_MS = 30 * 60 * 1000 // 30 minutes
const STATUS_WINDOW_MS = STATUS_BLOCK_COUNT * STATUS_BLOCK_DURATION_MS

/**
 * Usage 明细条目
 */
interface UsageDetail {
  timestamp: string
  source?: string
  auth_id?: string
  authId?: string
  auth_index?: number | string
  failed?: boolean
}

/**
 * 标准化 authIndex 值
 */
function normalizeAuthIndex(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString()
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  return null
}

function normalizeAuthId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/**
 * 从 usage 数据收集所有请求明细
 */
function collectUsageDetails(usageData: any): UsageDetail[] {
  if (!usageData) {
    return []
  }
  const apis = usageData.apis || {}
  const details: UsageDetail[] = []
  Object.values(apis as Record<string, any>).forEach((apiEntry) => {
    const models = apiEntry?.models || {}
    Object.values(models as Record<string, any>).forEach((modelEntry) => {
      const modelDetails = Array.isArray(modelEntry.details) ? modelEntry.details : []
      modelDetails.forEach((detail: any) => {
        if (detail && detail.timestamp) {
          details.push(detail)
        }
      })
    })
  })
  return details
}

/**
 * 计算按 source 和 authIndex 的统计
 */
function computeKeyStats(usageData: any): KeyStats {
  if (!usageData) {
    return { bySource: {}, byAuthIndex: {}, byAuthId: {} }
  }

  const sourceStats: Record<string, KeyStatBucket> = {}
  const authIndexStats: Record<string, KeyStatBucket> = {}
  const authIdStats: Record<string, KeyStatBucket> = {}

  const ensureBucket = (bucket: Record<string, KeyStatBucket>, key: string) => {
    if (!bucket[key]) {
      bucket[key] = { success: 0, failure: 0 }
    }
    return bucket[key]
  }

  const apis = usageData.apis || {}
  const now = Date.now()
  const windowStart = now - STATUS_WINDOW_MS

  Object.values(apis as any).forEach((apiEntry: any) => {
    const models = apiEntry?.models || {}

    Object.values(models as any).forEach((modelEntry: any) => {
      const details = modelEntry?.details || []

      details.forEach((detail: any) => {
        const timestampRaw = detail?.timestamp
        const timestamp = typeof timestampRaw === 'string' ? Date.parse(timestampRaw) : Number.NaN
        if (Number.isNaN(timestamp) || timestamp < windowStart || timestamp > now) {
          return
        }

        const source = detail?.source || ''
        const authIdKey = normalizeAuthId(detail?.auth_id ?? detail?.authId)
        const authIndexKey = normalizeAuthIndex(detail?.auth_index)
        const isFailed = detail?.failed === true

        if (source) {
          const bucket = ensureBucket(sourceStats, source)
          if (isFailed) {
            bucket.failure += 1
          } else {
            bucket.success += 1
          }
        }

        if (authIndexKey) {
          const bucket = ensureBucket(authIndexStats, authIndexKey)
          if (isFailed) {
            bucket.failure += 1
          } else {
            bucket.success += 1
          }
        }

        if (authIdKey) {
          const bucket = ensureBucket(authIdStats, authIdKey)
          if (isFailed) {
            bucket.failure += 1
          } else {
            bucket.success += 1
          }
        }
      })
    })
  })

  return {
    bySource: sourceStats,
    byAuthIndex: authIndexStats,
    byAuthId: authIdStats
  }
}

/**
 * 计算状态栏数据（最近1小时，分为20个5分钟的时间块）
 */
function calculateStatusBarData(
  usageDetails: UsageDetail[],
  filters?: { authId?: string | null; authIndex?: string | number | null }
): StatusBarData {
  const now = Date.now()
  const windowStart = now - STATUS_WINDOW_MS

  const authIdFilterKey = normalizeAuthId(filters?.authId)
  const authIndexFilterKey = normalizeAuthIndex(filters?.authIndex)

  // Initialize blocks
  const blockStats: Array<{ success: number; failure: number }> = Array.from(
    { length: STATUS_BLOCK_COUNT },
    () => ({ success: 0, failure: 0 })
  )

  let totalSuccess = 0
  let totalFailure = 0

  // Filter and bucket the usage details
  usageDetails.forEach((detail) => {
    const timestamp = Date.parse(detail.timestamp)
    if (Number.isNaN(timestamp) || timestamp < windowStart || timestamp > now) {
      return
    }

    // Apply authIndex filter if provided
    if (authIdFilterKey) {
      const detailAuthId = normalizeAuthId(detail.auth_id ?? detail.authId)
      if (detailAuthId !== authIdFilterKey) return
    }

    if (authIndexFilterKey) {
      const detailAuthIndex = normalizeAuthIndex(detail.auth_index)
      if (detailAuthIndex !== authIndexFilterKey) return
    }

    // Calculate which block this falls into (0 = oldest, 19 = newest)
    const rawBlockIndex = Math.floor((timestamp - windowStart) / STATUS_BLOCK_DURATION_MS)
    const blockIndex = Math.min(STATUS_BLOCK_COUNT - 1, Math.max(0, rawBlockIndex))

    if (blockIndex >= 0 && blockIndex < STATUS_BLOCK_COUNT) {
      if (detail.failed) {
        blockStats[blockIndex].failure += 1
        totalFailure += 1
      } else {
        blockStats[blockIndex].success += 1
        totalSuccess += 1
      }
    }
  })

  // Convert stats to block states (based on failure rate thresholds)
  const blocks: StatusBlockState[] = blockStats.map((stat) => {
    if (stat.success === 0 && stat.failure === 0) {
      return 'idle'
    }
    const total = stat.success + stat.failure
    const failureRate = total > 0 ? stat.failure / total : 0
    if (failureRate > 0.5) return 'failure'
    if (failureRate >= 0.2) return 'mixed'
    return 'success'
  })

  // Calculate success rate
  const total = totalSuccess + totalFailure
  const successRate = total > 0 ? (totalSuccess / total) * 100 : 100

  return {
    blocks,
    successRate,
    totalSuccess,
    totalFailure
  }
}

export const useAuthStatsStore = defineStore('authStats', () => {
  // 存储 usage 原始数据
  const usageData = ref<any>(null)
  
  // 存储计算后的 keyStats
  const keyStats = ref<KeyStats>({ bySource: {}, byAuthIndex: {}, byAuthId: {} })
  
  // 存储所有 usage details
  const usageDetails = ref<UsageDetail[]>([])
  
  // 加载状态
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)
  
  // 上次加载时间
  const lastLoadTime = ref<number>(0)
  
  // 缓存有效期（4分钟）
  const CACHE_EXPIRY_MS = 4 * 60 * 1000

  /**
   * 加载 usage 统计数据
   */
  const loadStats = async (force = false) => {
    // 如果缓存仍有效且非强制刷新，则跳过
    const now = Date.now()
    if (!force && loaded.value && now - lastLoadTime.value < CACHE_EXPIRY_MS) {
      return
    }

    if (loading.value) return

    loading.value = true
    error.value = null

    try {
      const res = await apiClient.get<any>('/usage').catch(() => null)
      if (res) {
        usageData.value = res.usage || res
        keyStats.value = computeKeyStats(usageData.value)
        usageDetails.value = collectUsageDetails(usageData.value)
        loaded.value = true
        lastLoadTime.value = now
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载统计数据失败'
    } finally {
      loading.value = false
    }
  }

  /**
   * 根据 authIndex 获取统计数据
   */
  const getStatsByAuthIndex = (authIndex: string | number | null | undefined): KeyStatBucket => {
    const key = normalizeAuthIndex(authIndex)
    if (!key) return { success: 0, failure: 0 }
    return keyStats.value.byAuthIndex[key] || { success: 0, failure: 0 }
  }

  const getStatsByAuthId = (authId: string | null | undefined): KeyStatBucket => {
    const key = normalizeAuthId(authId)
    if (!key) return { success: 0, failure: 0 }
    return keyStats.value.byAuthId[key] || { success: 0, failure: 0 }
  }

  /**
   * 根据 source (文件名) 获取统计数据
   */
  const getStatsBySource = (source: string): KeyStatBucket => {
    if (!source) return { success: 0, failure: 0 }
    
    // 尝试直接匹配
    if (keyStats.value.bySource[source]) {
      return keyStats.value.bySource[source]
    }
    
    // 尝试去掉扩展名匹配
    const nameWithoutExt = source.replace(/\.[^/.]+$/, '')
    if (nameWithoutExt && keyStats.value.bySource[nameWithoutExt]) {
      return keyStats.value.bySource[nameWithoutExt]
    }
    
    return { success: 0, failure: 0 }
  }

  /**
   * 获取认证文件的状态栏数据
   */
  const getStatusBarData = (authIndex: string | number | null | undefined): StatusBarData => {
    const key = normalizeAuthIndex(authIndex)
    if (!key || usageDetails.value.length === 0) {
      return {
        blocks: new Array(STATUS_BLOCK_COUNT).fill('idle') as StatusBlockState[],
        successRate: 100,
        totalSuccess: 0,
        totalFailure: 0
      }
    }
    return calculateStatusBarData(usageDetails.value, { authIndex: key })
  }

  const getStatusBarDataByAuthId = (authId: string | null | undefined): StatusBarData => {
    const key = normalizeAuthId(authId)
    if (!key || usageDetails.value.length === 0) {
      return {
        blocks: new Array(STATUS_BLOCK_COUNT).fill('idle') as StatusBlockState[],
        successRate: 100,
        totalSuccess: 0,
        totalFailure: 0
      }
    }
    return calculateStatusBarData(usageDetails.value, { authId: key })
  }

  /**
   * 计算成功率
   */
  const calculateSuccessRate = (stats: KeyStatBucket): number => {
    const total = stats.success + stats.failure
    return total > 0 ? (stats.success / total) * 100 : 100
  }

  /**
   * 检查是否有统计数据
   */
  const hasStatsData = computed(() => {
    return (
      Object.keys(keyStats.value.byAuthIndex).length > 0 ||
      Object.keys(keyStats.value.byAuthId).length > 0 ||
      Object.keys(keyStats.value.bySource).length > 0
    )
  })

  return {
    usageData,
    keyStats,
    usageDetails,
    loading,
    loaded,
    error,
    hasStatsData,
    loadStats,
    getStatsByAuthIndex,
    getStatsByAuthId,
    getStatsBySource,
    getStatusBarData,
    getStatusBarDataByAuthId,
    calculateSuccessRate,
    normalizeAuthIndex
  }
})
