import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import AdminGuard from '@/components/admin/AdminGuard'
import AdminNav from '@/components/admin/AdminNav'
import MobileNav from '@/components/admin/MobileNav'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div dir="rtl" className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <MobileNav />
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              س
            </span>
            <span className="font-serif text-xl">سالِكس</span>
          </div>

          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full px-2 py-1 hover:bg-accent">
              <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-bold">م</span>
              <span className="hidden text-sm sm:block">مشرف النظام</span>
            </summary>
            <div className="absolute left-0 top-11 min-w-44 rounded-2xl border border-border bg-card p-2 text-right shadow-soft">
              {/* TODO: ربط تسجيل الخروج مع Supabase */}
              <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent">
                <LogOut aria-hidden="true" className="size-4 shrink-0" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </details>
        </header>

        <div className="flex">
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 self-start overflow-y-auto border-e border-border bg-sidebar p-4 lg:block">
            <AdminNav />
          </aside>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AdminGuard>
  )
}
