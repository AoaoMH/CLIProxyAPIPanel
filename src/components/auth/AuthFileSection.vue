<template>
  <CardSection :class="sectionClass">
    <!-- Section Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-semibold text-foreground">{{ title }}</h3>
        <span class="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          {{ files.length }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <!-- View Mode Toggle -->
        <div class="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            :class="{ 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md': viewMode === 'paged', 'hover:bg-primary/10 hover:text-primary hover:scale-105': viewMode !== 'paged' }"
            class="transition-all duration-200"
            @click="viewMode = 'paged'"
          >
            分页
          </Button>
          <Button
            variant="secondary"
            size="sm"
            :class="{ 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md': viewMode === 'all', 'hover:bg-primary/10 hover:text-primary hover:scale-105': viewMode !== 'all' }"
            class="transition-all duration-200"
            @click="viewMode = 'all'"
          >
            全部
          </Button>
        </div>
        <!-- Refresh Button -->
        <Button
          variant="secondary"
          size="sm"
          :disabled="refreshing"
          @click="handleRefresh"
          title="刷新配额"
          class="hover:bg-primary/10 hover:text-primary hover:border-primary/30 hover:scale-105 transition-all duration-200"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': refreshing }" />
        </Button>

        <template v-if="showRemoveInvalidAction">
          <div class="h-5 w-px bg-border/80" aria-hidden="true" />
          <Button
            variant="secondary"
            size="sm"
            :disabled="removeInvalidLoading"
            @click="emit('remove-invalid', props.files)"
            class="text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-200"
          >
            <RefreshCw v-if="removeInvalidLoading" class="h-4 w-4 mr-1 animate-spin" />
            移除失效凭证
          </Button>
        </template>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="files.length === 0" class="py-8 text-center text-muted-foreground">
      暂无文件
    </div>

    <!-- Files Grid -->
    <div v-else class="grid gap-3 grid-cols-1 min-[450px]:grid-cols-2 min-[1300px]:grid-cols-3">
      <AuthFileCard
        v-for="file in displayFiles"
        :key="file.name"
        :file="file"
        :toggling="Boolean(togglingMap?.[file.name])"
        @download="$emit('download', $event)"
        @delete="$emit('delete', $event)"
        @show-models="$emit('show-models', file)"
        @show-info="$emit('show-info', file)"
        @edit="$emit('edit', file)"
        @toggle-disabled="$emit('toggle-disabled', $event)"
      />
    </div>

    <!-- Pagination -->
    <div v-if="viewMode === 'paged' && totalPages > 1" class="mt-6 flex justify-center">
      <div class="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          上一页
        </Button>
        <span class="mx-2 text-sm text-muted-foreground">
          {{ currentPage }} / {{ totalPages }} (共 {{ files.length }} 个)
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          下一页
        </Button>
      </div>
    </div>
  </CardSection>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CardSection from '@/components/layout/CardSection.vue'
import Button from '@/components/ui/button.vue'
import AuthFileCard from '@/components/auth/AuthFileCard.vue'
import { RefreshCw } from 'lucide-vue-next'
import type { AuthFileItem } from '@/types'

const props = defineProps<{
  title: string
  files: AuthFileItem[]
  sectionClass?: string
  togglingMap?: Record<string, boolean>
  showRemoveInvalidAction?: boolean
  removeInvalidLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'download', name: string): void
  (e: 'delete', name: string): void
  (e: 'show-models', file: AuthFileItem): void
  (e: 'show-info', file: AuthFileItem): void
  (e: 'edit', file: AuthFileItem): void
  (e: 'refresh', files: AuthFileItem[]): void
  (e: 'toggle-disabled', payload: { file: AuthFileItem; disabled: boolean }): void
  (e: 'remove-invalid', files: AuthFileItem[]): void
}>()

const viewMode = ref<'paged' | 'all'>('paged')
const currentPage = ref(1)
const itemsPerPage = 9 // 3 columns x 3 rows
const refreshing = ref(false)

// Reset page when files change
watch(() => props.files, () => {
  currentPage.value = 1
})

const totalPages = computed(() => 
  Math.max(1, Math.ceil(props.files.length / itemsPerPage))
)

const displayFiles = computed(() => {
  if (viewMode.value === 'all') {
    return props.files
  }
  const start = (currentPage.value - 1) * itemsPerPage
  return props.files.slice(start, start + itemsPerPage)
})

async function handleRefresh() {
  refreshing.value = true
  // Emit refresh event with current page files for parent to handle
  emit('refresh', displayFiles.value)
  // Keep refreshing state briefly to show feedback
  await new Promise(resolve => setTimeout(resolve, 300))
  refreshing.value = false
}
</script>
