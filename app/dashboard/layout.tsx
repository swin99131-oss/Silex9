import type { ReactNode } from 'react'
import Link from 'next/link'
import { Store } from 'lucide-react'
import { StoreProvider } from '@/components/store/store-context'
import DashboardGuard from '@/components/dashboard/DashboardGuard'
import DashboardNav from '@/components/dashboard/DashboardNav'
import DashboardMobileNav from '@/components/dashboard/DashboardMobileNav'
import HeaderActions from '@/components/dashboard/HeaderActions'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <DashboardGuard>
        <div dir="rtl" className="min-h-screen bg-background text-foreground">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-8">
            <div className="flex items-center gap-3">
              <DashboardMobileNav />
              <Link href="/dashboard" className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Store aria-hidden="true" className="size-4" />
                </span>
                <span className="font-display text-xl">متجري</span>
              </Link>
            </div>
            <HeaderActions />
          </header>

          <div className="flex">
            <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 self-start overflow-y-auto border-e border-border bg-sidebar p-4 lg:block">
              <DashboardNav />
            </aside>
            <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
      </DashboardGuard>
    </StoreProvider>
  )
}
