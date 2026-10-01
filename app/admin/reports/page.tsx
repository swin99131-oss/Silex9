'use client'

import { useCallback, useEffect, useState } from 'react'
import { logAction } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'

type Report = {
  id: string
  reporter_id: string | null
  reported_id: string | null
  conversation_id: string | null
  post_id: string | null
  reason: string | null
  details: string | null
  status: string
  admin_note: string | null
  created_at: string
}
type Person = { name: string; banned: boolean; role: string | null }
type PostInfo = {
  id: string
  user_id: string
  title: string | null
  caption: string | null
  image_url: string | null
  media_type: string | null
}
type Tab = 'open' | 'resolved' | 'dismissed' | 'all'
type Action = 'resolved' | 'dismissed' | 'ban' | 'delete_post'

const TABS: { key: Tab; label: string }[] = [
  { key: 'open', label: 'مفتوحة' },
  { key: 'resolved', label: 'معالَجة' },
  { key: 'dismissed', label: 'مرفوضة' },
  { key: 'all', label: 'الكل' },
]
const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'مفتوح', cls: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'تمت المعالجة', cls: 'bg-green-100 text-green-700' },
  dismissed: { label: 'مرفوض', cls: 'bg-secondary text-muted' },
}
const ACTIONS: Record<Action, { title: string; confirm: string; hint: string; required: boolean }> = {
  resolved: { title: 'إغلاق البلاغ كمُعالَج', confirm: 'تأكيد', hint: 'ملاحظة (اختياري)', required: false },
  dismissed: { title: 'رفض البلاغ', confirm: 'رفض', hint: 'سبب الرفض (اختياري)', required: false },
  ban: { title: 'حظر المستخدم المُبلَّغ عنه', confirm: 'حظر', hint: 'سبب الحظر (يظهر للمستخدم)', required: true },
  delete_post: { title: 'حذف المنشور', confirm: 'حذف', hint: 'ملاحظة (اختياري)', required: false },
}
const btn = 'rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50'

function errText(e: unknown) {
  const m = (e as { message?: string } | null)?.message ?? ''
  if (m.includes('TARGET_ADMIN')) return 'ما يمكن حظر أدمن'
  if (m.includes('SELF')) return 'ما تقدر تحظر حسابك'
  if (m.includes('FORBIDDEN')) return 'ليست لديك صلاحية الأدمن'
  return m || 'خطأ غير معروف'
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('open')
  const [rows, setRows] = useState<Report[]>([])
  const [people, setPeople] = useState<Record<string, Person>>({})
  const [posts, setPosts] = useState<Record<string, PostInfo>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [dlg, setDlg] = useState<{ row: Report; action: Action } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('reports')
      .select('id, reporter_id, reported_id, conversation_id, post_id, reason, details, status, admin_note, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (tab !== 'all') q = q.eq('status', tab)
    const { data, error: e } = await q
    if (e) {
      setError(e.message)
      setLoading(false)
      return
    }
    const list = (data ?? []) as Report[]
    setRows(list)

    const ids = Array.from(new Set(list.flatMap((r) => [r.reporter_id, r.reported_id]).filter(Boolean))) as string[]
    const pmap: Record<string, Person> = {}
    if (ids.length) {
      const { data: ps } = await supabase
        .from('profiles')
        .select('id, store_name, full_name, username, role, banned_at')
        .in('id', ids)
      for (const p of (ps ?? []) as {
        id: string
        store_name: string | null
        full_name: string | null
        username: string | null
        role: string | null
        banned_at: string | null
      }[]) {
        pmap[p.id] = { name: p.store_name || p.full_name || p.username || 'مستخدم', banned: !!p.banned_at, role: p.role }
      }
    }
    setPeople(pmap)

    const postIds = Array.from(new Set(list.map((r) => r.post_id).filter(Boolean))) as string[]
    const postMap: Record<string, PostInfo> = {}
    if (postIds.length) {
      const { data: ps } = await supabase
        .from('posts')
        .select('id, user_id, title, caption, image_url, media_type')
        .in('id', postIds)
      for (const p of (ps ?? []) as PostInfo[]) postMap[p.id] = p
    }
    setPosts(postMap)
    setError('')
    setLoading(false)
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  function ask(row: Report, action: Action) {
    setNote('')
    setOk('')
    setError('')
    setDlg({ row, action })
  }

  async function run() {
    if (!dlg) return
    const { row, action } = dlg
    const text = note.trim()
    if (ACTIONS[action].required && text.length < 3) {
      setError('اكتب سبباً واضحاً (3 أحرف على الأقل)')
      return
    }
    setBusy(true)
    let closed = false
    try {
      const { data: u } = await supabase.auth.getUser()
      const close = async (status: 'resolved' | 'dismissed', adminNote: string | null) => {
        const { data, error: e } = await supabase
          .from('reports')
          .update({
            status,
            admin_note: adminNote,
            resolved_by: u.user?.id ?? null,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', row.id)
          .select('id')
        if (e) throw new Error(e.message)
        if (!data?.length) throw new Error('لم يتم تحديث البلاغ، تحقق من الصلاحيات')
        closed = true
      }

      if (action === 'ban') {
        if (!row.reported_id) throw new Error('لا يوجد مستخدم مُبلَّغ عنه')
        const { error: e } = await supabase.rpc('admin_set_ban', {
          p_user: row.reported_id,
          p_banned: true,
          p_reason: text,
        })
        if (e) throw e
        await close('resolved', `حظر المستخدم: ${text}`)
      } else if (action === 'delete_post') {
        const post = row.post_id ? posts[row.post_id] : undefined
        await close('resolved', text || 'حذف المنشور')
        if (row.post_id) {
          const { error: e } = await supabase.from('posts').delete().eq('id', row.post_id)
          if (e) throw new Error('أُغلق البلاغ لكن تعذّر حذف المنشور: ' + e.message)
          const marker = '/object/public/posts/'
          const url = post?.image_url ?? ''
          const i = url.indexOf(marker)
          if (i !== -1) {
            try {
              await supabase.storage.from('posts').remove([decodeURIComponent(url.slice(i + marker.length).split('?')[0])])
            } catch {}
          }
        }
      } else {
        await close(action, text || null)
      }

      try {
        await logAction('report.' + action, 'reports', row.id, text ? { note: text } : {})
      } catch {}
      setDlg(null)
      setError('')
      setOk('تم تنفيذ الإجراء')
    } catch (e) {
      setError(errText(e))
      if (!closed) {
        setBusy(false)
        return
      }
      setDlg(null)
    }
    setBusy(false)
    void load()
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">البلاغات</h1>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`${btn} ${tab === t.key ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && !dlg && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">{ok}</p>}

      {loading ? (
        <p className="text-sm text-muted">جارٍ التحميل...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">لا توجد بلاغات هنا.</p>
      ) : (
        rows.map((r) => {
          const st = STATUS[r.status] ?? { label: r.status, cls: 'bg-secondary text-muted' }
          const reporter = r.reporter_id ? people[r.reporter_id] : undefined
          const reported = r.reported_id ? people[r.reported_id] : undefined
          const post = r.post_id ? posts[r.post_id] : undefined
          const kind = r.post_id ? 'منشور' : r.conversation_id ? 'محادثة' : 'مستخدم'
          const canBan = !!reported && !reported.banned && reported.role !== 'admin'
          return (
            <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">بلاغ عن {kind}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    من {reporter?.name ?? '—'} ← على {reported?.name ?? '—'}
                    {reported?.banned ? ' (محظور)' : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
              </div>

              <div className="rounded-lg bg-secondary px-3 py-2 text-sm">
                <p className="font-medium">{r.reason ?? 'بدون سبب'}</p>
                {r.details && <p className="mt-1 text-xs text-muted">{r.details}</p>}
              </div>

              {r.post_id && (
                <div className="flex gap-3 rounded-lg border border-border p-2">
                  {post ? (
                    <>
                      {post.image_url && post.media_type !== 'video' ? (
                        <img src={post.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary text-[11px] text-muted">
                          {post.media_type === 'video' ? 'فيديو' : 'نص'}
                        </div>
                      )}
                      <div className="min-w-0 text-xs">
                        <p className="truncate font-semibold">{post.title || 'بدون عنوان'}</p>
                        <p className="mt-0.5 line-clamp-2 text-muted">{post.caption}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted">المنشور محذوف أو غير متاح.</p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted">{new Date(r.created_at).toLocaleString('ar')}</p>
              {r.admin_note && r.status !== 'open' && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">ملاحظة الإدارة: {r.admin_note}</p>
              )}

              {r.status === 'open' && (
                <div className="flex flex-wrap gap-2">
                  {canBan && (
                    <button type="button" onClick={() => ask(r, 'ban')} className={`${btn} bg-red-600 text-white`}>
                      حظر المستخدم
                    </button>
                  )}
                  {post && (
                    <button type="button" onClick={() => ask(r, 'delete_post')} className={`${btn} bg-red-600 text-white`}>
                      حذف المنشور
                    </button>
                  )}
                  <button type="button" onClick={() => ask(r, 'resolved')} className={`${btn} bg-green-600 text-white`}>
                    تم الحل
                  </button>
                  <button type="button" onClick={() => ask(r, 'dismissed')} className={`${btn} border border-border`}>
                    رفض البلاغ
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}

      {dlg && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-card p-5">
            <h3 className="text-lg font-semibold">{ACTIONS[dlg.action].title}</h3>
            {dlg.action === 'delete_post' && (
              <p className="text-sm text-muted">سيتم حذف المنشور وملفاته نهائياً.</p>
            )}
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder={ACTIONS[dlg.action].hint}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40"
            />
            {error && <p className="rounded-lg bg-red-100 p-2 text-xs text-red-800">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={run}
                className={`${btn} flex-1 py-2.5 text-sm ${
                  dlg.action === 'ban' || dlg.action === 'delete_post' ? 'bg-red-600 text-white' : 'bg-primary text-primary-foreground'
                }`}
              >
                {busy ? 'جارٍ التنفيذ...' : ACTIONS[dlg.action].confirm}
              </button>
              <button type="button" disabled={busy} onClick={() => setDlg(null)} className={`${btn} border border-border py-2.5 text-sm`}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
