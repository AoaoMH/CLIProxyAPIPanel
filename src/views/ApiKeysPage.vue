<template>
  <PageContainer>
    <!-- 操作按钮区域 -->
    <div class="flex justify-end mb-4">
      <div class="flex gap-2">
        <Button variant="outline" @click="refreshKeys" :disabled="loading">
          <RefreshCw :class="['w-4 h-4 mr-2', loading && 'animate-spin']" />
          刷新
        </Button>
        <Button @click="openAddDialog">
          <Plus class="w-4 h-4 mr-2" />
          添加密钥
        </Button>
      </div>
    </div>

    <!-- 主卡片容器 -->
    <Card variant="default" class="overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="py-16 text-center space-y-4">
        <Skeleton class="mx-auto h-10 w-10 rounded-full" />
        <Skeleton class="mx-auto h-4 w-32" />
      </div>

      <div v-else>
        <!-- 工具栏: 搜索、筛选、统计 -->
        <div class="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border/60">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div class="shrink-0">
              <h3 class="text-sm sm:text-base font-semibold">
                代理 API 密钥
              </h3>
              <p class="text-xs text-muted-foreground mt-0.5">
                共 {{ apiKeys.length }} 个
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <!-- 搜索框 -->
              <div class="relative">
                <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10 pointer-events-none" />
                <Input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索密钥..."
                  class="h-8 w-28 sm:w-40 pl-8 pr-2 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredApiKeys.length === 0" class="py-16 text-center">
          <div class="flex flex-col items-center justify-center space-y-4">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Key class="h-8 w-8 text-muted-foreground" />
            </div>
            <div v-if="hasActiveFilters">
              <h3 class="text-lg font-semibold">
                未找到匹配的密钥
              </h3>
              <p class="mt-2 text-sm text-muted-foreground">
                尝试调整筛选条件
              </p>
              <Button
                variant="outline"
                size="sm"
                class="mt-3"
                @click="clearFilters"
              >
                清除筛选
              </Button>
            </div>
            <div v-else>
              <h3 class="text-lg font-semibold">
                暂无 API 密钥
              </h3>
              <p class="mt-2 text-sm text-muted-foreground">
                点击右上角按钮创建第一个密钥
              </p>
            </div>
          </div>
        </div>

        <!-- 密钥列表 - 桌面表格视图 -->
        <div class="hidden xl:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="border-b border-border/60 hover:bg-transparent">
                <TableHead class="w-[50px] h-12 font-semibold text-center">
                  #
                </TableHead>
                <TableHead class="w-[200px] h-12 font-semibold">
                  密钥信息
                </TableHead>
                <TableHead class="w-[100px] h-12 font-semibold text-right">
                  使用次数
                </TableHead>
                <TableHead class="w-[150px] h-12 font-semibold">
                  最近使用
                </TableHead>
                <TableHead class="w-[150px] h-12 font-semibold text-right">
                  Token消耗
                </TableHead>
                <TableHead class="w-[130px] h-12 font-semibold text-center">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(apiKey, index) in filteredApiKeys"
                :key="apiKey.id"
                class="border-b border-border/40 hover:bg-muted/30"
              >
                <TableCell class="py-4 text-center">
                  <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary mx-auto">
                    {{ index + 1 }}
                  </div>
                </TableCell>
                <TableCell class="py-4">
                  <div class="space-y-1">
                    <div class="flex items-center gap-1.5">
                      <code class="text-xs font-mono text-muted-foreground">
                        {{ apiKey.keyDisplay }}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-6 w-6"
                        title="复制完整密钥"
                        @click="copyKey(apiKey.key)"
                      >
                        <Copy class="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell class="py-4 text-right">
                  <span class="font-medium text-foreground">
                    {{ apiKey.usageCount.toLocaleString() }}
                  </span>
                </TableCell>
                <TableCell class="py-4">
                  <div class="text-xs">
                    <span v-if="apiKey.lastUsedAt" class="text-foreground">
                      {{ formatDate(apiKey.lastUsedAt) }}
                    </span>
                    <span v-else class="text-muted-foreground">
                      暂无记录
                    </span>
                  </div>
                </TableCell>
                <TableCell class="py-4 text-right">
                  <div class="text-xs font-mono tabular-nums">
                    <div v-if="apiKey.inputTokens || apiKey.outputTokens">
                      <span class="text-green-600 dark:text-green-400">{{ formatTokenCount(apiKey.inputTokens) }}</span>
                      <span class="text-muted-foreground mx-1">/</span>
                      <span class="text-blue-600 dark:text-blue-400">{{ formatTokenCount(apiKey.outputTokens) }}</span>
                    </div>
                    <span v-else class="text-muted-foreground">-</span>
                  </div>
                </TableCell>
                <TableCell class="py-4">
                  <div class="flex justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      title="编辑密钥"
                      @click="openEditDialog(apiKey)"
                    >
                      <SquarePen class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="删除"
                      @click="confirmDelete(apiKey)"
                      :disabled="deletingId === apiKey.id"
                    >
                      <Loader2 v-if="deletingId === apiKey.id" class="h-4 w-4 animate-spin" />
                      <Trash2 v-else class="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- 密钥列表 - 移动端卡片视图 -->
        <div class="xl:hidden divide-y divide-border/40">
          <div
            v-for="(apiKey, index) in filteredApiKeys"
            :key="apiKey.id"
            class="p-4 sm:p-5 hover:bg-muted/30 motion-transition"
          >
            <div class="space-y-4">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {{ index + 1 }}
                    </div>
                    <code class="inline-flex rounded-lg bg-muted px-3 py-1.5 text-xs font-mono font-semibold">
                      {{ apiKey.keyDisplay }}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 hover:bg-muted flex-shrink-0"
                      title="复制完整密钥"
                      @click="copyKey(apiKey.key)"
                    >
                      <Copy class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 min-[350px]:grid-cols-3 gap-2 text-xs">
                <div class="p-2 bg-muted/40 rounded-lg flex flex-row xs:flex-col justify-between xs:justify-start items-center xs:items-stretch">
                  <div class="text-muted-foreground mb-0 xs:mb-1">
                    使用次数
                  </div>
                  <div class="font-semibold font-mono tabular-nums">
                    {{ apiKey.usageCount.toLocaleString() }}
                  </div>
                </div>
                <div class="p-2 bg-muted/40 rounded-lg flex flex-row xs:flex-col justify-between xs:justify-start items-center xs:items-stretch">
                  <div class="text-muted-foreground mb-0 xs:mb-1">
                    最近使用
                  </div>
                  <div class="font-semibold">
                    {{ apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : '暂无' }}
                  </div>
                </div>
                <div class="p-2 bg-muted/40 rounded-lg flex flex-row xs:flex-col justify-between xs:justify-start items-center xs:items-stretch">
                  <div class="text-muted-foreground mb-0 xs:mb-1">
                    Token消耗
                  </div>
                  <div class="font-semibold font-mono tabular-nums text-right">
                    <span v-if="apiKey.inputTokens || apiKey.outputTokens">
                      <span class="text-green-600 dark:text-green-400">{{ formatTokenCount(apiKey.inputTokens) }}</span>
                      <span class="text-muted-foreground">/</span>
                      <span class="text-blue-600 dark:text-blue-400">{{ formatTokenCount(apiKey.outputTokens) }}</span>
                    </span>
                    <span v-else>-</span>
                  </div>
                </div>
              </div>

              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  class="flex-1"
                  @click="openEditDialog(apiKey)"
                >
                  <SquarePen class="h-3.5 w-3.5 mr-1.5" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="text-red-500"
                  @click="confirmDelete(apiKey)"
                  :disabled="deletingId === apiKey.id"
                >
                  <Loader2 v-if="deletingId === apiKey.id" class="h-3.5 w-3.5 animate-spin" />
                  <Trash2 v-else class="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- Add/Edit Key Drawer -->
    <Drawer 
      :open="showDialog" 
      @update:open="showDialog = $event" 
      size="md"
      :title="isEditing ? '编辑 API 密钥' : '添加 API 密钥'"
      :description="isEditing ? '修改现有的 API 密钥' : '创建新的 API 密钥用于客户端访问'"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">API 密钥</label>
          <Input
            v-model="formKey"
            :placeholder="isEditing ? '输入新的 API 密钥' : '输入 API 密钥或留空自动生成'"
            :disabled="saving"
          />
          <p v-if="formError" class="text-xs text-red-500 mt-1">{{ formError }}</p>
        </div>
      </div>
      <template #footer>
        <Button @click="handleSave" :disabled="saving">
          <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
          {{ isEditing ? '更新' : '添加' }}
        </Button>
        <Button variant="outline" @click="closeDialog" :disabled="saving">取消</Button>
      </template>
    </Drawer>

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除这个 API 密钥吗？此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <div class="py-4">
          <div class="p-3 bg-muted/30 rounded-lg font-mono text-sm break-all">
            {{ deleteTargetKey?.keyDisplay || '' }}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="cancelDelete">取消</Button>
          <Button variant="destructive" @click="executeDelete">
            <Loader2 v-if="deletingId" class="w-4 h-4 mr-2 animate-spin" />
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/api/client'
import { useToast } from '@/composables/useToast'
import { useClipboard } from '@/composables/useClipboard'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import {
  Card,
  Button,
  Input,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Drawer,
} from '@/components/ui'
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Loader2,
  RefreshCw,
  Search,
  SquarePen,
} from 'lucide-vue-next'
import type { ApiKeyEntry, ApiKeyInfo } from '@/types'
import { formatDate } from '@/utils/format'

const { toast } = useToast()
const { copy } = useClipboard()

// State
const loading = ref(true)
const rawApiKeys = ref<ApiKeyEntry[]>([])
const showDialog = ref(false)
const formKey = ref('')
const formError = ref('')
const saving = ref(false)
const editingApiKey = ref<ApiKeyInfo | null>(null)

// Delete confirmation
const showDeleteConfirm = ref(false)
const deleteTargetKey = ref<ApiKeyInfo | null>(null)
const deletingId = ref<string | null>(null)

// 筛选
const searchQuery = ref('')

// Computed
const isEditing = computed(() => editingApiKey.value !== null)

const hasActiveFilters = computed(() => {
  return searchQuery.value !== ''
})

// 转换后端数据为前端显示格式
const apiKeys = computed<ApiKeyInfo[]>(() => {
  return rawApiKeys.value.map(raw => {
    const key = raw['api-key'] || ''
    return {
      id: raw.id || '',
      key,
      keyDisplay: maskKey(key),
      name: raw.name || '',
      isActive: raw['is-active'] ?? true,
      usageCount: raw['usage-count'] || 0,
      inputTokens: raw['input-tokens'] || 0,
      outputTokens: raw['output-tokens'] || 0,
      lastUsedAt: raw['last-used-at'] || null,
      createdAt: raw['created-at'] || null
    }
  })
})

// 筛选后的密钥列表
const filteredApiKeys = computed(() => {
  let result = apiKeys.value

  // 搜索筛选
  if (searchQuery.value) {
    const keywords = searchQuery.value.toLowerCase().split(/\s+/).filter(k => k.length > 0)
    result = result.filter(key => {
      const searchableText = `${key.key}`.toLowerCase()
      return keywords.every(keyword => searchableText.includes(keyword))
    })
  }

  return result
})

// Helpers
function maskKey(key: string): string {
  if (key.length <= 8) return key
  return `${key.substring(0, 4)}${'*'.repeat(Math.min(key.length - 8, 20))}${key.substring(key.length - 4)}`
}

function formatTokenCount(count: number): string {
  if (!count || count === 0) return '0'
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K'
  }
  return count.toLocaleString()
}

// 验证 API 密钥字符
function isValidApiKeyCharset(key: string): boolean {
  return /^[\w-]+$/.test(key)
}

async function copyKey(key: string) {
  await copy(key)
  toast({ title: '已复制到剪贴板' })
}

function clearFilters() {
  searchQuery.value = ''
}

async function fetchKeys() {
  loading.value = true
  try {
    const data = await apiClient.get<{ 'api-keys'?: ApiKeyEntry[] }>('/api-keys')
    const keys = data?.['api-keys'] ?? []
    rawApiKeys.value = Array.isArray(keys) ? keys : []
  } catch {
    toast({ title: '加载 API 密钥失败', variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

async function refreshKeys() {
  await fetchKeys()
  toast({ title: '已刷新' })
}

function openAddDialog() {
  editingApiKey.value = null
  formKey.value = ''
  formError.value = ''
  showDialog.value = true
}

function openEditDialog(apiKey: ApiKeyInfo) {
  editingApiKey.value = apiKey
  formKey.value = apiKey.key
  formError.value = ''
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  formKey.value = ''
  formError.value = ''
  editingApiKey.value = null
}

async function handleSave() {
  const trimmedKey = formKey.value.trim()
  
  // 编辑模式必须有值
  if (isEditing.value && !trimmedKey) {
    formError.value = '请输入 API 密钥'
    return
  }

  // 如果有值，验证字符
  if (trimmedKey && !isValidApiKeyCharset(trimmedKey)) {
    formError.value = 'API 密钥只能包含字母、数字、下划线和横杠'
    return
  }

  formError.value = ''
  saving.value = true

  try {
    if (isEditing.value && editingApiKey.value) {
      // 更新密钥 - 使用 PATCH 接口，通过 ID 定位
      const patchPayload: Record<string, string> = {
        id: editingApiKey.value.id
      }
      
      // 如果密钥值变了
      if (trimmedKey !== editingApiKey.value.key) {
        patchPayload['api-key'] = trimmedKey
      }
      
      // 只有有变化时才发请求
      if (Object.keys(patchPayload).length > 1) {
        await apiClient.patch('/api-keys', patchPayload)
      }
      
      toast({ title: 'API 密钥已更新' })
    } else {
      // 添加新密钥
      const keyToAdd = trimmedKey || crypto.randomUUID()
      await apiClient.post('/api-keys', {
        'api-key': keyToAdd
      })
      
      toast({ title: 'API 密钥添加成功' })
    }
    closeDialog()
    await fetchKeys()
  } catch (err: unknown) {
    const error = err as { message?: string }
    toast({ title: error?.message || '操作失败', variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(apiKey: ApiKeyInfo) {
  deleteTargetKey.value = apiKey
  showDeleteConfirm.value = true
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deleteTargetKey.value = null
}

async function executeDelete() {
  if (!deleteTargetKey.value) return
  
  const id = deleteTargetKey.value.id
  deletingId.value = id
  showDeleteConfirm.value = false

  try {
    await apiClient.delete(`/api-keys?id=${encodeURIComponent(id)}`)
    toast({ title: 'API 密钥已删除' })
    await fetchKeys()
  } catch {
    toast({ title: '删除 API 密钥失败', variant: 'destructive' })
  } finally {
    deletingId.value = null
    deleteTargetKey.value = null
  }
}

onMounted(fetchKeys)
</script>
