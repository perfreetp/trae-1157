import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown } from 'lucide-react';
import type { WaterQualityRecord, Thresholds } from '@/types';
import { useStore } from '@/store';
import GlassCard from '@/components/GlassCard';

const TIME_RANGES = [
  { label: '6h', ms: 6 * 3600000 },
  { label: '12h', ms: 12 * 3600000 },
  { label: '24h', ms: 24 * 3600000 },
  { label: '3d', ms: 3 * 24 * 3600000 },
  { label: '7d', ms: 7 * 24 * 3600000 },
] as const;

const INDICATORS = [
  { key: 'flow' as const, label: '流量', unit: 'm³/h', color: '#06B6D4' },
  { key: 'temperature' as const, label: '水温', unit: '°C', color: '#F59E0B' },
  { key: 'turbidity' as const, label: '浊度', unit: 'NTU', color: '#EF4444' },
  { key: 'pH' as const, label: '酸碱度', unit: 'pH', color: '#22C55E' },
  { key: 'chlorine' as const, label: '余氯', unit: 'mg/L', color: '#3B82F6' },
];

type IndicatorKey = (typeof INDICATORS)[number]['key'];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}-${day} ${h}:${min}`;
}

function isExceeded(key: IndicatorKey, value: number, thresholds: Thresholds): boolean {
  const t = thresholds[key];
  if (!t) return false;
  return value < t.min || value > t.max;
}

function ChartTooltip({
  active,
  payload,
  label,
  indicatorLabel,
  unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  indicatorLabel: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-surface-400/50 bg-surface-100 px-3 py-2 text-sm shadow-lg">
      <p className="text-surface-400">时间: {label}</p>
      <p className="text-white">
        {indicatorLabel}: {payload[0].value} {unit}
      </p>
    </div>
  );
}

function IndicatorChart({
  indicator,
  data,
  currentValue,
  thresholds,
}: {
  indicator: (typeof INDICATORS)[number];
  data: { time: string; value: number }[];
  currentValue: number | null;
  thresholds: Thresholds;
}) {
  const exceeded =
    currentValue !== null && isExceeded(indicator.key, currentValue, thresholds);
  const t = thresholds[indicator.key];

  return (
    <GlassCard>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-surface-400 text-sm">
            {indicator.label} ({indicator.unit})
          </span>
          <span
            className={`text-xs rounded-full px-2 py-0.5 ${
              exceeded
                ? 'bg-data-red/20 text-data-red'
                : 'bg-data-green/20 text-data-green'
            }`}
          >
            {exceeded ? '超标' : '正常'}
          </span>
        </div>
        <div
          className={`font-mono text-3xl font-bold mb-4 ${
            exceeded ? 'text-data-red' : 'text-white'
          }`}
        >
          {currentValue !== null ? currentValue : '--'}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id={`grad-${indicator.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={indicator.color}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={indicator.color}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={
                <ChartTooltip
                  indicatorLabel={indicator.label}
                  unit={indicator.unit}
                />
              }
            />
            {t && (
              <>
                <ReferenceLine
                  y={t.min}
                  stroke="#334155"
                  strokeDasharray="4 4"
                />
                <ReferenceLine
                  y={t.max}
                  stroke="#334155"
                  strokeDasharray="4 4"
                />
              </>
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={indicator.color}
              strokeWidth={2}
              fill={`url(#grad-${indicator.key})`}
              dot={{ fill: indicator.color, r: 3 }}
              activeDot={{
                fill: indicator.color,
                r: 5,
                strokeWidth: 2,
                stroke: '#fff',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

export default function DetailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [timeRange, setTimeRange] = useState('24h');
  const [page, setPage] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { monitoringPoints, waterQualityRecords, thresholds } = useStore();

  const pointId =
    searchParams.get('pointId') || monitoringPoints[0]?.id || '';
  const selectedPoint =
    monitoringPoints.find((p) => p.id === pointId) || monitoringPoints[0];

  const timeRangeMs =
    TIME_RANGES.find((r) => r.label === timeRange)?.ms ?? 24 * 3600000;

  const filteredRecords = useMemo(() => {
    const now = Date.now();
    return waterQualityRecords
      .filter((r) => r.pointId === (selectedPoint?.id ?? ''))
      .filter((r) => now - new Date(r.timestamp).getTime() <= timeRangeMs)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }, [waterQualityRecords, selectedPoint, timeRangeMs]);

  const latestRecord =
    filteredRecords.length > 0
      ? filteredRecords[filteredRecords.length - 1]
      : null;

  const chartDataMap = useMemo(() => {
    const map: Record<string, { time: string; value: number }[]> = {};
    for (const ind of INDICATORS) {
      map[ind.key] = filteredRecords.map((r) => ({
        time: formatTime(r.timestamp),
        value: r[ind.key] as number,
      }));
    }
    return map;
  }, [filteredRecords]);

  const tableRecords = useMemo(() => {
    return [...filteredRecords].reverse();
  }, [filteredRecords]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(tableRecords.length / PAGE_SIZE));
  const paginatedRecords = tableRecords.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  function handlePointChange(id: string) {
    setSearchParams({ pointId: id });
    setPage(1);
    setDropdownOpen(false);
  }

  function isRecordAbnormal(record: WaterQualityRecord): boolean {
    return INDICATORS.some((ind) =>
      isExceeded(ind.key, record[ind.key] as number, thresholds),
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 space-y-6">
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg bg-surface-50 px-4 py-2 text-white hover:bg-surface-300 transition-colors"
            >
              <span>
                {selectedPoint?.name} - {selectedPoint?.area}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute z-50 mt-1 w-64 rounded-lg border border-surface-400/50 bg-surface-100 py-1 shadow-xl">
                  {monitoringPoints.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePointChange(p.id)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-300 transition-colors ${
                        p.id === selectedPoint?.id
                          ? 'text-spring-400'
                          : 'text-white'
                      }`}
                    >
                      {p.name} - {p.area}
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
                onClick={() => {
                  setTimeRange(tr.label);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  timeRange === tr.label
                    ? 'bg-spring-600 text-white'
                    : 'bg-surface-50 text-surface-400 hover:text-white'
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>
        {selectedPoint && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-white font-medium">
              {selectedPoint.name}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                selectedPoint.status === 'normal'
                  ? 'bg-data-green/20 text-data-green'
                  : selectedPoint.status === 'warning'
                    ? 'bg-data-amber/20 text-data-amber'
                    : 'bg-surface-400/30 text-surface-400'
              }`}
            >
              {selectedPoint.status === 'normal'
                ? '正常'
                : selectedPoint.status === 'warning'
                  ? '预警'
                  : '离线'}
            </span>
            <span className="text-surface-400">{selectedPoint.area}</span>
            <span className="text-surface-400">
              最近上报: {selectedPoint.lastReportTime}
            </span>
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INDICATORS.map((ind, idx) => (
          <div
            key={ind.key}
            className={
              idx === INDICATORS.length - 1 ? 'md:col-span-2' : undefined
            }
          >
            <IndicatorChart
              indicator={ind}
              data={chartDataMap[ind.key]}
              currentValue={
                latestRecord ? (latestRecord[ind.key] as number) : null
              }
              thresholds={thresholds}
            />
          </div>
        ))}
      </div>

      <GlassCard>
        <div className="p-4">
          <h3 className="text-white font-medium mb-4">监测数据记录</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-400/50">
                  <th className="py-2 px-3 text-left text-surface-400 font-medium">
                    时间
                  </th>
                  <th className="py-2 px-3 text-right text-surface-400 font-medium">
                    流量(m³/h)
                  </th>
                  <th className="py-2 px-3 text-right text-surface-400 font-medium">
                    水温(°C)
                  </th>
                  <th className="py-2 px-3 text-right text-surface-400 font-medium">
                    浊度(NTU)
                  </th>
                  <th className="py-2 px-3 text-right text-surface-400 font-medium">
                    pH
                  </th>
                  <th className="py-2 px-3 text-right text-surface-400 font-medium">
                    余氯(mg/L)
                  </th>
                  <th className="py-2 px-3 text-center text-surface-400 font-medium">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record, i) => {
                  const abnormal = isRecordAbnormal(record);
                  return (
                    <tr
                      key={record.timestamp}
                      className={`border-b border-surface-400/20 ${
                        i % 2 === 1 ? 'bg-surface-50/50' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-surface-400">
                        {formatDateTime(record.timestamp)}
                      </td>
                      {INDICATORS.map((ind) => {
                        const val = record[ind.key] as number;
                        const exc = isExceeded(ind.key, val, thresholds);
                        return (
                          <td
                            key={ind.key}
                            className={`py-2 px-3 text-right font-mono ${
                              exc
                                ? 'text-data-red bg-data-red/10'
                                : 'text-white'
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-center">
                        {abnormal ? (
                          <span className="rounded-full bg-data-red/20 text-data-red px-2 py-0.5 text-xs font-medium">
                            异常
                          </span>
                        ) : (
                          <span className="rounded-full bg-data-green/20 text-data-green px-2 py-0.5 text-xs font-medium">
                            正常
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg bg-surface-50 px-3 py-1 text-sm text-white disabled:opacity-30 hover:bg-surface-300 transition-colors"
              >
                上一页
              </button>
              <span className="text-surface-400 text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg bg-surface-50 px-3 py-1 text-sm text-white disabled:opacity-30 hover:bg-surface-300 transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
