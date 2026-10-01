'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { PAGE_SIZE, listAuditLogs } from '@/lib/admin/api'
import type { AuditLog } from '@/lib/admin/types'
import { supabase } from '@/lib/supabase'

const ACTIONS: Record<string, string> = {
  'settings.update': 'تعديل إعدادات المنصة',
  'user.role_change': 'تغيير صلاحية مستخدم',
  'user.verify': 'توثيق حساب',
  'user.unverify': 'إلغاء توثيق حساب',
  'campaign.active': 'قبول إعلان وتفعيله',
  'campaign.rejected': 'رفض إعلان',
  'campaign.paused': 'إيقاف إعلان مؤقتاً',
  'ad_package.save': 'حفظ باقة إعلانية',
  'ad_template.save': 'حفظ قالب إعلاني',
  'ad_settings.save': 'حفظ إعدادات الإعلانات والدفع',
  'report.resolved': 'إغلاق بلاغ (تمت المعالجة)',
  'report.dismissed': 'تجاهل بلاغ',
  'post.delete': 'حذف منشور مبلّغ عنه',
  'notification.send': 'إرسال تنبيه لمستخدم',
}

const ENTITIES: Record<string, string> = {
  platform_settings: 'إعدادات المنصة',
  profiles: 'حساب مستخدم',
  campaigns: 'إعلان',
  ad_packages: 'باقة إعلانية',
  ad_templates: 'قالب إعلاني',
  reports: 'بلاغ',
  posts: 'منشور',
  notifications: 'تنبيه',
}

const KEYS: Record<string, string> = {
  role: 'الصلاحية',
  daily_price: 'السعر اليومي',
  days: 'الأيام',
  active: 'مفعّلة',
  enabled: 'مفعّل',
  free_ads_quota: 'عدد الإعلانات المجانية',
}

const ROLES: Record<string, string> = { admin: 'مشرف', merchant: 'تاجر', customer: 'زبون' }

function fmt(k: string, v: unknown) {
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
  if (typeof v === 'number') return v.toLocaleString('ar')
  if (k === 'role' && typeof v === 'string') return ROLES[v] ?? v
  return String(v)
}

function describe(d: Record<string, unknown> | null) {
  const parts = Object.entries(d ?? {})
    .filter(([k]) => k in KEYS)
    .map(([k, v]) => `${KEYS[k]}: ${fmt(k, v)}`)
  return parts.length ? parts.join(' · ') : '—'
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLog[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    listAuditLogs({ page })
      .then(async (res) => {
        const ids = Array.from(new Set(res.rows.map((r) => r.actor_id).filter(Boolean))) as string[]
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">سجل العمليات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      <DataTable<AuditLog>
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        columns={[
          { key: 'actor', header: 'المنفّذ', render: (r) => (r.actor_id ? names[r.actor_id] ?? '—' : '—') },
          {
            key: 'action',
            header: 'العملية',
            render: (r) => <span title={r.action}>{ACTIONS[r.action] ?? 'عملية أخرى'}</span>,
          },
          { key: 'entity', header: 'الكيان', render: (r) => (r.entity_type ? ENTITIES[r.entity_type] ?? '—' : '—') },
          {
            key: 'details',
            header: 'التفاصيل',
            render: (r) => <span className="line-clamp-2 max-w-xs text-xs">{describe(r.details)}</span>,
          },
          { key: 'created', header: 'التاريخ', render: (r) => new Date(r.created_at).toLocaleString('ar') },
        ]}
      />
    </div>
  )
}
