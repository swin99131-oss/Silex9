"use client"

import { useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Boxes, PackageX, TrendingDown, Wallet, FileSpreadsheet, FileText } from "lucide-react"
import { toast } from "sonner"
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
import { Header } from "@/components/dashboard/header"
import { useStore, formatIQD, toArabicNumber } from "@/components/store/store-context"

const palette = ["#16A34A", "#22C55E", "#4ADE80", "#DC2626", "#F87171", "#FB923C"]

function ChartTooltip({ active, payload, suffix }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-lg">
        <p className="font-bold">
          {payload[0].value} {suffix}
        </p>
        <p className="text-[10px] opacity-80">{payload[0].payload.category || payload[0].payload.name}</p>
      </div>
    )
  }
  return null
}

async function downloadReport(path: string, filename: string, setBusy: (v: boolean) => void) {
  setBusy(true)
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error("no session")
    const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error("request failed")
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error(error)
    toast.error("تعذر إنشاء التقرير")
  } finally {
    setBusy(false)
  }
}

export function AnalyticsContent() {
  const { products, debtors, isLoading, dataError } = useStore()
  const [downloading, setDownloading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const kpis = useMemo(() => {
    const inventoryValue = products.reduce((sum, p) => sum + p.stock * p.price, 0)
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 15).length
    const outOfStockCount = products.filter((p) => p.stock === 0).length
    const outstandingDebts = debtors.filter((d) => !d.paid).reduce((sum, d) => sum + d.amount, 0)
    return [
      { title: "قيمة المخزون", value: formatIQD(inventoryValue), icon: Boxes, iconClass: "bg-emerald-100 text-emerald-700" },
      { title: "منتجات قاربت النفاد", value: toArabicNumber(lowStockCount), icon: TrendingDown, iconClass: "bg-orange-100 text-orange-700" },
      { title: "نفدت من المخزن", value: toArabicNumber(outOfStockCount), icon: PackageX, iconClass: "bg-red-100 text-red-700" },
      { title: "ديون مستحقة", value: formatIQD(outstandingDebts), icon: Wallet, iconClass: "bg-orange-100 text-orange-700" },
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

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      <Header
        title="محلل بيانات المنتجات"
        description="نظرة على قيمة المخزون وتوزيع الأصناف والديون بناءً على بياناتك الفعلية."
        search={false}
      />

      {dataError && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{dataError}</p>}
      {isLoading && <p className="text-sm text-muted">جار تحميل البيانات...</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <article key={kpi.title} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted">{kpi.title}</p>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${kpi.iconClass}`}>
                <kpi.icon aria-hidden="true" className="size-4" />
              </span>
            </div>
            <p className="mt-4 truncate text-2xl font-semibold tracking-tight">{kpi.value}</p>
          </article>
        ))}
      </div>

      {products.length === 0 && !isLoading ? (
        <section className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
          لا توجد منتجات بعد لعرض تحليلات عليها. أضف منتجات من صفحة المخازن أولاً.
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">الكمية حسب الصنف</h2>
              <span className="rounded-full bg-chip px-3 py-1 text-[11px] text-muted">وحدة</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockByCategory} margin={{ top: 10, right: 50, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECECE8" />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: "#8B8B8B", fontSize: 11 }} />
                  <YAxis orientation="right" width={40} tickMargin={10} axisLine={false} tickLine={false} tick={{ fill: "#8B8B8B", fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip suffix="وحدة" />} cursor={{ fill: "transparent" }} />
                  <Bar dataKey="stock" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {stockByCategory.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">قيمة المخزون حسب الصنف</h2>
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
            <ul className="mt-3 space-y-2">
              {categoryShare.map((cat) => (
                <li key={cat.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-muted">{cat.category}</span>
                  </div>
                  <span className="font-semibold">{cat.value}٪</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted">
        تحليلات المبيعات (الأكثر رواجًا، الاتجاه الشهري) ستُحسب هنا تلقائيًا من فواتيرك الحقيقية بمجرد تسجيل مبيعات كافية.
      </section>

      <section className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-semibold">التقرير الأسبوعي</h3>
          <p className="mt-1 text-sm text-muted">حمّل ملخصًا كاملاً لمبيعاتك ومخزونك وديونك بآخر ٧ أيام.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => downloadReport("/api/reports/weekly", `weekly-report-${today}.xlsx`, setDownloading)}
            disabled={downloading}
            className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <FileSpreadsheet aria-hidden="true" size={16} />
            {downloading ? "جارٍ..." : "Excel"}
          </button>
          <button
            type="button"
            onClick={() => downloadReport("/api/reports/weekly-pdf", `weekly-report-${today}.pdf`, setDownloadingPdf)}
            disabled={downloadingPdf}
            className="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-chip disabled:opacity-50"
          >
            <FileText aria-hidden="true" size={16} />
            {downloadingPdf ? "جارٍ..." : "PDF"}
          </button>
        </div>
      </section>
    </div>
  )
}
