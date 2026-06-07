import { useState, useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  CheckCircle,
  Clock,
  Search,
  Save,
  X,
  User,
  FileText,
  ChevronRight,
} from 'lucide-react'
import type { AlertRecord } from '@/types'
import { useStore } from '@/store'
import GlassCard from '@/components/GlassCard'
import StatusBadge from '@/components/StatusBadge'

const INDICATOR_LABELS: Record<string, string> = {
  flow: '流量',
  temperature: '水温',
  turbidity: '浊度',
  pH: '酸碱度',
  residualChlorine: '余氯',
}

const LEVEL_BADGE: Record<string, { level: 'critical' | 'warning' | 'info'; label: string }> = {
  critical: { level: 'critical', label: '严重' },
  warning: { level: 'warning', label: '警告' },
  info: { level: 'info', label: '提示' },
}

const STATUS_BADGE: Record<string, { level: 'critical' | 'info' | 'online'; label: string }> = {
  pending: { level: 'critical', label: '待处理' },
  processing: { level: 'info', label: '处理中' },
  resolved: { level: 'online', label: '已解决' },
}

const PIE_COLORS = ['#EF4444', '#F59E0B', '#06B6D4']

type DetailStep = 'processing' | 'closing'

export default function AlertsPage() {
  const { alerts, thresholds, updateAlert, updateThreshold } = useStore()

  const [statusFilter, setStatusFilter] = useState<string>('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null)
  const [detailStep, setDetailStep] = useState<DetailStep>('processing')
  const [confirmModalAlert, setConfirmModalAlert] = useState<AlertRecord | null>(null)
  const [confirmName, setConfirmName] = useState('')
  const [processingNote, setProcessingNote] = useState('')
  const [processingBy, setProcessingBy] = useState('')
  const [resolvedResult, setResolvedResult] = useState('')
  const [resolvedNote, setResolvedNote] = useState('')
  const [resolvedBy, setResolvedBy] = useState('')
  const [thresholdEdits, setThresholdEdits] = useState<Record<string, { min: string; max: string }>>({})

  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((a) => {
        if (statusFilter && a.status !== statusFilter) return false
        if (levelFilter && a.level !== levelFilter) return false
        if (searchText) {
          const s = searchText.toLowerCase()
          return (
            a.pointName.toLowerCase().includes(s) ||
            a.description.toLowerCase().includes(s) ||
            (INDICATOR_LABELS[a.indicator] || '').toLowerCase().includes(s)
          )
        }
        return true
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [alerts, statusFilter, levelFilter, searchText])

  const levelCounts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0 }
    alerts.forEach((a) => { c[a.level]++ })
    return c
  }, [alerts])

  const indicatorCounts = useMemo(() => {
    const map: Record<string, number> = {}
    alerts.forEach((a) => {
      const label = INDICATOR_LABELS[a.indicator] || a.indicator
      map[label] = (map[label] || 0) + 1
    })
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [alerts])

  const pieData = [
    { name: '严重', value: levelCounts.critical },
    { name: '警告', value: levelCounts.warning },
    { name: '提示', value: levelCounts.info },
  ].filter((d) => d.value > 0)

  const openDetail = (alert: AlertRecord) => {
    const fresh = alerts.find((a) => a.id === alert.id) || alert
    setSelectedAlert(fresh)
    setProcessingNote(fresh.processingNote || '')
    setProcessingBy(fresh.processingBy || '')
    setResolvedResult(fresh.resolvedResult || '')
    setResolvedNote(fresh.resolvedNote || '')
    setResolvedBy(fresh.resolvedBy || '')
    if (fresh.processingNote) {
      setDetailStep('closing')
    } else {
      setDetailStep('processing')
    }
  }

  const closeDetail = () => {
    setSelectedAlert(null)
    setProcessingNote('')
    setProcessingBy('')
    setResolvedResult('')
    setResolvedNote('')
    setResolvedBy('')
  }

  const handleConfirmAlert = () => {
    if (!confirmModalAlert || !confirmName.trim()) return
    updateAlert(confirmModalAlert.id, {
      status: 'processing',
      confirmedAt: new Date().toISOString(),
      confirmedBy: confirmName.trim(),
    })
    setConfirmModalAlert(null)
    setConfirmName('')
  }

  const handleSubmitProcessing = () => {
    if (!selectedAlert || !processingNote.trim() || !processingBy.trim()) return
    updateAlert(selectedAlert.id, {
      processingNote: processingNote.trim(),
      processingBy: processingBy.trim(),
      processingAt: new Date().toISOString(),
    })
    const fresh = alerts.find((a) => a.id === selectedAlert.id)
    if (fresh) {
      setSelectedAlert({ ...fresh, processingNote: processingNote.trim(), processingBy: processingBy.trim(), processingAt: new Date().toISOString() })
    }
    setDetailStep('closing')
  }

  const handleCloseAlert = () => {
    if (!selectedAlert || !resolvedResult || !resolvedBy.trim()) return
    updateAlert(selectedAlert.id, {
      status: 'resolved',
      resolvedResult,
      resolvedNote: resolvedNote.trim(),
      resolvedBy: resolvedBy.trim(),
      resolvedAt: new Date().toISOString(),
    })
    closeDetail()
  }

  const handleSaveThresholds = () => {
    for (const [indicator, values] of Object.entries(thresholdEdits)) {
      const min = parseFloat(values.min)
      const max = parseFloat(values.max)
      if (!isNaN(min) && !isNaN(max)) {
        updateThreshold(indicator, { min, max })
      }
    }
    setThresholdEdits({})
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-surface-100 p-1">
            {[
              { value: '', label: '全部' },
              { value: 'pending', label: '待处理' },
              { value: 'processing', label: '处理中' },
              { value: 'resolved', label: '已解决' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${statusFilter === f.value ? 'bg-spring-700 text-white' : 'text-white/40 hover:text-white'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg bg-surface-100 p-1">
            {[
              { value: '', label: '全部' },
              { value: 'critical', label: '严重' },
              { value: 'warning', label: '警告' },
              { value: 'info', label: '提示' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setLevelFilter(f.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${levelFilter === f.value ? 'bg-spring-700 text-white' : 'text-white/40 hover:text-white'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索告警..."
              className="w-full bg-surface-100 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-spring-500"
            />
          </div>
        </div>

        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2.5 px-3 text-left text-white/40 font-medium w-16">等级</th>
                  <th className="py-2.5 px-3 text-left text-white/40 font-medium">监测点</th>
                  <th className="py-2.5 px-3 text-left text-white/40 font-medium">指标</th>
                  <th className="py-2.5 px-3 text-right text-white/40 font-medium">当前值</th>
                  <th className="py-2.5 px-3 text-right text-white/40 font-medium">阈值</th>
                  <th className="py-2.5 px-3 text-left text-white/40 font-medium">时间</th>
                  <th className="py-2.5 px-3 text-center text-white/40 font-medium">状态</th>
                  <th className="py-2.5 px-3 text-center text-white/40 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => {
                  const levelStyle = alert.level === 'critical' ? 'border-l-data-red' : alert.level === 'warning' ? 'border-l-data-amber' : 'border-l-data-blue'
                  return (
                    <tr key={alert.id} className={`border-b border-white/5 hover:bg-white/[0.03] border-l-2 ${levelStyle}`}>
                      <td className="py-2.5 px-3">
                        <StatusBadge level={LEVEL_BADGE[alert.level]?.level || 'info'} label={LEVEL_BADGE[alert.level]?.label || alert.level} />
                      </td>
                      <td className="py-2.5 px-3 text-white">{alert.pointName}</td>
                      <td className="py-2.5 px-3 text-white/70">{INDICATOR_LABELS[alert.indicator] || alert.indicator}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-data-red">{alert.value}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white/50">{alert.threshold}</td>
                      <td className="py-2.5 px-3 text-white/50 text-xs">{new Date(alert.createdAt).toLocaleString('zh-CN')}</td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge level={STATUS_BADGE[alert.status]?.level || 'info'} label={STATUS_BADGE[alert.status]?.label || alert.status} />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {alert.status === 'pending' && (
                          <button
                            onClick={() => {
                              setConfirmModalAlert(alert)
                              setConfirmName('')
                            }}
                            className="text-xs text-spring-400 hover:text-spring-300 transition-colors"
                          >
                            处置
                          </button>
                        )}
                        {(alert.status === 'processing' || alert.status === 'resolved') && (
                          <button onClick={() => openDetail(alert)} className="text-xs text-white/50 hover:text-white transition-colors">
                            查看
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <div className="w-80 shrink-0 space-y-4">
        <GlassCard title="指标阈值配置">
          <div className="space-y-4">
            {thresholds.map((t) => {
              const edits = thresholdEdits[t.indicator]
              const minVal = edits ? edits.min : String(t.min)
              const maxVal = edits ? edits.max : String(t.max)
              return (
                <div key={t.indicator}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/70">{t.label}</span>
                    <span className="text-xs text-white/30">{t.unit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={minVal}
                      onChange={(e) =>
                        setThresholdEdits((prev) => ({
                          ...prev,
                          [t.indicator]: { ...prev[t.indicator], min: e.target.value, max: maxVal },
                        }))
                      }
                      className="w-20 rounded-lg bg-surface-50 border border-white/10 px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-spring-500"
                    />
                    <span className="text-white/30 text-xs">~</span>
                    <input
                      type="number"
                      step="any"
                      value={maxVal}
                      onChange={(e) =>
                        setThresholdEdits((prev) => ({
                          ...prev,
                          [t.indicator]: { ...prev[t.indicator], min: minVal, max: e.target.value },
                        }))
                      }
                      className="w-20 rounded-lg bg-surface-50 border border-white/10 px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-spring-500"
                    />
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-surface-50 relative overflow-hidden">
                    <div
                      className="absolute top-0 h-full rounded-full bg-spring-500/50"
                      style={{ left: '10%', width: '60%' }}
                    />
                  </div>
                </div>
              )
            })}
            <button
              onClick={handleSaveThresholds}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-spring-700 px-4 py-2 text-sm font-medium text-white hover:bg-spring-800 transition-colors"
            >
              <Save className="w-4 h-4" />
              保存配置
            </button>
          </div>
        </GlassCard>

        <GlassCard title="告警统计">
          <div className="h-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} strokeWidth={0}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mb-4">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-white/50">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                {d.name} {d.value}
              </div>
            ))}
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={indicatorCounts}>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#14b8a6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {confirmModalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setConfirmModalAlert(null); setConfirmName('') }}>
          <div className="w-full max-w-sm rounded-xl bg-surface-50 border border-white/10 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">确认告警</h2>
              <button onClick={() => { setConfirmModalAlert(null); setConfirmName('') }} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="rounded-lg bg-surface-100 p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge level={LEVEL_BADGE[confirmModalAlert.level]?.level || 'info'} label={LEVEL_BADGE[confirmModalAlert.level]?.label || ''} />
                <span className="text-white font-medium text-sm">{confirmModalAlert.pointName}</span>
              </div>
              <p className="text-xs text-white/50">{INDICATOR_LABELS[confirmModalAlert.indicator] || confirmModalAlert.indicator} · 当前值 {confirmModalAlert.value} · 阈值 {confirmModalAlert.threshold}</p>
            </div>
            <div className="mb-5">
              <label className="block text-sm text-white/70 mb-2">确认人姓名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder="请输入确认人姓名"
                  className="w-full rounded-lg bg-surface-100 border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-spring-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmAlert() }}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmModalAlert(null); setConfirmName('') }}
                className="flex-1 rounded-lg bg-surface-200 px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmAlert}
                disabled={!confirmName.trim()}
                className="flex-1 rounded-lg bg-spring-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-spring-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                确认告警
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAlert && (() => {
        const current = alerts.find((a) => a.id === selectedAlert.id) || selectedAlert
        const isResolved = current.status === 'resolved'
        const isProcessing = current.status === 'processing'
        const hasProcessingInfo = !!current.processingAt

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeDetail}>
            <div className="w-full max-w-lg rounded-xl bg-surface-50 border border-white/10 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">告警详情</h2>
                <button onClick={closeDetail} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <StatusBadge level={LEVEL_BADGE[current.level]?.level || 'info'} label={LEVEL_BADGE[current.level]?.label || ''} />
                  <StatusBadge level={STATUS_BADGE[current.status]?.level || 'info'} label={STATUS_BADGE[current.status]?.label || ''} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-surface-100 p-3">
                    <p className="text-xs text-white/40">监测点</p>
                    <p className="text-white font-medium">{current.pointName}</p>
                  </div>
                  <div className="rounded-lg bg-surface-100 p-3">
                    <p className="text-xs text-white/40">指标</p>
                    <p className="text-white font-medium">{INDICATOR_LABELS[current.indicator] || current.indicator}</p>
                  </div>
                  <div className="rounded-lg bg-surface-100 p-3">
                    <p className="text-xs text-white/40">当前值</p>
                    <p className="text-data-red font-bold font-mono">{current.value}</p>
                  </div>
                  <div className="rounded-lg bg-surface-100 p-3">
                    <p className="text-xs text-white/40">阈值</p>
                    <p className="text-white font-mono">{current.threshold}</p>
                  </div>
                </div>
                <div className="rounded-lg bg-surface-100 p-3">
                  <p className="text-xs text-white/40">描述</p>
                  <p className="text-white/70 text-sm">{current.description}</p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h3 className="text-white font-medium mb-4">处置流程</h3>
                <div className="space-y-0">

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-data-green flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="w-px flex-1 bg-white/10 min-h-[24px]" />
                    </div>
                    <div className="pb-5">
                      <p className="text-sm text-white font-medium">确认告警</p>
                      {current.confirmedAt && (
                        <div className="mt-1.5 rounded-lg bg-surface-100 p-2.5 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-white/50">
                            <Clock className="w-3 h-3" />
                            {new Date(current.confirmedAt).toLocaleString('zh-CN')}
                          </div>
                          <div className="flex items-center gap-1.5 text-white/50">
                            <User className="w-3 h-3" />
                            {current.confirmedBy}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${hasProcessingInfo ? 'bg-data-green' : isProcessing ? 'bg-spring-600 animate-pulse' : 'bg-surface-300'}`}>
                        {hasProcessingInfo ? <CheckCircle className="w-4 h-4 text-white" /> : <FileText className="w-4 h-4 text-white/40" />}
                      </div>
                      <div className="w-px flex-1 bg-white/10 min-h-[24px]" />
                    </div>
                    <div className="pb-5 flex-1">
                      <p className="text-sm text-white font-medium">处置过程</p>
                      {hasProcessingInfo ? (
                        <div className="mt-1.5 rounded-lg bg-surface-100 p-2.5 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-white/50">
                            <Clock className="w-3 h-3" />
                            {current.processingAt && new Date(current.processingAt).toLocaleString('zh-CN')}
                          </div>
                          <div className="flex items-center gap-1.5 text-white/50">
                            <User className="w-3 h-3" />
                            {current.processingBy}
                          </div>
                          <div className="flex items-start gap-1.5 text-white/70">
                            <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                            {current.processingNote}
                          </div>
                        </div>
                      ) : isProcessing && detailStep === 'processing' ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={processingNote}
                            onChange={(e) => setProcessingNote(e.target.value)}
                            placeholder="请描述处置过程..."
                            rows={3}
                            className="w-full rounded-lg bg-surface-100 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-spring-500 resize-none"
                          />
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <input
                              value={processingBy}
                              onChange={(e) => setProcessingBy(e.target.value)}
                              placeholder="处置人"
                              className="w-full rounded-lg bg-surface-100 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-spring-500"
                            />
                          </div>
                          <button
                            onClick={handleSubmitProcessing}
                            disabled={!processingNote.trim() || !processingBy.trim()}
                            className="w-full rounded-lg bg-spring-700 px-4 py-2 text-sm font-medium text-white hover:bg-spring-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            提交处置
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-white/30 mt-1">等待确认后开始处置</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isResolved ? 'bg-data-green' : hasProcessingInfo ? 'bg-spring-600 animate-pulse' : 'bg-surface-300'}`}>
                        {isResolved ? <CheckCircle className="w-4 h-4 text-white" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">关闭告警</p>
                      {isResolved ? (
                        <div className="mt-1.5 rounded-lg bg-surface-100 p-2.5 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-white/50">
                            <Clock className="w-3 h-3" />
                            {current.resolvedAt && new Date(current.resolvedAt).toLocaleString('zh-CN')}
                          </div>
                          <div className="flex items-center gap-1.5 text-white/50">
                            <User className="w-3 h-3" />
                            {current.resolvedBy}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white/40">处置结果:</span>
                            <span className={`font-medium ${current.resolvedResult === '已恢复' ? 'text-data-green' : current.resolvedResult === '升级处理' ? 'text-data-red' : 'text-data-amber'}`}>
                              {current.resolvedResult}
                            </span>
                          </div>
                          {current.resolvedNote && (
                            <div className="flex items-start gap-1.5 text-white/70">
                              <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                              {current.resolvedNote}
                            </div>
                          )}
                        </div>
                      ) : hasProcessingInfo && detailStep === 'closing' ? (
                        <div className="mt-2 space-y-2">
                          <select
                            value={resolvedResult}
                            onChange={(e) => setResolvedResult(e.target.value)}
                            className="w-full rounded-lg bg-surface-100 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-spring-500"
                          >
                            <option value="">选择处置结果</option>
                            <option value="已恢复">已恢复</option>
                            <option value="需持续关注">需持续关注</option>
                            <option value="升级处理">升级处理</option>
                          </select>
                          <textarea
                            value={resolvedNote}
                            onChange={(e) => setResolvedNote(e.target.value)}
                            placeholder="备注（可选）"
                            rows={2}
                            className="w-full rounded-lg bg-surface-100 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-spring-500 resize-none"
                          />
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <input
                              value={resolvedBy}
                              onChange={(e) => setResolvedBy(e.target.value)}
                              placeholder="确认人"
                              className="w-full rounded-lg bg-surface-100 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-spring-500"
                            />
                          </div>
                          <button
                            onClick={handleCloseAlert}
                            disabled={!resolvedResult || !resolvedBy.trim()}
                            className="w-full rounded-lg bg-spring-700 px-4 py-2 text-sm font-medium text-white hover:bg-spring-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            确认关闭
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-white/30 mt-1">等待处置完成</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
