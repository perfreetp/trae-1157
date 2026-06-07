import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { ChevronDown, Inbox, ArrowRightLeft } from 'lucide-react'
import type { WaterQualityRecord, ThresholdConfig } from '@/types'
import { useStore } from '@/store'
import GlassCard from '@/components/GlassCard'
import StatusBadge from '@/components/StatusBadge'

const TIME_RANGES = [
  { label: '6h', ms: 6 * 3600000 },
  { label: '12h', ms: 12 * 3600000 },
  { label: '24h', ms: 24 * 3600000 },
  { label: '3d', ms: 3 * 24 * 3600000 },
  { label: '7d', ms: 7 * 24 * 3600000 },
] as const

type IndicatorKey = 'flow' | 'temperature' | 'turbidity' | 'pH' | 'residualChlorine'

const INDICATORS: { key: IndicatorKey; label: string; unit: string; color: string }[] = [
  { key: 'flow', label: '流量', unit: 'm³/h', color: '#06B6D4' },
  { key: 'temperature', label: '水温', unit: '°C', color: '#F59E0B' },
  { key: 'turbidity', label: '浊度', unit: 'NTU', color: '#EF4444' },
  { key: 'pH', label: '酸碱度', unit: 'pH', color: '#22C55E' },
  { key: 'residualChlorine', label: '余氯', unit: 'mg/L', color: '#3B82F6' },
]

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}

function getThreshold(thresholds: ThresholdConfig[], key: string): ThresholdConfig | undefined {
  return thresholds.find(t => t.indicator === key)
}

function isExceeded(key: IndicatorKey, value: number, thresholds: ThresholdConfig[]): boolean {
  const t = getThreshold(thresholds, key)
  if (!t) return false
  return value < t.min || value > t.max
}

function ChartTooltip({
  active,
  payload,
  label,
  indicatorLabel,
  unit,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  indicatorLabel: string
  unit: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-surface-100/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
      <p className="text-white/50">时间: {label}</p>
      <p className="text-white">
        {indicatorLabel}: {payload[0].value} {unit}
      </p>
    </div>
  )
}

function IndicatorChart({
  indicator,
  data,
  currentValue,
  thresholds,
}: {
  indicator: (typeof INDICATORS)[number]
  data: { time: string; value: number }[]
  currentValue: number | null
  thresholds: ThresholdConfig[]
}) {
  const exceeded = currentValue !== null && isExceeded(indicator.key, currentValue, thresholds)
  const t = getThreshold(thresholds, indicator.key)

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/50 text-sm">
          {indicator.label} ({indicator.unit})
        </span>
        <span
          className={`text-xs rounded-full px-2 py-0.5 ${
            exceeded ? 'bg-data-red/20 text-data-red' : 'bg-data-green/20 text-data-green'
          }`}
        >
          {exceeded ? '超标' : '正常'}
        </span>
      </div>
      <div className={`font-mono text-3xl font-bold mb-4 ${exceeded ? 'text-data-red' : 'text-white'}`}>
        {currentValue !== null ? currentValue : '--'}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${indicator.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={indicator.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={indicator.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
          <Tooltip content={<ChartTooltip indicatorLabel={indicator.label} unit={indicator.unit} />} />
          {t && (
            <>
              <ReferenceLine y={t.min} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" label={{ value: `下限 ${t.min}`, fill: 'rgba(255,255,255,0.3)', fontSize: 10, position: 'insideBottomLeft' }} />
              <ReferenceLine y={t.max} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" label={{ value: `上限 ${t.max}`, fill: 'rgba(255,255,255,0.3)', fontSize: 10, position: 'insideTopLeft' }} />
            </>
          )}
          <Area type="monotone" dataKey="value" stroke={indicator.color} strokeWidth={2} fill={`url(#grad-${indicator.key})`} dot={{ fill: indicator.color, r: 2 }} activeDot={{ fill: indicator.color, r: 5, strokeWidth: 2, stroke: '#fff' }} />
        </AreaChart>
      </ResponsiveContainer>
    </GlassCard>
  )
}

const STATUS_MAP: Record<string, { level: 'online' | 'offline' | 'critical'; label: string }> = {
  online: { level: 'online', label: '在线' },
  offline: { level: 'offline', label: '离线' },
  alert: { level: 'critical', label: '告警' },
}

export default function DetailPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [timeRange, setTimeRange] = useState('24h')
  const [page, setPage] = useState(1)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const monitoringPoints = useStore((s) => s.monitoringPoints)
  const waterQualityRecords = useStore((s) => s.waterQualityRecords)
  const thresholds = useStore((s) => s.thresholds)

  const pointId = searchParams.get('pointId') || monitoringPoints[0]?.id || ''
  const selectedPoint = monitoringPoints.find((p) => p.id === pointId) || monitoringPoints[0]

  const timeRangeMs = TIME_RANGES.find((r) => r.label === timeRange)?.ms ?? 24 * 3600000

  const filteredRecords = useMemo(() => {
    const now = Date.now()
    return waterQualityRecords
      .filter((r) => r.pointId === (selectedPoint?.id ?? ''))
      .filter((r) => now - new Date(r.timestamp).getTime() <= timeRangeMs)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [waterQualityRecords, selectedPoint, timeRangeMs])

  const latestRecord = filteredRecords.length > 0 ? filteredRecords[filteredRecords.length - 1] : null

  const lastReportDisplay = useMemo(() => {
    if (filteredRecords.length === 0) return null
    return new Date(latestRecord!.timestamp).toLocaleString('zh-CN')
  }, [filteredRecords, latestRecord])

  const chartDataMap = useMemo(() => {
    const map: Record<string, { time: string; value: number }[]> = {}
    for (const ind of INDICATORS) {
      map[ind.key] = filteredRecords.map((r) => ({
        time: formatTime(r.timestamp),
        value: r[ind.key] as number,
      }))
    }
    return map
  }, [filteredRecords])

  const tableRecords = useMemo(() => [...filteredRecords].reverse(), [filteredRecords])

  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(tableRecords.length / PAGE_SIZE))
  const paginatedRecords = tableRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handlePointChange(id: string) {
    setSearchParams({ pointId: id })
    setPage(1)
    setDropdownOpen(false)
  }

  function isRecordAbnormal(record: WaterQualityRecord): boolean {
    return INDICATORS.some((ind) => isExceeded(ind.key, record[ind.key as IndicatorKey] as number, thresholds))
  }

  const isEmpty = filteredRecords.length === 0

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg bg-surface-50 px-4 py-2 text-white hover:bg-surface-300 transition-colors"
            >
              <span>{selectedPoint?.name} - {selectedPoint?.area}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute z-50 mt-1 w-64 rounded-lg border border-white/10 bg-surface-100 py-1 shadow-xl">
                  {monitoringPoints.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePointChange(p.id)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-300 transition-colors ${p.id === selectedPoint?.id ? 'text-spring-400' : 'text-white'}`}
                    >
                      <span className="flex items-center justify-between">
                        <span>{p.name} - {p.area}</span>
                        <StatusBadge level={STATUS_MAP[p.status]?.level || 'online'} label={STATUS_MAP[p.status]?.label || '在线'} />
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.label}
                onClick={() => { setTimeRange(tr.label); setPage(1) }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${timeRange === tr.label ? 'bg-spring-600 text-white' : 'bg-surface-50 text-white/40 hover:text-white'}`}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>
        {selectedPoint && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-white font-medium">{selectedPoint.name}</span>
            <StatusBadge level={STATUS_MAP[selectedPoint.status]?.level || 'online'} label={STATUS_MAP[selectedPoint.status]?.label || '在线'} />
            <span className="text-white/40">{selectedPoint.area}</span>
            <span className="text-white/40">
              最近上报: {lastReportDisplay ?? '当前时间范围内无数据'}
            </span>
          </div>
        )}
      </GlassCard>

      {isEmpty ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-16 w-16 text-white/10 mb-4" />
            <p className="text-white/60 text-lg font-medium mb-2">当前时间范围内无监测数据</p>
            <p className="text-white/30 text-sm mb-6">请尝试切换时间范围或选择其他监测点</p>
            <div className="flex gap-2 mb-6">
              {TIME_RANGES.map((tr) => (
                <button
                  key={tr.label}
                  onClick={() => { setTimeRange(tr.label); setPage(1) }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${timeRange === tr.label ? 'bg-spring-600 text-white' : 'bg-surface-50 text-white/40 hover:text-white hover:bg-surface-300'}`}
                >
                  {tr.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-lg bg-surface-50 px-4 py-2 text-white/60 hover:bg-surface-300 hover:text-white transition-colors"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>切换监测点</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute z-50 mt-1 w-64 rounded-lg border border-white/10 bg-surface-100 py-1 shadow-xl">
                    {monitoringPoints.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handlePointChange(p.id)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-300 transition-colors ${p.id === selectedPoint?.id ? 'text-spring-400' : 'text-white'}`}
                      >
                        <span className="flex items-center justify-between">
                          <span>{p.name} - {p.area}</span>
                          <StatusBadge level={STATUS_MAP[p.status]?.level || 'online'} label={STATUS_MAP[p.status]?.label || '在线'} />
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INDICATORS.map((ind, idx) => (
              <div key={ind.key} className={idx === INDICATORS.length - 1 ? 'md:col-span-2' : undefined}>
                <IndicatorChart
                  indicator={ind}
                  data={chartDataMap[ind.key]}
                  currentValue={latestRecord ? (latestRecord[ind.key as IndicatorKey] as number) : null}
                  thresholds={thresholds}
                />
              </div>
            ))}
          </div>

          <GlassCard title="监测数据记录">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 px-3 text-left text-white/40 font-medium">时间</th>
                    <th className="py-2 px-3 text-right text-white/40 font-medium">流量(m³/h)</th>
                    <th className="py-2 px-3 text-right text-white/40 font-medium">水温(°C)</th>
                    <th className="py-2 px-3 text-right text-white/40 font-medium">浊度(NTU)</th>
                    <th className="py-2 px-3 text-right text-white/40 font-medium">pH</th>
                    <th className="py-2 px-3 text-right text-white/40 font-medium">余氯(mg/L)</th>
                    <th className="py-2 px-3 text-center text-white/40 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record, i) => {
                    const abnormal = isRecordAbnormal(record)
                    return (
                      <tr key={record.timestamp} className={`border-b border-white/5 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
                        <td className="py-2 px-3 text-white/50">{formatDateTime(record.timestamp)}</td>
                        {INDICATORS.map((ind) => {
                          const val = record[ind.key as IndicatorKey] as number
                          const exc = isExceeded(ind.key, val, thresholds)
                          return (
                            <td key={ind.key} className={`py-2 px-3 text-right font-mono ${exc ? 'text-data-red bg-data-red/10' : 'text-white'}`}>
                              {val}
                            </td>
                          )
                        })}
                        <td className="py-2 px-3 text-center">
                          {abnormal ? (
                            <span className="rounded-full bg-data-red/20 text-data-red px-2 py-0.5 text-xs font-medium">异常</span>
                          ) : (
                            <span className="rounded-full bg-data-green/20 text-data-green px-2 py-0.5 text-xs font-medium">正常</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg bg-surface-50 px-3 py-1 text-sm text-white disabled:opacity-30 hover:bg-surface-300 transition-colors">上一页</button>
                <span className="text-white/40 text-sm">{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg bg-surface-50 px-3 py-1 text-sm text-white disabled:opacity-30 hover:bg-surface-300 transition-colors">下一页</button>
              </div>
            )}
          </GlassCard>
        </>
      )}
    </div>
  )
}
