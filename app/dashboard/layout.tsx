import type { ReactNode } from "react"
import { StoreProvider } from "@/components/store/store-context"
import { Toaster } from "sonner"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <div dir="rtl">
        {children}
        <Toaster position="top-center" richColors />
      </div>
    </StoreProvider>
  )
}
