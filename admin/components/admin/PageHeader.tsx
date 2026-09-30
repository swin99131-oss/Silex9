import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}</div>{actions}</header>
}

export default PageHeader
