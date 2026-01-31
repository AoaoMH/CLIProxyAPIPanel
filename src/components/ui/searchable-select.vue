<template>
  <div class="relative">
    <Select
      :model-value="modelValue"
      :open="open"
      @update:model-value="handleValueChange"
      @update:open="handleOpenChange"
    >
      <SelectTrigger
        :class="triggerClass"
        :disabled="disabled"
      >
        <SelectValue :placeholder="placeholder">
          <span v-if="selectedOption">{{ selectedOption.label }}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent :class="contentClass">
        <!-- 搜索框 -->
        <div v-if="searchable" class="p-2 border-b border-border/60">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10 pointer-events-none" />
            <Input
              ref="searchInputRef"
              v-model="searchQuery"
              :placeholder="searchPlaceholder"
              class="h-8 text-xs pl-8 border-border/60"
              @keydown.escape="handleEscape"
              @keydown.enter.prevent="handleEnterKey"
              @keydown.arrow-down.prevent="handleArrowDown"
              @keydown.arrow-up.prevent="handleArrowUp"
            />
          </div>
        </div>
        
        <!-- 选项列表 -->
        <div class="max-h-60 overflow-y-auto">
          <SelectItem
            v-if="filteredOptions.length === 0 && searchQuery"
            value=""
            disabled
            class="text-muted-foreground text-center py-2"
          >
            {{ noResultsText }}
          </SelectItem>
          
          <SelectItem
            v-for="(option, index) in filteredOptions"
            :key="option.value"
            :value="option.value"
            :disabled="option.disabled"
            :class="cn('cursor-pointer', highlightedIndex === index && 'bg-primary/10')"
            @mouseenter="highlightedIndex = index"
          >
            <div class="flex items-center justify-between w-full">
              <span>{{ option.label }}</span>
              <span v-if="option.description" class="text-xs text-muted-foreground ml-2">
                {{ option.description }}
              </span>
            </div>
          </SelectItem>
        </div>
      </SelectContent>
    </Select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input
} from '@/components/ui'
import { Search } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface Props {
  modelValue?: string
  options: SelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  noResultsText?: string
  searchable?: boolean
  disabled?: boolean
  class?: string
  contentClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择...',
  searchPlaceholder: '搜索选项...',
  noResultsText: '未找到匹配项',
  searchable: true,
  disabled: false,
  class: '',
  contentClass: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement>()
const highlightedIndex = ref(-1)

const triggerClass = computed(() =>
  cn(
    'flex h-11 w-full items-center justify-between rounded-2xl border border-border/60 bg-card/80 px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 text-foreground cursor-pointer backdrop-blur transition-all',
    props.class
  )
)

const selectedOption = computed(() => {
  return props.options.find(option => option.value === props.modelValue)
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) {
    return props.options
  }
  
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(option => 
    option.label.toLowerCase().includes(query) ||
    option.description?.toLowerCase().includes(query) ||
    option.value.toLowerCase().includes(query)
  )
})

function handleValueChange(value: string) {
  emit('update:modelValue', value)
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
}

function handleOpenChange(isOpen: boolean) {
  open.value = isOpen
  
  if (isOpen) {
    searchQuery.value = ''
    highlightedIndex.value = -1
    
    // 聚焦搜索框
    if (props.searchable) {
      nextTick(() => {
        searchInputRef.value?.focus()
      })
    }
  }
}

function handleEscape() {
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
}

function handleEnterKey() {
  if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredOptions.value.length) {
    const selectedOption = filteredOptions.value[highlightedIndex.value]
    if (!selectedOption.disabled) {
      handleValueChange(selectedOption.value)
    }
  }
}

function handleArrowDown() {
  if (highlightedIndex.value < filteredOptions.value.length - 1) {
    highlightedIndex.value++
  }
}

function handleArrowUp() {
  if (highlightedIndex.value > 0) {
    highlightedIndex.value--
  }
}

// 重置高亮索引当筛选结果改变时
watch(filteredOptions, () => {
  highlightedIndex.value = -1
})
</script>
