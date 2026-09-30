import type { ReactNode } from 'react'

export function EmptyState({ title = 'لا توجد بيانات', description = 'ستظهر البيانات هنا عند توفرها.', icon, action }: { title?: string; description?: string; icon?: ReactNode; action?: ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-chip/20 p-8 text-center">{icon && <div className="mb-3 text-muted">{icon}</div>}<h2 className="text-base font-medium">{title}</h2><p className="mt-2 max-w-sm text-sm text-muted">{description}</p>{action && <div className="mt-4">{action}</div>}</div>
}

export default EmptyState
