import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const styles = { neutral: 'bg-chip text-muted', success: 'bg-emerald-100 text-emerald-800', danger: 'bg-red-100 text-red-800' } as const

export function StatusChip({ status, children }: { status?: keyof typeof styles; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', styles[status ?? 'neutral'])}>{children}</span>
}

export default StatusChip
