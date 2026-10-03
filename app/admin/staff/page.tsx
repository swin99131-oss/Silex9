'use client'

import { useCallback, useEffect, useState } from 'react'
import { PERMS } from '@/lib/admin/perms'
import { logAction } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'

type Staff = {
  id: string
  name: string
  username: string | null
  is_super: boolean
  perms: string[]
  is_me: boolean
}
type Draft = { id: string; label: string; is_super: boolean; perms: string[] }

const ERRORS: Record<string, string> = {
  FORBIDDEN: 'هذه الصفحة للمشرف العام فقط',
  CANNOT_DEMOTE_SELF: 'لا يمكنك تقليل صلاحياتك بنفسك',
  CANNOT_REMOVE_SELF: 'لا يمكنك إزالة نفسك',
  USER_NOT_FOUND: 'المستخدم غير موجود',
  NOT_ADMIN: 'هذا الحساب ليس مشرفاً',
}

function friendly(m: string) {
  const key = Object.keys(ERRORS).find((k) => m.includes(k))
  return key ? ERRORS[key] : m
}

const input = 'w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40'
const label = (key: string) => PERMS.find((p) => p.key === key)?.label ?? key

export default function StaffPage() {
  const [rows, setRows] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [username, setUsername] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: e } = await supabase.rpc('admin_list_staff')
    if (e) setError(friendly(e.message))
    else {
      setRows(Array.isArray(data) ? (data as Staff[]) : [])
      setError('')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function startAdd() {
    const u = username.trim().replace(/^@/, '').toLowerCase()
    if (!u) return
    setOk('')
    setError('')
    const { data, error: e } = await supabase.from('profiles').select('id, role').eq('username', u).maybeSingle()
    if (e) return setError(e.message)
    if (!data) return setError('ما فيه مستخدم بهذا الاسم')
    if (data.role === 'admin') return setError('هذا المستخدم مشرف أصلاً، عدّل صلاحياته من القائمة')
    setDraft({ id: data.id, label: '@' + u, is_super: false, perms: [] })
  }

  function startEdit(s: Staff) {
    setOk('')
    setError('')
    setDraft({ id: s.id, label: s.name, is_super: s.is_super, perms: s.perms })
  }

  const toggle = (key: string) =>
    setDraft((d) =>
      d ? { ...d, perms: d.perms.includes(key) ? d.perms.filter((x) => x !== key) : [...d.perms, key] } : d,
    )

  async function save() {
    if (!draft) return
    if (!draft.is_super && draft.perms.length === 0) {
      return setError('اختر قسماً واحداً على الأقل أو اجعله مشرفاً عاماً')
    }
    if (draft.is_super && !window.confirm('المشرف العام يرى ويدير كل شيء ويدير المشرفين. متأكد؟')) return
    setBusy(true)
    setOk('')
    setError('')
    const { error: e } = await supabase.rpc('admin_set_staff', {
      p_user: draft.id,
      p_super: draft.is_super,
      p_perms: draft.perms,
    })
    setBusy(false)
    if (e) return setError(friendly(e.message))
    await logAction('staff.save', 'profiles', draft.id)
    setOk('تم حفظ الصلاحيات')
    setDraft(null)
    setUsername('')
    void load()
  }

  async function remove(s: Staff) {
    if (!window.confirm('إزالة صلاحية المشرف عن ' + s.name + '؟')) return
    setOk('')
    setError('')
    const { error: e } = await supabase.rpc('admin_remove_staff', { p_user: s.id })
    if (e) return setError(friendly(e.message))
    await logAction('staff.remove', 'profiles', s.id)
    setOk('تمت إزالة المشرف')
    void load()
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">المشرفون والصلاحيات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">{ok}</p>}

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">إضافة مشرف</h2>
        <div className="flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="اسم المستخدم (username)"
            dir="ltr"
            className={input}
          />
          <button
            type="button"
            onClick={startAdd}
            disabled={!username.trim()}
            className="h-11 shrink-0 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      </section>

      {draft && (
        <section className="flex flex-col gap-4 rounded-xl border border-primary/40 bg-card p-5">
          <h2 className="text-lg font-semibold">صلاحيات {draft.label}</h2>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={draft.is_super}
              onChange={(e) => setDraft({ ...draft, is_super: e.target.checked })}
            />
            مشرف عام (كل الصلاحيات وإدارة المشرفين)
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {PERMS.map((p) => (
              <label key={p.key} className={`flex items-center gap-2 text-sm ${draft.is_super ? 'opacity-40' : ''}`}>
                <input
                  type="checkbox"
                  disabled={draft.is_super}
                  checked={draft.is_super || draft.perms.includes(p.key)}
                  onChange={() => toggle(p.key)}
                />
                {p.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="h-11 rounded-full border border-border px-6 text-sm">
              إلغاء
            </button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">المشرفون الحاليون</h2>
        {loading ? (
          <p className="text-sm text-muted">جارٍ التحميل...</p>
        ) : (
          rows.map((s) => (
            <article key={s.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">
                  {s.name}
                  {s.is_me && <span className="mr-2 text-xs text-muted">(أنت)</span>}
                </p>
                {s.username && <p className="text-xs text-muted">@{s.username}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.is_super ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] text-emerald-700">مشرف عام</span>
                  ) : (
                    s.perms.map((k) => (
                      <span key={k} className="rounded-full bg-chip px-3 py-1 text-[11px]">
                        {label(k)}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => startEdit(s)} className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold">
                  تعديل الصلاحيات
                </button>
                {!s.is_me && (
                  <button type="button" onClick={() => remove(s)} className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white">
                    إزالة
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
