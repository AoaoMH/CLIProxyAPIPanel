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
      <div class="flex gap-1 mb-6 border-b border-border overflow-x-auto">
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
        <div v-else-if="activeTab === 'visual'" class="space-y-6">
          <VisualConfigEditor
            :values="visualValues"
            :disabled="disableControls || loading"
            @update:values="setVisualValues"
          />
        </div>

        <!-- 保存按钮 -->
        <div class="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" @click="loadConfig" :disabled="loading">
            <RotateCcw class="w-4 h-4 mr-2" />
            重新加载
          </Button>
          <Button
            @click="handleSave"
            :disabled="!isDirty || saving || disableControls"
          >
            <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
            <Save v-else class="w-4 h-4 mr-2" />
            {{ saving ? '保存中...' : '保存配置' }}
          </Button>
        </div>
      </div>
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
import { ChevronDown, ChevronUp, Loader2, RotateCcw, Save, Search } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'
import { useDarkMode } from '@/composables/useDarkMode'
import { useToast } from '@/composables/useToast'
import { useVisualConfig } from '@/composables/useVisualConfig'
import { configFileApi } from '@/api/configFile'
import PageContainer from '@/components/layout/PageContainer.vue'
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'
import VisualConfigEditor from '@/components/config/VisualConfigEditor.vue'

type ConfigEditorTab = 'visual' | 'source'

const authStore = useAuthStore()
const configStore = useConfigStore()
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

// 搜索相关
const searchQuery = ref('')
const searchResults = ref({ current: 0, total: 0 })
const editorRef = ref()

const disableControls = computed(() => !authStore.isConnected)
const isDirty = computed(() =>
  activeTab.value === 'visual' ? visualDirty.value : dirty.value
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
    const nextContent =
      activeTab.value === 'visual'
        ? applyVisualChangesToYaml(content.value)
        : content.value
    await configFileApi.saveConfigYaml(nextContent)

    if (activeTab.value === 'visual') {
      content.value = nextContent
      // 保存后重新从YAML内容加载到可视化编辑器
      loadVisualValuesFromYaml(nextContent)
    }

    dirty.value = false
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

:deep(.cm-editor) {
  @apply text-sm;
}

:deep(.cm-focused) {
  @apply outline-none;
}
</style>
