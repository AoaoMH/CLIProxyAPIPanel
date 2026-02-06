<template>
  <Card class="overflow-hidden">
    <div class="px-3 py-2 border-b">
      <h3 class="text-sm font-medium">
        按提供商分析
      </h3>
    </div>
    <Table class="text-sm">
      <TableHeader>
        <TableRow>
          <TableHead class="h-8 px-2">
            提供商
          </TableHead>
          <TableHead class="h-8 px-2 text-right">
            请求数(成功/失败)
          </TableHead>
          <TableHead class="h-8 px-2 text-right">
            Tokens
          </TableHead>
          <TableHead class="h-8 px-2 text-right">
            成功率
          </TableHead>
          <TableHead class="h-8 px-2 text-right">
            平均耗时
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="data.length === 0">
          <TableCell
            :colspan="5"
            class="text-center py-6 text-muted-foreground px-2"
          >
            暂无提供商统计数据
          </TableCell>
        </TableRow>
        <TableRow
          v-for="provider in data"
          :key="provider.provider"
        >
          <TableCell class="font-medium py-2 px-2">
            {{ provider.provider }}
          </TableCell>
          <TableCell class="text-right py-2 px-2">
            <span class="font-medium">{{ provider.request_count }}</span>
            <span class="text-muted-foreground"> (</span>
            <span class="text-green-600 dark:text-green-400">{{ provider.success_count }}</span>
            <span class="text-muted-foreground">/</span>
            <span class="text-red-600 dark:text-red-400">{{ provider.failure_count }}</span>
            <span class="text-muted-foreground">)</span>
          </TableCell>
          <TableCell class="text-right py-2 px-2">
            <span>{{ formatTokens(provider.total_tokens) }}</span>
          </TableCell>
          <TableCell class="text-right py-2 px-2">
            <span :class="getSuccessRateClass(successRate(provider))">{{ successRate(provider) }}%</span>
          </TableCell>
          <TableCell class="text-right text-muted-foreground py-2 px-2">
            {{ formatDuration(provider.avg_duration_ms) }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </Card>
</template>

<script setup lang="ts">
import Card from '@/components/ui/card.vue'
import Table from '@/components/ui/table.vue'
import TableHeader from '@/components/ui/table-header.vue'
import TableBody from '@/components/ui/table-body.vue'
import TableRow from '@/components/ui/table-row.vue'
import TableHead from '@/components/ui/table-head.vue'
import TableCell from '@/components/ui/table-cell.vue'
import { formatTokens } from '@/utils/format'
import type { ProviderStats } from '@/api/usageRecords'

defineProps<{
  data: ProviderStats[]
}>()

function successRate(provider: ProviderStats): number {
  if (provider.request_count === 0) return 0
  return Math.round((provider.success_count / provider.request_count) * 100)
}

function getSuccessRateClass(rate: number): string {
  if (rate < 90) return 'text-destructive'
  return ''
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
</script>
