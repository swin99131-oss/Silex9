'use client'

import { toast } from 'sonner'
import { PageHeader } from '@/components/admin/PageHeader'
import { EmptyState } from '@/components/admin/EmptyState'

export function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-10"><div className="mx-auto flex max-w-7xl flex-col gap-8"><PageHeader title={title} subtitle={subtitle} actions={<button onClick={() => toast('ستتوفر هذه الشاشة عند ربط بيانات Supabase')} className="rounded-md border px-4 py-2 text-sm">تنبيه</button>} /><EmptyState title="لا توجد بيانات بعد" description="هذه الشاشة جاهزة لاستقبال بيانات Supabase الحقيقية." /></div></main>
}
