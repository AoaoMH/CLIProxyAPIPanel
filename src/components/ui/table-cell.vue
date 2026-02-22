<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

interface Props {
  class?: string
}

const props = defineProps<Props>()

const cellClass = computed(() =>
  cn('p-4 align-middle text-foreground [&:has([role=checkbox])]:pr-0', props.class)
)
</script>

<template>
  <td :class="cellClass">
    <slot />
  </td>
</template>
