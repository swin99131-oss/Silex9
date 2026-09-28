import { Sidebar } from "@/components/dashboard/sidebar"
import { DebtsContent } from "@/components/debts/debts-content"

export default function DebtsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 p-3 md:p-4 lg:p-5 lg:ms-64">
        <DebtsContent />
      </main>
    </div>
  )
}
