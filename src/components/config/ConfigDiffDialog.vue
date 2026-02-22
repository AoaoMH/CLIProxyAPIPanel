<template>
  <Dialog
    :open="open"
    :title="'确认配置变更'"
    :description="'请先检查差异，确认后再写入 config.yaml'"
    size="6xl"
    :no-padding="true"
    @update:open="handleOpenChange"
  >
    <div class="diff-dialog-content">
      <div v-if="hasChanges" class="diff-summary">
        <span>变更块：{{ hunkCount }}</span>
        <span>新增：{{ addedLines }}</span>
        <span>删除：{{ removedLines }}</span>
      </div>

      <div v-if="hasChanges" class="diff-render-wrapper">
        <div class="diff-render" v-html="diffHtml" />
      </div>

      <div v-else class="diff-empty">
        <div class="diff-empty-text"># 未检测到变更</div>
      </div>
    </div>

    <template #footer>
      <Button variant="outline" :disabled="loading" @click="emit('cancel')">
        取消
      </Button>
      <Button :disabled="loading" @click="emit('confirm')">
        {{ loading ? '保存中...' : '确认保存' }}
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { createTwoFilesPatch, structuredPatch } from 'diff'
import * as Diff2Html from 'diff2html'
import 'diff2html/bundles/css/diff2html.min.css'
import { Dialog } from '@/components/ui'
import Button from '@/components/ui/button.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    original: string
    modified: string
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

const normalizedOriginal = computed(() => normalizeNewlines(props.original))
const normalizedModified = computed(() => normalizeNewlines(props.modified))

const hasChanges = computed(
  () => normalizedOriginal.value !== normalizedModified.value,
)

const patchInfo = computed(() => {
  if (!hasChanges.value) return null

  return structuredPatch(
    'config.yaml',
    'config.yaml',
    normalizedOriginal.value,
    normalizedModified.value,
    '',
    '',
    { context: 3 },
  )
})

const patchText = computed(() => {
  if (!hasChanges.value) return ''

  return createTwoFilesPatch(
    'a/config.yaml',
    'b/config.yaml',
    normalizedOriginal.value,
    normalizedModified.value,
    '',
    '',
    { context: 3 },
  )
})

const diffHtml = computed(() => {
  if (!patchText.value) return ''

  return Diff2Html.html(patchText.value, {
    outputFormat: 'line-by-line',
    drawFileList: false,
    matching: 'lines',
    diffStyle: 'word',
    renderNothingWhenEmpty: false,
  })
})

const hunkCount = computed(() => patchInfo.value?.hunks.length ?? 0)

const addedLines = computed(() =>
  patchInfo.value?.hunks.reduce((total, hunk) => {
    const additions = hunk.lines.filter(
      (line) => line.startsWith('+') && !line.startsWith('+++'),
    ).length
    return total + additions
  }, 0) ?? 0,
)

const removedLines = computed(() =>
  patchInfo.value?.hunks.reduce((total, hunk) => {
    const removals = hunk.lines.filter(
      (line) => line.startsWith('-') && !line.startsWith('---'),
    ).length
    return total + removals
  }, 0) ?? 0,
)

const handleOpenChange = (nextOpen: boolean) => {
  if (!nextOpen && !props.loading) {
    emit('cancel')
  }
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n')
}
</script>

<style scoped>
.diff-dialog-content {
  @apply p-4 sm:p-6 space-y-4;
}

.diff-summary {
  @apply text-sm text-muted-foreground flex flex-wrap gap-4;
}

.diff-empty {
  @apply border border-border rounded-md overflow-hidden;
}

.diff-empty-text {
  @apply px-4 py-6 text-sm text-muted-foreground font-mono;
}

.diff-render-wrapper {
  @apply border border-border rounded-md overflow-hidden bg-background;
  max-height: min(68vh, 720px);
}

.diff-render {
  @apply overflow-auto;
  max-height: min(68vh, 720px);
}

.diff-render :deep(.d2h-wrapper) {
  @apply m-0;
}

.diff-render :deep(.d2h-diff-table) {
  width: 100%;
  border-collapse: collapse;
  background-color: transparent !important;
}

.diff-render :deep(.d2h-file-header) {
  @apply hidden;
}

.diff-render :deep(.d2h-file-diff) {
  @apply border-0;
}

.diff-render :deep(.d2h-code-wrapper) {
  @apply bg-background;
}

.diff-render :deep(.d2h-code-linenumber),
.diff-render :deep(.d2h-code-side-linenumber) {
  background-color: color-mix(in oklab, var(--muted) 82%, var(--background) 18%) !important;
  color: color-mix(in oklab, var(--foreground) 78%, transparent 22%) !important;
  border-color: var(--border) !important;
}

.diff-render :deep(.d2h-code-line),
.diff-render :deep(.d2h-code-side-line) {
  background-color: transparent !important;
  color: var(--foreground) !important;
}

.diff-render :deep(.d2h-code-line-ctn) {
  color: var(--foreground) !important;
}

.diff-render :deep(.d2h-info) {
  background-color: color-mix(in oklab, var(--muted) 55%, var(--background) 45%) !important;
  color: color-mix(in oklab, var(--foreground) 68%, transparent 32%) !important;
  border-color: var(--border) !important;
}

.diff-render :deep(.d2h-code-line-ctn) {
  @apply font-mono text-xs;
}

.diff-render :deep(.d2h-del) {
  background-color: rgba(239, 68, 68, 0.18) !important;
}

.diff-render :deep(.d2h-ins) {
  background-color: rgba(16, 185, 129, 0.18) !important;
}

.diff-render :deep(.d2h-cntx) {
  background-color: transparent !important;
}

.diff-render :deep(.d2h-del .d2h-code-line-ctn),
.diff-render :deep(.d2h-ins .d2h-code-line-ctn) {
  color: var(--foreground) !important;
}

.diff-render :deep(.d2h-ins .d2h-change) {
  background-color: rgba(46, 160, 67, 0.28) !important;
  color: var(--foreground) !important;
}

.diff-render :deep(.d2h-code-line ins),
.diff-render :deep(.d2h-code-side-line ins) {
  background-color: rgba(46, 160, 67, 0.28) !important;
  color: var(--foreground) !important;
  text-decoration: none !important;
}

.diff-render :deep(.d2h-del .d2h-change) {
  background-color: rgba(248, 81, 73, 0.24) !important;
  color: var(--foreground) !important;
}

.diff-render :deep(.d2h-code-line del),
.diff-render :deep(.d2h-code-side-line del) {
  background-color: rgba(248, 81, 73, 0.24) !important;
  color: var(--foreground) !important;
  text-decoration: none !important;
}

.diff-render :deep(.d2h-change) {
  border-radius: 3px;
  padding: 0 2px;
}
</style>
