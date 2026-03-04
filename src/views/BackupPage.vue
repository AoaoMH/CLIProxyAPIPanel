<template>
  <PageContainer>
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <!-- Action Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Create Backup Card -->
        <div 
          class="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md border-book-cloth/30 dark:border-book-cloth/20"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-book-cloth/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div class="p-6 relative">
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <div class="p-2 w-fit rounded-lg bg-book-cloth/10 text-book-cloth mb-3">
                  <Download class="w-5 h-5" />
                </div>
                <h3 class="font-semibold text-lg tracking-tight">创建备份</h3>
                <p class="text-sm text-muted-foreground leading-relaxed max-w-[85%]">
                  导出所有设置、API 密钥和提供商配置到本地文件。
                </p>
              </div>
            </div>
            <div class="mt-6">
              <Button 
                @click="openBackupDialog" 
                :disabled="creatingBackup" 
                class="w-full sm:w-auto bg-book-cloth hover:bg-book-cloth/90 text-white shadow-sm"
              >
                <Loader2 v-if="creatingBackup" class="w-4 h-4 mr-2 animate-spin" />
                <Download v-else class="w-4 h-4 mr-2" />
                立即创建备份
              </Button>
            </div>
          </div>
        </div>

        <!-- Restore Backup Card -->
        <div 
          class="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md border-kraft/40 dark:border-kraft/30"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-kraft/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div class="p-6 relative">
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <div class="p-2 w-fit rounded-lg bg-kraft/20 text-orange-700 dark:text-orange-400 mb-3">
                  <Upload class="w-5 h-5" />
                </div>
                <h3 class="font-semibold text-lg tracking-tight">恢复备份</h3>
                <p class="text-sm text-muted-foreground leading-relaxed max-w-[85%]">
                  上传之前的备份文件以恢复系统设置。
                </p>
              </div>
            </div>
            <div class="mt-6">
              <input
                ref="restoreInput"
                type="file"
                accept=".zip"
                class="hidden"
                @change="handleRestore"
              />
              <Button 
                variant="outline" 
                @click="restoreInput?.click()" 
                :disabled="restoring"
                class="w-full sm:w-auto border-kraft/40 hover:bg-kraft/10 hover:text-orange-800 dark:hover:text-orange-300"
              >
                <Loader2 v-if="restoring" class="w-4 h-4 mr-2 animate-spin" />
                <Upload v-else class="w-4 h-4 mr-2" />
                选择备份文件
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Backup History -->
      <div class="space-y-4">
        <div class="flex items-center justify-between px-1">
          <h3 class="text-lg font-medium tracking-tight flex items-center gap-2">
            <Archive class="w-5 h-5 text-muted-foreground" />
            备份历史
          </h3>
          <span class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md font-mono" v-if="backups.length">
            Total: {{ backups.length }}
          </span>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-12 space-y-4 border rounded-xl border-dashed">
          <Loader2 class="w-8 h-8 animate-spin text-muted-foreground/50" />
          <p class="text-sm text-muted-foreground">加载历史记录...</p>
        </div>

        <div v-else-if="backups.length === 0" class="flex flex-col items-center justify-center py-16 space-y-4 border rounded-xl border-dashed bg-muted/5">
          <div class="p-4 rounded-full bg-muted/50">
            <Archive class="w-8 h-8 text-muted-foreground/50" />
          </div>
          <div class="text-center space-y-1">
            <p class="font-medium text-foreground">暂无备份历史</p>
            <p class="text-sm text-muted-foreground">创建的备份文件将显示在这里</p>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 gap-3">
          <div
            v-for="backup in backups"
            :key="backup.name"
            class="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 hover:border-muted-foreground/30 transition-all duration-200 shadow-sm"
          >
            <div class="flex items-start sm:items-center gap-4 min-w-0">
              <div class="hidden sm:flex w-10 h-10 rounded-lg bg-primary/5 border border-primary/10 items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <span class="font-mono text-xs font-bold text-primary/70">ZIP</span>
              </div>
              <div class="min-w-0 flex-1 space-y-1">
                <div class="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {{ backup.name }}
                </div>
                <div class="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                  <span class="flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {{ formatDate(backup.date) }}
                  </span>
                  <span v-if="backup.size" class="flex items-center gap-1">
                    <Database class="w-3 h-3" />
                    {{ formatSize(backup.size) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2 mt-4 sm:mt-0 pl-14 sm:pl-0 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="sm" 
                @click="downloadBackup(backup.name)"
                class="h-8 px-2 hover:bg-primary/10 hover:text-primary"
                title="下载"
              >
                <Download class="w-4 h-4 mr-1.5 sm:mr-0" />
                <span class="sm:hidden text-xs">下载</span>
              </Button>
              <div class="h-4 w-px bg-border hidden sm:block"></div>
              <Button 
                variant="ghost" 
                size="sm" 
                class="h-8 px-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                @click="deleteBackup(backup.name)"
                title="删除"
              >
                <Trash2 class="w-4 h-4 mr-1.5 sm:mr-0" />
                <span class="sm:hidden text-xs">删除</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Backup Dialog -->
    <Dialog v-model:open="backupDialogOpen" size="md" title="创建备份" :icon="Download">
      <div class="space-y-4">
        <!-- Backup Name -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">备份名称（可选）</label>
          <input
            v-model="backupForm.name"
            type="text"
            placeholder="留空则自动生成"
            class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <!-- Backup Content -->
        <div class="space-y-3">
          <label class="text-sm font-medium text-foreground">备份内容</label>
          <div class="space-y-2">
            <label class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <Checkbox v-model="backupForm.content.config" />
              <div class="flex-1">
                <div class="text-sm font-medium">配置文件</div>
                <div class="text-xs text-muted-foreground">config.yaml - 服务器配置</div>
              </div>
              <Settings class="w-4 h-4 text-muted-foreground" />
            </label>
            <label class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <Checkbox v-model="backupForm.content.auths" />
              <div class="flex-1">
                <div class="text-sm font-medium">认证文件</div>
                <div class="text-xs text-muted-foreground">auths/ - OAuth 凭证和 API 密钥</div>
              </div>
              <Key class="w-4 h-4 text-muted-foreground" />
            </label>
            <label class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <Checkbox v-model="backupForm.content.env" />
              <div class="flex-1">
                <div class="text-sm font-medium">环境变量</div>
                <div class="text-xs text-muted-foreground">.env - 环境配置文件</div>
              </div>
              <FileText class="w-4 h-4 text-muted-foreground" />
            </label>
          </div>
        </div>
      </div>

      <template #footer>
        <Button @click="confirmCreateBackup" :disabled="creatingBackup || !hasSelectedContent">
          <Loader2 v-if="creatingBackup" class="w-4 h-4 mr-2 animate-spin" />
          <Download v-else class="w-4 h-4 mr-2" />
          创建备份
        </Button>
        <Button variant="outline" @click="backupDialogOpen = false" :disabled="creatingBackup">
          取消
        </Button>
      </template>
    </Dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { apiClient } from '@/api/client'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import PageContainer from '@/components/layout/PageContainer.vue'
import Button from '@/components/ui/button.vue'
import Checkbox from '@/components/ui/checkbox.vue'
import { Dialog } from '@/components/ui/dialog'
import {
  Download,
  Upload,
  Archive,
  Trash2,
  Loader2,
  Clock,
  Database,
  Settings,
  Key,
  FileText,
} from 'lucide-vue-next'
import { formatDateTime } from '@/utils/format'

interface Backup {
  name: string
  date: string
  size?: number
  content?: {
    env?: boolean
    config?: boolean
    auths?: boolean
  }
}

interface BackupListResponse {
  backups: Backup[]
  backupPath: string
}

const { toast } = useToast()
const { confirmDanger } = useConfirm()

const loading = ref(true)
const creatingBackup = ref(false)
const restoring = ref(false)
const backups = ref<Backup[]>([])
const restoreInput = ref<HTMLInputElement>()
const backupDialogOpen = ref(false)

const backupForm = reactive({
  name: '',
  content: {
    config: true,
    auths: true,
    env: true
  }
})

const hasSelectedContent = computed(() => {
  return backupForm.content.config || backupForm.content.auths || backupForm.content.env
})

function formatDate(dateString: string): string {
  return formatDateTime(dateString) || dateString
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function fetchBackups() {
  loading.value = true
  try {
    const data = await apiClient.get<BackupListResponse>('/backups')
    backups.value = data?.backups || []
  } catch {
    backups.value = []
  } finally {
    loading.value = false
  }
}

function openBackupDialog() {
  backupForm.name = ''
  backupForm.content.config = true
  backupForm.content.auths = true
  backupForm.content.env = true
  backupDialogOpen.value = true
}

async function confirmCreateBackup() {
  creatingBackup.value = true
  try {
    await apiClient.post('/backups', {
      name: backupForm.name || undefined,
      content: backupForm.content
    })
    toast({ title: '备份已创建' })
    backupDialogOpen.value = false
    await fetchBackups()
  } catch {
    toast({ title: '创建备份失败', variant: 'destructive' })
  } finally {
    creatingBackup.value = false
  }
}

async function handleRestore(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  restoring.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('authsMode', 'overwrite')
    await apiClient.postForm('/backups/upload', formData)
    toast({ title: '备份恢复成功' })
    await fetchBackups()
  } catch {
    toast({ title: '恢复备份失败', variant: 'destructive' })
  } finally {
    restoring.value = false
    input.value = ''
  }
}

async function downloadBackup(name: string) {
  try {
    const response = await apiClient.getRaw(`/backups/download?name=${encodeURIComponent(name)}`, {
      responseType: 'blob'
    })
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name.endsWith('.zip') ? name : `${name}.zip`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    toast({ title: '下载备份失败', variant: 'destructive' })
  }
}

async function deleteBackup(name: string) {
  if (!await confirmDanger(`确定要删除备份 "${name}" 吗？`)) return
  
  try {
    await apiClient.delete(`/backups/${encodeURIComponent(name)}`)
    toast({ title: '备份已删除' })
    await fetchBackups()
  } catch {
    toast({ title: '删除备份失败', variant: 'destructive' })
  }
}

onMounted(fetchBackups)
</script>
