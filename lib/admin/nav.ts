import {
  BadgeCheck,
  ClipboardList,
  CreditCard,
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
// الإشعارات مؤجلة: /admin/notifications + أيقونة Bell
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'نظرة عامة', href: '/admin', icon: LayoutDashboard },
  { label: 'الشكاوى والبلاغات', href: '/admin/reports', icon: Flag },
  { label: 'المحادثات', href: '/admin/chats', icon: MessageSquare },
  { label: 'الإعلانات', href: '/admin/campaigns', icon: Megaphone },
  { label: 'أسعار الإعلانات', href: '/admin/ad-pricing', icon: CreditCard },
  { label: 'المستخدمون', href: '/admin/users', icon: Users },
  { label: 'طلبات التوثيق', href: '/admin/verifications', icon: BadgeCheck },
  { label: 'التجار', href: '/admin/merchants', icon: Store },
  { label: 'المنتجات', href: '/admin/products', icon: Package },
  { label: 'الطلبات', href: '/admin/orders', icon: ShoppingCart },
  { label: 'المشرفون والصلاحيات', href: '/admin/staff', icon: UserCog },
  { label: 'سجل العمليات', href: '/admin/audit-log', icon: ClipboardList },
  { label: 'الإعدادات', href: '/admin/settings', icon: Settings },
]

export function isNavActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === href : pathname.startsWith(href)
}
