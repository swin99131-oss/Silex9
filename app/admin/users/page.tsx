'use client'

import { useCallback, useEffect, useState } from 'react'
import { logAction } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'

type Row = {
  id: string
  full_name: string | null
  username: string | null
  store_name: string | null
  phone: string | null
  role: string | null
  city: string | null
  created_at: string
  banned_at: string | null
  ban_reason: string | null
  verified_at: string | null
}
type RoleTab = 'all' | 'merchant' | 'customer' | 'admin'
type Kind = 'ban' | 'unban' | 'verify' | 'unverify'

const PAGE = 20
const COLS = 'id, full_name, username, store_name, phone, role, city, created_at, banned_at, ban_reason, verified_at'
const ROLE_TABS: { key: RoleTab; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'merchant', label: 'التجار' },
  { key: 'customer', label: 'الزبائن' },
  { key: 'admin', label: 'الإدارة' },
]
const ROLE_LABEL: Record<string, string> = { admin: 'أدمن', merchant: 'تاجر', customer: 'زبون' }
const TITLES: Record<Kind, string> = {
  ban: 'حظر المستخدم',
  unban: 'رفع الحظر',
  verify: 'توثيق الحساب',
  unverify: 'إلغاء التوثيق',
}
const clean = (s: string) => s.replace(/[,()%]/g, ' ').trim()
const btn = 'rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50'

function errText(e: unknown) {
  const m = (e as { message?: string } | null)?.message ?? ''
  if (m.includes('SELF')) return 'ما تقدر تحظر حسابك'
  if (m.includes('TARGET_ADMIN')) return 'ما يمكن حظر أدمن'
  if (m.includes('FORBIDDEN')) return 'ليست لديك صلاحية الأدمن'
  if (m.includes('NOT_FOUND')) return 'المستخدم غير موجود'
  return m || 'خطأ غير معروف'
}

export default function UsersPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [role, setRole] = useState<RoleTab>('all')
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [act, setAct] = useState<{ row: Row; kind: Kind } | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('profiles')
      .select(COLS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (role !== 'all') q = q.eq('role', role)
    const term = clean(search)
    if (term) {
      q = q.or(`full_name.ilike.%${term}%,username.ilike.%${term}%,store_name.ilike.%${term}%,phone.ilike.%${term}%`)
    }
    const { data, count, error: e } = await q
    if (e) {
      setError(e.message)
      setLoading(false)
      return
    }
    setRows((data ?? []) as Row[])
    setTotal(count ?? 0)
    setError('')
    setLoading(false)
  }, [page, role, search])

  useEffect(() => {
    void load()
  }, [load])

  function ask(row: Row, kind: Kind) {
    setReason('')
    setOk('')
    setError('')
    setAct({ row, kind })
  }

  async function run() {
    if (!act) return
    const { row, kind } = act
    if (kind === 'ban' && reason.trim().length < 3) {
      setError('اكتب سبب الحظر (3 أحرف على الأقل)')
      return
    }
    setBusy(true)
    const { error: e } =
      kind === 'ban' || kind === 'unban'
        ? await supabase.rpc('admin_set_ban', {
            p_user: row.id,
            p_banned: kind === 'ban',
            p_reason: kind === 'ban' ? reason.trim() : null,
          })
        : await supabase.rpc('admin_set_verified', { p_user: row.id, p_verified: kind === 'verify' })
    setBusy(false)
    if (e) {
      setError(errText(e))
      return
    }
    try {
      await logAction('user.' + kind, 'profiles', row.id, kind === 'ban' ? { reason: reason.trim() } : {})
    } catch {}
    setAct(null)
    setError('')
    setOk('تم تنفيذ الإجراء')
    void load()
  }

  const pages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">المستخدمون</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setPage(0)
          setSearch(input)
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ابحث بالاسم أو اسم المستخدم أو الهاتف"
          className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40"
        />
        <button type="submit" className={`${btn} bg-primary px-5 text-primary-foreground`}>
          بحث
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setPage(0)
              setRole(t.key)
            }}
            className={`${btn} ${role === t.key ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && !act && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">{ok}</p>}

      {loading ? (
        <p className="text-sm text-muted">جارٍ التحميل...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">لا توجد نتائج.</p>
      ) : (
        rows.map((r) => {
          const name = r.store_name || r.full_name || r.username || 'بدون اسم'
          return (
            <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {r.username ? `@${r.username}` : '—'}
                    {r.phone ? ` · ${r.phone}` : ''}
                    {r.city ? ` · ${r.city}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">
                    {ROLE_LABEL[r.role ?? ''] ?? r.role ?? 'زبون'}
                  </span>
                  {r.verified_at && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-700">موثّق</span>
                  )}
                  {r.banned_at && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700">محظور</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted">انضم في {new Date(r.created_at).toLocaleDateString('ar')}</p>
              {r.banned_at && r.ban_reason && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">سبب الحظر: {r.ban_reason}</p>
              )}

              {r.role !== 'admin' && (
                <div className="flex flex-wrap gap-2">
                  {r.banned_at ? (
                    <button type="button" onClick={() => ask(r, 'unban')} className={`${btn} border border-border`}>
                      رفع الحظر
                    </button>
                  ) : (
                    <button type="button" onClick={() => ask(r, 'ban')} className={`${btn} bg-red-600 text-white`}>
                      حظر
                    </button>
                  )}
                  {r.verified_at ? (
                    <button type="button" onClick={() => ask(r, 'unverify')} className={`${btn} border border-border`}>
                      إلغاء التوثيق
                    </button>
                  ) : (
                    <button type="button" onClick={() => ask(r, 'verify')} className={`${btn} border border-border`}>
                      توثيق
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      <div className="flex items-center justify-between text-xs text-muted">
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className={`${btn} border border-border`}>
          السابق
        </button>
        <span>
          صفحة {page + 1} من {pages} · {total.toLocaleString('ar')} مستخدم
        </span>
        <button
          type="button"
          disabled={page + 1 >= pages}
          onClick={() => setPage((p) => p + 1)}
          className={`${btn} border border-border`}
        >
          التالي
        </button>
      </div>

      {act && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-card p-5">
            <h3 className="text-lg font-semibold">{TITLES[act.kind]}</h3>
            <p className="text-sm text-muted">{act.row.store_name || act.row.full_name || act.row.username || 'مستخدم'}</p>
            {act.kind === 'ban' && (
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 200))}
                placeholder="سبب الحظر (يظهر للمستخدم)"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40"
              />
            )}
            {error && <p className="rounded-lg bg-red-100 p-2 text-xs text-red-800">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={run}
                className={`${btn} flex-1 py-2.5 text-sm ${act.kind === 'ban' ? 'bg-red-600 text-white' : 'bg-primary text-primary-foreground'}`}
              >
                {busy ? 'جارٍ التنفيذ...' : 'تأكيد'}
              </button>
              <button type="button" disabled={busy} onClick={() => setAct(null)} className={`${btn} border border-border py-2.5 text-sm`}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
