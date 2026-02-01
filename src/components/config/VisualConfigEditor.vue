<template>
  <div class="visual-config-editor space-y-8">
    <!-- 服务器配置 -->
    <ServerConfigSection
      :values="serverConfigValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />

    <!-- TLS 配置 -->
    <TlsConfigSection
      :values="tlsConfigValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />

    <!-- 远程管理配置 -->
    <RemoteManagementSection
      :values="remoteManagementValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />

    <!-- 认证配置 -->
    <AuthConfigSection
      :values="authConfigValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />

    <!-- 系统配置 -->
    <SystemConfigSection
      :values="systemConfigValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />

    <!-- 网络配置 -->
    <NetworkConfigSection
      :values="networkConfigValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />

    <!-- 配额回退配置 -->
    <QuotaConfigSection
      :values="quotaConfigValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />

    <!-- 流式传输配置 -->
    <StreamingConfigSection
      :values="streamingConfigValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />

    <!-- Ampcode 配置 -->
    <AmpcodeConfigSection
      :values="ampcodeConfigValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />

    <!-- OAuth 模型映射 -->
    <OAuthModelMappingsSection
      :values="oauthModelMappingsValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />

    <!-- OAuth 排除模型 -->
    <OAuthExcludedModelsSection
      :values="oauthExcludedModelsValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />

    <!-- Payload 配置 -->
    <PayloadConfigSection
      :values="payloadConfigValues"
      :disabled="disabled"
      @update="handleSectionUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { VisualConfigValues } from '@/types/config'
import {
  ServerConfigSection,
  TlsConfigSection,
  RemoteManagementSection,
  AuthConfigSection,
  SystemConfigSection,
  NetworkConfigSection,
  QuotaConfigSection,
  StreamingConfigSection,
  AmpcodeConfigSection,
  OAuthModelMappingsSection,
  OAuthExcludedModelsSection,
  PayloadConfigSection
} from './sections'

interface Props {
  values: VisualConfigValues
  disabled?: boolean
}

interface Emits {
  (e: 'update:values', values: Partial<VisualConfigValues>): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<Emits>()

// Computed values for each section - extracting relevant fields from the full values object

const serverConfigValues = computed(() => ({
  host: props.values.host,
  port: props.values.port
}))

const tlsConfigValues = computed(() => ({
  tlsEnable: props.values.tlsEnable,
  tlsCert: props.values.tlsCert,
  tlsKey: props.values.tlsKey
}))

const remoteManagementValues = computed(() => ({
  rmAllowRemote: props.values.rmAllowRemote,
  rmDisableControlPanel: props.values.rmDisableControlPanel,
  rmSecretKey: props.values.rmSecretKey,
  rmPanelRepo: props.values.rmPanelRepo
}))

const authConfigValues = computed(() => ({
  authDir: props.values.authDir,
  apiKeysText: props.values.apiKeysText
}))

const systemConfigValues = computed(() => ({
  debug: props.values.debug,
  commercialMode: props.values.commercialMode,
  loggingToFile: props.values.loggingToFile,
  usageStatisticsEnabled: props.values.usageStatisticsEnabled,
  logsMaxTotalSizeMb: props.values.logsMaxTotalSizeMb,
  usageRecordsRetentionDays: props.values.usageRecordsRetentionDays
}))

const networkConfigValues = computed(() => ({
  proxyUrl: props.values.proxyUrl,
  requestRetry: props.values.requestRetry,
  maxRetryInterval: props.values.maxRetryInterval,
  routingStrategy: props.values.routingStrategy,
  forceModelPrefix: props.values.forceModelPrefix,
  wsAuth: props.values.wsAuth
}))

const quotaConfigValues = computed(() => ({
  quotaSwitchProject: props.values.quotaSwitchProject,
  quotaSwitchPreviewModel: props.values.quotaSwitchPreviewModel
}))

const streamingConfigValues = computed(() => ({
  streaming: props.values.streaming
}))

const ampcodeConfigValues = computed(() => ({
  ampUpstreamUrl: props.values.ampUpstreamUrl,
  ampUpstreamApiKey: props.values.ampUpstreamApiKey,
  ampRestrictManagementToLocalhost: props.values.ampRestrictManagementToLocalhost,
  ampForceModelMappings: props.values.ampForceModelMappings,
  ampModelMappings: props.values.ampModelMappings,
  ampUpstreamApiKeys: props.values.ampUpstreamApiKeys
}))

const oauthModelMappingsValues = computed(() => ({
  oauthModelMappings: props.values.oauthModelMappings
}))

const oauthExcludedModelsValues = computed(() => ({
  oauthExcludedModels: props.values.oauthExcludedModels
}))

const payloadConfigValues = computed(() => ({
  payloadDefaultRules: props.values.payloadDefaultRules,
  payloadOverrideRules: props.values.payloadOverrideRules,
  payloadFilterRules: props.values.payloadFilterRules
}))

// Unified update handler that merges section updates and emits to parent
const handleSectionUpdate = (updates: Partial<VisualConfigValues>) => {
  emit('update:values', updates)
}
</script>
