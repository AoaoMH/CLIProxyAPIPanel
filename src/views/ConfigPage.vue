<template>
  <PageContainer>
    <div class="config-page">
      <!-- 页面标题 -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-foreground">配置管理</h1>
        <p class="text-sm text-muted-foreground mt-1">
          管理系统配置文件，支持可视化编辑和源代码编辑两种模式
        </p>
      </div>

      <!-- 标签页切换 -->
      <div class="flex gap-1 mb-6 border-b border-border">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="[
            'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === tab.key
              ? 'text-primary border-primary'
              : 'text-muted-foreground border-transparent hover:text-foreground',
          ]"
          @click="handleTabChange(tab.key)"
        >
          <span class="flex items-center gap-2">
            {{ tab.label }}
          </span>
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="flex flex-col gap-6 min-h-0 flex-1">
        <!-- 源代码编辑模式 -->
        <div v-if="activeTab === 'source'" class="flex flex-col gap-4 flex-1">
          <!-- 搜索控制栏 -->
          <div
            class="flex items-center gap-4 p-4 bg-card border border-border rounded-lg"
          >
            <div class="flex-1 relative">
              <Search
                class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
              />
              <Input
                v-model="searchQuery"
                placeholder="搜索配置内容..."
                class="pl-10"
                @keydown.enter="performSearch(searchQuery, 'next')"
                @keydown.f3.prevent="performSearch(searchQuery, 'next')"
                @keydown.shift.f3.prevent="performSearch(searchQuery, 'prev')"
              />
            </div>
            <div
              v-if="searchResults.total > 0"
              class="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <span>{{ searchResults.current }}/{{ searchResults.total }}</span>
              <div class="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  @click="performSearch(searchQuery, 'prev')"
                  :disabled="searchResults.total === 0"
                >
                  <ChevronUp class="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  @click="performSearch(searchQuery, 'next')"
                  :disabled="searchResults.total === 0"
                >
                  <ChevronDown class="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <!-- 代码编辑器 -->
          <div class="flex-1 border border-border rounded-lg overflow-hidden">
            <Codemirror
              ref="editorRef"
              v-model="content"
              :style="{ height: '600px' }"
              :extensions="editorExtensions"
              :disabled="disableControls || loading"
              @change="handleChange"
            />
          </div>
        </div>

        <!-- 可视化编辑模式 -->
        <div
          v-else-if="activeTab === 'visual'"
          :class="['space-y-6 transition-all duration-200', showFloatingActions ? 'pb-28' : 'pb-6']"
        >
          <VisualConfigEditor
            :values="visualValues"
            :disabled="disableControls || loading"
            @update:values="setVisualValues"
          />
        </div>

      </div>

      <Transition
        enter-active-class="duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-3 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-3 scale-95"
      >
        <div v-if="showFloatingActions" class="floating-action-bar" role="status" aria-live="polite">
          <span class="floating-dirty-tip">
            <span class="floating-dirty-dot" aria-hidden="true" />
            有改动
          </span>
          <button
            class="floating-action-btn floating-action-undo"
            type="button"
            :disabled="saving || loading"
            title="撤销修改"
            aria-label="撤销修改"
            @click="revertDialogOpen = true"
          >
            <Undo2 class="w-4 h-4" />
          </button>
          <button
            class="floating-action-btn floating-action-save"
            type="button"
            :disabled="saving || loading || disableControls || diffDialogOpen"
            title="保存配置"
            aria-label="保存配置"
            @click="handleSave"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            <Check v-else class="w-4 h-4" />
          </button>
        </div>
      </Transition>

      <ConfigDiffDialog
        :open="diffDialogOpen"
        :original="serverYaml"
        :modified="mergedYaml"
        :loading="saving"
        @cancel="diffDialogOpen = false"
        @confirm="handleConfirmSave"
      />

      <Dialog
        :open="revertDialogOpen"
        title="确认撤销修改"
        description="撤销后将恢复到最近一次加载/保存的配置内容，未保存改动会丢失。"
        @update:open="revertDialogOpen = $event"
      >
        <template #footer>
          <Button variant="outline" :disabled="saving" @click="revertDialogOpen = false">
            取消
          </Button>
          <Button :disabled="saving" @click="handleConfirmRevert">
            确认撤销
          </Button>
        </template>
      </Dialog>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import {
  search,
  searchKeymap,
  highlightSelectionMatches,
} from '@codemirror/search'
import { keymap } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { Check, ChevronDown, ChevronUp, Loader2, Search, Undo2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import { useToast } from '@/composables/useToast'
import { useVisualConfig } from '@/composables/useVisualConfig'
import { configFileApi } from '@/api/configFile'
import PageContainer from '@/components/layout/PageContainer.vue'
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'
import VisualConfigEditor from '@/components/config/VisualConfigEditor.vue'
import ConfigDiffDialog from '@/components/config/ConfigDiffDialog.vue'
import { Dialog } from '@/components/ui'

type ConfigEditorTab = 'visual' | 'source'

const authStore = useAuthStore()
const { isDark } = useDarkMode()
const { toast } = useToast()
const {
  visualValues,
  visualDirty,
  loadVisualValuesFromYaml,
  applyVisualChangesToYaml,
  setVisualValues,
} = useVisualConfig()

const activeTab = ref<ConfigEditorTab>('visual')
const content = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const dirty = ref(false)
const diffDialogOpen = ref(false)
const revertDialogOpen = ref(false)
const serverYaml = ref('')
const mergedYaml = ref('')

// 搜索相关
const searchQuery = ref('')
const searchResults = ref({ current: 0, total: 0 })
const editorRef = ref()

const disableControls = computed(() => !authStore.isConnected)
const isDirty = computed(() =>
  activeTab.value === 'visual' ? visualDirty.value : dirty.value
)
const showFloatingActions = computed(
  () => activeTab.value === 'visual' && isDirty.value,
)

const tabs = [
  { key: 'visual' as const, label: '可视化编辑' },
  { key: 'source' as const, label: '源代码编辑' },
]

// CodeMirror 扩展
const editorExtensions = computed(() => [
  yaml(),
  search({ top: true }),
  highlightSelectionMatches(),
  keymap.of(searchKeymap),
  ...(isDark.value ? [oneDark] : []),
])

// 加载配置
const loadConfig = async () => {
  loading.value = true
  error.value = ''
  try {
    // 只从 YAML 文件加载配置
    const yamlData = await configFileApi.fetchConfigYaml()

    content.value = yamlData
    dirty.value = false
    diffDialogOpen.value = false
    serverYaml.value = yamlData
    mergedYaml.value = yamlData

    // 直接从 YAML 数据加载到可视化编辑器
    loadVisualValuesFromYaml(yamlData)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '刷新失败'
    error.value = message
    toast({
      title: '加载配置失败',
      description: message,
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
}

// 保存配置
const handleSave = async () => {
  saving.value = true
  try {
    const nextMergedYaml =
      activeTab.value === 'visual'
        ? applyVisualChangesToYaml(content.value)
        : content.value

    const latestServerYaml = await configFileApi.fetchConfigYaml()

    if (latestServerYaml === nextMergedYaml) {
      dirty.value = false
      content.value = latestServerYaml
      serverYaml.value = latestServerYaml
      mergedYaml.value = nextMergedYaml
      loadVisualValuesFromYaml(latestServerYaml)
      toast({
        title: '无变更',
        description: '未检测到可保存的配置变更',
        variant: 'default',
      })
      return
    }

    serverYaml.value = latestServerYaml
    mergedYaml.value = nextMergedYaml
    diffDialogOpen.value = true
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    toast({
      title: '保存失败',
      description: message,
      variant: 'destructive',
    })
  } finally {
    saving.value = false
  }
}

const handleConfirmSave = async () => {
  saving.value = true
  try {
    await configFileApi.saveConfigYaml(mergedYaml.value)
    const latestContent = await configFileApi.fetchConfigYaml()

    dirty.value = false
    diffDialogOpen.value = false
    content.value = latestContent
    serverYaml.value = latestContent
    mergedYaml.value = latestContent
    loadVisualValuesFromYaml(latestContent)

    toast({ title: '保存成功', description: '配置已写入 config.yaml', variant: 'success' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    toast({
      title: '保存失败',
      description: message,
      variant: 'destructive',
    })
  } finally {
    saving.value = false
  }
}

const handleConfirmRevert = () => {
  const baseline = serverYaml.value
  diffDialogOpen.value = false
  revertDialogOpen.value = false
  content.value = baseline
  mergedYaml.value = baseline
  dirty.value = false
  loadVisualValuesFromYaml(baseline)
  toast({ title: '已撤销', description: '未保存的改动已恢复', variant: 'default' })
}

// 处理内容变化
const handleChange = (value: string) => {
  content.value = value
  dirty.value = true
}

// 处理标签页切换
const handleTabChange = (tab: ConfigEditorTab) => {
  if (tab === activeTab.value) return

  if (tab === 'source') {
    const nextContent = applyVisualChangesToYaml(content.value)
    if (nextContent !== content.value) {
      content.value = nextContent
      dirty.value = true
    }
  } else {
    // 切换到可视化编辑时，从当前YAML内容加载
    loadVisualValuesFromYaml(content.value)
  }

  activeTab.value = tab
}

// 搜索功能
const performSearch = async (
  query: string,
  direction: 'next' | 'prev' = 'next'
) => {
  if (!query || !editorRef.value?.view) return

  await nextTick()

  const view = editorRef.value.view
  const doc = view.state.doc.toString()
  const matches: number[] = []
  const lowerQuery = query.toLowerCase()
  const lowerDoc = doc.toLowerCase()

  let pos = 0
  while (pos < lowerDoc.length) {
    const index = lowerDoc.indexOf(lowerQuery, pos)
    if (index === -1) break
    matches.push(index)
    pos = index + 1
  }

  if (matches.length === 0) {
    searchResults.value = { current: 0, total: 0 }
    return
  }

  // 找到当前匹配项
  const currentPos = view.state.selection.main.head
  let currentIndex = matches.findIndex((pos) => pos >= currentPos)

  if (currentIndex === -1) {
    currentIndex = direction === 'next' ? 0 : matches.length - 1
  } else if (direction === 'prev') {
    currentIndex = currentIndex > 0 ? currentIndex - 1 : matches.length - 1
  } else if (direction === 'next' && matches[currentIndex] === currentPos) {
    currentIndex = currentIndex < matches.length - 1 ? currentIndex + 1 : 0
  }

  const targetPos = matches[currentIndex]
  view.dispatch({
    selection: { anchor: targetPos, head: targetPos + query.length },
    scrollIntoView: true,
  })

  searchResults.value = {
    current: currentIndex + 1,
    total: matches.length,
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.config-page {
  @apply flex flex-col h-full;
}

.floating-action-bar {
  @apply fixed left-1/2 -translate-x-1/2 bottom-6 z-50 flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 shadow-2xl backdrop-blur;
}

@media (min-width: 1024px) {
  .floating-action-bar {
    left: calc(50% + 130px);
  }
}

.floating-dirty-tip {
  @apply flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground;
}

.floating-dirty-dot {
  @apply inline-block h-2 w-2 rounded-full bg-amber-500;
}

.floating-action-btn {
  @apply inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors;
}

.floating-action-btn:disabled {
  @apply cursor-not-allowed opacity-60;
}

.floating-action-undo:hover:not(:disabled) {
  @apply bg-muted;
}

.floating-action-save {
  @apply bg-primary text-primary-foreground border-primary;
}

.floating-action-save:hover:not(:disabled) {
  @apply opacity-90;
}

:deep(.cm-editor) {
  @apply text-sm;
}

:deep(.cm-focused) {
  @apply outline-none;
}
</style>
