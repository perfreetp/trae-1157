import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Eye } from 'lucide-react'
import { useStore } from '@/store'
import GlassCard from '@/components/GlassCard'
import StatusBadge from '@/components/StatusBadge'

const STATUS_COLORS: Record<string, string> = {
  online: '#22C55E',
  offline: '#6B7280',
  alert: '#EF4444',
}

const STATUS_LABELS: Record<string, string> = {
  online: '在线',
  offline: '离线',
  alert: '告警',
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

function FlyToView({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  map.flyTo([lat, lng], 14, { duration: 1 })
  return null
}

export default function MapPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { monitoringPoints, waterQualityRecords } = useStore()

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

  const handlePointClick = (pointId: string) => {
    navigate(`/detail?pointId=${pointId}`)
  }

  const handleListClick = (point: typeof monitoringPoints[0]) => {
    setFlyTarget({ lat: point.location.lat, lng: point.location.lng })
    setTimeout(() => setFlyTarget(null), 1500)
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
                  <div className="min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">{point.name}</span>
                      <StatusBadge level={point.status === 'alert' ? 'critical' : point.status === 'online' ? 'online' : 'offline'} />
                    </div>
                    <div className="text-xs text-gray-600 mb-2">{point.area}</div>
                    {latest && (
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-700 mb-2">
                        <span>流量: {latest.flow} m³/h</span>
                        <span>水温: {latest.temperature} °C</span>
                        <span>浊度: {latest.turbidity} NTU</span>
                        <span>pH: {latest.pH}</span>
                        <span>余氯: {latest.residualChlorine} mg/L</span>
                      </div>
                    )}
                    <button
                      onClick={() => handlePointClick(point.id)}
                      className="w-full text-center text-xs bg-teal-600 text-white rounded px-3 py-1.5 hover:bg-teal-700 transition-colors"
                    >
                      查看详情
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}

          {PROTECTION_ZONES.map((zone) => (
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
                <span className="font-semibold text-teal-700">{zone.name}</span>
              </Popup>
            </Polygon>
          ))}
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
                  {latest && (
                    <div className="text-xs text-white/30 ml-[18px] mt-1">
                      上报: {new Date(latest.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
