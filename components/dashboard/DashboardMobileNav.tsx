'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import DashboardNav from './DashboardNav'

export default function DashboardMobileNav() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="القائمة"
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-full hover:bg-chip"
      >
        <Menu className="size-5" />
      </button>
      {mounted &&
        open &&
        createPortal(
          <div dir="rtl" className="fixed inset-0 z-[100]">
            <button type="button" aria-label="إغلاق" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-card p-4 shadow-soft">
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  aria-label="إغلاق"
                  onClick={() => setOpen(false)}
                  className="flex size-9 items-center justify-center rounded-full hover:bg-chip"
                >
                  <X className="size-5" />
                </button>
              </div>
              <DashboardNav />
            </aside>
          </div>,
          document.body,
        )}
    </div>
  )
}
