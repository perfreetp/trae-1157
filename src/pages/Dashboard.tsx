import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Droplets,
  Thermometer,
  Eye,
  Beaker,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { AlertRecord, WaterQualityRecord, ThresholdConfig } from '@/types'
import { useStore } from '@/store'
import GlassCard from '@/components/GlassCard'
import StatusBadge from '@/components/StatusBadge'

interface IndicatorCardData {
  key: string
  label: string
  unit: string
  value: number
  trend: 'up' | 'down' | 'stable'
  history: number[]
}

const ICON_MAP: Record<string, React.ElementType> = {
  flow: Droplets,
  temperature: Thermometer,
  turbidity: Eye,
  pH: Beaker,
  residualChlorine: ShieldCheck,
}

const ICON_BG: Record<string, string> = {
  flow: 'bg-data-cyan/20 text-data-cyan',
  temperature: 'bg-data-amber/20 text-data-amber',
  turbidity: 'bg-spring-500/20 text-spring-400',
  pH: 'bg-data-blue/20 text-data-blue',
  residualChlorine: 'bg-data-green/20 text-data-green',
}

const INDICATOR_LABELS: Record<string, string> = {
  flow: '流量',
  temperature: '水温',
  turbidity: '浊度',
  pH: '酸碱度',
  residualChlorine: '余氯',
}

const INDICATOR_KEYS = ['flow', 'temperature', 'turbidity', 'pH', 'residualChlorine'] as const

function computeIndicatorSummaries(
  records: WaterQualityRecord[],
  thresholds: ThresholdConfig[]
): IndicatorCardData[] {
  const latestByPoint = new Map<string, WaterQualityRecord>()
  for (const r of records) {
    const existing = latestByPoint.get(r.pointId)
    if (!existing || r.timestamp > existing.timestamp) {
      latestByPoint.set(r.pointId, r)
    }
  }

  const allLatest = Array.from(latestByPoint.values())
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

  const thresholdMap = new Map(thresholds.map((t) => [t.indicator, t]))

  return INDICATOR_KEYS.map((key) => {
    const t = thresholdMap.get(key)
    const values = allLatest.map((r) => r[key] as number)
    const current = parseFloat(avg(values).toFixed(2))

    const pointHistories = Array.from(latestByPoint.values())
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((r) => r[key] as number)
    const history = pointHistories.length >= 2
      ? pointHistories.slice(-24)
      : Array.from({ length: 24 }, (_, i) =>
          parseFloat((current + (Math.random() - 0.5) * current * 0.15).toFixed(2))
        )

    const recentHalf = history.slice(-12)
    const earlierHalf = history.slice(0, -12)
    const recentAvg = avg(recentHalf)
    const earlierAvg = avg(earlierHalf)
    const diff = recentAvg - earlierAvg
    const threshold = t ? (t.max - t.min) * 0.05 : current * 0.05
    const trend: 'up' | 'down' | 'stable' =
      diff > threshold ? 'up' : diff < -threshold ? 'down' : 'stable'

    return {
      key,
      label: INDICATOR_LABELS[key],
      unit: t?.unit ?? '',
      value: current,
      trend,
      history,
    }
  })
}

function computeTrendData(alerts: AlertRecord[]) {
  const now = new Date()
  const days: { date: string; critical: number; warning: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const dayEnd = dayStart + 24 * 3600 * 1000

    const dayAlerts = alerts.filter((a) => {
      const t = new Date(a.createdAt).getTime()
      return t >= dayStart && t < dayEnd
    })

    days.push({
      date: dateStr,
      critical: dayAlerts.filter((a) => a.level === 'critical').length,
      warning: dayAlerts.filter((a) => a.level === 'warning').length,
    })
  }

  return days
}

const INDICATOR_DISPLAY: Record<string, string> = {
  flow: '流量',
  temperature: '水温',
  turbidity: '浊度',
  pH: '酸碱度',
  residualChlorine: '余氯',
}

function MiniSparkline({ data, id }: { data: number[]; id: string }) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width={80} height={30}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`sparkGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="#14b8a6"
          strokeWidth={1.5}
          fill={`url(#sparkGrad-${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function IndicatorCard({ summary }: { summary: IndicatorCardData }) {
  const Icon = ICON_MAP[summary.key]
  const trendIcon =
    summary.trend === 'up' ? (
      <TrendingUp className="h-4 w-4 text-data-red" />
    ) : summary.trend === 'down' ? (
      <TrendingDown className="h-4 w-4 text-data-green" />
    ) : null

  return (
    <GlassCard className="animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${ICON_BG[summary.key]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-white/50">{summary.label}</p>
            <p className="font-mono text-2xl font-bold text-white">
              {summary.value}
              <span className="ml-1 text-xs font-normal text-white/40">{summary.unit}</span>
            </p>
          </div>
        </div>
        {trendIcon}
      </div>
      <div className="mt-2 flex justify-end">
        <MiniSparkline data={summary.history} id={summary.key} />
      </div>
    </GlassCard>
  )
}

function AlertSummaryPanel() {
  const alerts = useStore((s) => s.alerts)
  const unresolved = useMemo(() => alerts.filter((a) => a.status !== 'resolved'), [alerts])
  const latest5 = useMemo(
    () =>
      [...unresolved]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [unresolved]
  )

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0 }
    unresolved.forEach((a) => {
      c[a.level]++
    })
    return c
  }, [unresolved])

  const stats = [
    { label: '严重', count: counts.critical, text: 'text-data-red' },
    { label: '警告', count: counts.warning, text: 'text-data-amber' },
    { label: '提示', count: counts.info, text: 'text-data-blue' },
  ]

  return (
    <GlassCard title="告警摘要">
      <div className="mb-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center rounded-xl bg-white/[0.03] py-3"
          >
            <span className={`font-mono text-3xl font-bold ${s.text}`}>{s.count}</span>
            <span className="mt-1 text-xs text-white/50">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2.5">
        {latest5.map((alert: AlertRecord) => (
          <div
            key={alert.id}
            className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${alert.level === 'critical' ? 'text-data-red' : alert.level === 'warning' ? 'text-data-amber' : 'text-data-blue'}`} />
              <span className="truncate text-sm text-white/80">{alert.pointName}</span>
              <span className="shrink-0 text-xs text-white/40">{INDICATOR_DISPLAY[alert.indicator] ?? alert.indicator}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge level={alert.level} />
              <span className="text-xs text-white/30">
                {new Date(alert.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Link
          to="/alerts"
          className="text-xs text-spring-400 transition-colors hover:text-spring-300"
        >
          查看全部 →
        </Link>
      </div>
    </GlassCard>
  )
}

const PIE_COLORS: Record<string, string> = {
  online: '#22C55E',
  offline: '#64748B',
  alert: '#EF4444',
}

const PIE_LABELS: Record<string, string> = {
  online: '在线',
  offline: '离线',
  alert: '告警',
}

function MonitoringPointStatus() {
  const points = useStore((s) => s.monitoringPoints)

  const statusCounts = useMemo(() => {
    const c = { online: 0, offline: 0, alert: 0 }
    points.forEach((p) => {
      c[p.status]++
    })
    return c
  }, [points])

  const total = points.length

  const pieData = useMemo(
    () =>
      (['online', 'offline', 'alert'] as const)
        .filter((k) => statusCounts[k] > 0)
        .map((k) => ({
          name: PIE_LABELS[k],
          value: statusCounts[k],
          status: k,
        })),
    [statusCounts]
  )

  return (
    <GlassCard title="监测点状态">
      <div className="flex flex-col items-center">
        <div className="relative h-40 w-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={70}
                paddingAngle={3}
                strokeWidth={0}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.status} fill={PIE_COLORS[entry.status]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold text-white">{total}</span>
            <span className="text-xs text-white/40">监测点</span>
          </div>
        </div>
        <div className="mt-4 flex w-full justify-center gap-4">
          {(['online', 'offline', 'alert'] as const).map((status) => (
            <Link
              key={status}
              to={`/map?status=${status}`}
              className="flex items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-white"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: PIE_COLORS[status] }}
              />
              {PIE_LABELS[status]} {statusCounts[status]}
            </Link>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}

function AnomalyTrendChart() {
  const alerts = useStore((s) => s.alerts)
  const trendData = useMemo(() => computeTrendData(alerts), [alerts])

  return (
    <GlassCard title="异常趋势 (近7天)">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="criticalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="warningGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(22,32,50,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 }}
              itemStyle={{ fontSize: 13 }}
              formatter={(value: number, name: string) => [value, name === 'critical' ? '严重' : '警告']}
            />
            <Area
              type="monotone"
              dataKey="warning"
              name="warning"
              stroke="#F59E0B"
              strokeWidth={2}
              fill="url(#warningGrad)"
            />
            <Area
              type="monotone"
              dataKey="critical"
              name="critical"
              stroke="#EF4444"
              strokeWidth={2}
              fill="url(#criticalGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}

export default function Dashboard() {
  const records = useStore((s) => s.waterQualityRecords)
  const thresholds = useStore((s) => s.thresholds)
  const indicatorSummaries = useMemo(
    () => computeIndicatorSummaries(records, thresholds),
    [records, thresholds]
  )

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {indicatorSummaries.map((s) => (
            <IndicatorCard key={s.key} summary={s} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AlertSummaryPanel />
          </div>
          <div>
            <MonitoringPointStatus />
          </div>
        </div>

        <AnomalyTrendChart />
      </div>
    </div>
  )
}
