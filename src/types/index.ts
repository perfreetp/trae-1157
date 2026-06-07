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
  resolvedAt?: string
  description: string
  disposition?: string
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
