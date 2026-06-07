import { useState } from 'react'
import {
  User,
  Plus,
  ClipboardCheck,
  X,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import type { SamplingTask, WaterQualityRecord } from '@/types'
import { useStore } from '@/store'
import GlassCard from '@/components/GlassCard'
import StatusBadge from '@/components/StatusBadge'

const INDICATORS = [
  { key: 'flow', label: '流量', unit: 'm³/h' },
  { key: 'temperature', label: '水温', unit: '°C' },
  { key: 'turbidity', label: '浊度', unit: 'NTU' },
  { key: 'pH', label: 'pH', unit: '' },
  { key: 'residualChlorine', label: '余氯', unit: 'mg/L' },
]

const STATUS_COLUMNS: {
  status: SamplingTask['status']
  label: string
  accent: string
}[] = [
  { status: 'pending', label: '待执行', accent: 'border-l-amber-400' },
  { status: 'in_progress', label: '进行中', accent: 'border-l-blue-400' },
  { status: 'completed', label: '已完成', accent: 'border-l-green-400' },
]

const TYPE_BADGE: Record<SamplingTask['type'], { level: 'info' | 'warning'; label: string }> = {
  routine: { level: 'info', label: '日常取样' },
  recheck: { level: 'warning', label: '复检任务' },
}

const STATUS_BADGE: Record<SamplingTask['status'], { level: 'info' | 'warning' | 'online'; label: string }> = {
  pending: { level: 'warning', label: '待执行' },
  in_progress: { level: 'info', label: '进行中' },
  completed: { level: 'online', label: '已完成' },
}

const PHOTO_COLORS = [
  'bg-spring-500/30',
  'bg-blue-500/30',
  'bg-amber-500/30',
  'bg-purple-500/30',
  'bg-rose-500/30',
]

const emptyResultForm = () => ({
  flow: '',
  temperature: '',
  turbidity: '',
  pH: '',
  residualChlorine: '',
  samplingTime: '',
})

const emptyTaskForm = () => ({
  pointId: '',
  assignee: '',
  type: 'routine' as SamplingTask['type'],
  indicators: [] as string[],
  notes: '',
})

const emptyRecheckForm = () => ({
  alertId: '',
  assignee: '',
  priority: 'normal',
})

export default function SamplingPage() {
  const {
    samplingTasks,
    monitoringPoints,
    alerts,
    addSamplingTask,
    updateSamplingTask,
    updateAlert,
  } = useStore()

  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [showRecheckModal, setShowRecheckModal] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showResultForm, setShowResultForm] = useState(false)
  const [photoStubs, setPhotoStubs] = useState<string[]>([])

  const [taskForm, setTaskForm] = useState(emptyTaskForm())
  const [recheckForm, setRecheckForm] = useState(emptyRecheckForm())
  const [resultForm, setResultForm] = useState(emptyResultForm())

  const selectedTask = samplingTasks.find((t) => t.id === selectedTaskId) || null
  const selectedAlert = alerts.find((a) => a.id === recheckForm.alertId)
  const unresolvedAlerts = alerts.filter((a) => a.status !== 'resolved')

  const handleSubmitNewTask = () => {
    const point = monitoringPoints.find((p) => p.id === taskForm.pointId)
    if (!point) return
    addSamplingTask({
      id: `task-${Date.now()}`,
      pointId: taskForm.pointId,
      pointName: point.name,
      assignee: taskForm.assignee,
      type: taskForm.type,
      status: 'pending',
      indicators:
        taskForm.type === 'recheck'
          ? taskForm.indicators
          : INDICATORS.map((i) => i.key),
      notes: taskForm.notes,
      createdAt: new Date().toISOString(),
    })
    setShowNewTaskModal(false)
    setTaskForm(emptyTaskForm())
  }

  const handleSubmitRecheck = () => {
    const alert = alerts.find((a) => a.id === recheckForm.alertId)
    if (!alert) return
    addSamplingTask({
      id: `task-${Date.now()}`,
      pointId: alert.pointId,
      pointName: alert.pointName,
      assignee: recheckForm.assignee,
      type: 'recheck',
      status: 'pending',
      indicators: [alert.indicator],
      notes: `复检预警: ${alert.indicator} 超标 (${alert.value} > ${alert.threshold})`,
      createdAt: new Date().toISOString(),
    })
    updateAlert(alert.id, { status: 'resolved', resolvedAt: new Date().toISOString() })
    setShowRecheckModal(false)
    setRecheckForm(emptyRecheckForm())
  }

  const handleSubmitResult = () => {
    if (!selectedTask) return
    const result: WaterQualityRecord = {
      pointId: selectedTask.pointId,
      timestamp: resultForm.samplingTime
        ? new Date(resultForm.samplingTime).toISOString()
        : new Date().toISOString(),
      flow: parseFloat(resultForm.flow) || 0,
      temperature: parseFloat(resultForm.temperature) || 0,
      turbidity: parseFloat(resultForm.turbidity) || 0,
      pH: parseFloat(resultForm.pH) || 0,
      residualChlorine: parseFloat(resultForm.residualChlorine) || 0,
    }
    updateSamplingTask(selectedTask.id, {
      results: result,
      photos: photoStubs,
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
    setShowResultForm(false)
    setResultForm(emptyResultForm())
    setPhotoStubs([])
  }

  const handleAddPhoto = () => {
    setPhotoStubs((prev) => [...prev, `photo-${Date.now()}-${prev.length}`])
  }

  const handleRemovePhoto = (index: number) => {
    setPhotoStubs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleOpenDetail = (taskId: string) => {
    setSelectedTaskId(taskId)
    setShowResultForm(false)
  }

  const handleCloseDetail = () => {
    setSelectedTaskId(null)
    setShowResultForm(false)
    setResultForm(emptyResultForm())
    setPhotoStubs([])
  }

  const filteredTasks = (status: SamplingTask['status']) =>
    samplingTasks.filter((t) => t.status === status)

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">取样任务</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRecheckModal(true)}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            <ClipboardCheck size={16} />
            派发复检
          </button>
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="flex items-center gap-2 rounded-lg bg-spring-700 px-4 py-2 text-sm font-medium text-white hover:bg-spring-800 transition-colors"
          >
            <Plus size={16} />
            新建取样任务
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        {STATUS_COLUMNS.map((col) => (
          <div
            key={col.status}
            className={`rounded-xl bg-surface-50/50 border-l-4 ${col.accent} p-4 flex flex-col overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-lg font-semibold text-white">{col.label}</h2>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70">
                {filteredTasks(col.status).length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1">
              {filteredTasks(col.status).map((task) => (
                <GlassCard
                  key={task.id}
                  onClick={() => handleOpenDetail(task.id)}
                  className="[&_.p-5]:!p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge level={TYPE_BADGE[task.type].level} label={TYPE_BADGE[task.type].label} />
                    {task.status === 'completed' && (
                      <CheckCircle size={16} className="text-green-400" />
                    )}
                  </div>
                  <p className="text-white font-medium mb-1">{task.pointName}</p>
                  <div className="flex items-center gap-1.5 text-white/60 text-sm">
                    <User size={14} />
                    <span>{task.assignee}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/40 text-xs mt-2">
                    <Clock size={12} />
                    <span>
                      {task.status === 'completed' && task.completedAt
                        ? `完成: ${new Date(task.completedAt).toLocaleString('zh-CN')}`
                        : `创建: ${new Date(task.createdAt).toLocaleString('zh-CN')}`}
                    </span>
                  </div>
                </GlassCard>
              ))}
              {filteredTasks(col.status).length === 0 && (
                <div className="flex items-center justify-center h-24 text-white/20 text-sm">
                  暂无任务
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showNewTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNewTaskModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-surface-50 border border-white/10 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">新建取样任务</h2>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">监测点</label>
                <select
                  value={taskForm.pointId}
                  onChange={(e) =>
                    setTaskForm((f) => ({ ...f, pointId: e.target.value }))
                  }
                  className="w-full rounded-lg bg-surface-100 border border-surface-400 px-3 py-2 text-white text-sm focus:outline-none focus:border-spring-500"
                >
                  <option value="">选择监测点</option>
                  {monitoringPoints.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">执行人</label>
                <input
                  value={taskForm.assignee}
                  onChange={(e) =>
                    setTaskForm((f) => ({ ...f, assignee: e.target.value }))
                  }
                  placeholder="输入执行人姓名"
                  className="w-full rounded-lg bg-surface-100 border border-surface-400 px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-spring-500"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">任务类型</label>
                <select
                  value={taskForm.type}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      type: e.target.value as SamplingTask['type'],
                      indicators: [],
                    }))
                  }
                  className="w-full rounded-lg bg-surface-100 border border-surface-400 px-3 py-2 text-white text-sm focus:outline-none focus:border-spring-500"
                >
                  <option value="routine">日常取样</option>
                  <option value="recheck">复检任务</option>
                </select>
              </div>
              {taskForm.type === 'recheck' && (
                <div>
                  <label className="block text-sm text-white/70 mb-1">检测指标</label>
                  <div className="grid grid-cols-2 gap-2">
                    {INDICATORS.map((ind) => (
                      <label
                        key={ind.key}
                        className="flex items-center gap-2 text-sm text-white/80 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={taskForm.indicators.includes(ind.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTaskForm((f) => ({
                                ...f,
                                indicators: [...f.indicators, ind.key],
                              }))
                            } else {
                              setTaskForm((f) => ({
                                ...f,
                                indicators: f.indicators.filter((i) => i !== ind.key),
                              }))
                            }
                          }}
                          className="rounded border-surface-400 bg-surface-100 text-spring-500 focus:ring-spring-500"
                        />
                        {ind.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-white/70 mb-1">备注</label>
                <textarea
                  value={taskForm.notes}
                  onChange={(e) =>
                    setTaskForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="输入备注信息"
                  className="w-full rounded-lg bg-surface-100 border border-surface-400 px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-spring-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowNewTaskModal(false)}
                  className="rounded-lg bg-surface-200 px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitNewTask}
                  className="rounded-lg bg-spring-700 px-4 py-2 text-sm font-medium text-white hover:bg-spring-800 transition-colors"
                >
                  提交
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRecheckModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowRecheckModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-surface-50 border border-white/10 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">派发复检</h2>
              <button
                onClick={() => setShowRecheckModal(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">选择预警</label>
                <select
                  value={recheckForm.alertId}
                  onChange={(e) =>
                    setRecheckForm((f) => ({ ...f, alertId: e.target.value }))
                  }
                  className="w-full rounded-lg bg-surface-100 border border-surface-400 px-3 py-2 text-white text-sm focus:outline-none focus:border-spring-500"
                >
                  <option value="">选择未解决的预警</option>
                  {unresolvedAlerts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.pointName} - {a.indicator} 超标
                    </option>
                  ))}
                </select>
              </div>
              {selectedAlert && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
                    <AlertTriangle size={14} />
                    <span>预警详情</span>
                  </div>
                  <p className="text-white/70 text-sm">
                    监测点: {selectedAlert.pointName}
                  </p>
                  <p className="text-white/70 text-sm">
                    指标: {selectedAlert.indicator} ({selectedAlert.value} &gt;{' '}
                    {selectedAlert.threshold})
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm text-white/70 mb-1">执行人</label>
                <input
                  value={recheckForm.assignee}
                  onChange={(e) =>
                    setRecheckForm((f) => ({ ...f, assignee: e.target.value }))
                  }
                  placeholder="输入执行人姓名"
                  className="w-full rounded-lg bg-surface-100 border border-surface-400 px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-spring-500"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">优先级</label>
                <select
                  value={recheckForm.priority}
                  onChange={(e) =>
                    setRecheckForm((f) => ({ ...f, priority: e.target.value }))
                  }
                  className="w-full rounded-lg bg-surface-100 border border-surface-400 px-3 py-2 text-white text-sm focus:outline-none focus:border-spring-500"
                >
                  <option value="low">低</option>
                  <option value="normal">中</option>
                  <option value="high">高</option>
                  <option value="urgent">紧急</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowRecheckModal(false)}
                  className="rounded-lg bg-surface-200 px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitRecheck}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  派发
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <div
          className="fixed inset-0 z-40 flex justify-end"
          onClick={handleCloseDetail}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-md bg-surface-50 border-l border-white/10 p-6 overflow-y-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">任务详情</h2>
              <button
                onClick={handleCloseDetail}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge level={TYPE_BADGE[selectedTask.type].level} label={TYPE_BADGE[selectedTask.type].label} />
                <StatusBadge level={STATUS_BADGE[selectedTask.status].level} label={STATUS_BADGE[selectedTask.status].label} />
              </div>
              <div>
                <p className="text-white/50 text-sm">监测点</p>
                <p className="text-white font-medium">{selectedTask.pointName}</p>
              </div>
              <div>
                <p className="text-white/50 text-sm">执行人</p>
                <div className="flex items-center gap-1.5 text-white">
                  <User size={14} />
                  <span>{selectedTask.assignee}</span>
                </div>
              </div>
              <div>
                <p className="text-white/50 text-sm">创建时间</p>
                <p className="text-white text-sm">
                  {new Date(selectedTask.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              {selectedTask.completedAt && (
                <div>
                  <p className="text-white/50 text-sm">完成时间</p>
                  <p className="text-white text-sm">
                    {new Date(selectedTask.completedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-white/50 text-sm">检测指标</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedTask.indicators.map((ind) => {
                    const indicator = INDICATORS.find((i) => i.key === ind)
                    return (
                      <span
                        key={ind}
                        className="rounded-full bg-spring-500/20 text-spring-400 px-2 py-0.5 text-xs"
                      >
                        {indicator?.label || ind}
                      </span>
                    )
                  })}
                </div>
              </div>
              {selectedTask.notes && (
                <div>
                  <p className="text-white/50 text-sm">备注</p>
                  <p className="text-white text-sm">{selectedTask.notes}</p>
                </div>
              )}

              {selectedTask.status === 'in_progress' && !showResultForm && (
                <button
                  onClick={() => setShowResultForm(true)}
                  className="w-full rounded-lg bg-spring-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-spring-800 transition-colors"
                >
                  录入结果
                </button>
              )}

              {selectedTask.status === 'in_progress' && showResultForm && (
                <div className="space-y-3 border-t border-white/10 pt-4">
                  <h3 className="text-white font-medium">录入检测结果</h3>
                  {INDICATORS.map((ind) => (
                    <div key={ind.key}>
                      <label className="block text-sm text-white/70 mb-1">
                        {ind.label} {ind.unit && `(${ind.unit})`}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={resultForm[ind.key as keyof typeof resultForm]}
                        onChange={(e) =>
                          setResultForm((f) => ({
                            ...f,
                            [ind.key]: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg bg-surface-100 border border-surface-400 px-3 py-2 text-white text-sm focus:outline-none focus:border-spring-500"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm text-white/70 mb-1">
                      取样时间
                    </label>
                    <input
                      type="datetime-local"
                      value={resultForm.samplingTime}
                      onChange={(e) =>
                        setResultForm((f) => ({
                          ...f,
                          samplingTime: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg bg-surface-100 border border-surface-400 px-3 py-2 text-white text-sm focus:outline-none focus:border-spring-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">
                      现场照片
                    </label>
                    <div
                      onClick={handleAddPhoto}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-surface-400 bg-surface-100 p-6 cursor-pointer hover:border-spring-500 transition-colors"
                    >
                      <Upload size={24} className="text-white/40 mb-2" />
                      <span className="text-white/40 text-sm">
                        点击或拖拽上传现场照片
                      </span>
                    </div>
                    {photoStubs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {photoStubs.map((p, i) => (
                          <div key={p} className="relative group">
                            <div
                              className={`w-16 h-16 rounded-lg ${PHOTO_COLORS[i % PHOTO_COLORS.length]} flex items-center justify-center text-white/40 text-xs`}
                            >
                              照片{i + 1}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemovePhoto(i)
                              }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-data-red text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSubmitResult}
                    className="w-full rounded-lg bg-spring-700 px-4 py-2 text-sm font-medium text-white hover:bg-spring-800 transition-colors"
                  >
                    提交结果
                  </button>
                </div>
              )}

              {selectedTask.status === 'completed' && selectedTask.results && (
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-white font-medium mb-3">检测结果</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {INDICATORS.map((ind) => (
                      <div key={ind.key} className="rounded-lg bg-surface-100 p-3">
                        <p className="text-white/50 text-xs">{ind.label}</p>
                        <p className="text-white font-medium">
                          {selectedTask.results![
                            ind.key as keyof WaterQualityRecord
                          ] as number}{' '}
                          {ind.unit}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-white/50 text-xs mt-2">
                    取样时间:{' '}
                    {new Date(
                      selectedTask.results.timestamp
                    ).toLocaleString('zh-CN')}
                  </p>
                  {selectedTask.photos && selectedTask.photos.length > 0 && (
                    <div className="mt-3">
                      <p className="text-white/50 text-sm mb-2">现场照片</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.photos.map((p, i) => (
                          <div
                            key={p}
                            className={`w-16 h-16 rounded-lg ${PHOTO_COLORS[i % PHOTO_COLORS.length]} flex items-center justify-center text-white/40 text-xs`}
                          >
                            照片{i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
