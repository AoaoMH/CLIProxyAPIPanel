<template>
  <Card :class="cardClasses">
    <div
      v-if="title || description || $slots.header"
      :class="headerClasses"
    >
      <slot name="header">
        <div class="flex items-center justify-between">
          <div>
            <h3
              v-if="title"
              class="text-lg font-medium leading-6 text-foreground"
            >
              {{ title }}
            </h3>
            <p
              v-if="description"
              class="mt-1 text-sm text-muted-foreground"
            >
              {{ description }}
            </p>
          </div>
          <div v-if="$slots.actions">
            <slot name="actions" />
          </div>
        </div>
      </slot>
    </div>

    <div :class="contentClasses">
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      :class="footerClasses"
    >
      <slot name="footer" />
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/components/ui/card.vue'

interface Props {
  title?: string
  description?: string
  variant?: 'default' | 'elevated' | 'glass'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined,
  variant: 'default',
  padding: 'md',
  interactive: false,
})

const cardClasses = computed(() => {
  const classes = ['motion-transition']

  if (props.variant === 'elevated') {
    classes.push('shadow-md')
  } else if (props.variant === 'glass') {
    classes.push('surface-glass')
  }

  if (props.interactive) {
    classes.push('hover:shadow-lg hover:-translate-y-px cursor-pointer hover:border-primary/35 active:scale-[0.995]')
  }

  return classes.join(' ')
})


const headerClasses = computed(() => {
  const paddingMap = {
    none: '',
    sm: 'px-4 py-4',
    md: 'px-6 py-6',
    lg: 'px-8 py-8',
  }

  const classes = [paddingMap[props.padding]]

  if (props.padding !== 'none') {
    classes.push('border-b border-border/60')
  }

  return classes.join(' ')
})

const contentClasses = computed(() => {
  const paddingMap = {
    none: '',
    sm: 'px-4 py-4',
    md: 'px-6 py-6',
    lg: 'px-8 py-8',
  }

  return paddingMap[props.padding]
})

const footerClasses = computed(() => {
  const paddingMap = {
    none: '',
    sm: 'px-4 py-4',
    md: 'px-6 py-6',
    lg: 'px-8 py-8',
  }

  const classes = [paddingMap[props.padding]]

  if (props.padding !== 'none') {
    classes.push('border-t border-border/60 bg-muted/20')
  }

  return classes.join(' ')
})
</script>
