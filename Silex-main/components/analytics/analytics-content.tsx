"use client"

import { useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { FileSpreadsheet, FileText } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Boxes, PackageX, TrendingDown, Wallet } from "lucide-react"
import { useStore, formatIQD, toArabicNumber } from "@/components/store/store-context"

const palette = ["#16A34A", "#22C55E", "#4ADE80", "#DC2626", "#F87171", "#FB923C"]

function ChartTooltip({ active, payload, suffix }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-lg">
        <p className="font-bold">
          {payload[0].value} {suffix}
        </p>
        <p className="text-[10px] opacity-80">{payload[0].payload.category || payload[0].payload.name}</p>
      </div>
    )
  }
  return null
}

export function AnalyticsContent() {
  const { products, debtors, isLoading, dataError } = useStore()

  const kpis = useMemo(() => {
    const inventoryValue = products.reduce((sum, p) => sum + p.stock * p.price, 0)
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 15).length
    const outOfStockCount = products.filter((p) => p.stock === 0).length
    const outstandingDebts = debtors.filter((d) => !d.paid).reduce((sum, d) => sum + d.amount, 0)
    return [
      { title: "قيمة المخزون", value: formatIQD(inventoryValue), icon: Boxes },
      { title: "منتجات قاربت النفاد", value: toArabicNumber(lowStockCount), icon: TrendingDown, accent: "text-red-600" },
      { title: "نفدت من المخزن", value: toArabicNumber(outOfStockCount), icon: PackageX, accent: "text-red-600" },
      { title: "ديون مستحقة", value: formatIQD(outstandingDebts), icon: Wallet, accent: "text-red-600" },
    ]
  }, [products, debtors])

  const categoryShare = useMemo(() => {
    const byCategory = new Map<string, number>()
    products.forEach((p) => {
      byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + p.stock * p.price)
    })
    const total = Array.from(byCategory.values()).reduce((a, b) => a + b, 0)
    return Array.from(byCategory.entries())
      .map(([category, value], i) => ({
        category,
        value: total > 0 ? Math.round((value / total) * 100) : 0,
        color: palette[i % palette.length],
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [products])

  const stockByCategory = useMemo(() => {
    const byCategory = new Map<string, number>()
    products.forEach((p) => {
      byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + p.stock)
    })
    return Array.from(byCategory.entries())
      .map(([category, stock]) => ({
        category,
        stock,
        color: stock === 0 ? "#DC2626" : stock <= 15 ? "#F97316" : "#16A34A",
      }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 6)
  }, [products])

  const [downloading, setDownloading] = useState(false)

  async function downloadWeeklyReport() {
    setDownloading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error("لا توجد جلسة دخول")
      const response = await fetch("/api/reports/weekly", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error("تعذر إنشاء التقرير")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `تقرير-أسبوعي-${new Date().toLocaleDateString("ar-IQ")}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
    } finally {
      setDownloading(false)
    }
  }

  const [downloadingPdf, setDownloadingPdf] = useState(false)

  async function downloadWeeklyPdf() {
    setDownloadingPdf(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error("لا توجد جلسة دخول")
      const response = await fetch("/api/reports/weekly-pdf", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error("تعذر إنشاء التقرير")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `weekly-report-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <>
      <Header
        title="محلل بيانات المنتجات"
        description="نظرة على قيمة المخزون وتوزيع الأصناف والديون بناءً على بياناتك الفعلية."
      />

      <div className="mt-4 md:mt-5 space-y-4">
        {dataError && <p className="text-sm text-red-600">{dataError}</p>}
        {isLoading && <p className="text-sm text-muted">جار تحميل البيانات...</p>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <Card key={kpi.title} className="p-4 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted">{kpi.title}</span>
                <kpi.icon className={`w-4 h-4 ${kpi.accent ?? "text-ink"}`} />
              </div>
              <p className={`text-xl font-bold ${kpi.accent ?? "text-ink"}`}>{kpi.value}</p>
            </Card>
          ))}
        </div>

        {products.length === 0 && !isLoading ? (
          <Card className="p-12 text-center text-sm text-muted">
            لا توجد منتجات بعد لعرض تحليلات عليها. أضف منتجات من صفحة المخازن أولاً.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-4 md:p-6 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-ink">الكمية حسب الصنف</h2>
                <Badge variant="secondary" className="font-normal">
                  وحدة
                </Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockByCategory} margin={{ top: 10, right: -20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ECECE8" />
                    <XAxis
                      dataKey="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8B8B8B", fontSize: 11 }}
                    />
                    <YAxis orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#8B8B8B", fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip suffix="وحدة" />} cursor={{ fill: "transparent" }} />
                    <Bar dataKey="stock" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {stockByCategory.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 md:p-6 transition-all duration-300 hover:shadow-lg">
              <h2 className="text-lg font-semibold text-ink mb-4">قيمة المخزون حسب الصنف</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryShare}
                      dataKey="value"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryShare.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip suffix="٪" />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-3">
                {categoryShare.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-muted">{cat.category}</span>
                    </div>
                    <span className="font-semibold text-ink">{cat.value}٪</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        <Card className="p-4 md:p-6 text-sm text-muted">
          تحليلات المبيعات (الأكثر رواجًا، الاتجاه الشهري) ستُحسب هنا تلقائيًا من فواتيرك الحقيقية بمجرد تسجيل مبيعات كافية.
        </Card>

        <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-ink">التقرير الأسبوعي</h3>
            <p className="text-sm text-muted mt-0.5">حمّل ملخصًا كاملاً لمبيعاتك ومخزونك وديونك بآخر ٧ أيام.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={downloadWeeklyReport}
              disabled={downloading}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
            >
              <FileSpreadsheet size={16} />
              {downloading ? "جارٍ..." : "Excel"}
            </button>
            <button
              onClick={downloadWeeklyPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-2 bg-white text-ink border border-line rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors hover:bg-chip"
            >
              <FileText size={16} />
              {downloadingPdf ? "جارٍ..." : "PDF"}
            </button>
          </div>
        </Card>
      </div>
    </>
  )
}
