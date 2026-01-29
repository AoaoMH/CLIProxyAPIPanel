<template>
  <DialogRoot :open="isOpen" :modal="props.modal" @update:open="handleOpenChange">
    <DialogPortal>
      <!-- 背景遮罩 -->
      <DialogOverlay 
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      
      <!-- Sheet 内容 (从右侧滑入) -->
      <DialogContent
        :class="[
          'fixed inset-y-0 right-0 z-50 h-full gap-4 bg-background p-0 shadow-lg transition ease-in-out',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          'data-[state=closed]:duration-300 data-[state=open]:duration-300',
          widthClass
        ]"
        @pointerDownOutside="$event.preventDefault()"
      >
        <div class="flex h-full flex-col">
          <!-- Header 区域 -->
          <slot name="header">
            <div
              v-if="title"
              class="border-b border-border px-6 py-4 flex-shrink-0"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    v-if="icon"
                    class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0"
                    :class="iconClass"
                  >
                    <component
                      :is="icon"
                      class="h-5 w-5 text-primary"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <DialogTitle class="text-lg font-semibold text-foreground leading-tight">
                      {{ title }}
                    </DialogTitle>
                    <DialogDescription
                      v-if="description"
                      class="text-xs text-muted-foreground"
                    >
                      {{ description }}
                    </DialogDescription>
                  </div>
                </div>
                <DialogClose
                  class="p-1.5 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X class="w-5 h-5" />
                </DialogClose>
              </div>
            </div>
          </slot>

          <!-- 内容区域 (可滚动) -->
          <div class="flex-1 overflow-y-auto" :class="noPadding ? '' : 'px-6 py-4'">
            <slot />
          </div>

          <!-- Footer 区域 -->
          <div
            v-if="slots.footer"
            class="border-t border-border px-6 py-4 bg-muted/10 flex flex-row-reverse gap-3 flex-shrink-0"
          >
            <slot name="footer" />
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { computed, useSlots, type Component } from 'vue'
import { 
  DialogRoot, 
  DialogPortal, 
  DialogOverlay, 
  DialogContent, 
  DialogTitle, 
  DialogDescription, 
  DialogClose 
} from 'radix-vue'
import { X } from 'lucide-vue-next'

// Props 定义
const props = withDefaults(defineProps<{
  open?: boolean
  modelValue?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full'
  title?: string
  description?: string
  icon?: Component
  iconClass?: string
  noPadding?: boolean
  modal?: boolean
}>(), {
  modal: true
})

// Emits 定义
const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:modelValue': [value: boolean]
}>()

// 获取 slots
const slots = useSlots()

// 统一处理 open 状态
const isOpen = computed(() => {
  if (props.modelValue === true) return true
  if (props.open === true) return true
  return false
})

// 统一处理 open 变化
function handleOpenChange(value: boolean) {
  if (props.open !== undefined) {
    emit('update:open', value)
  }
  if (props.modelValue !== undefined) {
    emit('update:modelValue', value)
  }
}

const widthClass = computed(() => {
  const sizeValue = props.size || 'md'
  const sizes: Record<string, string> = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[480px]',
    xl: 'w-[560px]',
    '2xl': 'w-[640px]',
    '3xl': 'w-[768px]',
    '4xl': 'w-[896px]',
    full: 'w-full max-w-full'
  }
  return sizes[sizeValue]
})
</script>
