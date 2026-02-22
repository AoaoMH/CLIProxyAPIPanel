<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

interface Props {
  class?: string
}

const props = defineProps<Props>()

const rowClass = computed(() =>
  cn(
    'border-b motion-transition hover:bg-muted/40 data-[state=selected]:bg-muted/70',
    props.class
  )
)
</script>

<template>
  <tr :class="rowClass">
    <slot />
  </tr>
</template>
