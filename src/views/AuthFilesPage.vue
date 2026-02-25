<template>
  <PageContainer>
    <!-- Page Error Banner (prevents blank screen on failures) -->
    <div v-if="pageError" class="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm">
      <div class="font-medium text-destructive">请求失败</div>
      <div class="mt-1 text-destructive/90 break-all">{{ pageError }}</div>
      <div class="mt-2 text-xs text-muted-foreground">
        如果是 Codex 凭证显示 <code class="font-mono">token_invalidated</code> / 401，请重新登录后再刷新。
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
      <div class="relative">
        <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文件..."
          class="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div class="flex items-center gap-2">
        <Button v-if="loadedQuotaCount > 0" variant="outline" @click="clearAllQuotaStates" class="hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-900/20 hover:scale-105 transition-all duration-200">
          <Trash2 class="w-4 h-4 mr-2" />
          清除配额 ({{ loadedQuotaCount }})
        </Button>
        <Button @click="triggerUpload" class="hover:scale-105 transition-all duration-200">
          <Upload class="w-4 h-4 mr-2" />
          上传文件
        </Button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        multiple
        class="hidden"
        @change="handleFileUpload"
      />
    </div>

    <!-- Filter Tags -->
    <div class="mb-6 flex flex-wrap gap-2">
      <button
        class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:scale-105"
        :class="currentFilter === 'all' 
          ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-md' 
          : 'border-transparent bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30'"
        @click="currentFilter = 'all'"
      >
        全部
        <span class="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] leading-none dark:bg-white/15">{{ files.length }}</span>
      </button>
      <button
        v-for="type in availableTypes"
        :key="type"
        class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 capitalize hover:scale-105"
        :class="currentFilter === type 
          ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-md' 
          : 'border-transparent bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30'"
        @click="currentFilter = type"
      >
        {{ type }}
        <span class="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] leading-none dark:bg-white/15">{{ typeCounts[type] || 0 }}</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-8">
      <div v-for="i in 3" :key="i" class="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div class="mb-4 flex items-center gap-3">
          <div class="h-6 w-32 rounded bg-muted animate-pulse"></div>
          <div class="h-5 w-8 rounded-full bg-muted animate-pulse"></div>
        </div>
        <div class="grid gap-3 grid-cols-1 min-[450px]:grid-cols-2 min-[1300px]:grid-cols-3">
          <div v-for="j in 3" :key="j" class="rounded-xl border border-border bg-card p-5 shadow-sm h-48 animate-pulse">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3 w-full">
                <div class="h-10 w-10 rounded-lg bg-muted"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 w-3/4 rounded bg-muted"></div>
                  <div class="h-3 w-1/2 rounded bg-muted"></div>
                </div>
              </div>
            </div>
            <div class="mt-8 space-y-2">
              <div class="h-2 w-full rounded bg-muted"></div>
              <div class="h-2 w-full rounded bg-muted"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <CardSection v-else-if="filteredFiles.length === 0" class="text-center py-20 border-dashed">
      <FileText class="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
      <h3 class="text-xl font-semibold text-foreground mb-2">
        {{ searchQuery ? '未找到匹配文件' : '暂无认证文件' }}
      </h3>
      <p class="text-muted-foreground mb-6 max-w-sm mx-auto">
        {{ searchQuery ? '请尝试更换搜索关键词' : '上传 OAuth 凭证 JSON 文件以开始使用' }}
      </p>
      <Button v-if="!searchQuery" @click="triggerUpload">
        <Upload class="w-4 h-4 mr-2" />
        上传文件
      </Button>
      <Button v-else variant="outline" @click="searchQuery = ''">
        清除搜索
      </Button>
    </CardSection>

    <!-- Grouped Files by Type -->
    <div v-else class="space-y-8">
      <!-- Antigravity Section -->
      <AuthFileSection
        v-if="antigravityFiles.length > 0 && (currentFilter === 'all' || currentFilter === 'antigravity')"
        title="Antigravity"
        :files="searchFilteredFiles(antigravityFiles)"
        :section-class="'bg-gradient-to-b from-cyan-50/10 to-transparent dark:from-cyan-900/10'"
        :toggling-map="authFileToggling"
        @download="downloadFile"
        @delete="deleteFile"
        @show-models="showModelsModal"
        @show-info="showInfoModal"
        @edit="openEditModal"
        @refresh="handleSectionRefresh"
        @toggle-disabled="toggleAuthFileDisabled"
      />

      <!-- Codex Section -->
      <AuthFileSection
        v-if="codexFiles.length > 0 && (currentFilter === 'all' || currentFilter === 'codex')"
        title="Codex"
        :files="searchFilteredFiles(codexFiles)"
        :section-class="'bg-gradient-to-b from-amber-50/10 to-transparent dark:from-amber-900/10'"
        :toggling-map="authFileToggling"
        :show-remove-invalid-action="true"
        :remove-invalid-loading="removingInvalidCodex"
        @download="downloadFile"
        @delete="deleteFile"
        @show-models="showModelsModal"
        @show-info="showInfoModal"
        @edit="openEditModal"
        @refresh="handleSectionRefresh"
        @toggle-disabled="toggleAuthFileDisabled"
        @remove-invalid="removeInvalidCodexCredentials"
      />

      <!-- Gemini CLI Section -->
      <AuthFileSection
        v-if="geminiCliFiles.length > 0 && (currentFilter === 'all' || currentFilter === 'gemini-cli')"
        title="Gemini CLI"
        :files="searchFilteredFiles(geminiCliFiles)"
        :section-class="'bg-gradient-to-b from-blue-50/10 to-transparent dark:from-blue-900/10'"
        :toggling-map="authFileToggling"
        @download="downloadFile"
        @delete="deleteFile"
        @show-models="showModelsModal"
        @show-info="showInfoModal"
        @edit="openEditModal"
        @refresh="handleSectionRefresh"
        @toggle-disabled="toggleAuthFileDisabled"
      />

      <!-- Other Types Section -->
      <AuthFileSection
        v-if="otherFiles.length > 0 && (currentFilter === 'all' || !['antigravity', 'codex', 'gemini-cli'].includes(currentFilter))"
        title="其他"
        :files="currentFilter === 'all' ? searchFilteredFiles(otherFiles) : searchFilteredFiles(filteredOtherFiles)"
        :section-class="'bg-gradient-to-b from-gray-50/10 to-transparent dark:from-gray-900/10'"
        :toggling-map="authFileToggling"
        @download="downloadFile"
        @delete="deleteFile"
        @show-models="showModelsModal"
        @show-info="showInfoModal"
        @edit="openEditModal"
        @refresh="handleSectionRefresh"
        @toggle-disabled="toggleAuthFileDisabled"
      />
    </div>

    <!-- Models Modal -->
    <div 
      v-if="modelsModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="modelsModalOpen = false"
    >
      <div class="bg-card rounded-xl border shadow-lg p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">支持的模型 - {{ modelsFileName }}</h3>
          <Button variant="ghost" size="icon" @click="modelsModalOpen = false" class="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 hover:scale-110 transition-all duration-200">
            <X class="h-4 w-4" />
          </Button>
        </div>
        <div v-if="modelsLoading" class="py-8 text-center text-muted-foreground">
          <RefreshCw class="h-6 w-6 animate-spin mx-auto mb-2" />
          正在加载模型列表...
        </div>
        <div v-else-if="modelsError" class="py-8 text-center">
          <div class="text-destructive mb-2">{{ modelsError }}</div>
        </div>
        <div v-else-if="modelsList.length === 0" class="py-8 text-center text-muted-foreground">
          <p class="mb-1">该凭证暂无可用模型</p>
          <p class="text-xs">该认证凭证可能尚未被服务器加载或没有绑定任何模型</p>
        </div>
        <div v-else class="space-y-2">
          <div 
            v-for="model in modelsList" 
            :key="model.id"
            class="px-3 py-2 rounded-lg bg-secondary/50 text-sm cursor-pointer hover:bg-secondary/80 transition-colors"
            title="点击复制模型 ID"
            @click="copyModelId(model.id)"
          >
            <div class="flex items-center justify-between">
              <span class="font-mono font-medium">{{ model.id }}</span>
              <span v-if="model.type" class="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{{ model.type }}</span>
            </div>
            <div v-if="model.display_name && model.display_name !== model.id" class="text-xs text-muted-foreground mt-1">
              {{ model.display_name }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Modal -->
    <div 
      v-if="infoModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="infoModalOpen = false"
    >
      <div class="bg-card rounded-xl border shadow-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between mb-4 shrink-0">
          <h3 class="text-lg font-semibold truncate">{{ selectedFileInfo?.name || '凭证信息' }}</h3>
          <Button variant="ghost" size="icon" @click="infoModalOpen = false" class="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 hover:scale-110 transition-all duration-200">
            <X class="h-4 w-4" />
          </Button>
        </div>
        <div v-if="selectedFileInfo" class="flex-1 overflow-auto">
          <pre class="bg-secondary/30 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap break-all overflow-x-auto">{{ JSON.stringify(selectedFileInfo, null, 2) }}</pre>
        </div>
        <div class="flex justify-end gap-2 mt-4 pt-4 border-t shrink-0">
          <Button variant="outline" @click="infoModalOpen = false" class="hover:scale-105 transition-all duration-200">
            关闭
          </Button>
          <Button @click="copyFileInfo" class="hover:scale-105 transition-all duration-200">
            复制
          </Button>
        </div>
      </div>
    </div>

    <!-- Quick Edit Modal -->
    <Dialog
      :open="editModal.open"
      @update:open="(v) => (v ? null : closeEditModal())"
      size="md"
      :title="editModal.target?.name ? `快捷修改 - ${editModal.target.name}` : '快捷修改'"
      description="快速修改 OAuth 凭证文件的 proxy/prefix（写入 JSON 文件）"
    >
      <div class="space-y-4">
        <div v-if="editModal.loading" class="py-8 text-center text-muted-foreground">
          <RefreshCw class="h-6 w-6 animate-spin mx-auto mb-2" />
          正在读取凭证文件...
        </div>

        <div v-else class="space-y-4">
          <div class="space-y-1">
            <label class="text-sm font-medium text-foreground mb-1 block">Proxy URL（可选）</label>
            <Input
              v-model="editModal.form.proxyUrl"
              placeholder="socks5://user:pass@host:1080"
              :disabled="editModal.saving"
            />
            <div class="text-xs text-muted-foreground">
              写入字段：<code class="font-mono">proxy_url</code>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium text-foreground mb-1 block">Prefix（可选）</label>
            <Input
              v-model="editModal.form.prefix"
              placeholder="teamA"
              :disabled="editModal.saving"
            />
            <div class="text-xs text-muted-foreground">
              写入字段：<code class="font-mono">prefix</code>（不能包含 <code class="font-mono">/</code>）
            </div>
          </div>

          <div v-if="editModal.error" class="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {{ editModal.error }}
          </div>
        </div>
      </div>

      <template #footer>
        <Button @click="saveEditModal" :disabled="editModal.loading || editModal.saving">
          <RefreshCw v-if="editModal.saving" class="w-4 h-4 mr-2 animate-spin" />
          保存
        </Button>
        <Button variant="outline" @click="closeEditModal" :disabled="editModal.saving">取消</Button>
      </template>
    </Dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide, reactive } from 'vue'
import { apiClient } from '@/api/client'
import { apiCallApi, getApiCallErrorMessage } from '@/api/apiCall'
import { useToast } from '@/composables/useToast'
import { useClipboard } from '@/composables/useClipboard'
import { useQuotaStore } from '@/stores/quota'
import { useAuthStatsStore } from '@/stores/authStats'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import CardSection from '@/components/layout/CardSection.vue'
import Button from '@/components/ui/button.vue'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import Input from '@/components/ui/input.vue'
import AuthFileSection from '@/components/auth/AuthFileSection.vue'
import type { AuthFileItem, AuthFilesResponse } from '@/types'
import {
  CODEX_REQUEST_HEADERS,
  CODEX_USAGE_URL,
  normalizeAuthIndexValue,
  resolveCodexChatgptAccountId,
} from '@/utils/quota'
import {
  FileText,
  Upload,
  Search,
  X,
  RefreshCw,
  Trash2
} from 'lucide-vue-next'
import { formatUnixTimestamp, formatDateOnly } from '@/utils/format'
import { MAX_AUTH_FILE_SIZE } from '@/utils/constants'

const { toast } = useToast()
const { copy } = useClipboard()
const quotaStore = useQuotaStore()
const authStatsStore = useAuthStatsStore()

const loading = ref(true)
const files = ref<AuthFileItem[]>([])
const fileInput = ref<HTMLInputElement>()
const searchQuery = ref('')
const currentFilter = ref('all')
const authFileToggling = ref<Record<string, boolean>>({})
const removingInvalidCodex = ref(false)

// Page-level error (keep UI visible even when API calls fail)
const pageError = ref<string | null>(null)

// Models modal state
const modelsModalOpen = ref(false)
const modelsLoading = ref(false)
const modelsError = ref<string | null>(null)
const modelsList = ref<{ id: string; display_name?: string; type?: string }[]>([])
const modelsFileName = ref('')

// Info modal state
const infoModalOpen = ref(false)
const selectedFileInfo = ref<AuthFileItem | null>(null)

// Quick edit modal state
const editModal = reactive({
  open: false,
  loading: false,
  saving: false,
  error: '',
  target: null as AuthFileItem | null,
  original: null as Record<string, any> | null,
  form: {
    proxyUrl: '',
    prefix: ''
  }
})

// Refresh trigger for child cards - provide a reactive ref that contains files to refresh
const refreshTrigger = ref<Set<string>>(new Set())
provide('quotaRefreshTrigger', refreshTrigger)

// Handle section refresh event
async function handleSectionRefresh(filesToRefresh: AuthFileItem[]) {
  // Add file names to refresh trigger set
  const fileNames = filesToRefresh.map(f => f.name)
  refreshTrigger.value = new Set(fileNames)
  // Clear after a short delay so cards can pick it up
  setTimeout(() => {
    refreshTrigger.value = new Set()
  }, 100)
}

// Clear all quota states
const clearAllQuotaStates = () => {
  if (confirm('确定要清除所有配额信息吗？这将重置所有已加载的配额状态。')) {
    quotaStore.clearAllStates()
    toast({ title: '已清除所有配额信息' })
  }
}

// Get loaded quota count for display
const loadedQuotaCount = computed(() => quotaStore.getLoadedQuotaCount())

// Available types for filter
const availableTypes = computed(() => {
  const types = new Set<string>()
  files.value.forEach(f => {
    if (f.type) types.add(f.type)
  })
  return Array.from(types).sort()
})

const typeCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  files.value.forEach((f) => {
    const key = (f.type || '').trim()
    if (!key) return
    counts[key] = (counts[key] || 0) + 1
  })
  return counts
})

// Group files by type
const antigravityFiles = computed(() => 
  files.value.filter(f => f.type === 'antigravity')
)

const codexFiles = computed(() => 
  files.value.filter(f => f.type === 'codex')
)

const geminiCliFiles = computed(() => 
  files.value.filter(f => f.type === 'gemini-cli')
)

const otherFiles = computed(() => 
  files.value.filter(f => !['antigravity', 'codex', 'gemini-cli'].includes(f.type || ''))
)

const filteredOtherFiles = computed(() => 
  otherFiles.value.filter(f => f.type === currentFilter.value)
)

// Filtered files for empty state check
const filteredFiles = computed(() => {
  let result = files.value

  // Type filter
  if (currentFilter.value !== 'all') {
    result = result.filter(f => f.type === currentFilter.value)
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(f => f.name.toLowerCase().includes(query))
  }

  return result
})

// Helper to apply search filter to a file array
function searchFilteredFiles(fileList: AuthFileItem[]): AuthFileItem[] {
  if (!searchQuery.value) return fileList
  const query = searchQuery.value.toLowerCase()
  return fileList.filter(f => f.name.toLowerCase().includes(query))
}

function triggerUpload() {
  fileInput.value?.click()
}

async function fetchFiles() {
  loading.value = true
  pageError.value = null
  try {
    const data = await apiClient.get<AuthFilesResponse>('/auth-files')
    files.value = data.files || []
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载认证文件失败'
    pageError.value = message
    toast({ title: '加载认证文件失败', description: message, variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement

  const list = input.files ? Array.from(input.files) : []
  if (list.length === 0) return

  const valid: File[] = []
  const invalidNames: string[] = []
  const oversizedNames: string[] = []

  // Basic client-side validation to reduce accidental uploads.
  for (const file of list) {
    if (!file.name.toLowerCase().endsWith('.json')) {
      invalidNames.push(file.name)
      continue
    }
    if (file.size > MAX_AUTH_FILE_SIZE) {
      oversizedNames.push(file.name)
      continue
    }
    valid.push(file)
  }

  if (invalidNames.length > 0) {
    toast({
      title: '仅支持 JSON 文件',
      description: invalidNames.slice(0, 5).join('、') + (invalidNames.length > 5 ? '…' : ''),
      variant: 'destructive'
    })
  }

  if (oversizedNames.length > 0) {
    toast({
      title: '文件过大',
      description: `单个文件最大 ${Math.round(MAX_AUTH_FILE_SIZE / (1024 * 1024))}MB：${oversizedNames.slice(0, 3).join('、')}${oversizedNames.length > 3 ? '…' : ''}`,
      variant: 'destructive'
    })
  }

  if (valid.length === 0) {
    input.value = ''
    return
  }

  let success = 0
  const failed: { name: string; message: string }[] = []

  // The backend endpoint is single-file. Batch upload is achieved by looping.
  for (const file of valid) {
    const formData = new FormData()
    formData.append('file', file, file.name)
    try {
      await apiClient.postForm('/auth-files', formData)
      success++
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败'
      failed.push({ name: file.name, message })
    }
  }

  if (success > 0) {
    const suffix = valid.length > 1 ? `（${success}/${valid.length}）` : ''
    toast({ title: `文件上传成功${suffix}`, variant: failed.length ? 'warning' : 'default' })
    await fetchFiles()
  }

  if (failed.length > 0) {
    const preview = failed
      .slice(0, 3)
      .map((item) => `${item.name}: ${item.message}`)
      .join('；')
    toast({
      title: `有 ${failed.length} 个文件上传失败`,
      description: preview + (failed.length > 3 ? '…' : ''),
      variant: 'destructive'
    })
  }

  input.value = ''
}

async function downloadFile(name: string) {
  try {
    const response = await apiClient.getRaw(`/auth-files/download?name=${encodeURIComponent(name)}`)
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    const message = err instanceof Error ? err.message : '下载文件失败'
    toast({ title: '下载文件失败', description: message, variant: 'destructive' })
  }
}

async function deleteFile(name: string) {
  if (!confirm(`确定要删除 ${name} 吗？`)) return
  
  try {
    await apiClient.delete(`/auth-files?name=${encodeURIComponent(name)}`)
    toast({ title: '文件已删除' })
    await fetchFiles()
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除文件失败'
    toast({ title: '删除文件失败', description: message, variant: 'destructive' })
  }
}

async function removeInvalidCodexCredentials(sectionFiles: AuthFileItem[]) {
  if (removingInvalidCodex.value) return

  const codexTargets = sectionFiles.filter((f) => (f.type || '').toLowerCase() === 'codex')
  if (codexTargets.length === 0) {
    toast({ title: '当前分组没有可处理的 Codex 凭证' })
    return
  }

  if (!confirm(`将校验 ${codexTargets.length} 个 Codex 凭证，并批量删除失效项，是否继续？`)) return

  removingInvalidCodex.value = true
  try {
    const validationResults = await Promise.all(
      codexTargets.map(async (file) => {
        const rawAuthIndex = file.authIndex ?? (file as Record<string, unknown>)['auth_index']
        const authIndex = normalizeAuthIndexValue(rawAuthIndex)
        const accountId = resolveCodexChatgptAccountId(file)

        if (!authIndex) {
          return { file, valid: false as const, reason: '缺少认证索引' }
        }
        if (!accountId) {
          return { file, valid: false as const, reason: '缺少 ChatGPT 账户 ID' }
        }

        try {
          // 使用 Codex 配额接口做校验（与“刷新配额”一致）：报错则记录为失效
          const response = await apiCallApi.request({
            authIndex,
            method: 'GET',
            url: CODEX_USAGE_URL,
            header: {
              ...CODEX_REQUEST_HEADERS,
              'Chatgpt-Account-Id': accountId,
            },
          })

          if (response.statusCode < 200 || response.statusCode >= 300) {
            return {
              file,
              valid: false as const,
              reason: getApiCallErrorMessage(response),
            }
          }

          return { file, valid: true as const }
        } catch (err) {
          const message = err instanceof Error ? err.message : '校验失败'
          return { file, valid: false as const, reason: message }
        }
      })
    )

    const invalidItems = validationResults.filter((item) => !item.valid)

    if (invalidItems.length === 0) {
      toast({ title: `校验完成：${codexTargets.length} 个凭证均有效` })
      return
    }

    const deleteResults = await Promise.allSettled(
      invalidItems.map((item) =>
        apiClient.delete(`/auth-files?name=${encodeURIComponent(item.file.name)}`)
      )
    )

    const deleted = deleteResults.filter((r) => r.status === 'fulfilled').length
    const deleteFailed = deleteResults.length - deleted
    const invalidPreview = invalidItems
      .slice(0, 3)
      .map((item) => `${item.file.name}${item.reason ? `（${item.reason}）` : ''}`)
      .join('、')

    if (deleted > 0) {
      toast({
        title: `已删除 ${deleted} 个失效 Codex 凭证`,
        description: invalidPreview
          ? `校验失败示例：${invalidPreview}${invalidItems.length > 3 ? '…' : ''}`
          : undefined,
      })
      await fetchFiles()
    }

    if (deleteFailed > 0) {
      toast({
        title: `有 ${deleteFailed} 个失效凭证删除失败`,
        variant: 'destructive',
      })
    }
  } finally {
    removingInvalidCodex.value = false
  }
}

function resolveAuthFileIdentifier(file: AuthFileItem): string {
  const raw = (file.id ?? (file as any).id ?? file.name) as unknown
  return typeof raw === 'string' ? raw : String(raw)
}

async function toggleAuthFileDisabled(payload: { file: AuthFileItem; disabled: boolean }) {
  const fileName = payload.file.name
  if (authFileToggling.value[fileName]) return

  const prev = Boolean(payload.file.disabled)
  payload.file.disabled = payload.disabled
  authFileToggling.value[fileName] = true

  try {
    await apiClient.patch('/auth-files/status', {
      name: resolveAuthFileIdentifier(payload.file),
      disabled: payload.disabled
    })
    toast({ title: payload.disabled ? '凭证已禁用' : '凭证已启用' })
  } catch (err) {
    payload.file.disabled = prev

    const status = (err as any)?.status as number | undefined
    const message = err instanceof Error ? err.message : ''
    if (status === 404 || message.toLowerCase().includes('not found')) {
      toast({ title: '当前版本不支持凭证开关，请更新 CLI Proxy API', variant: 'destructive' })
    } else {
      toast({ title: '切换凭证状态失败', variant: 'destructive' })
    }
  } finally {
    delete authFileToggling.value[fileName]
  }
}

// Show models modal - fetches from /auth-files/models API
async function showModelsModal(file: AuthFileItem) {
  modelsModalOpen.value = true
  modelsLoading.value = true
  modelsError.value = null
  modelsList.value = []
  modelsFileName.value = file.name

  try {
    const data = await apiClient.get<{ models: { id: string; display_name?: string; type?: string }[] }>(
      `/auth-files/models?name=${encodeURIComponent(file.name)}`
    )
    const models = data?.models
    if (Array.isArray(models)) {
      modelsList.value = models
    } else {
      modelsList.value = []
    }
  } catch (err) {
    // Check for 404 (API not supported)
    const errorMessage = err instanceof Error ? err.message : ''
    if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('Not Found')) {
      modelsError.value = '当前版本不支持此功能，请更新 CLI Proxy API'
    } else {
      modelsError.value = errorMessage || '获取模型列表失败'
    }
  } finally {
    modelsLoading.value = false
  }
}

// Show info modal
function showInfoModal(file: AuthFileItem) {
  selectedFileInfo.value = file
  infoModalOpen.value = true
}

function coerceJsonObject(input: unknown): Record<string, any> | null {
  if (!input) return null
  if (typeof input === 'object') return input as Record<string, any>
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, any>
    } catch {
      return null
    }
  }
  return null
}

async function openEditModal(file: AuthFileItem) {
  editModal.open = true
  editModal.loading = true
  editModal.saving = false
  editModal.error = ''
  editModal.target = file
  editModal.original = null
  editModal.form.proxyUrl = (file as any).proxy_url ?? (file as any).proxyUrl ?? ''
  editModal.form.prefix = (file as any).prefix ?? ''

  try {
    const response = await apiClient.getRaw(`/auth-files/download?name=${encodeURIComponent(file.name)}`)
    const json = coerceJsonObject(response.data)
    if (!json) {
      throw new Error('无法解析凭证文件内容')
    }
    editModal.original = json
    editModal.form.proxyUrl = typeof json.proxy_url === 'string' ? json.proxy_url : ''
    editModal.form.prefix = typeof json.prefix === 'string' ? json.prefix : ''
  } catch (err) {
    editModal.error = err instanceof Error ? err.message : '读取凭证文件失败'
  } finally {
    editModal.loading = false
  }
}

function closeEditModal() {
  editModal.open = false
  editModal.loading = false
  editModal.saving = false
  editModal.error = ''
  editModal.target = null
  editModal.original = null
  editModal.form.proxyUrl = ''
  editModal.form.prefix = ''
}

async function saveEditModal() {
  if (!editModal.target) return
  if (editModal.saving) return

  const name = editModal.target.name
  const proxyUrl = editModal.form.proxyUrl.trim()
  const prefixRaw = editModal.form.prefix.trim().replace(/^\/+|\/+$/g, '')

  if (prefixRaw.includes('/')) {
    editModal.error = 'Prefix 不能包含 /'
    return
  }

  editModal.saving = true
  editModal.error = ''

  try {
    // Prefer server-side patch (newer versions).
    try {
      await apiClient.patch('/auth-files/metadata', {
        name,
        proxy_url: proxyUrl,
        prefix: prefixRaw
      })
    } catch (err) {
      const status = (err as any)?.status as number | undefined
      const message = err instanceof Error ? err.message : ''
      const notSupported = status === 404 || message.toLowerCase().includes('not found')
      if (!notSupported) throw err

      // Fallback: download + overwrite file via legacy upload endpoint.
      const response = await apiClient.getRaw(`/auth-files/download?name=${encodeURIComponent(name)}`)
      const json = coerceJsonObject(response.data) || {}

      if (proxyUrl) (json as any).proxy_url = proxyUrl
      else delete (json as any).proxy_url

      if (prefixRaw) (json as any).prefix = prefixRaw
      else delete (json as any).prefix

      await apiClient.post(`/auth-files?name=${encodeURIComponent(name)}`, JSON.stringify(json), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    toast({ title: '保存成功' })
    closeEditModal()
    await fetchFiles()
  } catch (err) {
    editModal.error = err instanceof Error ? err.message : '保存失败'
    toast({ title: '保存失败', variant: 'destructive' })
  } finally {
    editModal.saving = false
  }
}

// Copy model ID to clipboard
async function copyModelId(modelId: string) {
  const success = await copy(modelId)
  if (success) {
    toast({ title: '已复制到剪贴板' })
  } else {
    toast({ title: '复制失败', variant: 'destructive' })
  }
}

// Copy file info JSON to clipboard
async function copyFileInfo() {
  if (!selectedFileInfo.value) return
  const text = JSON.stringify(selectedFileInfo.value, null, 2)
  const success = await copy(text)
  if (success) {
    toast({ title: '已复制到剪贴板' })
  } else {
    toast({ title: '复制失败', variant: 'destructive' })
  }
}

// Helper: Format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return '未知大小'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Helper: Format date
function formatDate(dateValue?: number | string): string {
  if (!dateValue) return ''
  if (typeof dateValue === 'number') {
    return formatUnixTimestamp(dateValue) || ''
  }
  return formatDateOnly(dateValue) || ''
}

onMounted(() => {
  fetchFiles()
  authStatsStore.loadStats()
})
</script>
