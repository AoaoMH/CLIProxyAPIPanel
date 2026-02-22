import { apiClient } from './client'

// ==================== Types ====================

export interface UsageRecord {
  id: number
  request_id: string
  timestamp: string
  ip: string
  api_key: string
  api_key_masked: string
  model: string
  provider: string
  upstream_provider?: string
  upstream_api_key_masked?: string
  upstream_candidate_count?: number
  upstream_has_retry?: boolean
  is_streaming: boolean
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cached_tokens?: number
  reasoning_tokens?: number
  duration_ms: number
  status_code: number
  success: boolean
  request_url: string
  request_method: string
  request_headers?: Record<string, string>
  request_body?: string
  response_headers?: Record<string, string>
  response_body?: string
}

export interface UsageRecordsListQuery {
  page?: number
  page_size?: number
  api_key?: string
  model?: string
  provider?: string
  start_time?: string
  end_time?: string
  success?: boolean
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  include_kpis?: boolean
}

export interface UsageRecordsListResult {
  records: UsageRecord[]
  total: number
  page: number
  page_size: number
  total_pages: number
  kpis?: UsageKPIs
}

export interface UsageRecordOptionsResult {
  models: string[]
  providers: string[]
}

export interface KPITrendPoint {
  t: string
  v: number
}

export interface UsageKPIs {
  total_requests: number
  success_requests: number
  failure_requests: number
  total_tokens: number
  cached_tokens: number
  reasoning_tokens: number
  rpm: number
  tpm: number
  rpd?: number
  tpd?: number
  trend_bucket: 'hour' | 'day'
  requests_trend: KPITrendPoint[]
  tokens_trend: KPITrendPoint[]
  rpm_trend: KPITrendPoint[]
  tpm_trend: KPITrendPoint[]
  generated_at: string
}

// Activity Heatmap types
export interface ActivityHeatmapDay {
  date: string
  requests: number
  total_tokens: number
  total_cost?: number
  actual_total_cost?: number
}

export interface ActivityHeatmap {
  start_date: string
  end_date: string
  total_days: number
  max_requests: number
  days: ActivityHeatmapDay[]
}

// Model Stats types
export interface ModelStats {
  model: string
  provider: string
  request_count: number
  success_count: number
  failure_count: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  avg_duration_ms: number
}

export interface ModelStatsResult {
  models: ModelStats[]
  total_models: number
}

// Provider Stats types
export interface ProviderStats {
  provider: string
  request_count: number
  success_count: number
  failure_count: number
  total_tokens: number
  avg_duration_ms: number
  model_count: number
}

export interface ProviderStatsResult {
  providers: ProviderStats[]
  total_providers: number
}

// Usage Summary types
export interface UsageSummary {
  total_requests: number
  success_requests: number
  failure_requests: number
  success_rate: number
  total_tokens: number
  input_tokens: number
  output_tokens: number
  avg_duration_ms: number
  unique_models: number
  unique_providers: number
}

// Request Timeline types
export interface RequestTimelinePoint {
  hour: string      // Format: "2006-01-02 15:00"
  requests: number  // Number of requests in this hour
  tokens: number    // Total tokens in this hour
}

export interface RequestTimeline {
  start_time: string
  end_time: string
  total_hours: number
  max_requests: number
  points: RequestTimelinePoint[]
}

// Interval Timeline types (for scatter chart)
export interface IntervalTimelinePoint {
  x: string       // ISO timestamp
  y: number       // Interval in minutes
  model: string   // Model name for color coding
}

export interface IntervalTimelineResult {
  analysis_period_hours: number
  total_points: number
  points: IntervalTimelinePoint[]
  models?: string[]  // List of unique models
}

// Request Candidate types (for request tracing)
export interface RequestCandidate {
  id: number
  request_id: string
  timestamp: string
  provider: string
  api_key: string
  api_key_masked: string
  status: string        // pending, success, failed, skipped
  status_code: number
  success: boolean
  duration_ms: number
  error_message?: string
  candidate_index: number
  retry_index: number
  request_body?: string
  response_body?: string
}

export interface RequestCandidatesResult {
  request_id: string
  candidates: RequestCandidate[]
}

// ==================== API ====================

export const usageRecordsApi = {
  /**
   * Get paginated list of usage records
   */
  list: (query: UsageRecordsListQuery = {}): Promise<UsageRecordsListResult> =>
    apiClient.get('/usage-records', { params: query }),

  /**
   * Get a single usage record by ID with full details
   */
  getById: (id: number): Promise<UsageRecord> =>
    apiClient.get(`/usage-records/${id}`),

  /**
   * Delete records older than specified days
   */
  deleteOld: (days: number): Promise<{ deleted: number; message: string }> =>
    apiClient.delete('/usage-records', { data: { days } }),

  /**
   * Get activity heatmap data (GitHub-style contribution graph)
   */
  getHeatmap: (days: number = 90): Promise<ActivityHeatmap> =>
    apiClient.get('/usage-records/heatmap', { params: { days } }),

  /**
   * Get usage statistics grouped by model
   */
  getModelStats: (startTime?: string, endTime?: string): Promise<ModelStatsResult> =>
    apiClient.get('/usage-records/model-stats', { params: { start_time: startTime, end_time: endTime } }),

  /**
   * Get usage statistics grouped by provider
   */
  getProviderStats: (startTime?: string, endTime?: string): Promise<ProviderStatsResult> =>
    apiClient.get('/usage-records/provider-stats', { params: { start_time: startTime, end_time: endTime } }),

  /**
   * Get distinct models/providers in records for filter options.
   */
  getOptions: (startTime?: string, endTime?: string): Promise<UsageRecordOptionsResult> =>
    apiClient.get('/usage-records/options', { params: { start_time: startTime, end_time: endTime } }),

  /**
   * Get overall usage summary
   */
  getSummary: (startTime?: string, endTime?: string): Promise<UsageSummary> =>
    apiClient.get('/usage-records/summary', { params: { start_time: startTime, end_time: endTime } }),

  /**
   * Get hourly request distribution for timeline visualization
   */
  getTimeline: (startTime?: string, endTime?: string): Promise<RequestTimeline> =>
    apiClient.get('/usage-records/timeline', { params: { start_time: startTime, end_time: endTime } }),

  /**
   * Get request interval data for scatter chart visualization
   */
  getIntervalTimeline: (hours: number = 24, limit: number = 5000): Promise<IntervalTimelineResult> =>
    apiClient.get('/usage-records/interval-timeline', { params: { hours, limit } }),

  /**
   * Get request candidates for tracing (shows routing attempts)
   */
  getRequestCandidates: (recordId: number): Promise<RequestCandidatesResult> =>
    apiClient.get(`/usage-records/${recordId}/candidates`),
}
