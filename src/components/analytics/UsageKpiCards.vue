<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <!-- 总请求数 -->
    <Card
      class="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/25"
    >
      <div class="p-4 pb-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs font-medium text-muted-foreground tracking-wide">
              总请求数
            </div>
            <div class="mt-2">
              <Skeleton
                v-if="!kpis"
                class="h-9 w-24"
              />
              <div
                v-else
                class="text-3xl font-semibold tracking-tight tabular-nums"
              >
                {{ formatNumber(kpis.total_requests) }}
              </div>
            </div>
            <div class="mt-1 text-xs text-muted-foreground">
              <div
                v-if="!kpis"
                class="flex items-center gap-3"
              >
                <Skeleton class="h-3 w-20" />
                <Skeleton class="h-3 w-20" />
              </div>
              <div
                v-else
                class="flex items-center gap-3"
              >
                <div class="flex items-center gap-1">
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  成功 {{ formatNumber(kpis.success_requests) }}
                </div>
                <div class="flex items-center gap-1">
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
                  失败 {{ formatNumber(kpis.failure_requests) }}
                </div>
              </div>
            </div>
          </div>

          <div class="shrink-0 w-9 h-9 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center transition-colors group-hover:bg-muted/35">
            <Activity class="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>
      <div class="h-14 border-t border-border/60 bg-muted/10 px-4 py-3">
        <Skeleton
          v-if="!kpis"
          class="h-full w-full rounded-lg bg-muted/50"
        />
        <LineChart
          v-else
          :data="requestsChartData"
          :options="sparklineOptions"
        />
      </div>
    </Card>

    <!-- 总 Token 数 -->
    <Card
      class="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/25"
    >
      <div class="p-4 pb-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs font-medium text-muted-foreground tracking-wide">
              总 Token 数
            </div>
            <div class="mt-2">
              <Skeleton
                v-if="!kpis"
                class="h-9 w-28"
              />
              <div
                v-else
                class="text-3xl font-semibold tracking-tight tabular-nums"
              >
                {{ formatTokens(kpis.total_tokens) }}
              </div>
            </div>
            <div class="mt-1 text-xs text-muted-foreground">
              <div
                v-if="!kpis"
                class="flex items-center gap-3"
              >
                <Skeleton class="h-3 w-24" />
                <Skeleton class="h-3 w-24" />
              </div>
              <div
                v-else
                class="flex items-center gap-3"
              >
                <div class="flex items-center gap-1">
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
                  缓存 {{ formatTokens(kpis.cached_tokens) }}
                </div>
                <div class="flex items-center gap-1">
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  思考 {{ formatTokens(kpis.reasoning_tokens) }}
                </div>
              </div>
            </div>
          </div>

          <div class="shrink-0 w-9 h-9 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center transition-colors group-hover:bg-muted/35">
            <Cpu class="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>
      <div class="h-14 border-t border-border/60 bg-muted/10 px-4 py-3">
        <Skeleton
          v-if="!kpis"
          class="h-full w-full rounded-lg bg-muted/50"
        />
        <LineChart
          v-else
          :data="tokensChartData"
          :options="sparklineOptions"
        />
      </div>
    </Card>

    <!-- RPM -->
    <Card
      class="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/25"
    >
      <div class="p-4 pb-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs font-medium text-muted-foreground tracking-wide">
              RPM
            </div>
            <div class="mt-2">
              <Skeleton
                v-if="!kpis"
                class="h-9 w-20"
              />
              <div
                v-else
                class="text-3xl font-semibold tracking-tight tabular-nums"
              >
                {{ formatNumber(kpis.rpm) }}
              </div>
            </div>
            <div class="mt-1 text-xs text-muted-foreground">
              <Skeleton
                v-if="!kpis"
                class="h-3 w-28"
              />
              <span v-else>最近 60 秒请求数</span>
            </div>
          </div>

          <div class="shrink-0 w-9 h-9 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center transition-colors group-hover:bg-muted/35">
            <Gauge class="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>
      <div class="h-14 border-t border-border/60 bg-muted/10 px-4 py-3">
        <Skeleton
          v-if="!kpis"
          class="h-full w-full rounded-lg bg-muted/50"
        />
        <LineChart
          v-else
          :data="rpmChartData"
          :options="sparklineOptions"
        />
      </div>
    </Card>

    <!-- TPM -->
    <Card
      class="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/25"
    >
      <div class="p-4 pb-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs font-medium text-muted-foreground tracking-wide">
              TPM
            </div>
            <div class="mt-2">
              <Skeleton
                v-if="!kpis"
                class="h-9 w-28"
              />
              <div
                v-else
                class="text-3xl font-semibold tracking-tight tabular-nums"
              >
                {{ formatTokens(kpis.tpm) }}
              </div>
            </div>
            <div class="mt-1 text-xs text-muted-foreground">
              <Skeleton
                v-if="!kpis"
                class="h-3 w-28"
              />
              <span v-else>最近 60 秒 Token</span>
            </div>
          </div>

          <div class="shrink-0 w-9 h-9 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center transition-colors group-hover:bg-muted/35">
            <Zap class="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>
      <div class="h-14 border-t border-border/60 bg-muted/10 px-4 py-3">
        <Skeleton
          v-if="!kpis"
          class="h-full w-full rounded-lg bg-muted/50"
        />
        <LineChart
          v-else
          :data="tpmChartData"
          :options="sparklineOptions"
        />
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Activity, Cpu, Gauge, Zap } from 'lucide-vue-next'
import type { ChartData, ChartOptions } from 'chart.js'
import Card from '@/components/ui/card.vue'
import Skeleton from '@/components/ui/skeleton.vue'
import LineChart from '@/components/charts/LineChart.vue'
import type { KPITrendPoint, UsageKPIs } from '@/api/usageRecords'
import { formatNumber, formatTokens } from '@/utils/format'

const props = withDefaults(defineProps<{
  kpis: UsageKPIs | null
  loading?: boolean
}>(), {
  loading: false
})

const kpis = computed(() => props.kpis)
const loading = computed(() => props.loading)

function parseRgbTriplet(value: string): [number, number, number] {
  const parts = value.split(',').map(p => parseInt(p.trim(), 10)).filter(n => Number.isFinite(n))
  if (parts.length !== 3) return [201, 100, 66]
  return [parts[0], parts[1], parts[2]]
}

function mixRgb(rgb: [number, number, number], target: number, amount: number): [number, number, number] {
  const clamp = (n: number) => Math.max(0, Math.min(255, n))
  const mix = (c: number) => clamp(Math.round(c + (target - c) * amount))
  return [mix(rgb[0]), mix(rgb[1]), mix(rgb[2])]
}

function rgbToTriplet(rgb: [number, number, number]): string {
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`
}

function getPrimaryRgbTriplet(): string {
  if (typeof window === 'undefined') return '201, 100, 66'
  const style = getComputedStyle(document.body)
  return style.getPropertyValue('--color-primary-rgb').trim() || '201, 100, 66'
}

const baseRgb = computed(() => parseRgbTriplet(getPrimaryRgbTriplet()))

const requestsRgb = computed(() => rgbToTriplet(baseRgb.value))
const tokensRgb = computed(() => rgbToTriplet(mixRgb(baseRgb.value, 255, 0.18)))
const rpmRgb = computed(() => rgbToTriplet(mixRgb(baseRgb.value, 0, 0.12)))
const tpmRgb = computed(() => rgbToTriplet(mixRgb(baseRgb.value, 255, 0.28)))

function buildSparkline(points: KPITrendPoint[] | undefined, rgbTriplet: string): ChartData<'line'> {
  const safe = points ?? []
  return {
    labels: safe.map(p => p.t),
    datasets: [
      {
        data: safe.map(p => p.v),
        borderColor: `rgba(${rgbTriplet}, 0.95)`,
        backgroundColor: `rgba(${rgbTriplet}, 0.14)`,
        fill: true,
        tension: 0.38,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
      }
    ]
  }
}

const sparklineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false }
  },
  scales: {
    x: { display: false, grid: { display: false }, ticks: { display: false } },
    y: { display: false, grid: { display: false }, ticks: { display: false } }
  },
  elements: {
    line: { capBezierPoints: true },
  },
}

const requestsChartData = computed(() =>
  buildSparkline(kpis.value?.requests_trend, requestsRgb.value)
)

const tokensChartData = computed(() =>
  buildSparkline(kpis.value?.tokens_trend, tokensRgb.value)
)

const rpmChartData = computed(() =>
  buildSparkline(kpis.value?.rpm_trend, rpmRgb.value)
)

const tpmChartData = computed(() =>
  buildSparkline(kpis.value?.tpm_trend, tpmRgb.value)
)
</script>
