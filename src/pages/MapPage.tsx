import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { AlertTriangle, Eye } from 'lucide-react'
import { useStore } from '@/store'
import GlassCard from '@/components/GlassCard'
import StatusBadge from '@/components/StatusBadge'

const STATUS_COLORS: Record<string, string> = {
  online: '#22C55E',
  offline: '#6B7280',
  alert: '#EF4444',
}

const INDICATOR_LABELS: Record<string, { label: string; unit: string }> = {
  flow: { label: '流量', unit: 'm³/h' },
  temperature: { label: '水温', unit: '°C' },
  turbidity: { label: '浊度', unit: 'NTU' },
  pH: { label: 'pH', unit: '' },
  residualChlorine: { label: '余氯', unit: 'mg/L' },
}

const PROTECTION_ZONES = [
  {
    name: '一级水源保护区',
    positions: [
      [24.975, 110.285] as [number, number],
      [24.995, 110.290] as [number, number],
      [24.990, 110.315] as [number, number],
      [24.970, 110.310] as [number, number],
    ],
  },
  {
    name: '二级水源保护区',
    positions: [
      [25.020, 110.310] as [number, number],
      [25.045, 110.320] as [number, number],
      [25.040, 110.355] as [number, number],
      [25.015, 110.345] as [number, number],
    ],
  },
  {
    name: '碧溪水源保护区',
    positions: [
      [24.940, 110.265] as [number, number],
      [24.965, 110.270] as [number, number],
      [24.960, 110.295] as [number, number],
      [24.935, 110.290] as [number, number],
    ],
  },
]

function isPointInZone(lat: number, lng: number, positions: [number, number][]): boolean {
  const lats = positions.map(p => p[0])
  const lngs = positions.map(p => p[1])
  return lat >= Math.min(...lats) && lat <= Math.max(...lats) && lng >= Math.min(...lngs) && lng <= Math.max(...lngs)
}

function FlyToView({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  map.flyTo([lat, lng], 14, { duration: 1 })
  return null
}

export default function MapPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { monitoringPoints, waterQualityRecords, alerts } = useStore()

  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '')
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null)

  const filteredPoints = useMemo(() => {
    if (!statusFilter) return monitoringPoints
    return monitoringPoints.filter((p) => p.status === statusFilter)
  }, [monitoringPoints, statusFilter])

  const getLatestRecord = (pointId: string) => {
    const records = waterQualityRecords.filter((r) => r.pointId === pointId)
    if (records.length === 0) return null
    return records.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b))
  }

  const handleListClick = (point: typeof monitoringPoints[0]) => {
    setFlyTarget({ lat: point.location.lat, lng: point.location.lng })
    setTimeout(() => setFlyTarget(null), 1500)
  }

  const getZonePoints = (positions: [number, number][]) => {
    return monitoringPoints.filter((p) => isPointInZone(p.location.lat, p.location.lng, positions))
  }

  const getZoneAlertCount = (pointIds: string[]) => {
    return alerts.filter((a) => pointIds.includes(a.pointId) && a.status !== 'resolved').length
  }

  const getZoneStopReportCount = (points: typeof monitoringPoints) => {
    const now = new Date()
    return points.filter((p) => {
      const last = new Date(p.lastReport)
      const hours = (now.getTime() - last.getTime()) / (1000 * 60 * 60)
      return hours > 24
    }).length
  }

  const getPointAlertCount = (pointId: string) => {
    return alerts.filter((a) => a.pointId === pointId && a.status !== 'resolved').length
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-7.5rem)]">
      <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.08] relative">
        <MapContainer
          center={[24.97, 110.33]}
          zoom={12}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />

          {flyTarget && <FlyToView lat={flyTarget.lat} lng={flyTarget.lng} />}

          {filteredPoints.map((point) => {
            const color = STATUS_COLORS[point.status]
            const latest = getLatestRecord(point.id)
            const indicators = latest
              ? (['flow', 'temperature', 'turbidity', 'pH', 'residualChlorine'] as const).slice(0, 5).map((key) => ({
                  key,
                  label: INDICATOR_LABELS[key].label,
                  value: latest[key],
                  unit: INDICATOR_LABELS[key].unit,
                }))
              : []
            return (
              <CircleMarker
                key={point.id}
                center={[point.location.lat, point.location.lng]}
                radius={point.status === 'alert' ? 12 : 10}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.8,
                  weight: 2,
                  className: point.status === 'alert' ? 'pulse-marker' : '',
                }}
              >
                <Popup>
                  <div className="min-w-[220px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">{point.name}</span>
                      <StatusBadge level={point.status === 'alert' ? 'critical' : point.status === 'online' ? 'online' : 'offline'} />
                    </div>
                    <div className="text-xs text-gray-600 mb-2">{point.area}</div>
                    {indicators.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-700 mb-3">
                        {indicators.map((ind) => (
                          <span key={ind.key}>
                            {ind.label}: {ind.value} {ind.unit}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/detail?pointId=${point.id}`)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs bg-teal-600 text-white rounded px-3 py-1.5 hover:bg-teal-700 transition-colors"
                      >
                        <Eye size={12} />
                        查看详情
                      </button>
                      <button
                        onClick={() => navigate(`/alerts?pointId=${point.id}`)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs bg-amber-500 text-white rounded px-3 py-1.5 hover:bg-amber-600 transition-colors"
                      >
                        <AlertTriangle size={12} />
                        查看告警
                      </button>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}

          {PROTECTION_ZONES.map((zone) => {
            const zonePoints = getZonePoints(zone.positions)
            const pointIds = zonePoints.map((p) => p.id)
            const alertCount = getZoneAlertCount(pointIds)
            const stopReportCount = getZoneStopReportCount(zonePoints)
            return (
              <Polygon
                key={zone.name}
                positions={zone.positions}
                pathOptions={{
                  color: '#14b8a6',
                  fillColor: '#14b8a6',
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: '8 4',
                }}
              >
                <Popup>
                  <div className="min-w-[240px]">
                    <div className="font-bold text-teal-700 text-sm mb-2">{zone.name}</div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center rounded bg-teal-50 px-2 py-1.5">
                        <div className="text-lg font-bold text-teal-700">{zonePoints.length}</div>
                        <div className="text-[10px] text-gray-500">监测点</div>
                      </div>
                      <div className="text-center rounded bg-red-50 px-2 py-1.5">
                        <div className="text-lg font-bold text-red-600">{alertCount}</div>
                        <div className="text-[10px] text-gray-500">告警</div>
                      </div>
                      <div className="text-center rounded bg-gray-100 px-2 py-1.5">
                        <div className="text-lg font-bold text-gray-600">{stopReportCount}</div>
                        <div className="text-[10px] text-gray-500">停报</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-1.5">区内监测点</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {zonePoints.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                          onClick={() => navigate(`/detail?pointId=${p.id}&zone=${encodeURIComponent(zone.name)}`)}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: STATUS_COLORS[p.status] }}
                          />
                          <span className="text-gray-800 hover:text-teal-700 hover:underline">{p.name}</span>
                        </div>
                      ))}
                      {zonePoints.length === 0 && (
                        <div className="text-xs text-gray-400">暂无监测点</div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => navigate(`/alerts?zone=${encodeURIComponent(zone.name)}`)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs bg-amber-500 text-white rounded px-3 py-1.5 hover:bg-amber-600 transition-colors"
                      >
                        <AlertTriangle size={12} />
                        查看区内告警
                      </button>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            )
          })}
        </MapContainer>

        <div className="absolute bottom-4 left-4 z-[1000]">
          <div className="rounded-lg border border-white/10 bg-surface-100/90 backdrop-blur-md px-4 py-3">
            <div className="text-xs text-white/50 mb-2">图例</div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className="w-3 h-3 rounded-full bg-data-green inline-block" /> 在线
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className="w-3 h-3 rounded-full bg-data-red inline-block" /> 告警
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className="w-3 h-3 rounded-full bg-gray-500 inline-block" /> 离线
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className="w-3 h-3 rounded bg-spring-500/30 border border-spring-500/50 inline-block" /> 保护区
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-72 flex flex-col gap-4">
        <GlassCard>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {[
              { value: '', label: '全部' },
              { value: 'online', label: '在线' },
              { value: 'alert', label: '告警' },
              { value: 'offline', label: '离线' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === f.value ? 'bg-spring-700 text-white' : 'bg-surface-50 text-white/50 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="text-sm text-white/50 mb-2">监测点列表</div>
          <div className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
            {filteredPoints.map((point) => {
              const latest = getLatestRecord(point.id)
              const alertCount = getPointAlertCount(point.id)
              return (
                <div
                  key={point.id}
                  onClick={() => handleListClick(point)}
                  className="rounded-lg bg-surface-50/50 border border-white/5 p-3 cursor-pointer hover:bg-surface-200/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[point.status] }}
                      />
                      <span className="text-sm text-white font-medium">{point.name}</span>
                    </div>
                    <StatusBadge level={point.status === 'alert' ? 'critical' : point.status === 'online' ? 'online' : 'offline'} />
                  </div>
                  <div className="text-xs text-white/40 ml-[18px]">{point.area}</div>
                  <div className="flex items-center gap-3 ml-[18px] mt-1">
                    {latest && (
                      <span className="text-xs text-white/30">
                        上报: {new Date(latest.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {alertCount > 0 && (
                      <span className="text-xs text-data-red flex items-center gap-0.5">
                        <AlertTriangle size={10} />
                        {alertCount}告警
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
