import type { LucideIcon } from 'lucide-react'

export function StatCard({ label, value, description, icon: Icon }: { label: string; value: string | number; description?: string; icon?: LucideIcon }) {
  return <article className="rounded-xl border bg-card p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm text-muted">{label}</p>{Icon && <Icon className="text-muted" aria-hidden="true" />}</div><p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>{description && <p className="mt-2 text-xs text-muted">{description}</p>}</article>
}

export default StatCard
