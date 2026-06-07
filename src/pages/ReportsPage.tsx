import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  FileText,
  Download,
  Printer,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import type {
  WaterQualityRecord,
  MonitoringPoint,
  AlertRecord,
  ThresholdConfig,
  ExportRecord,
  ReportType,
  IndicatorStats,
  SummaryStat,
} from '@/types'
import { useStore } from '@/store'
import GlassCard from '@/components/GlassCard'

const INDICATOR_KEYS: Record<string, { label: string; unit: string }> = {
  flow: { label: '流量', unit: 'm³/h' },
  temperature: { label: '水温', unit: '°C' },
  turbidity: { label: '浊度', unit: 'NTU' },
  pH: { label: '酸碱度', unit: 'pH' },
  residualChlorine: { label: '余氯', unit: 'mg/L' },
}

const getBarColor = (rate: number) => {
  if (rate > 90) return '#22C55E'
  if (rate >= 70) return '#F59E0B'
  return '#EF4444'
}

const getComplianceClass = (rate: number) => {
  if (rate >= 90) return 'text-data-green'
  if (rate >= 70) return 'text-data-amber'
  return 'text-data-red'
}

const formatRelativeTime = (hours: number) => {
  if (hours < 24) return `${Math.round(hours)}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

const tooltipStyle = {
  backgroundColor: '#1E293B',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
}

const getToday = () => new Date().toISOString().split('T')[0]

const getMonthStart = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

interface ReportData {
  summaryStats: SummaryStat[]
  indicatorStats: IndicatorStats[]
  complianceData: { name: string; rate: number }[]
  alertTrends: { date: string; critical: number; warning: number; info: number }[]
  pointScores: { name: string; score: number }[]
  radarData: { indicator: string; value: number; fullMark: number }[]
}

function computeReport(
  records: WaterQualityRecord[],
  points: MonitoringPoint[],
  alerts: AlertRecord[],
  thresholds: ThresholdConfig[],
  selectedPoints: string[],
  selectedIndicators: string[],
  startDate: string,
  endDate: string,
): ReportData {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T23:59:59')

  const filteredRecords = records.filter((r) => {
    const t = new Date(r.timestamp)
    return t >= start && t <= end && selectedPoints.includes(r.pointId)
  })

  const filteredAlerts = alerts.filter((a) => {
    const t = new Date(a.createdAt)
    return t >= start && t <= end && selectedPoints.includes(a.pointId)
  })

  const onlineCount = points.filter((p) => selectedPoints.includes(p.id) && p.status === 'online').length
  const onlineRate = selectedPoints.length > 0 ? (onlineCount / selectedPoints.length) * 100 : 0

  const indicatorStats: IndicatorStats[] = selectedIndicators.map((key) => {
    const config = INDICATOR_KEYS[key]
    const threshold = thresholds.find((t) => t.indicator === key)
    const values = filteredRecords.map((r) => r[key as keyof WaterQualityRecord] as number).filter((v) => typeof v === 'number')

    if (values.length === 0) {
      return { name: config.label, unit: config.unit, avg: 0, max: 0, min: 0, complianceRate: 0 }
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const max = Math.max(...values)
    const min = Math.min(...values)

    let complianceCount = values.length
    if (threshold) {
      complianceCount = values.filter((v) => v >= threshold.min && v <= threshold.max).length
    }
    const complianceRate = values.length > 0 ? (complianceCount / values.length) * 100 : 0

    return {
      name: config.label,
      unit: config.unit,
      avg: Number(avg.toFixed(2)),
      max: Number(max.toFixed(2)),
      min: Number(min.toFixed(2)),
      complianceRate: Number(complianceRate.toFixed(1)),
    }
  })

  const complianceData = indicatorStats.map((s) => ({ name: s.name, rate: s.complianceRate }))

  const overallCompliance = indicatorStats.length > 0
    ? indicatorStats.reduce((a, b) => a + b.complianceRate, 0) / indicatorStats.length
    : 0

  const summaryStats: SummaryStat[] = [
    { label: '监测点总数', value: selectedPoints.length, suffix: '个' },
    { label: '在线率', value: onlineRate.toFixed(1), suffix: '%', color: onlineRate >= 90 ? 'text-data-green' : onlineRate >= 70 ? 'text-data-amber' : 'text-data-red' },
    { label: '告警次数', value: filteredAlerts.length, suffix: '次', color: filteredAlerts.length > 10 ? 'text-data-red' : 'text-data-amber' },
    { label: '达标率', value: overallCompliance.toFixed(1), suffix: '%', color: overallCompliance >= 90 ? 'text-data-green' : overallCompliance >= 70 ? 'text-data-amber' : 'text-data-red' },
  ]

  const dayMap = new Map<string, { critical: number; warning: number; info: number }>()
  const current = new Date(start)
  while (current <= end) {
    const key = current.toISOString().split('T')[0]
    dayMap.set(key, { critical: 0, warning: 0, info: 0 })
    current.setDate(current.getDate() + 1)
  }
  filteredAlerts.forEach((a) => {
    const day = a.createdAt.split('T')[0]
    const entry = dayMap.get(day)
    if (entry) {
      entry[a.level] += 1
    }
  })
  const alertTrends = Array.from(dayMap.entries()).map(([date, counts]) => ({
    date: `${new Date(date).getMonth() + 1}/${new Date(date).getDate()}`,
    ...counts,
  }))

  const pointScores = selectedPoints.map((pid) => {
    const point = points.find((p) => p.id === pid)
    if (!point) return { name: pid, score: 0 }
    const pointRecords = filteredRecords.filter((r) => r.pointId === pid)
    if (pointRecords.length === 0) return { name: point.name, score: 0 }

    let compliantIndicators = 0
    selectedIndicators.forEach((key) => {
      const threshold = thresholds.find((t) => t.indicator === key)
      if (!threshold) { compliantIndicators++; return }
      const allWithin = pointRecords.every((r) => {
        const v = r[key as keyof WaterQualityRecord] as number
        return v >= threshold.min && v <= threshold.max
      })
      if (allWithin) compliantIndicators++
    })
    const score = selectedIndicators.length > 0 ? (compliantIndicators / selectedIndicators.length) * 100 : 0
    return { name: point.name, score: Number(score.toFixed(0)) }
  }).sort((a, b) => b.score - a.score)

  const radarData = indicatorStats.map((s) => ({
    indicator: s.name,
    value: Number(s.complianceRate.toFixed(0)),
    fullMark: 100,
  }))

  return { summaryStats, indicatorStats, complianceData, alertTrends, pointScores, radarData }
}

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function buildLedgerCSV(
  records: WaterQualityRecord[],
  points: MonitoringPoint[],
  thresholds: ThresholdConfig[],
  selectedIndicators: string[],
): string {
  const headers = ['监测点', '时间', ...selectedIndicators.map((k) => `${INDICATOR_KEYS[k].label}(${INDICATOR_KEYS[k].unit})`)]
  const rows = records.map((r) => {
    const point = points.find((p) => p.id === r.pointId)
    return [
      point?.name || r.pointId,
      new Date(r.timestamp).toLocaleString('zh-CN'),
      ...selectedIndicators.map((k) => String(r[k as keyof WaterQualityRecord] as number)),
    ]
  })
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const { monitoringPoints, waterQualityRecords, alerts, thresholds } = useStore()

  const [reportType, setReportType] = useState<ReportType>('daily')
  const [startDate, setStartDate] = useState(getToday())
  const [endDate, setEndDate] = useState(getToday())
  const [selectedPoints, setSelectedPoints] = useState<string[]>(monitoringPoints.map((p) => p.id))
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(Object.keys(INDICATOR_KEYS))
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [exportRecords, setExportRecords] = useState<ExportRecord[]>([])
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const stopReportPoints = useMemo(() => {
    const now = Date.now()
    return monitoringPoints
      .map((p) => {
        const lastTime = new Date(p.lastReport).getTime()
        const hoursSince = (now - lastTime) / (1000 * 60 * 60)
        return { id: p.id, name: p.name, lastReportTime: p.lastReport, hoursSinceReport: hoursSince }
      })
      .filter((p) => p.hoursSinceReport > 24)
      .sort((a, b) => b.hoursSinceReport - a.hoursSinceReport)
  }, [monitoringPoints])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }, [])

  const handleReportTypeChange = useCallback((type: ReportType) => {
    setReportType(type)
    if (type === 'daily') {
      setStartDate(getToday())
      setEndDate(getToday())
    } else {
      setStartDate(getMonthStart())
      setEndDate(getToday())
    }
  }, [])

  const handleGenerateReport = useCallback(() => {
    const data = computeReport(
      waterQualityRecords,
      monitoringPoints,
      alerts,
      thresholds,
      selectedPoints,
      selectedIndicators,
      startDate,
      endDate,
    )
    setReportData(data)
  }, [waterQualityRecords, monitoringPoints, alerts, thresholds, selectedPoints, selectedIndicators, startDate, endDate])

  const handleExportLedger = useCallback(() => {
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T23:59:59')
    const filteredRecords = waterQualityRecords.filter((r) => {
      const t = new Date(r.timestamp)
      return t >= start && t <= end && selectedPoints.includes(r.pointId)
    })

    const csvContent = buildLedgerCSV(filteredRecords, monitoringPoints, thresholds, selectedIndicators)
    const typeLabel = reportType === 'daily' ? '日报台账' : '月报台账'
    const filename = `水质监测${typeLabel}_${startDate}_${endDate}.csv`

    const newRecord: ExportRecord = {
      id: `export-${Date.now()}`,
      date: getToday(),
      type: typeLabel,
      pointCount: selectedPoints.length,
      status: 'completed',
    }
    setExportRecords((prev) => [newRecord, ...prev])
    downloadCSV(filename, csvContent)
    showToast('台账导出成功')
  }, [startDate, endDate, waterQualityRecords, monitoringPoints, thresholds, selectedPoints, selectedIndicators, reportType, showToast])

  const handleDownloadPDF = useCallback(() => {
    if (!reportData) return
    const lines: string[] = []
    lines.push('山泉水质监测报表')
    lines.push(`日期范围: ${startDate} 至 ${endDate}`)
    lines.push('')
    lines.push('--- 概要统计 ---')
    reportData.summaryStats.forEach((s) => {
      lines.push(`${s.label}: ${s.value}${s.suffix || ''}`)
    })
    lines.push('')
    lines.push('--- 指标统计 ---')
    lines.push('指标,平均值,最大值,最小值,达标率(%)')
    reportData.indicatorStats.forEach((s) => {
      lines.push(`${s.name}(${s.unit}),${s.avg},${s.max},${s.min},${s.complianceRate}`)
    })
    const csvContent = lines.join('\n')
    const typeLabel = reportType === 'daily' ? '日报' : '月报'
    downloadCSV(`水质监测${typeLabel}报表_${startDate}_${endDate}.csv`, csvContent)
    showToast('PDF报表导出成功')
  }, [reportData, startDate, endDate, reportType, showToast])

  const handleDownloadExport = useCallback((record: ExportRecord) => {
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T23:59:59')
    const filteredRecords = waterQualityRecords.filter((r) => {
      const t = new Date(r.timestamp)
      return t >= start && t <= end && selectedPoints.includes(r.pointId)
    })
    const csvContent = buildLedgerCSV(filteredRecords, monitoringPoints, thresholds, selectedIndicators)
    downloadCSV(`${record.type}_${record.date}.csv`, csvContent)
  }, [startDate, endDate, waterQualityRecords, monitoringPoints, thresholds, selectedPoints, selectedIndicators])

  const togglePoint = useCallback((id: string) => {
    setSelectedPoints((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }, [])

  const toggleIndicator = useCallback((key: string) => {
    setSelectedIndicators((prev) =>
      prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key],
    )
  }, [])

  useEffect(() => {
    handleGenerateReport()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      {toastVisible && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-spring-700 px-5 py-3 text-sm font-medium text-white shadow-lg animate-fade-in">
          <CheckCircle className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">统计报表</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-surface-50 p-1">
            {(['daily', 'monthly'] as ReportType[]).map((type) => (
              <button
                key={type}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  reportType === type
                    ? 'bg-spring-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => handleReportTypeChange(type)}
              >
                {type === 'daily' ? '日报' : '月报'}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-surface-50 px-3 py-1.5 text-sm text-white"
          />
          <span className="text-gray-400">至</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-surface-50 px-3 py-1.5 text-sm text-white"
          />
          <button
            onClick={handleGenerateReport}
            className="flex items-center gap-2 rounded-lg bg-spring-700 px-4 py-2 text-sm font-medium text-white hover:bg-spring-600 transition-colors"
          >
            <FileText className="h-4 w-4" />
            生成报表
          </button>
          <button
            onClick={handleExportLedger}
            className="flex items-center gap-2 rounded-lg bg-surface-50 px-4 py-2 text-sm font-medium text-white hover:bg-surface-100 transition-colors"
          >
            <Download className="h-4 w-4" />
            导出台账
          </button>
        </div>
      </div>

      {reportData && (
        <>
          <GlassCard>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white">
                山泉水质监测{reportType === 'daily' ? '日' : '月'}报
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {startDate} 至 {endDate}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {reportData.summaryStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg bg-surface-200/50 p-4 text-center"
                >
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p
                    className={`text-2xl font-bold font-mono ${stat.color || 'text-white'}`}
                  >
                    {stat.value}
                    {stat.suffix || ''}
                  </p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-3 px-4 text-left text-gray-400 font-medium">
                      指标
                    </th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">
                      平均值
                    </th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">
                      最大值
                    </th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">
                      最小值
                    </th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">
                      达标率
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.indicatorStats.map((stat) => (
                    <tr
                      key={stat.name}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="py-3 px-4 text-white">
                        {stat.name} ({stat.unit})
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white">
                        {stat.avg}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white">
                        {stat.max}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white">
                        {stat.min}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono ${getComplianceClass(stat.complianceRate)}`}
                      >
                        {stat.complianceRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                <Printer className="h-4 w-4" />
                打印
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
              >
                <Download className="h-4 w-4" />
                下载PDF
              </button>
            </div>
          </GlassCard>

          <div className="grid grid-cols-2 gap-6">
            <GlassCard title="指标达标率">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={reportData.complianceData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                    {reportData.complianceData.map((entry, index) => (
                      <Cell key={index} fill={getBarColor(entry.rate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard title="告警趋势">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={reportData.alertTrends}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="critical"
                    stroke="#EF4444"
                    name="严重"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="warning"
                    stroke="#F59E0B"
                    name="警告"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="info"
                    stroke="#06B6D4"
                    name="提示"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard title="监测点水质评分">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart layout="vertical" data={reportData.pointScores}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={70}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="score" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard title="指标分布">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={reportData.radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis
                    dataKey="indicator"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  />
                  <Radar
                    name="达标率"
                    dataKey="value"
                    stroke="#14b8a6"
                    fill="#14b8a6"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        </>
      )}

      <GlassCard title="监管台账">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                监测点
              </label>
              <div className="flex flex-wrap gap-2">
                {monitoringPoints.map((point) => (
                  <button
                    key={point.id}
                    className={`rounded-md px-3 py-1 text-xs transition-all ${
                      selectedPoints.includes(point.id)
                        ? 'bg-spring-700 text-white'
                        : 'bg-surface-200 text-gray-400 hover:text-white'
                    }`}
                    onClick={() => togglePoint(point.id)}
                  >
                    {point.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                指标
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(INDICATOR_KEYS).map(([key, val]) => (
                  <button
                    key={key}
                    className={`rounded-md px-3 py-1 text-xs transition-all ${
                      selectedIndicators.includes(key)
                        ? 'bg-spring-700 text-white'
                        : 'bg-surface-200 text-gray-400 hover:text-white'
                    }`}
                    onClick={() => toggleIndicator(key)}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleExportLedger}
              className="flex items-center gap-2 rounded-lg bg-surface-50 px-4 py-2 text-sm font-medium text-white hover:bg-surface-100 transition-colors"
            >
              <Download className="h-4 w-4" />
              导出Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">
                    日期
                  </th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">
                    类型
                  </th>
                  <th className="py-3 px-4 text-right text-gray-400 font-medium">
                    点位数
                  </th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">
                    状态
                  </th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {exportRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      暂无导出记录
                    </td>
                  </tr>
                ) : (
                  exportRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="py-3 px-4 text-white">{record.date}</td>
                      <td className="py-3 px-4 text-white">{record.type}</td>
                      <td className="py-3 px-4 text-right font-mono text-white">
                        {record.pointCount}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            record.status === 'completed'
                              ? 'bg-data-green/20 text-data-green'
                              : record.status === 'processing'
                                ? 'bg-data-amber/20 text-data-amber'
                                : 'bg-data-red/20 text-data-red'
                          }`}
                        >
                          {record.status === 'completed'
                            ? '已完成'
                            : record.status === 'processing'
                              ? '处理中'
                              : '失败'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {record.status === 'completed' && (
                          <button
                            onClick={() => handleDownloadExport(record)}
                            className="text-spring-500 hover:text-spring-400 text-xs"
                          >
                            下载
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GlassCard>

      <GlassCard
        title="停报点位提醒"
        className="border-l-4 border-l-data-amber"
      >
        {stopReportPoints.length === 0 ? (
          <div className="flex items-center gap-3 py-4">
            <CheckCircle className="h-8 w-8 text-data-green" />
            <span className="text-lg text-data-green">所有监测点正常上报</span>
          </div>
        ) : (
          <div className="space-y-3">
            {stopReportPoints.map((point) => (
              <div
                key={point.id}
                className={`flex items-center justify-between rounded-lg bg-surface-200/50 p-4 border-l-4 ${
                  point.hoursSinceReport > 48
                    ? 'border-l-data-red'
                    : 'border-l-data-amber'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      point.hoursSinceReport > 48
                        ? 'text-data-red'
                        : 'text-data-amber'
                    }`}
                  />
                  <div>
                    <p className="text-white font-medium">{point.name}</p>
                    <p className="text-sm text-gray-400">
                      最后上报: {formatRelativeTime(point.hoursSinceReport)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-data-red font-bold font-mono">
                    已停报 {formatRelativeTime(point.hoursSinceReport)}
                  </span>
                  <button
                    onClick={() => navigate(`/detail?pointId=${point.id}`)}
                    className="text-spring-500 hover:text-spring-400 text-sm"
                  >
                    查看详情
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
