import type { ReactNode } from "react"
import { StoreProvider } from "@/components/store/store-context"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <div dir="rtl">
        {children}
      </div>
    </StoreProvider>
  )
}
