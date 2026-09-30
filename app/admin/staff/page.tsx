'use client'

import { useCallback, useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { PAGE_SIZE, listAdmins, setUserRole } from '@/lib/admin/api'
import type { Profile } from '@/lib/admin/types'
import { supabase } from '@/lib/supabase'

export default function StaffPage() {
  const [rows, setRows] = useState<Profile[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [me, setMe] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    listAdmins({ page })
      .then((res) => {
        setRows(res.rows)
        setTotal(res.total)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ غير معروف'))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [])

  async function add() {
    const u = username.trim().replace(/^@/, '').toLowerCase()
    if (!u) return
    setBusy(true)
    try {
      const { data, error: e } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('username', u)
        .maybeSingle()
      if (e) throw new Error(e.message)
      if (!data) throw new Error('ما فيه مستخدم بهذا الاسم')
      if (data.role === 'admin') throw new Error('هذا المستخدم مشرف أصلاً')
      if (!window.confirm(`تعيين @${u} كمشرف؟ بيقدر يشوف ويدير كل شي.`)) return
      await setUserRole(data.id, 'admin')
      setUsername('')
      setError('')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setBusy(false)
    }
  }

  async function remove(p: Profile) {
    if (p.id === me) return
    if (!window.confirm('إزالة صلاحية المشرف عن هذا الحساب؟')) return
    try {
      await setUserRole(p.id, 'customer')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">المشرفون والصلاحيات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}

      <div className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="اسم المستخدم (username) لإضافته كمشرف"
          dir="ltr"
          className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy || !username.trim()}
          className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          إضافة مشرف
        </button>
      </div>

      <DataTable<Profile>
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        columns={[
          {
            key: 'name',
            header: 'الاسم',
            render: (r) => r.full_name || r.display_name || r.store_name || 'بدون اسم',
          },
          { key: 'username', header: 'اسم المستخدم', render: (r) => (r.username ? `@${r.username}` : '—') },
          { key: 'phone', header: 'الجوال', render: (r) => r.phone ?? '—' },
          {
            key: 'act',
            header: '',
            render: (r) =>
              r.id === me ? (
                <span className="text-xs text-muted">أنت</span>
              ) : (
                <button type="button" onClick={() => remove(r)} className="text-sm font-semibold text-red-700 underline">
                  إزالة الصلاحية
                </button>
              ),
          },
        ]}
      />
    </div>
  )
}
