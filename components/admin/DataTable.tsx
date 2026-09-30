'use client'

import { MoreHorizontal, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

type Column<T> = { key: string; header: string; render: (row: T) => ReactNode }

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = 'بحث...',
  filters,
  loading,
  emptyState,
  rowActions,
  search,
  onSearchChange,
  page = 0,
  pageSize = 25,
  total,
  onPageChange,
}: {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  filters?: ReactNode
  loading?: boolean
  emptyState?: ReactNode
  rowActions?: (row: T) => ReactNode
  search?: string
  onSearchChange?: (value: string) => void
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void
}) {
  const count = total ?? data.length
  const lastPage = Math.max(0, Math.ceil(count / pageSize) - 1)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
          <Search className="size-4 text-muted" aria-hidden="true" />
          <input
            className="min-w-0 bg-transparent outline-none"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={search ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            disabled={!onSearchChange}
          />
        </label>
        {filters && <div className="flex flex-wrap gap-2">{filters}</div>}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-chip/50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 text-right font-medium text-muted">
                  {c.header}
                </th>
              ))}
              {rowActions && (
                <th className="px-4 py-3" aria-label="الإجراءات">
                  <MoreHorizontal className="size-4" />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-chip" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.map((row, i) => (
                  <tr key={i} className="border-t">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-4">
                        {c.render(row)}
                      </td>
                    ))}
                    {rowActions && <td className="px-4 py-4">{rowActions(row)}</td>}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {!loading && data.length === 0 && (emptyState ?? <EmptyState />)}

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          عرض {data.length} من {count}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border px-3 py-1.5 disabled:opacity-50"
            disabled={!onPageChange || page <= 0}
            onClick={() => onPageChange?.(page - 1)}
          >
            السابق
          </button>
          <span>
            {page + 1} / {lastPage + 1}
          </span>
          <button
            className="rounded-md border px-3 py-1.5 disabled:opacity-50"
            disabled={!onPageChange || page >= lastPage}
            onClick={() => onPageChange?.(page + 1)}
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  )
}

export default DataTable
