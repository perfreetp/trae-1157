import { cn } from '@/lib/utils'

type BadgeLevel = 'critical' | 'warning' | 'info' | 'online' | 'offline'

interface StatusBadgeProps {
  level: BadgeLevel
  label?: string
  className?: string
}

const levelStyles: Record<BadgeLevel, string> = {
  critical: 'bg-data-red/15 text-data-red border-data-red/30',
  warning: 'bg-data-amber/15 text-data-amber border-data-amber/30',
  info: 'bg-data-blue/15 text-data-blue border-data-blue/30',
  online: 'bg-data-green/15 text-data-green border-data-green/30',
  offline: 'bg-white/10 text-white/40 border-white/20',
}

const levelLabels: Record<BadgeLevel, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
  online: '在线',
  offline: '离线',
}

export default function StatusBadge({ level, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        levelStyles[level],
        className
      )}
    >
      {label ?? levelLabels[level]}
    </span>
  )
}
