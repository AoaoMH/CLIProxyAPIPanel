<template>
  <ConfigSection title="流式传输配置" description="Keepalive 和重试设置">
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Keepalive 秒数</label>
          <div class="relative">
            <Input
              :model-value="values.streaming.keepaliveSeconds"
              type="number"
              placeholder="0"
              :disabled="disabled"
              @update:model-value="updateStreamingValue('keepaliveSeconds', $event)"
            />
            <span
              v-if="isKeepaliveDisabled"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
            >
              已禁用
            </span>
          </div>
          <p class="text-xs text-muted-foreground mt-1">设置为 0 或留空表示禁用 keepalive</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Bootstrap 重试次数</label>
          <Input
            :model-value="values.streaming.bootstrapRetries"
            type="number"
            placeholder="3"
            :disabled="disabled"
            @update:model-value="updateStreamingValue('bootstrapRetries', $event)"
          />
          <p class="text-xs text-muted-foreground mt-1">流式传输启动时的重试次数</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">非流式 Keepalive 间隔 (秒)</label>
          <div class="relative">
            <Input
              :model-value="values.streaming.nonstreamKeepaliveInterval"
              type="number"
              placeholder="0"
              :disabled="disabled"
              @update:model-value="updateStreamingValue('nonstreamKeepaliveInterval', $event)"
            />
            <span
              v-if="isNonstreamKeepaliveDisabled"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
            >
              已禁用
            </span>
          </div>
          <p class="text-xs text-muted-foreground mt-1">非流式响应时每隔 N 秒发送空行以防止空闲超时，设置为 0 或留空表示禁用</p>
        </div>
      </div>
    </div>
  </ConfigSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ConfigSection from '../ConfigSection.vue'
import { Input } from '@/components/ui'
import type { StreamingConfig } from '@/types/config'

interface StreamingConfigValues {
  streaming: StreamingConfig
}

interface Props {
  values: StreamingConfigValues
  disabled?: boolean
}

interface Emits {
  (e: 'update', values: Partial<StreamingConfigValues>): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<Emits>()

const isKeepaliveDisabled = computed(() => {
  const val = props.values.streaming.keepaliveSeconds
  return val === '' || val === '0' || val === undefined
})

const isNonstreamKeepaliveDisabled = computed(() => {
  const val = props.values.streaming.nonstreamKeepaliveInterval
  return val === '' || val === '0' || val === undefined
})

const updateStreamingValue = <K extends keyof StreamingConfig>(key: K, value: StreamingConfig[K]) => {
  emit('update', {
    streaming: {
      ...props.values.streaming,
      [key]: value
    }
  })
}
</script>
