import {
  AlertTriangle,
  Bell,
  ClipboardList,
  Flag,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Store,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { label: string; href: string; icon: LucideIcon }

// لإضافة قسم جديد: أضف سطراً هنا + مجلد صفحة في app/admin/<name>/page.tsx
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'نظرة عامة', href: '/admin', icon: LayoutDashboard },
  { label: 'الشكاوى والبلاغات', href: '/admin/reports', icon: Flag },
  { label: 'المحادثات', href: '/admin/chats', icon: MessageSquare },
  { label: 'الإعلانات', href: '/admin/announcements', icon: Megaphone },
  { label: 'المستخدمون', href: '/admin/users', icon: Users },
  { label: 'التجار', href: '/admin/merchants', icon: Store },
  { label: 'المنتجات', href: '/admin/products', icon: Package },
  { label: 'الطلبات', href: '/admin/orders', icon: ShoppingCart },
  { label: 'الإشعارات', href: '/admin/notifications', icon: Bell },
  { label: 'المحتوى المسيء', href: '/admin/banned-content', icon: AlertTriangle },
  { label: 'المشرفون والصلاحيات', href: '/admin/staff', icon: UserCog },
  { label: 'سجل العمليات', href: '/admin/audit-log', icon: ClipboardList },
  { label: 'الإعدادات', href: '/admin/settings', icon: Settings },
]

export function isNavActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === href : pathname.startsWith(href)
}
