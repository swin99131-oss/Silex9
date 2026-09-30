'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { PAGE_SIZE, listMessages, listReportedChats } from '@/lib/admin/api'
import type { ChatMessage, WithCity } from '@/lib/admin/api'
import type { Report } from '@/lib/admin/types'
import { supabase } from '@/lib/supabase'

type Row = WithCity<Report>

export default function ChatsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<Row | null>(null)
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  const [msgLoading, setMsgLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    listReportedChats({ page })
      .then(async (res) => {
        const ids = Array.from(
          new Set(res.rows.flatMap((r) => [r.reporter_id, r.reported_id]).filter(Boolean)),
        ) as string[]
        if (ids.length) {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, display_name, store_name')
            .in('id', ids)
          const map: Record<string, string> = {}
          for (const p of data ?? []) {
            map[p.id] = p.store_name || p.full_name || p.display_name || 'بدون اسم'
          }
          setNames(map)
        }
        setRows(res.rows)
        setTotal(res.total)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ غير معروف'))
      .finally(() => setLoading(false))
  }, [page])

  async function view(r: Row) {
    if (!r.conversation_id) return
    setOpen(r)
    setMsgLoading(true)
    try {
      setMsgs(await listMessages(r.conversation_id))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setMsgLoading(false)
    }
  }

  const name = (id: string | null) => (id ? names[id] ?? '—' : '—')
  const body = (m: ChatMessage) =>
    m.deleted_at ? 'رسالة محذوفة' : m.content ? m.content : m.media_type ? `[${m.media_type}]` : '🔒 مشفّرة'

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">المحادثات المبلغ عنها</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      <DataTable<Row>
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        columns={[
          { key: 'reporter', header: 'المُبلِّغ', render: (r) => name(r.reporter_id) },
          { key: 'reported', header: 'المُبلَّغ عنه', render: (r) => name(r.reported_id) },
          { key: 'reason', header: 'السبب', render: (r) => r.reason ?? '—' },
          {
            key: 'created',
            header: 'التاريخ',
            render: (r) => new Date(r.created_at).toLocaleDateString('ar'),
          },
          {
            key: 'view',
            header: '',
            render: (r) => (
              <button type="button" onClick={() => view(r)} className="text-sm font-semibold underline">
                عرض الرسائل
              </button>
            ),
          },
        ]}
      />

      {open && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">
              {name(open.reporter_id)} ↔ {name(open.reported_id)}
            </h2>
            <button type="button" onClick={() => setOpen(null)} className="text-sm">إغلاق</button>
          </div>
          {msgLoading ? (
            <p className="text-sm text-muted">جارٍ التحميل...</p>
          ) : msgs.length === 0 ? (
            <p className="text-sm text-muted">لا توجد رسائل.</p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {msgs.map((m) => (
                <li key={m.id} className="rounded-xl bg-chip px-3 py-2 text-sm">
                  <span className="font-semibold">{name(m.sender_id)}: </span>
                  {body(m)}
                  <span className="mr-2 text-[11px] text-muted">
                    {new Date(m.created_at).toLocaleString('ar')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
