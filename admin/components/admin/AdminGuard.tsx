import type { ReactNode } from 'react'

export default function AdminGuard({ children }: { children: ReactNode }) {
  // TODO: تحقق من دور المستخدم عبر Supabase قبل حماية المسارات.
  return children
}
