import { Sidebar } from "@/components/dashboard/sidebar"
import { InventoryContent } from "@/components/inventory/inventory-content"

export default function InventoryPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 p-3 md:p-4 lg:p-5 lg:ms-64">
        <InventoryContent />
      </main>
    </div>
  )
}
