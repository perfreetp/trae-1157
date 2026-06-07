import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  title?: string
  children: ReactNode
  className?: string
  action?: ReactNode
  onClick?: () => void
}

export default function GlassCard({ title, children, className, action, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-surface-100/80 backdrop-blur-xl shadow-lg',
        onClick && 'cursor-pointer hover:bg-surface-200/80 transition-colors',
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <h3 className="text-sm font-semibold text-white/90">{title}</h3>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
