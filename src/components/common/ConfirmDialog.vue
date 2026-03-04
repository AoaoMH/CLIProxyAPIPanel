<template>
  <Dialog :open="state.isOpen" @update:open="onOpenChange" :size="'sm'">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          :class="iconBgClass"
        >
          <component :is="iconComponent" class="h-5 w-5" :class="iconColorClass" />
        </div>
        <div>
          <DialogTitle>{{ state.title }}</DialogTitle>
        </div>
      </div>
    </template>

    <p class="text-sm text-muted-foreground leading-relaxed">{{ state.message }}</p>

    <template #footer>
      <Button
        :variant="confirmButtonVariant"
        size="sm"
        @click="handleConfirm"
      >
        {{ state.confirmText }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        @click="handleCancel"
      >
        {{ state.cancelText }}
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfirm } from '@/composables/useConfirm'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import Button from '@/components/ui/button.vue'
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-vue-next'
import type { Component } from 'vue'

const { state, handleConfirm, handleCancel } = useConfirm()

const iconComponent = computed<Component>(() => {
  switch (state.value.variant) {
    case 'danger':
    case 'destructive':
      return Trash2
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
    case 'question':
    default:
      return HelpCircle
  }
})

const iconBgClass = computed(() => {
  switch (state.value.variant) {
    case 'danger':
    case 'destructive':
      return 'bg-destructive/10'
    case 'warning':
      return 'bg-yellow-500/10'
    case 'info':
      return 'bg-blue-500/10'
    case 'question':
    default:
      return 'bg-muted'
  }
})

const iconColorClass = computed(() => {
  switch (state.value.variant) {
    case 'danger':
    case 'destructive':
      return 'text-destructive'
    case 'warning':
      return 'text-yellow-500'
    case 'info':
      return 'text-blue-500'
    case 'question':
    default:
      return 'text-muted-foreground'
  }
})

const confirmButtonVariant = computed<'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'>(() => {
  switch (state.value.variant) {
    case 'danger':
    case 'destructive':
      return 'destructive'
    default:
      return 'default'
  }
})

function onOpenChange(val: boolean) {
  if (!val) {
    handleCancel()
  }
}
</script>
