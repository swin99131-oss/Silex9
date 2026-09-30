'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import DashboardNav from './DashboardNav'

export default function DashboardMobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

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
      {open && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="إغلاق" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-72 bg-sidebar p-4 shadow-soft">
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
          </div>
        </div>
      )}
    </div>
  )
}
