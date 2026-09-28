import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ProjectAnalytics } from "@/components/dashboard/project-analytics"
import { DebtsSummary } from "@/components/dashboard/debts-summary"
import { TopProducts } from "@/components/dashboard/top-products"
import { LowStock } from "@/components/dashboard/low-stock"
import { RecentOrders } from "@/components/dashboard/recent-orders"
import { QuickActions } from "@/components/dashboard/quick-actions"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 md:p-4 lg:p-5 lg:ms-64">
        <Header
          title="لوحة تحكم التاجر"
          description="تابع مبيعاتك وديونك ومخزونك في لمحة واحدة."
          actions={<QuickActions />}
        />

        <div className="mt-4 md:mt-5 space-y-3 md:space-y-4">
          <StatsCards />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="lg:col-span-2 space-y-3 md:space-y-4">
              <ProjectAnalytics />
              <TopProducts />
            </div>

            <div className="space-y-3 md:space-y-4">
              <DebtsSummary />
              <LowStock />
            </div>
          </div>

          <RecentOrders />
        </div>
      </main>
    </div>
  )
}
