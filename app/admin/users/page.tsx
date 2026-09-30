'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { StatusChip } from '@/components/admin/StatusChip'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { PAGE_SIZE, listUsers, setUserRole } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/admin/types'

export default function UsersPage() {
  const [rows, setRows] = useState<Profile[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [me, setMe] = useState<string | null>(null)
  const [target, setTarget] = useState<Profile | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await listUsers({ page, search })
        setRows(res.rows)
        setTotal(res.total)
        setError('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطأ غير معروف')
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [page, search, reload])

  async function confirmChange() {
    if (!target) return
    try {
      await setUserRole(target.id, target.role === 'admin' ? 'merchant' : 'admin')
      setTarget(null)
      setReload((n) => n + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التحديث')
      setTarget(null)
    }
  }

  const isAdmin = target?.role === 'admin'

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">المستخدمون</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      <DataTable<Profile>
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => {
          setPage(0)
          setSearch(v)
        }}
        searchPlaceholder="بحث بالاسم أو الهاتف أو المدينة..."
        columns={[
          { key: 'name', header: 'الاسم', render: (r) => r.full_name ?? r.display_name ?? '—' },
          { key: 'store', header: 'المتجر', render: (r) => r.store_name ?? '—' },
          { key: 'city', header: 'المدينة', render: (r) => r.city ?? '—' },
          { key: 'phone', header: 'الهاتف', render: (r) => r.phone ?? r.whatsapp ?? '—' },
          {
            key: 'role',
            header: 'الدور',
            render: (r) => (
              <StatusChip status={r.role === 'admin' ? 'success' : 'neutral'}>{r.role}</StatusChip>
            ),
          },
          {
            key: 'created',
            header: 'التسجيل',
            render: (r) => new Date(r.created_at).toLocaleDateString('ar'),
          },
        ]}
        rowActions={(r) =>
          r.id === me ? null : (
            <button className="rounded-md border px-3 py-1.5 text-xs" onClick={() => setTarget(r)}>
              {r.role === 'admin' ? 'إزالة الأدمن' : 'ترقية لأدمن'}
            </button>
          )
        }
      />
      <ConfirmDialog
        open={!!target}
        title={isAdmin ? 'إزالة صلاحية الأدمن' : 'ترقية لأدمن'}
        description={
          isAdmin
            ? 'سيفقد هذا الحساب الوصول للوحة الإدارة.'
            : 'سيحصل هذا الحساب على وصول كامل للوحة الإدارة.'
        }
        confirmLabel="تأكيد"
        onConfirm={confirmChange}
        onCancel={() => setTarget(null)}
      />
    </div>
  )
}
