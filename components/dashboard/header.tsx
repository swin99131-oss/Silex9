"use client"

import type { ReactNode } from "react"
import { Search } from "lucide-react"
import { useStore } from "@/components/store/store-context"

interface HeaderProps {
  title: string
  description: string
  actions?: ReactNode
  search?: boolean
}

export function Header({ title, description, actions, search = true }: HeaderProps) {
  const { query, setQuery } = useStore()

  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {search && (
        <div className="relative max-w-md">
          <Search aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج أو زبون"
            className="h-11 w-full rounded-full border border-border bg-card ps-10 pe-4 text-sm"
          />
        </div>
      )}
    </header>
  )
}
