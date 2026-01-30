<template>
  <div class="minimal-request-timeline">
    <!-- Loading State -->
    <div v-if="loading" class="py-4">
      <div class="animate-pulse">
        <div class="h-32 bg-muted/50 rounded-lg" />
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-4"
    >
      <p class="text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </p>
    </div>

    <!-- Timeline Content -->
    <div
      v-else-if="groupedTimeline.length > 0"
      class="bg-muted/30 rounded-lg border border-border/50 overflow-hidden"
    >
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <h4 class="text-sm font-semibold">
              请求链路追踪
            </h4>
            <div
              class="px-2 py-1 rounded text-xs font-medium"
              :class="getFinalStatusClass()"
            >
              {{ getFinalStatusLabel() }}
            </div>
          </div>
          <div class="text-sm text-muted-foreground">
            {{ formatLatency(totalLatency) }}
          </div>
        </div>

        <!-- Minimal Timeline Track (Grouped) -->
        <div class="minimal-track">
          <div
            v-for="(group, groupIndex) in groupedTimeline"
            :key="`${group.id}-${group.startIndex}`"
            class="minimal-node-group"
            :class="{
              selected: isGroupSelected(group),
              hovered: isGroupHovered(groupIndex) && !isGroupSelected(group),
            }"
            @mouseenter="hoveredGroupIndex = groupIndex"
            @mouseleave="hoveredGroupIndex = null"
            @click="selectGroup(group)"
          >
            <!-- Node container -->
            <div class="node-container">
              <!-- Node label (above node) -->
              <div class="node-label">
                {{ group.providerName }}
              </div>

              <!-- Main node (represents the provider group) -->
              <div
                class="node-dot"
                :class="[
                  getStatusColorClass(group.primaryStatus),
                  { 'is-first-selected': isGroupSelected(group) && selectedAttemptIndex === 0 },
                ]"
                @click.stop="selectFirstAttempt(group)"
              />

              <!-- Sub nodes (retries within the same provider group) -->
              <div
                v-if="group.retryCount > 0 && isGroupSelected(group)"
                class="sub-dots"
              >
                <button
                  v-for="(attempt, idx) in group.allAttempts.slice(1)"
                  :key="attempt.id"
                  class="sub-dot"
                  :class="[
                    getStatusColorClass(attempt.status),
                    { active: selectedAttemptIndex === idx + 1 },
                  ]"
                  :title="attempt.api_key_masked || `Key ${idx + 2}`"
                  @click.stop="selectedAttemptIndex = idx + 1"
                />
              </div>
            </div>

            <!-- Connection line -->
            <div
              v-if="groupIndex < groupedTimeline.length - 1"
              class="node-line"
            />
          </div>
        </div>

        <!-- Selected Details Panel -->
        <div
          v-if="selectedGroup && currentAttempt"
          class="detail-panel"
        >
          <div class="panel-header">
            <div class="panel-title">
              <span
                class="title-dot"
                :class="getStatusColorClass(currentAttempt.status)"
              />
              <span class="title-text">{{ selectedGroup.providerName }}</span>
              <span
                class="status-tag"
                :class="getStatusColorClass(currentAttempt.status)"
              >
                {{ currentAttempt.status_code || getStatusLabel(currentAttempt.status) }}
              </span>
              <span
                v-if="selectedGroup.retryCount > 0"
                class="cache-hint"
              >
                {{ selectedAttemptIndex + 1 }}/{{ selectedGroup.allAttempts.length }}
              </span>
            </div>

            <div class="panel-nav">
              <button
                class="nav-btn"
                :disabled="selectedGroupIndex === 0"
                @click="navigateGroup(-1)"
              >
                <ChevronLeft class="w-4 h-4" />
              </button>
              <span class="nav-info">{{ selectedGroupIndex + 1 }} / {{ groupedTimeline.length }}</span>
              <button
                class="nav-btn"
                :disabled="selectedGroupIndex === groupedTimeline.length - 1"
                @click="navigateGroup(1)"
              >
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="panel-body">
            <!-- Core information grid -->
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">凭证</span>
                <span class="info-value">
                  <code class="key-preview">{{ currentAttempt.api_key_masked || '-' }}</code>
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">耗时</span>
                <span class="info-value highlight">
                  {{ formatLatency(currentAttempt.duration_ms) }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">候选索引</span>
                <span class="info-value">{{ currentAttempt.candidate_index }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">重试索引</span>
                <span class="info-value">{{ currentAttempt.retry_index }}</span>
              </div>
            </div>

            <!-- Error information -->
            <div
              v-if="currentAttempt.status === 'failed' && currentAttempt.error_message"
              class="error-block"
            >
              <div class="error-type">错误信息</div>
              <div class="error-msg">{{ currentAttempt.error_message }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="bg-muted/30 rounded-lg border border-border/50 border-dashed p-8 text-center"
    >
      <p class="text-sm text-muted-foreground">
        暂无追踪数据
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { usageRecordsApi, type RequestCandidate } from '../../api/usageRecords'

const props = defineProps<{
  requestId: number
  overrideStatusCode?: number
}>()

interface NodeGroup {
  id: string
  providerName: string
  primary: RequestCandidate
  primaryStatus: string
  allAttempts: RequestCandidate[]
  retryCount: number
  startIndex: number
  endIndex: number
}

const loading = ref(false)
const error = ref<string | null>(null)
const candidates = ref<RequestCandidate[]>([])
const selectedGroupIndex = ref(0)
const selectedAttemptIndex = ref(0)
const hoveredGroupIndex = ref<number | null>(null)

const timeline = computed<RequestCandidate[]>(() => {
  return [...candidates.value].sort((a, b) => {
    if (a.candidate_index !== b.candidate_index) {
      return a.candidate_index - b.candidate_index
    }
    return a.retry_index - b.retry_index
  })
})

// Merge sequential attempts of the same provider into a group.
const groupedTimeline = computed<NodeGroup[]>(() => {
  if (!timeline.value.length) return []

  const groups: NodeGroup[] = []
  let current: NodeGroup | null = null

  timeline.value.forEach((candidate, index) => {
    const providerKey = candidate.provider || '未知'

    if (current && current.id === providerKey) {
      current.allAttempts.push(candidate)
      current.retryCount += 1
      current.endIndex = index
      if (candidate.status === 'success' || candidate.success) {
        current.primaryStatus = 'success'
      }
      return
    }

    current = {
      id: providerKey,
      providerName: providerKey,
      primary: candidate,
      primaryStatus: candidate.status,
      allAttempts: [candidate],
      retryCount: 0,
      startIndex: index,
      endIndex: index,
    }
    groups.push(current)
  })

  return groups
})

const selectedGroup = computed(() => {
  return groupedTimeline.value[selectedGroupIndex.value] || null
})

const currentAttempt = computed(() => {
  if (!selectedGroup.value) return null
  return selectedGroup.value.allAttempts[selectedAttemptIndex.value] || selectedGroup.value.primary
})

const totalLatency = computed(() => {
  if (!timeline.value.length) return 0

  const successCandidate = timeline.value.find(c => c.success || c.status === 'success')
  if (successCandidate) {
    return successCandidate.duration_ms
  }

  return timeline.value[timeline.value.length - 1]?.duration_ms || 0
})

const formatLatency = (ms: number | undefined | null): string => {
  if (ms === undefined || ms === null) return '-'
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  return `${ms}ms`
}

const getFinalStatusClass = (): string => {
  if (props.overrideStatusCode !== undefined) {
    if (props.overrideStatusCode === 0) {
      return 'bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-200'
    }
    return props.overrideStatusCode === 200
      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
  }

  const hasSuccess = timeline.value.some(c => c.success || c.status === 'success')
  return hasSuccess
    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
}

const getFinalStatusLabel = (): string => {
  if (props.overrideStatusCode !== undefined) {
    if (props.overrideStatusCode === 0) {
      return '进行中'
    }
    return props.overrideStatusCode === 200 ? '最终成功' : '最终失败'
  }

  const hasSuccess = timeline.value.some(c => c.success || c.status === 'success')
  return hasSuccess ? '最终成功' : '最终失败'
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: '等待中',
    success: '成功',
    failed: '失败',
    skipped: '跳过',
  }
  return labels[status] || status
}

const getStatusColorClass = (status: string): string => {
  const classes: Record<string, string> = {
    pending: 'status-pending',
    success: 'status-success',
    failed: 'status-failed',
    skipped: 'status-skipped',
  }
  return classes[status] || 'status-pending'
}

const isGroupHovered = (groupIndex: number) => {
  return hoveredGroupIndex.value === groupIndex
}

const isGroupSelected = (group: NodeGroup) => {
  return selectedGroupIndex.value === groupedTimeline.value.findIndex(g => g.id === group.id && g.startIndex === group.startIndex)
}

const selectGroup = (group: NodeGroup) => {
  const index = groupedTimeline.value.findIndex(g => g.id === group.id && g.startIndex === group.startIndex)
  if (index < 0) return

  selectedGroupIndex.value = index

  const successIdx = group.allAttempts.findIndex(a => a.success || a.status === 'success')
  selectedAttemptIndex.value = successIdx >= 0 ? successIdx : group.allAttempts.length - 1
}

const selectFirstAttempt = (group: NodeGroup) => {
  const index = groupedTimeline.value.findIndex(g => g.id === group.id && g.startIndex === group.startIndex)
  if (index < 0) return

  selectedGroupIndex.value = index
  selectedAttemptIndex.value = 0
}

const navigateGroup = (direction: number) => {
  const newIndex = selectedGroupIndex.value + direction
  if (newIndex < 0 || newIndex >= groupedTimeline.value.length) return

  selectedGroupIndex.value = newIndex
  const group = groupedTimeline.value[newIndex]
  const successIdx = group.allAttempts.findIndex(a => a.success || a.status === 'success')
  selectedAttemptIndex.value = successIdx >= 0 ? successIdx : group.allAttempts.length - 1
}

const loadCandidates = async () => {
  if (!props.requestId) return

  loading.value = true
  error.value = null

  try {
    const result = await usageRecordsApi.getRequestCandidates(props.requestId)
    candidates.value = result.candidates || []
  } catch (err: any) {
    error.value = err.response?.data?.detail || err.message || '加载失败'
    console.error('Failed to load request candidates:', err)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.requestId,
  () => {
    selectedGroupIndex.value = 0
    selectedAttemptIndex.value = 0
    loadCandidates()
  },
  { immediate: true },
)

// Auto-select the most meaningful group when trace updates.
watch(
  groupedTimeline,
  (newGroups) => {
    if (!newGroups.length) return

    const successGroupIndex = newGroups.findIndex(g => g.allAttempts.some(a => a.success || a.status === 'success'))
    if (successGroupIndex >= 0) {
      selectedGroupIndex.value = successGroupIndex
      const group = newGroups[successGroupIndex]
      const attemptIdx = group.allAttempts.findIndex(a => a.success || a.status === 'success')
      selectedAttemptIndex.value = attemptIdx >= 0 ? attemptIdx : 0
      return
    }

    const pendingGroupIndex = newGroups.findIndex(g => g.allAttempts.some(a => a.status === 'pending'))
    if (pendingGroupIndex >= 0) {
      selectedGroupIndex.value = pendingGroupIndex
      selectedAttemptIndex.value = newGroups[pendingGroupIndex].allAttempts.length - 1
      return
    }

    for (let i = newGroups.length - 1; i >= 0; i--) {
      const group = newGroups[i]
      for (let j = group.allAttempts.length - 1; j >= 0; j--) {
        if (group.allAttempts[j].status === 'failed') {
          selectedGroupIndex.value = i
          selectedAttemptIndex.value = j
          return
        }
      }
    }

    selectedGroupIndex.value = newGroups.length - 1
    selectedAttemptIndex.value = newGroups[newGroups.length - 1].allAttempts.length - 1
  },
  { immediate: true },
)
</script>

<script lang="ts">
export default {
  name: 'RequestTimeline',
}
</script>

<style scoped>
.minimal-request-timeline {
  width: 100%;
}

/* Minimal track - center when no overflow, scroll when overflow */
.minimal-track {
  display: flex;
  align-items: center;
  justify-content: safe center;
  gap: 64px;
  padding: 2rem;
  overflow-x: auto;
  overflow-y: hidden;

  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}

.minimal-track::-webkit-scrollbar {
  height: 6px;
}

.minimal-track::-webkit-scrollbar-track {
  background: transparent;
}

.minimal-track::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}

.minimal-track::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}

.minimal-node-group {
  display: flex;
  align-items: center;
  position: relative;
  cursor: pointer;
}

/* Node container */
.node-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

/* Node label - positioned above node */
.node-label {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Main node - concentric circles */
.node-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transition: all 0.2s ease;
  z-index: 2;
  position: relative;
  cursor: pointer;
  border: 2px solid currentColor;
  background: transparent;
}

.node-dot::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  transform: translate(-50%, -50%);
}

.node-dot.is-first-selected {
  transform: scale(1.1);
}

/* Sub nodes (retries) */
.sub-dots {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  padding: 0;
  background: transparent;
}

.sub-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  opacity: 0.5;
  position: relative;
  background: currentColor;
}

.sub-dot::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
}

.sub-dot:hover {
  transform: scale(1.2);
  opacity: 0.9;
}

.sub-dot.active {
  opacity: 1;
  transform: scale(1.15);
  box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 3px currentColor;
}

/* Selected state: breathing animation + ripple effect */
.minimal-node-group.selected .node-dot {
  animation: breathe 2s ease-in-out infinite;
}

.minimal-node-group.selected .node-dot::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid currentColor;
  background: transparent;
  transform: translate(-50%, -50%);
  animation: ripple 1.5s ease-out infinite;
  z-index: -1;
}

/* Hover state: scale effect only */
.minimal-node-group.hovered .node-dot {
  transform: scale(1.3);
}

@keyframes breathe {
  0%, 100% { transform: scale(1.3); }
  50% { transform: scale(1.5); }
}

@keyframes ripple {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.4;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.5);
    opacity: 0;
  }
}

/* Status colors - using color for concentric circles */
.node-dot.status-success { color: #22c55e; }
.node-dot.status-failed { color: #ef4444; }
.node-dot.status-pending { color: #3b82f6; }
.node-dot.status-skipped { color: hsl(var(--primary)); }

.sub-dot.status-success { color: #22c55e; }
.sub-dot.status-failed { color: #ef4444; }
.sub-dot.status-pending { color: #3b82f6; }
.sub-dot.status-skipped { color: hsl(var(--primary)); }

.node-line {
  position: absolute;
  right: -64px;
  top: 50%;
  transform: translateY(-50%);
  width: 64px;
  height: 2px;
  background: hsl(var(--border));
  z-index: 1;
}

/* Details panel */
.detail-panel {
  margin-top: 1rem;
  background: hsl(var(--muted) / 0.3);
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0rem;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--muted) / 0.4);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.title-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.title-dot.status-success { background: #22c55e; }
.title-dot.status-failed { background: #ef4444; }
.title-dot.status-pending { background: #3b82f6; }
.title-dot.status-skipped { background: hsl(var(--primary)); }

.title-text {
  font-weight: 600;
  font-size: 0.95rem;
}

.panel-nav {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  border-radius: 6px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:hover:not(:disabled) {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
  border-color: hsl(var(--muted-foreground) / 0.3);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-info {
  font-size: 0.8rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  padding: 0 0.5rem;
  min-width: 50px;
  text-align: center;
}

.panel-body {
  padding: 0.75rem 0rem;
}

/* Status tag */
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
  margin-left: 0.5rem;
}

.status-tag.status-success {
  background: #22c55e20;
  color: #16a34a;
}

.status-tag.status-failed {
  background: #ef444420;
  color: #dc2626;
}

.status-tag.status-pending {
  background: #3b82f620;
  color: #2563eb;
}

.status-tag.status-skipped {
  background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
}

.cache-hint {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 0.5);
  border-radius: 4px;
  margin-left: 0.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.625rem 1.25rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.info-value {
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-value.highlight {
  font-size: 1.1rem;
  font-weight: 600;
  font-family: ui-monospace, monospace;
  color: hsl(var(--primary));
}

.info-value code {
  font-size: 0.7rem;
  padding: 0.15rem 0.375rem;
  background: hsl(var(--muted));
  border-radius: 4px;
  color: hsl(var(--muted-foreground));
  font-family: ui-monospace, monospace;
}

/* Error block */
.error-block {
  margin-top: 1rem;
  padding: 0.75rem;
  background: hsl(var(--destructive) / 0.05);
  border: 1px solid hsl(var(--destructive) / 0.2);
  border-radius: 10px;
}

.error-type {
  font-size: 0.7rem;
  font-weight: 600;
  color: hsl(var(--destructive));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.error-msg {
  font-size: 0.8rem;
  font-family: ui-monospace, monospace;
  color: hsl(var(--destructive));
  line-height: 1.4;
}
</style>
