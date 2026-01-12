/**
 * Auth Store - 管理连接配置和认证状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/api/client'
import { STORAGE_KEY_AUTH } from '@/utils/constants'

export interface ConnectionConfig {
  apiBase: string
  managementKey: string
}

interface StoredAuth {
  apiBase: string
  managementKey: string
}

function loadStoredAuth(): StoredAuth | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_AUTH)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.apiBase && parsed.managementKey) {
        return parsed
      }
    }
  } catch {
    // ignore
  }
  return null
}

function saveAuth(config: StoredAuth): void {
  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(config))
}

function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY_AUTH)
}

export const useAuthStore = defineStore('auth', () => {
  const apiBase = ref('')
  const managementKey = ref('')
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const connectionError = ref<string | null>(null)
  const serverVersion = ref<string | null>(null)
  const serverBuildDate = ref<string | null>(null)

  const hasCredentials = computed(() => !!apiBase.value && !!managementKey.value)

  /**
   * 初始化 - 从 localStorage 恢复连接配置
   */
  function init(): void {
    const stored = loadStoredAuth()
    if (stored) {
      apiBase.value = stored.apiBase
      managementKey.value = stored.managementKey
      apiClient.setConfig({
        apiBase: stored.apiBase,
        managementKey: stored.managementKey
      })
    }

    // 监听版本更新事件
    window.addEventListener('server-version-update', (event) => {
      const detail = (event as CustomEvent).detail
      if (detail.version) serverVersion.value = detail.version
      if (detail.buildDate) serverBuildDate.value = detail.buildDate
    })

    // 监听 401 未授权事件
    window.addEventListener('unauthorized', () => {
      disconnect()
    })
  }

  /**
   * 连接到服务器
   */
  async function connect(config: ConnectionConfig): Promise<boolean> {
    isConnecting.value = true
    connectionError.value = null

    try {
      apiClient.setConfig({
        apiBase: config.apiBase,
        managementKey: config.managementKey
      })

      // 验证连接 - 尝试获取配置（这会触发版本信息更新）
      await apiClient.get('/config')

      // 保存配置
      apiBase.value = config.apiBase
      managementKey.value = config.managementKey
      isConnected.value = true
      saveAuth(config)

      return true
    } catch (error) {
      connectionError.value = (error as Error).message || '连接失败'
      isConnected.value = false
      return false
    } finally {
      isConnecting.value = false
    }
  }

  /**
   * 断开连接
   */
  function disconnect(): void {
    apiBase.value = ''
    managementKey.value = ''
    isConnected.value = false
    serverVersion.value = null
    serverBuildDate.value = null
    clearAuth()
  }

  /**
   * 尝试自动连接（如果有保存的凭证）
   */
  async function autoConnect(): Promise<boolean> {
    const stored = loadStoredAuth()
    if (stored) {
      try {
        return await connect(stored)
      } catch (error) {
        // 自动连接失败时清除存储的凭证
        clearAuth()
        return false
      }
    }
    return false
  }

  /**
   * 刷新服务器版本信息
   */
  async function refreshServerInfo(): Promise<void> {
    if (!isConnected.value) return
    
    try {
      // 发起一个简单的请求来触发版本信息更新
      await apiClient.get('/config')
    } catch (error) {
      // 忽略错误，版本信息不是关键功能
      console.warn('Failed to refresh server info:', error)
    }
  }

  return {
    apiBase,
    managementKey,
    isConnected,
    isConnecting,
    connectionError,
    serverVersion,
    serverBuildDate,
    hasCredentials,
    init,
    connect,
    disconnect,
    autoConnect,
    refreshServerInfo
  }
})
