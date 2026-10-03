'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isNavActive } from '@/lib/admin/nav'
import { canOpen, useMyPerms } from '@/lib/admin/perms'

export default function AdminNav() {
  const pathname = usePathname()
  const my = useMyPerms()
  return (
    <nav aria-label="القائمة الرئيسية" className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => canOpen(my, item.href)).map(({ label, href, icon: Icon }) => {
        const active = isNavActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm transition ${
              active ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`}
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
