<template>
  <input
    :class="inputClass"
    :value="modelValue"
    :autocomplete="autocompleteAttr"
    :data-lpignore="disableAutofill ? 'true' : undefined"
    :data-1p-ignore="disableAutofill ? 'true' : undefined"
    :data-form-type="disableAutofill ? 'other' : undefined"
    v-bind="$attrs"
    @input="handleInput"
  >
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  modelValue?: string | number
  class?: string
  autocomplete?: string
  disableAutofill?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const autocompleteAttr = computed(() => {
  if (props.disableAutofill) {
    return 'one-time-code'
  }
  return props.autocomplete ?? 'off'
})

const inputClass = computed(() =>
  cn(
    'flex h-11 w-full rounded-2xl border border-border/60 bg-card/80 px-4 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-primary/60 text-foreground backdrop-blur motion-transition',
    props.class
  )
)

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>
