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
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Save,
  X,
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

export default function AlertsPage() {
  const { alerts, thresholds, updateAlert, updateThreshold } = useStore()

  const [statusFilter, setStatusFilter] = useState<string>('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null)
  const [dispositionText, setDispositionText] = useState('')
  const [dispositionPerson, setDispositionPerson] = useState('')
  const [dispositionResult, setDispositionResult] = useState('')
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

  const handleStartDisposition = (alert: AlertRecord) => {
    setSelectedAlert(alert)
    setDispositionText(alert.disposition || '')
    setDispositionPerson('')
    setDispositionResult('')
  }

  const handleSubmitDisposition = () => {
    if (!selectedAlert) return
    const fullDisposition = `${dispositionText} (处置人: ${dispositionPerson}, 结果: ${dispositionResult})`
    updateAlert(selectedAlert.id, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      disposition: fullDisposition,
    })
    setSelectedAlert(null)
    setDispositionText('')
    setDispositionPerson('')
    setDispositionResult('')
  }

  const handleProcessAlert = (alert: AlertRecord) => {
    updateAlert(alert.id, { status: 'processing' })
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
                          <button onClick={() => handleProcessAlert(alert)} className="text-xs text-spring-400 hover:text-spring-300 transition-colors">处置</button>
                        )}
                        {(alert.status === 'processing' || alert.status === 'resolved') && (
                          <button onClick={() => handleStartDisposition(alert)} className="text-xs text-white/50 hover:text-white transition-colors">查看</button>
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

      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAlert(null)}>
          <div className="w-full max-w-lg rounded-xl bg-surface-50 border border-white/10 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">告警详情</h2>
              <button onClick={() => setSelectedAlert(null)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <StatusBadge level={LEVEL_BADGE[selectedAlert.level]?.level || 'info'} label={LEVEL_BADGE[selectedAlert.level]?.label || ''} />
                <StatusBadge level={STATUS_BADGE[selectedAlert.status]?.level || 'info'} label={STATUS_BADGE[selectedAlert.status]?.label || ''} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-100 p-3">
                  <p className="text-xs text-white/40">监测点</p>
                  <p className="text-white font-medium">{selectedAlert.pointName}</p>
                </div>
                <div className="rounded-lg bg-surface-100 p-3">
                  <p className="text-xs text-white/40">指标</p>
                  <p className="text-white font-medium">{INDICATOR_LABELS[selectedAlert.indicator] || selectedAlert.indicator}</p>
                </div>
                <div className="rounded-lg bg-surface-100 p-3">
                  <p className="text-xs text-white/40">当前值</p>
                  <p className="text-data-red font-bold font-mono">{selectedAlert.value}</p>
                </div>
                <div className="rounded-lg bg-surface-100 p-3">
                  <p className="text-xs text-white/40">阈值</p>
                  <p className="text-white font-mono">{selectedAlert.threshold}</p>
                </div>
              </div>
              <div className="rounded-lg bg-surface-100 p-3">
                <p className="text-xs text-white/40">描述</p>
                <p className="text-white/70 text-sm">{selectedAlert.description}</p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <h3 className="text-white font-medium mb-4">处置流程</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-data-green flex items-center justify-center">
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="w-px flex-1 bg-white/10" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">确认告警</p>
                    <p className="text-xs text-white/40">{new Date(selectedAlert.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedAlert.status !== 'pending' ? 'bg-data-green' : 'bg-surface-300'}`}>
                      {selectedAlert.status !== 'pending' ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <Clock className="w-3.5 h-3.5 text-white/40" />}
                    </div>
                    <div className="w-px flex-1 bg-white/10" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">处置过程</p>
                    {selectedAlert.status === 'resolved' && selectedAlert.disposition ? (
                      <p className="text-xs text-white/50 mt-1">{selectedAlert.disposition}</p>
                    ) : selectedAlert.status !== 'pending' ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={dispositionText}
                          onChange={(e) => setDispositionText(e.target.value)}
                          placeholder="请描述处置过程..."
                          rows={2}
                          className="w-full rounded-lg bg-surface-100 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-spring-500 resize-none"
                        />
                        <input
                          value={dispositionPerson}
                          onChange={(e) => setDispositionPerson(e.target.value)}
                          placeholder="处置人"
                          className="w-full rounded-lg bg-surface-100 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-spring-500"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-white/30 mt-1">等待确认后开始处置</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedAlert.status === 'resolved' ? 'bg-data-green' : 'bg-surface-300'}`}>
                      {selectedAlert.status === 'resolved' ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <Clock className="w-3.5 h-3.5 text-white/40" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">处置结果</p>
                    {selectedAlert.status === 'resolved' ? (
                      <p className="text-xs text-data-green mt-1">已解决</p>
                    ) : selectedAlert.status === 'processing' ? (
                      <div className="mt-2 space-y-2">
                        <select
                          value={dispositionResult}
                          onChange={(e) => setDispositionResult(e.target.value)}
                          className="w-full rounded-lg bg-surface-100 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-spring-500"
                        >
                          <option value="">选择处置结果</option>
                          <option value="已恢复">已恢复</option>
                          <option value="需持续关注">需持续关注</option>
                          <option value="升级处理">升级处理</option>
                        </select>
                        {dispositionText && dispositionPerson && dispositionResult && (
                          <button
                            onClick={handleSubmitDisposition}
                            className="w-full rounded-lg bg-spring-700 px-4 py-2 text-sm font-medium text-white hover:bg-spring-800 transition-colors"
                          >
                            确认关闭
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-white/30 mt-1">等待处置</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
