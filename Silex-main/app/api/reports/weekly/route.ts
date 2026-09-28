import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import ExcelJS from "exceljs"

function clientForUser(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "غير مصرح" }, { status: 401 })

  const supabase = clientForUser(token)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 })

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: orders }, { data: products }, { data: debts }, { data: profile }] = await Promise.all([
    supabase.from("orders").select("*").eq("merchant_id", user.id).gte("created_at", weekAgo).order("created_at", { ascending: false }),
    supabase.from("products").select("*").eq("merchant_id", user.id).order("title"),
    supabase.from("debts").select("*").eq("merchant_id", user.id),
    supabase.from("profiles").select("store_name, full_name, currency").eq("id", user.id).single(),
  ])

  const orderIds = (orders ?? []).map((o) => o.id)
  const { data: orderItems } = orderIds.length
    ? await supabase.from("order_items").select("*").in("order_id", orderIds)
    : { data: [] }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "لوح التاجر"

  const summarySheet = workbook.addWorksheet("الملخص", { views: [{ rightToLeft: true }] })
  const totalSales = (orders ?? []).reduce((s, o) => s + Number(o.total_amount ?? 0), 0)
  const inventoryValue = (products ?? []).reduce((s, p) => s + Number(p.price ?? 0) * Number(p.stock ?? 0), 0)
  const outstandingDebts = (debts ?? []).filter((d) => d.status !== "تم الاستلام").reduce((s, d) => s + (Number(d.total_amount ?? 0) - Number(d.paid_amount ?? 0)), 0)

  summarySheet.addRow(["تقرير أسبوعي", profile?.store_name || profile?.full_name || ""])
  summarySheet.addRow(["الفترة", `${new Date(weekAgo).toLocaleDateString("ar-IQ")} - ${new Date().toLocaleDateString("ar-IQ")}`])
  summarySheet.addRow([])
  summarySheet.addRow(["إجمالي المبيعات (٧ أيام)", totalSales])
  summarySheet.addRow(["عدد الفواتير", (orders ?? []).length])
  summarySheet.addRow(["قيمة المخزون الحالية", inventoryValue])
  summarySheet.addRow(["منتجات نفدت", (products ?? []).filter((p) => p.stock === 0).length])
  summarySheet.addRow(["منتجات قاربت النفاد", (products ?? []).filter((p) => p.stock > 0 && p.stock <= 15).length])
  summarySheet.addRow(["ديون مستحقة", outstandingDebts])
  summarySheet.getColumn(1).width = 30
  summarySheet.getColumn(2).width = 25
  summarySheet.getRow(1).font = { bold: true, size: 14 }

  const ordersSheet = workbook.addWorksheet("الفواتير", { views: [{ rightToLeft: true }] })
  ordersSheet.addRow(["التاريخ", "الزبون", "عدد الأصناف", "المبلغ", "الحالة"])
  ordersSheet.getRow(1).font = { bold: true }
  ;(orders ?? []).forEach((o) => {
    ordersSheet.addRow([
      new Date(o.created_at).toLocaleDateString("ar-IQ"),
      o.customer_name,
      o.items_count,
      Number(o.total_amount ?? 0),
      o.status,
    ])
  })
  ordersSheet.columns.forEach((c) => (c.width = 20))

  const productsSheet = workbook.addWorksheet("المخزون", { views: [{ rightToLeft: true }] })
  productsSheet.addRow(["المنتج", "الصنف", "الكمية", "السعر", "قيمة المخزون", "الحالة"])
  productsSheet.getRow(1).font = { bold: true }
  ;(products ?? []).forEach((p) => {
    productsSheet.addRow([
      p.title,
      p.category ?? "غير مصنف",
      p.stock,
      Number(p.price ?? 0),
      Number(p.price ?? 0) * Number(p.stock ?? 0),
      p.stock === 0 ? "نفاذ" : p.stock <= 15 ? "قارب على النفاد" : "متوفر",
    ])
  })
  productsSheet.columns.forEach((c) => (c.width = 20))

  const topProductsMap = new Map<string, { qty: number; total: number }>()
  ;(orderItems ?? []).forEach((item: any) => {
    const entry = topProductsMap.get(item.product_name) ?? { qty: 0, total: 0 }
    entry.qty += Number(item.quantity ?? 0)
    entry.total += Number(item.line_total ?? 0)
    topProductsMap.set(item.product_name, entry)
  })
  const topProductsSheet = workbook.addWorksheet("الأكثر مبيعًا", { views: [{ rightToLeft: true }] })
  topProductsSheet.addRow(["المنتج", "الكمية المباعة", "إجمالي المبيعات"])
  topProductsSheet.getRow(1).font = { bold: true }
  Array.from(topProductsMap.entries())
    .sort((a, b) => b[1].qty - a[1].qty)
    .forEach(([name, data]) => {
      topProductsSheet.addRow([name, data.qty, data.total])
    })
  topProductsSheet.columns.forEach((c) => (c.width = 25))

  const debtsSheet = workbook.addWorksheet("الديون", { views: [{ rightToLeft: true }] })
  debtsSheet.addRow(["الزبون", "الهاتف", "المبلغ المتبقي", "تاريخ الاستحقاق", "الحالة"])
  debtsSheet.getRow(1).font = { bold: true }
  ;(debts ?? []).forEach((d) => {
    debtsSheet.addRow([
      d.customer_name,
      d.phone ?? "",
      Number(d.total_amount ?? 0) - Number(d.paid_amount ?? 0),
      d.due_date ?? "",
      d.status,
    ])
  })
  debtsSheet.columns.forEach((c) => (c.width = 20))

  const buffer = await workbook.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="taqrir-usbuei.xlsx"`,
    },
  })
}
