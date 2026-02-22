<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

interface Props {
  class?: string
}

const props = defineProps<Props>()

const headClass = computed(() =>
  cn(
    'h-12 px-4 text-left align-middle font-semibold text-muted-foreground/90 tracking-wide [&:has([role=checkbox])]:pr-0',
    props.class
  )
)
</script>

<template>
  <th :class="headClass">
    <slot />
  </th>
</template>
