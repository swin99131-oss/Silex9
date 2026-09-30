'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import AdminNav from './AdminNav'

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="فتح القائمة"
        aria-expanded={open}
        className="flex size-10 items-center justify-center rounded-full border border-border bg-card transition hover:bg-chip"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar p-4 shadow-float transition-[transform,visibility] duration-200 ${
          open ? 'translate-x-0' : 'invisible translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-xl">سالِكس</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="إغلاق القائمة"
            className="flex size-9 items-center justify-center rounded-full hover:bg-sidebar-accent"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>
      </aside>
    </div>
  )
}
