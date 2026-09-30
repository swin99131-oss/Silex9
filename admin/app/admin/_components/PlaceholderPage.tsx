"use client"

import { useEffect, useState } from 'react'
import { Bell, ClipboardList, FileWarning, MessageSquare, Package, Settings2, ShieldCheck, ShoppingCart, Store, Users } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import { createClient } from '@/lib/supabase/client'

type ScreenConfig = { icon: typeof Bell; label: string; description: string; table: string; columns: string[] }

const screenConfig: Record<string, ScreenConfig> = {
  'الشكاوى والبلاغات': { icon: FileWarning, label: 'البلاغات الواردة', description: 'بلاغات المستخدمين التي تحتاج إلى مراجعة.', table: 'reports', columns: ['id', 'reason', 'status', 'created_at'] },
  'المحادثات': { icon: MessageSquare, label: 'المحادثات المبلّغ عنها', description: 'المحادثات المرتبطة ببلاغات المستخدمين.', table: 'conversations', columns: ['id', 'status', 'created_at'] },
  'الإعلانات': { icon: Bell, label: 'طلبات الإعلانات', description: 'طلبات الإعلانات التي تنتظر المراجعة.', table: 'campaigns', columns: ['id', 'title', 'status', 'created_at'] },
  'المستخدمون': { icon: Users, label: 'حسابات المستخدمين', description: 'ملخص الحسابات المسجلة في المنصة.', table: 'profiles', columns: ['id', 'display_name', 'created_at'] },
  'التجار': { icon: Store, label: 'التجار المسجلون', description: 'السجلات الفعلية للتجار.', table: 'merchants', columns: ['id', 'name', 'status', 'created_at'] },
  'المنتجات': { icon: Package, label: 'كتالوج المنتجات', description: 'المنتجات المنشورة في المنصة.', table: 'products', columns: ['id', 'name', 'status', 'created_at'] },
  'الطلبات': { icon: ShoppingCart, label: 'الطلبات', description: 'الطلبات الفعلية وحالاتها.', table: 'orders', columns: ['id', 'status', 'created_at'] },
  'الإشعارات': { icon: Bell, label: 'مركز الإشعارات', description: 'الإشعارات المسجلة في النظام.', table: 'notifications', columns: ['id', 'title', 'created_at'] },
  'المحتوى المسيء': { icon: ShieldCheck, label: 'مراجعة المحتوى', description: 'العناصر المبلّغ عنها للمراجعة.', table: 'moderation_reports', columns: ['id', 'status', 'created_at'] },
  'المشرفون والصلاحيات': { icon: Users, label: 'فريق الإدارة', description: 'المشرفون والأدوار المسجلة.', table: 'admin_users', columns: ['id', 'role', 'created_at'] },
  'سجل العمليات': { icon: ClipboardList, label: 'سجل التدقيق', description: 'سجل العمليات الإدارية الفعلي.', table: 'audit_logs', columns: ['id', 'action', 'created_at'] },
  'الإعدادات': { icon: Settings2, label: 'إعدادات المنصة', description: 'إعدادات الإدارة المحفوظة.', table: 'settings', columns: ['id', 'key', 'updated_at'] },
}

export default function PlaceholderPage({ title, subtitle }: { title: string; subtitle: string }) {
  const config = screenConfig[title] ?? { icon: Settings2, label: title, description: subtitle, table: '', columns: [] }
  const Icon = config.icon
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true
    async function loadSection() {
      if (!config.table) { setLoading(false); return }
      const supabase = createClient()
      const result = await supabase.from(config.table).select(config.columns.join(',')).limit(25)
      if (!mounted) return
      if (result.error) setError(true)
      else setRows((result.data ?? []) as Record<string, unknown>[])
      setLoading(false)
    }
    loadSection()
    return () => { mounted = false }
  }, [config.table, config.columns])

  return <div className="flex flex-col gap-6">
    <PageHeader title={title} subtitle={subtitle} />
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><Icon aria-hidden="true" /></span><div><h2 className="font-semibold">{config.label}</h2><p className="text-sm text-muted-foreground">المصدر: Supabase · جدول {config.table}</p></div></div>
      {loading ? <div className="grid gap-3 sm:grid-cols-3"><div className="h-16 animate-pulse rounded-xl bg-muted" /><div className="h-16 animate-pulse rounded-xl bg-muted" /><div className="h-16 animate-pulse rounded-xl bg-muted" /></div> : error ? <EmptyState title="تعذر تحميل هذا القسم" description={`تحقق من وجود جدول ${config.table} وصلاحيات RLS في Supabase.`} /> : rows.length === 0 ? <EmptyState title="لا توجد سجلات حقيقية بعد" description={config.description} /> : <div className="grid gap-3 sm:grid-cols-3">{rows.slice(0, 6).map((row, index) => <div key={String(row.id ?? index)} className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">سجل {index + 1}</p><p className="mt-2 truncate text-sm font-medium">{String(row.title ?? row.name ?? row.reason ?? row.action ?? row.status ?? row.id)}</p></div>)}</div>}
    </section>
  </div>
}

export { screenConfig }
export { PlaceholderPage }
