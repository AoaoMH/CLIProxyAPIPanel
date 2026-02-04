<template>
  <ConfigSection title="系统配置" description="调试、日志、统计与性能调试设置">
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-medium text-foreground">调试模式</h4>
            <p class="text-sm text-muted-foreground">启用详细的调试日志</p>
          </div>
          <Switch
            :model-value="values.debug"
            :disabled="disabled"
            @update:model-value="updateValue('debug', $event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-medium text-foreground">pprof 调试服务</h4>
            <p class="text-sm text-muted-foreground">开启 Go pprof HTTP 调试端口</p>
          </div>
          <Switch
            :model-value="values.pprofEnable"
            :disabled="disabled"
            @update:model-value="updateValue('pprofEnable', $event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-medium text-foreground">商业模式</h4>
            <p class="text-sm text-muted-foreground">启用商业版功能</p>
          </div>
          <Switch
            :model-value="values.commercialMode"
            :disabled="disabled"
            @update:model-value="updateValue('commercialMode', $event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-medium text-foreground">写入日志文件</h4>
            <p class="text-sm text-muted-foreground">将日志保存到文件</p>
          </div>
          <Switch
            :model-value="values.loggingToFile"
            :disabled="disabled"
            @update:model-value="updateValue('loggingToFile', $event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-medium text-foreground">使用统计</h4>
            <p class="text-sm text-muted-foreground">收集使用统计信息</p>
          </div>
          <Switch
            :model-value="values.usageStatisticsEnabled"
            :disabled="disabled"
            @update:model-value="updateValue('usageStatisticsEnabled', $event)"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">日志文件大小限制 (MB)</label>
          <Input
            :model-value="values.logsMaxTotalSizeMb"
            type="number"
            placeholder="100"
            :disabled="disabled"
            @update:model-value="updateValue('logsMaxTotalSizeMb', $event)"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-2">pprof 监听地址</label>
          <Input
            :model-value="values.pprofAddr"
            placeholder="127.0.0.1:8316"
            :disabled="disabled"
            @update:model-value="updateValue('pprofAddr', $event)"
          />
          <p class="text-xs text-muted-foreground mt-1">建议仅监听本机地址（127.0.0.1）</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-2">使用记录保留天数</label>
          <Input
            :model-value="values.usageRecordsRetentionDays"
            type="number"
            placeholder="30"
            :disabled="disabled"
            @update:model-value="updateValue('usageRecordsRetentionDays', $event)"
          />
          <p class="text-xs text-muted-foreground mt-1">默认 30 天，0 为无限制（不清理）</p>
        </div>
      </div>
    </div>
  </ConfigSection>
</template>

<script setup lang="ts">
import ConfigSection from '../ConfigSection.vue'
import { Input, Switch } from '@/components/ui'

interface SystemConfigValues {
  debug: boolean
  pprofEnable: boolean
  pprofAddr: string
  commercialMode: boolean
  loggingToFile: boolean
  usageStatisticsEnabled: boolean
  logsMaxTotalSizeMb: string
  usageRecordsRetentionDays: string
}

interface Props {
  values: SystemConfigValues
  disabled?: boolean
}

interface Emits {
  (e: 'update', values: Partial<SystemConfigValues>): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<Emits>()

const updateValue = <K extends keyof SystemConfigValues>(key: K, value: SystemConfigValues[K]) => {
  emit('update', { [key]: value })
}
</script>
