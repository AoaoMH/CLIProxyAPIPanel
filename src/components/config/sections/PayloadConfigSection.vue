<template>
  <ConfigSection title="Payload 配置" description="配置请求 payload 的默认值、覆盖规则和过滤规则">
    <div class="space-y-6">
      <!-- Default Rules -->
      <div>
        <h4 class="text-sm font-medium text-foreground mb-3">默认规则</h4>
        <p class="text-xs text-muted-foreground mb-3">当请求中未指定参数时，使用这些默认值</p>
        <PayloadRulesEditor
          :model-value="values.payloadDefaultRules"
          :disabled="disabled"
          @update:model-value="updateValue('payloadDefaultRules', $event)"
        />
      </div>

      <!-- Override Rules -->
      <div>
        <h4 class="text-sm font-medium text-foreground mb-3">覆盖规则</h4>
        <p class="text-xs text-muted-foreground mb-3">强制覆盖请求中的参数值</p>
        <PayloadRulesEditor
          :model-value="values.payloadOverrideRules"
          :disabled="disabled"
          @update:model-value="updateValue('payloadOverrideRules', $event)"
        />
      </div>

      <!-- Filter Rules -->
      <div>
        <h4 class="text-sm font-medium text-foreground mb-3">过滤规则</h4>
        <p class="text-xs text-muted-foreground mb-3">
          通过 JSON Path 规则预过滤上游请求体，自动剔除不合规/冗余的请求参数（Request Sanitization）
        </p>
        <PayloadFilterRulesEditor
          :model-value="values.payloadFilterRules"
          :disabled="disabled"
          @update:model-value="updateValue('payloadFilterRules', $event)"
        />
      </div>
    </div>
  </ConfigSection>
</template>

<script setup lang="ts">
import ConfigSection from '../ConfigSection.vue'
import PayloadRulesEditor from '../editors/PayloadRulesEditor.vue'
import PayloadFilterRulesEditor from '../editors/PayloadFilterRulesEditor.vue'
import type { PayloadFilterRule, PayloadRule } from '@/types/config'

interface PayloadConfigValues {
  payloadDefaultRules: PayloadRule[]
  payloadOverrideRules: PayloadRule[]
  payloadFilterRules: PayloadFilterRule[]
}

interface Props {
  values: PayloadConfigValues
  disabled?: boolean
}

interface Emits {
  (e: 'update', values: Partial<PayloadConfigValues>): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<Emits>()

const updateValue = <K extends keyof PayloadConfigValues>(key: K, value: PayloadConfigValues[K]) => {
  emit('update', { [key]: value })
}
</script>
