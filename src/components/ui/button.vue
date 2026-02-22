<template>
  <button
    :type="props.type"
    :class="buttonClass"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
  class?: string
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  disabled: false,
  class: undefined,
  type: 'button'
})

const buttonClass = computed(() => {
  const baseClass =
    'inline-flex items-center justify-center rounded-xl text-sm font-semibold motion-transition ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]'

  const variantClasses = {
    default: 'bg-primary text-white hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 hover:-translate-y-px',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/85 hover:shadow-md hover:shadow-destructive/20 hover:-translate-y-px',
    outline:
      'border border-border/60 bg-card/60 text-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/10 hover:shadow-sm hover:-translate-y-px backdrop-blur',
    secondary:
      'bg-secondary text-secondary-foreground shadow-inner hover:bg-secondary/80 hover:shadow-sm hover:-translate-y-px',
    ghost: 'hover:bg-accent/80 hover:text-accent-foreground hover:shadow-sm hover:-translate-y-px hover:backdrop-blur-sm',
    link: 'text-primary underline-offset-4 hover:underline',
  }

  const sizeClasses = {
    default: 'h-11 px-5',
    sm: 'h-9 rounded-lg px-3',
    lg: 'h-12 rounded-xl px-8 text-base',
    icon: 'h-11 w-11 rounded-2xl',
  }

  return cn(
    baseClass,
    variantClasses[props.variant],
    sizeClasses[props.size],
    props.class
  )
})
</script>
