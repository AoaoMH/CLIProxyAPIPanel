<template>
  <div class="payload-filter-rules-editor space-y-4">
    <div
      v-for="(rule, ruleIndex) in rules"
      :key="rule.id"
      class="border border-border rounded-lg p-4 space-y-4"
    >
      <div class="flex items-center justify-between">
        <h5 class="text-sm font-medium text-foreground">规则 {{ ruleIndex + 1 }}</h5>
        <Button
          variant="ghost"
          size="icon"
          :disabled="disabled"
          class="shrink-0 text-muted-foreground hover:text-destructive"
          @click="removeRule(ruleIndex)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </Button>
      </div>

      <!-- Models -->
      <div>
        <label class="block text-xs font-medium text-muted-foreground mb-2">适用模型</label>
        <div class="space-y-2">
          <div
            v-for="(model, modelIndex) in rule.models"
            :key="model.id"
            class="flex items-center gap-2"
          >
            <Input
              :model-value="model.name"
              placeholder="模型名称"
              :disabled="disabled"
              class="flex-1"
              @update:model-value="updateModelName(ruleIndex, modelIndex, $event)"
            />
            <SearchableSelect
              :model-value="model.protocol || ''"
              :options="protocolOptions"
              placeholder="协议"
              :disabled="disabled"
              class="w-32"
              @update:model-value="updateModelProtocol(ruleIndex, modelIndex, $event)"
            />
            <Button
              variant="ghost"
              size="icon"
              :disabled="disabled"
              class="shrink-0 text-muted-foreground hover:text-destructive"
              @click="removeModel(ruleIndex, modelIndex)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            :disabled="disabled"
            class="w-full"
            @click="addModel(ruleIndex)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            添加模型
          </Button>
        </div>
      </div>

      <!-- Params -->
      <div>
        <label class="block text-xs font-medium text-muted-foreground mb-2">移除参数</label>
        <StringListEditor
          :model-value="rule.params"
          :disabled="disabled"
          placeholder="JSON 路径 (gjson/sjson)，如 generationConfig.thinkingConfig.thinkingBudget"
          @update:model-value="updateRuleParams(ruleIndex, $event)"
        />
      </div>
    </div>

    <Button
      variant="outline"
      size="sm"
      :disabled="disabled"
      class="w-full"
      @click="addRule"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
      添加规则
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Input, Button, SearchableSelect } from '@/components/ui'
import StringListEditor from './StringListEditor.vue'
import type { PayloadFilterRule, PayloadModelEntry } from '@/types/config'
import { makeClientId } from '@/types/config'

const protocolOptions = [
  { value: '', label: '默认' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude', label: 'Claude' },
  { value: 'codex', label: 'Codex' },
  { value: 'antigravity', label: 'Antigravity' },
]

interface Props {
  modelValue: PayloadFilterRule[]
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: PayloadFilterRule[]): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<Emits>()

const rules = computed(() => props.modelValue)

const addRule = () => {
  const newRule: PayloadFilterRule = {
    id: makeClientId(),
    models: [],
    params: [],
  }
  emit('update:modelValue', [...props.modelValue, newRule])
}

const removeRule = (index: number) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

const addModel = (ruleIndex: number) => {
  const newModel: PayloadModelEntry = {
    id: makeClientId(),
    name: '',
    protocol: undefined,
  }
  const updatedRules = props.modelValue.map((rule, i) =>
    i === ruleIndex ? { ...rule, models: [...rule.models, newModel] } : rule,
  )
  emit('update:modelValue', updatedRules)
}

const removeModel = (ruleIndex: number, modelIndex: number) => {
  const updatedRules = props.modelValue.map((rule, i) =>
    i === ruleIndex ? { ...rule, models: rule.models.filter((_, mi) => mi !== modelIndex) } : rule,
  )
  emit('update:modelValue', updatedRules)
}

const updateModelName = (ruleIndex: number, modelIndex: number, name: string) => {
  const updatedRules = props.modelValue.map((rule, i) =>
    i === ruleIndex
      ? { ...rule, models: rule.models.map((m, mi) => (mi === modelIndex ? { ...m, name } : m)) }
      : rule,
  )
  emit('update:modelValue', updatedRules)
}

const updateModelProtocol = (ruleIndex: number, modelIndex: number, protocol: string) => {
  const validProtocol = protocol as PayloadModelEntry['protocol']
  const updatedRules = props.modelValue.map((rule, i) =>
    i === ruleIndex
      ? {
          ...rule,
          models: rule.models.map((m, mi) =>
            mi === modelIndex ? { ...m, protocol: validProtocol || undefined } : m,
          ),
        }
      : rule,
  )
  emit('update:modelValue', updatedRules)
}

const updateRuleParams = (ruleIndex: number, params: string[]) => {
  const updatedRules = props.modelValue.map((rule, i) => (i === ruleIndex ? { ...rule, params } : rule))
  emit('update:modelValue', updatedRules)
}
</script>

