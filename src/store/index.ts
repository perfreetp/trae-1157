import { create } from 'zustand'
import type {
  MonitoringPoint,
  WaterQualityRecord,
  AlertRecord,
  SamplingTask,
  PatrolRecord,
  ThresholdConfig,
  ReportType,
  IndicatorStats,
  ExportRecord,
  StopReportPoint,
  SummaryStat,
} from '@/types'
import {
  monitoringPoints as initialPoints,
  generateWaterQualityRecords,
  alerts as initialAlerts,
  samplingTasks as initialTasks,
  patrolRecords as initialPatrols,
  thresholds as initialThresholds,
} from '../utils/mockData'

interface StoreState {
  monitoringPoints: MonitoringPoint[]
  waterQualityRecords: WaterQualityRecord[]
  alerts: AlertRecord[]
  samplingTasks: SamplingTask[]
  patrolRecords: PatrolRecord[]
  thresholds: ThresholdConfig[]

  addSamplingTask: (task: SamplingTask) => void
  updateSamplingTask: (id: string, updates: Partial<SamplingTask>) => void
  addPatrolRecord: (record: PatrolRecord) => void
  updatePatrolRecord: (id: string, updates: Partial<PatrolRecord>) => void
  updateAlert: (id: string, updates: Partial<AlertRecord>) => void
  updateThreshold: (indicator: string, updates: Partial<ThresholdConfig>) => void
  addAlert: (alert: AlertRecord) => void
}

export const useStore = create<StoreState>((set) => ({
  monitoringPoints: initialPoints,
  waterQualityRecords: generateWaterQualityRecords(),
  alerts: initialAlerts,
  samplingTasks: initialTasks,
  patrolRecords: initialPatrols,
  thresholds: initialThresholds,

  addSamplingTask: (task) =>
    set((state) => ({ samplingTasks: [...state.samplingTasks, task] })),

  updateSamplingTask: (id, updates) =>
    set((state) => ({
      samplingTasks: state.samplingTasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    })),

  addPatrolRecord: (record) =>
    set((state) => ({ patrolRecords: [...state.patrolRecords, record] })),

  updatePatrolRecord: (id, updates) =>
    set((state) => ({
      patrolRecords: state.patrolRecords.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  updateAlert: (id, updates) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, ...updates } : a,
      ),
    })),

  updateThreshold: (indicator, updates) =>
    set((state) => ({
      thresholds: state.thresholds.map((t) =>
        t.indicator === indicator ? { ...t, ...updates } : t,
      ),
    })),

  addAlert: (alert) =>
    set((state) => ({ alerts: [...state.alerts, alert] })),
}))

const generateAlertTrends = () => {
  const data = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(2026, 5, 8 - i)
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
    data.push({
      date: dateStr,
      critical: (i * 7 + 3) % 4,
      warning: (i * 5 + 2) % 6 + 1,
      info: (i * 3 + 1) % 9 + 2,
    })
  }
  return data
}

interface ReportsState {
  reportType: ReportType
  startDate: string
  endDate: string
  summaryStats: SummaryStat[]
  indicatorStats: IndicatorStats[]
  complianceData: { name: string; rate: number }[]
  alertTrends: { date: string; critical: number; warning: number; info: number }[]
  pointScores: { name: string; score: number }[]
  radarData: { indicator: string; value: number; fullMark: number }[]
  exportRecords: ExportRecord[]
  stopReportPoints: StopReportPoint[]
  reportMonitoringPoints: { id: string; name: string }[]
  setReportType: (type: ReportType) => void
  setStartDate: (date: string) => void
  setEndDate: (date: string) => void
}

export const useReportsStore = create<ReportsState>((set) => ({
  reportType: 'daily',
  startDate: '2026-06-01',
  endDate: '2026-06-08',
  summaryStats: [
    { label: '监测点总数', value: 12, suffix: '个' },
    { label: '在线率', value: 91.7, suffix: '%', color: 'text-data-green' },
    { label: '告警次数', value: 23, suffix: '次', color: 'text-data-amber' },
    { label: '达标率', value: 88.4, suffix: '%', color: 'text-data-green' },
  ],
  indicatorStats: [
    { name: '流量', unit: 'L/s', avg: 2.35, max: 4.12, min: 1.05, complianceRate: 96 },
    { name: '水温', unit: '°C', avg: 18.6, max: 22.3, min: 15.1, complianceRate: 98 },
    { name: '浊度', unit: 'NTU', avg: 1.8, max: 5.2, min: 0.3, complianceRate: 85 },
    { name: 'pH', unit: '', avg: 7.2, max: 8.5, min: 6.3, complianceRate: 72 },
    { name: '余氯', unit: 'mg/L', avg: 0.35, max: 0.8, min: 0.05, complianceRate: 91 },
  ],
  complianceData: [
    { name: '流量', rate: 96 },
    { name: '水温', rate: 98 },
    { name: '浊度', rate: 85 },
    { name: 'pH', rate: 72 },
    { name: '余氯', rate: 91 },
  ],
  alertTrends: generateAlertTrends(),
  pointScores: [
    { name: '翠竹泉', score: 95 },
    { name: '松涛泉', score: 91 },
    { name: '碧水潭', score: 88 },
    { name: '云雾溪', score: 82 },
    { name: '龙泉源', score: 76 },
    { name: '石壁泉', score: 73 },
  ],
  radarData: [
    { indicator: '流量', value: 85, fullMark: 100 },
    { indicator: '水温', value: 92, fullMark: 100 },
    { indicator: '浊度', value: 78, fullMark: 100 },
    { indicator: 'pH', value: 65, fullMark: 100 },
    { indicator: '余氯', value: 88, fullMark: 100 },
  ],
  exportRecords: [
    { id: '1', date: '2026-06-01', type: '月度台账', pointCount: 12, status: 'completed' },
    { id: '2', date: '2026-05-01', type: '月度台账', pointCount: 11, status: 'completed' },
    { id: '3', date: '2026-06-07', type: '日报台账', pointCount: 12, status: 'processing' },
    { id: '4', date: '2026-06-05', type: '日报台账', pointCount: 10, status: 'failed' },
  ],
  stopReportPoints: [
    { id: '3', name: '龙泉源', lastReportTime: '2026-06-06T08:00:00', hoursSinceReport: 48 },
    { id: '7', name: '石壁泉', lastReportTime: '2026-06-05T14:00:00', hoursSinceReport: 66 },
    { id: '9', name: '溪谷源', lastReportTime: '2026-06-07T02:00:00', hoursSinceReport: 30 },
  ],
  reportMonitoringPoints: [
    { id: '1', name: '翠竹泉' },
    { id: '2', name: '碧水潭' },
    { id: '3', name: '龙泉源' },
    { id: '4', name: '云雾溪' },
    { id: '5', name: '松涛泉' },
    { id: '6', name: '银杏泉' },
    { id: '7', name: '石壁泉' },
    { id: '8', name: '清泉庵' },
    { id: '9', name: '溪谷源' },
    { id: '10', name: '竹林溪' },
    { id: '11', name: '石桥泉' },
    { id: '12', name: '雾隐泉' },
  ],
  setReportType: (type) => set({ reportType: type }),
  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
}))
