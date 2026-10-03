import {
  BarChart3,
  BadgeCheck,
  BookOpen,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  Settings,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { label: string; href: string; icon: LucideIcon }

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
  { label: 'دفتر الديون', href: '/dashboard/debts', icon: BookOpen },
  { label: 'الطلبات', href: '/dashboard/orders', icon: ClipboardList },
  { label: 'توثيق المتجر', href: '/dashboard/verification', icon: BadgeCheck },
  { label: 'المخازن', href: '/dashboard/inventory', icon: Warehouse },
  { label: 'تحليل المنتجات', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'الإعلانات', href: '/dashboard/ads', icon: Megaphone },
  { label: 'الإعدادات', href: '/dashboard/settings', icon: Settings },
  { label: 'المساعدة', href: '/dashboard/help', icon: HelpCircle },
]

export function isNavActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
}
