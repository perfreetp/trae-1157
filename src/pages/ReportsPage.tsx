import { useState } from 'react'
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
import type { ReportType } from '@/types'
import { useReportsStore } from '@/store'
import GlassCard from '@/components/GlassCard'

const INDICATOR_OPTIONS = [
  { key: 'flow', label: '流量' },
  { key: 'temperature', label: '水温' },
  { key: 'turbidity', label: '浊度' },
  { key: 'pH', label: 'pH' },
  { key: 'residualChlorine', label: '余氯' },
]

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
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

const tooltipStyle = {
  backgroundColor: '#1E293B',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
}

export default function ReportsPage() {
  const {
    reportType,
    setReportType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    summaryStats,
    indicatorStats,
    complianceData,
    alertTrends,
    pointScores,
    radarData,
    exportRecords,
    stopReportPoints,
    reportMonitoringPoints,
  } = useReportsStore()

  const [selectedPoints, setSelectedPoints] = useState<string[]>([])
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(
    INDICATOR_OPTIONS.map((i) => i.key)
  )

  const reportLabel: Record<ReportType, string> = {
    daily: '日',
    monthly: '月',
  }

  const handleExport = () => {
    alert('台账导出功能准备中')
  }

  const togglePoint = (id: string) => {
    setSelectedPoints((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const toggleIndicator = (key: string) => {
    setSelectedIndicators((prev) =>
      prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
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
                onClick={() => setReportType(type)}
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
          <button className="flex items-center gap-2 rounded-lg bg-spring-700 px-4 py-2 text-sm font-medium text-white hover:bg-spring-600 transition-colors">
            <FileText className="h-4 w-4" />
            生成报表
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-surface-50 px-4 py-2 text-sm font-medium text-white hover:bg-surface-100 transition-colors">
            <Download className="h-4 w-4" />
            导出台账
          </button>
        </div>
      </div>

      <GlassCard>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white">
            山泉水质监测{reportLabel[reportType]}报
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {startDate} 至 {endDate}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {summaryStats.map((stat) => (
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
              {indicatorStats.map((stat) => (
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
          <button className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
            <Download className="h-4 w-4" />
            下载PDF
          </button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-6">
        <GlassCard title="指标达标率">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={complianceData}>
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
                {complianceData.map((entry, index) => (
                  <Cell key={index} fill={getBarColor(entry.rate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard title="告警趋势">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={alertTrends}>
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
            <BarChart layout="vertical" data={pointScores}>
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
            <RadarChart data={radarData}>
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
                name="平均值"
                dataKey="value"
                stroke="#14b8a6"
                fill="#14b8a6"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <GlassCard title="监管台账">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                起始日期
              </label>
              <input
                type="date"
                className="rounded-lg border border-white/10 bg-surface-200 px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                结束日期
              </label>
              <input
                type="date"
                className="rounded-lg border border-white/10 bg-surface-200 px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                监测点
              </label>
              <div className="flex flex-wrap gap-2">
                {reportMonitoringPoints.map((point) => (
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
                {INDICATOR_OPTIONS.map((ind) => (
                  <button
                    key={ind.key}
                    className={`rounded-md px-3 py-1 text-xs transition-all ${
                      selectedIndicators.includes(ind.key)
                        ? 'bg-spring-700 text-white'
                        : 'bg-surface-200 text-gray-400 hover:text-white'
                    }`}
                    onClick={() => toggleIndicator(ind.key)}
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleExport}
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
                {exportRecords.map((record) => (
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
                        <button className="text-spring-500 hover:text-spring-400 text-xs">
                          下载
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
                  <button className="text-spring-500 hover:text-spring-400 text-sm">
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
