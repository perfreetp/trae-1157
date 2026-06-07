export interface MonitoringPoint {
  id: string
  name: string
  location: { lat: number; lng: number }
  status: 'online' | 'offline' | 'alert'
  area: string
  lastReport: string
}

export interface WaterQualityRecord {
  pointId: string
  timestamp: string
  flow: number
  temperature: number
  turbidity: number
  pH: number
  residualChlorine: number
}

export interface HandoverNote {
  id: string
  fromPerson: string
  toPerson: string
  note: string
  createdAt: string
}

export interface DispositionRecord {
  confirmedAt?: string
  confirmedBy?: string
  processingAt?: string
  processingBy?: string
  processingNote?: string
  resolvedAt?: string
  resolvedBy?: string
  resolvedResult?: string
  resolvedNote?: string
}

export interface AlertRecord {
  id: string
  pointId: string
  pointName: string
  indicator: string
  value: number
  threshold: number
  level: 'critical' | 'warning' | 'info'
  status: 'pending' | 'processing' | 'resolved'
  createdAt: string
  confirmedAt?: string
  confirmedBy?: string
  processingAt?: string
  processingBy?: string
  processingNote?: string
  resolvedAt?: string
  resolvedBy?: string
  resolvedResult?: string
  resolvedNote?: string
  description: string
  disposition?: string
  assignedTo?: string
  handoverNotes?: HandoverNote[]
  previousDispositions?: DispositionRecord[]
}

export interface SamplingTask {
  id: string
  pointId: string
  pointName: string
  assignee: string
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
  completedAt?: string
  results?: WaterQualityRecord
  photos?: string[]
  type: 'routine' | 'recheck'
  indicators: string[]
  notes: string
}

export interface PatrolRecord {
  id: string
  pointId: string
  pointName: string
  inspector: string
  date: string
  content: string
  issues: string
  photos: string[]
  tags?: string[]
  recheckTaskId?: string
  recheckResult?: string
  recheckResolvedAt?: string
  recheckPhotos?: string[]
  recheckValues?: Record<string, number>
}

export interface ThresholdConfig {
  indicator: string
  label: string
  unit: string
  min: number
  max: number
}

export type ReportType = 'daily' | 'monthly'

export interface IndicatorStats {
  name: string
  unit: string
  avg: number
  max: number
  min: number
  complianceRate: number
}

export interface ExportRecord {
  id: string
  date: string
  type: string
  pointCount: number
  status: 'completed' | 'processing' | 'failed'
  downloadUrl?: string
}

export interface StopReportPoint {
  id: string
  name: string
  lastReportTime: string
  hoursSinceReport: number
}

export interface SummaryStat {
  label: string
  value: string | number
  suffix?: string
  color?: string
}

export interface ReportSnapshot {
  id: string
  type: ReportType
  startDate: string
  endDate: string
  createdAt: string
  summaryStats: SummaryStat[]
  indicatorStats: IndicatorStats[]
  complianceData: { name: string; rate: number }[]
  alertTrends: { date: string; critical: number; warning: number; info: number }[]
  pointScores: { name: string; score: number }[]
  radarData: { indicator: string; value: number; fullMark: number }[]
}
