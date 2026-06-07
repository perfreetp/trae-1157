import { useState } from 'react';
import {
  Upload,
  Camera,
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
  ClipboardCheck,
  Calendar,
  MapPin,
  User,
  ChevronDown,
  X,
  CheckCircle2,
  Clock,
  Hourglass,
  SendHorizonal,
} from 'lucide-react';
import type { PatrolRecord, SamplingTask } from '@/types';
import { useStore } from '@/store';
import GlassCard from '@/components/GlassCard';

const QUICK_TAGS = ['设施完好', '水量正常', '水质清澈', '周边整洁', '标识完好'];
const STEP_LABELS = ['选择点位', '巡查内容', '现场照片'];
const PHOTO_GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
];

const INDICATOR_LABELS_PATROL: Record<string, string> = {
  flow: '流量',
  temperature: '水温',
  turbidity: '浊度',
  pH: '酸碱度',
  residualChlorine: '余氯',
};

const RECHECK_INDICATORS = [
  { key: 'flow', label: '流量' },
  { key: 'temperature', label: '水温' },
  { key: 'turbidity', label: '浊度' },
  { key: 'pH', label: '酸碱度' },
  { key: 'residualChlorine', label: '余氯' },
];

interface RecheckModalState {
  open: boolean;
  recordId: string;
  assignee: string;
  notes: string;
  submitted: boolean;
  indicators: string[];
}

export default function PatrolPage() {
  const {
    patrolRecords,
    monitoringPoints,
    samplingTasks,
    thresholds,
    addPatrolRecord,
    addSamplingTask,
    updatePatrolRecord,
  } = useStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPoint, setSelectedPoint] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [patrolDate, setPatrolDate] = useState('');
  const [content, setContent] = useState('');
  const [issues, setIssues] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterPoint, setFilterPoint] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [recheckModal, setRecheckModal] = useState<RecheckModalState>({
    open: false,
    recordId: '',
    assignee: '',
    notes: '',
    submitted: false,
    indicators: [],
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    addPatrolRecord({
      id: `patrol-${Date.now()}`,
      pointId: selectedPoint,
      pointName: monitoringPoints.find(p => p.id === selectedPoint)?.name ?? '',
      inspector: inspectorName,
      date: patrolDate,
      content,
      issues,
      tags: selectedTags,
      photos,
    });
    setCurrentStep(1);
    setSelectedPoint('');
    setInspectorName('');
    setPatrolDate('');
    setContent('');
    setIssues('');
    setSelectedTags([]);
    setPhotos([]);
  };

  const openRecheckModal = (recordId: string) => {
    setRecheckModal({
      open: true,
      recordId,
      assignee: '',
      notes: '',
      submitted: false,
      indicators: [],
    });
  };

  const closeRecheckModal = () => {
    setRecheckModal(prev => ({ ...prev, open: false }));
  };

  const submitRecheck = () => {
    if (!recheckModal.assignee.trim()) return;

    const record = patrolRecords.find(r => r.id === recheckModal.recordId);
    if (!record) return;

    const effectiveIndicators = recheckModal.indicators.length > 0
      ? recheckModal.indicators
      : RECHECK_INDICATORS.map(i => i.key);

    const indicatorLabels = recheckModal.indicators.length > 0
      ? recheckModal.indicators
          .map(key => RECHECK_INDICATORS.find(i => i.key === key)?.label)
          .filter(Boolean)
          .join('、')
      : null;

    const notesParts = [recheckModal.notes.trim()];
    if (indicatorLabels) {
      notesParts.unshift(`复检指标: ${indicatorLabels}`);
    }
    const finalNotes = notesParts.filter(Boolean).join('\n');

    const taskId = `task-recheck-${Date.now()}`;
    const newTask: SamplingTask = {
      id: taskId,
      pointId: record.pointId,
      pointName: record.pointName,
      assignee: recheckModal.assignee.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      type: 'recheck',
      indicators: effectiveIndicators,
      notes: finalNotes,
    };

    addSamplingTask(newTask);
    updatePatrolRecord(record.id, { recheckTaskId: taskId });
    setRecheckModal(prev => ({ ...prev, submitted: true }));

    setTimeout(() => {
      closeRecheckModal();
    }, 1500);
  };

  const getRecheckStatus = (record: PatrolRecord) => {
    if (!record.recheckTaskId) return null;
    const task = samplingTasks.find(t => t.id === record.recheckTaskId);
    if (!task) return null;
    return task;
  };

  const filteredRecords = patrolRecords.filter(record => {
    if (filterDateStart && record.date < filterDateStart) return false;
    if (filterDateEnd && record.date > filterDateEnd) return false;
    if (filterPoint && record.pointId !== filterPoint) return false;
    if (filterSearch) {
      const s = filterSearch.toLowerCase();
      return (
        record.content.toLowerCase().includes(s) ||
        record.issues.toLowerCase().includes(s) ||
        record.inspector.toLowerCase().includes(s) ||
        record.pointName.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEP_LABELS.map((label, index) => {
        const step = index + 1;
        const isActive = currentStep === step;
        const isCompleted = currentStep > step;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-white/10 text-white/40'
                }`}
              >
                {isCompleted ? '✓' : step}
              </div>
              <span
                className={`mt-1 text-xs ${
                  isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-white/30'
                }`}
              >
                {label}
              </span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-2 mb-5 ${
                  currentStep > step ? 'bg-green-500' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-white/60 mb-1">巡查点位</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <select
            value={selectedPoint}
            onChange={e => setSelectedPoint(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white appearance-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          >
            <option value="" className="bg-gray-900">请选择巡查点位</option>
            {monitoringPoints.map(point => (
              <option key={point.id} value={point.id} className="bg-gray-900">{point.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm text-white/60 mb-1">巡查人</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={inspectorName}
            onChange={e => setInspectorName(e.target.value)}
            placeholder="请输入巡查人姓名"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-white/60 mb-1">巡查日期</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="date"
            value={patrolDate}
            onChange={e => setPatrolDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 [color-scheme:dark]"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-white/60 mb-1">巡查内容</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="请描述巡查情况..."
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 resize-none"
        />
      </div>
      <div>
        <label className="block text-sm text-white/60 mb-1">发现问题</label>
        <textarea
          value={issues}
          onChange={e => setIssues(e.target.value)}
          placeholder={'请描述发现的问题，无则填"无"'}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 resize-none"
        />
      </div>
      <div>
        <label className="block text-sm text-white/60 mb-2">快捷标签</label>
        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedTags.includes(tag)
                  ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/30'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-blue-500/30 transition-colors cursor-pointer">
        <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
        <p className="text-white/40 text-sm">点击或拖拽上传现场照片</p>
      </div>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <div
              key={photo}
              className="aspect-square rounded-lg overflow-hidden relative group"
              style={{ background: PHOTO_GRADIENTS[index % PHOTO_GRADIENTS.length] }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-white/60" />
              </div>
              <button
                type="button"
                onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setPhotos(prev => [...prev, `photo-${Date.now()}-${prev.length}`])}
        className="w-full py-2 border border-white/10 border-dashed rounded-lg text-white/40 text-sm hover:border-blue-500/30 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        添加更多照片
      </button>
    </div>
  );

  const renderNavigation = () => (
    <div className="flex justify-between mt-8">
      <button
        type="button"
        onClick={handlePrev}
        disabled={currentStep === 1}
        className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm transition-all ${
          currentStep === 1
            ? 'bg-white/5 text-white/20 cursor-not-allowed'
            : 'bg-white/10 text-white/70 hover:bg-white/15'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
        上一步
      </button>
      {currentStep < 3 ? (
        <button
          type="button"
          onClick={handleNext}
          className="flex items-center gap-1 px-6 py-2 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25"
        >
          下一步
          <ChevronRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-1 px-6 py-2 rounded-lg text-sm bg-green-500 text-white hover:bg-green-600 transition-all shadow-lg shadow-green-500/25"
        >
          提交
        </button>
      )}
    </div>
  );

  const renderFilterBar = () => (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="date"
          value={filterDateStart}
          onChange={e => setFilterDateStart(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
        />
      </div>
      <span className="text-white/30 self-center">至</span>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="date"
          value={filterDateEnd}
          onChange={e => setFilterDateEnd(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
        />
      </div>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <select
          value={filterPoint}
          onChange={e => setFilterPoint(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500/50"
        >
          <option value="" className="bg-gray-900">全部点位</option>
          {monitoringPoints.map(point => (
            <option key={point.id} value={point.id} className="bg-gray-900">{point.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
      </div>
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          placeholder="搜索巡查记录..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
        />
      </div>
    </div>
  );

  const renderRecheckBadge = (record: PatrolRecord) => {
    const task = getRecheckStatus(record);
    if (!task) return null;

    if (task.status === 'completed') {
      return (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 px-2.5 py-0.5 text-xs font-medium">
              <CheckCircle2 className="w-3 h-3" />
              已复检
            </span>
            {record.recheckResolvedAt && (
              <span className="text-xs text-white/40">
                {new Date(record.recheckResolvedAt).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
          {record.recheckResult && (
            <p className={`text-xs mt-1.5 ${record.recheckResult.includes('超标') ? 'text-data-amber' : 'text-data-green'}`}>
              {record.recheckResult}
            </p>
          )}
          {record.recheckValues && Object.keys(record.recheckValues).length > 0 && (
            <div className="mt-2 rounded-lg bg-white/5 p-2.5 space-y-1">
              <p className="text-xs text-white/40 mb-1">复检检测值</p>
              {Object.entries(record.recheckValues).map(([key, val]) => {
                const indicator = INDICATOR_LABELS_PATROL[key]
                const threshold = thresholds.find((t) => t.indicator === key)
                const exceeded = threshold && (val < threshold.min || val > threshold.max)
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-white/60">{indicator || key}</span>
                    <span className={`font-mono ${exceeded ? 'text-data-red' : 'text-data-green'}`}>{val}</span>
                  </div>
                )
              })}
            </div>
          )}
          {record.recheckPhotos && record.recheckPhotos.length > 0 && (
            <div className="flex gap-2 mt-2">
              {record.recheckPhotos.map((photo, photoIdx) => (
                <div
                  key={photo}
                  className="w-12 h-12 rounded overflow-hidden"
                  style={{ background: PHOTO_GRADIENTS[photoIdx % 3] }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white/60" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (task.status === 'in_progress') {
      return (
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 text-xs font-medium">
            <Clock className="w-3 h-3" />
            复检中
          </span>
          <span className="text-xs text-white/40">复检人: {task.assignee}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-xs font-medium">
          <Hourglass className="w-3 h-3" />
          待复检
        </span>
        <span className="text-xs text-white/40">复检人: {task.assignee}</span>
      </div>
    );
  };

  const renderRecheckModal = () => {
    if (!recheckModal.open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeRecheckModal}
        />
        <div className="relative bg-gray-900/95 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
          {recheckModal.submitted ? (
            <div className="flex flex-col items-center py-6">
              <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
              <p className="text-white/80 text-sm">复检任务已派发成功</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-white/90">派发复检任务</h3>
                <button
                  type="button"
                  onClick={closeRecheckModal}
                  className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-white/60">复检指标</label>
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = RECHECK_INDICATORS.map(i => i.key);
                        setRecheckModal(prev => ({
                          ...prev,
                          indicators: prev.indicators.length === allKeys.length ? [] : allKeys,
                        }));
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      全选
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {RECHECK_INDICATORS.map(indicator => (
                      <button
                        key={indicator.key}
                        type="button"
                        onClick={() =>
                          setRecheckModal(prev => ({
                            ...prev,
                            indicators: prev.indicators.includes(indicator.key)
                              ? prev.indicators.filter(k => k !== indicator.key)
                              : [...prev.indicators, indicator.key],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          recheckModal.indicators.includes(indicator.key)
                            ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                            : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/30'
                        }`}
                      >
                        {indicator.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-white/30 mt-1.5">未选择则默认检测全部指标</p>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">复检人</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={recheckModal.assignee}
                      onChange={e =>
                        setRecheckModal(prev => ({ ...prev, assignee: e.target.value }))
                      }
                      placeholder="请输入复检人姓名"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">复检说明</label>
                  <textarea
                    value={recheckModal.notes}
                    onChange={e =>
                      setRecheckModal(prev => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="请输入复检说明..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 resize-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={submitRecheck}
                  disabled={!recheckModal.assignee.trim()}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    recheckModal.assignee.trim()
                      ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }`}
                >
                  <SendHorizonal className="w-4 h-4" />
                  派发复检
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    if (filteredRecords.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-white/30">
          <ClipboardCheck className="w-12 h-12 mb-3" />
          <p className="text-sm">暂无巡查记录</p>
        </div>
      );
    }

    return (
      <div className="relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />
        {filteredRecords.map((record, index) => {
          const isLeft = index % 2 === 0;
          const isExpanded = expandedId === record.id;
          const hasIssues = record.issues && record.issues.trim() !== '' && record.issues.trim() !== '无';
          return (
            <div key={record.id} className="relative mb-8">
              <div className="absolute left-1/2 top-4 w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-300 -translate-x-1/2 z-10" />
              <div className={`flex ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-1/2 ${isLeft ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                  <p className="text-sm text-white/40">{record.date}</p>
                  <p className="text-sm text-white/60 mt-0.5">{record.inspector}</p>
                </div>
                <div className="w-1/2" />
              </div>
              <div className={`flex ${isLeft ? 'flex-row' : 'flex-row-reverse'} mt-2`}>
                <div className="w-1/2" />
                <div className={`w-1/2 ${isLeft ? 'pl-8' : 'pr-8'}`}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white/80">{record.pointName}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                    <p className={`text-xs text-white/50 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {record.content}
                    </p>
                    {hasIssues && (
                      <div className="mt-2 flex items-start gap-1">
                        <span className="text-xs text-amber-400/80">⚠</span>
                        <p className={`text-xs text-amber-400/80 ${isExpanded ? '' : 'line-clamp-1'}`}>
                          {record.issues}
                        </p>
                      </div>
                    )}
                    {isExpanded && record.tags && record.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {record.tags.map(tag => (
                          <span key={tag} className="rounded-full bg-data-blue/15 text-data-blue border border-data-blue/30 px-2 py-0.5 text-xs font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {isExpanded && renderRecheckBadge(record)}
                    {isExpanded && hasIssues && !record.recheckTaskId && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          openRecheckModal(record.id);
                        }}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors"
                      >
                        <SendHorizonal className="w-3.5 h-3.5" />
                        派发复检
                      </button>
                    )}
                    {record.photos && record.photos.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {record.photos.slice(0, isExpanded ? undefined : 3).map((photo, photoIdx) => (
                          <div
                            key={photoIdx}
                            className="w-12 h-12 rounded overflow-hidden"
                            style={{ background: PHOTO_GRADIENTS[photoIdx % 3] }}
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="w-4 h-4 text-white/60" />
                            </div>
                          </div>
                        ))}
                        {!isExpanded && record.photos.length > 3 && (
                          <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center text-xs text-white/40">
                            +{record.photos.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <GlassCard title="新建巡查记录">
        {renderStepIndicator()}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {renderNavigation()}
      </GlassCard>
      <GlassCard title="巡查记录">
        {renderFilterBar()}
        {renderTimeline()}
      </GlassCard>
      {renderRecheckModal()}
    </div>
  );
}
