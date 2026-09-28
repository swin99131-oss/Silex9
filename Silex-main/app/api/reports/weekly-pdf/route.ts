import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { amiriFontBase64 } from "@/lib/fonts/amiri-font"
const ArabicReshaper = require("arabic-reshaper")

function clientForUser(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

function ar(text: string) {
  const reshaped = ArabicReshaper.convertArabic(text)
  return reshaped.split("").reverse().join("")
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
    supabase.from("profiles").select("store_name, full_name").eq("id", user.id).single(),
  ])

  const totalSales = (orders ?? []).reduce((s, o) => s + Number(o.total_amount ?? 0), 0)
  const inventoryValue = (products ?? []).reduce((s, p) => s + Number(p.price ?? 0) * Number(p.stock ?? 0), 0)
  const outstandingDebts = (debts ?? []).filter((d) => d.status !== "تم الاستلام").reduce((s, d) => s + (Number(d.total_amount ?? 0) - Number(d.paid_amount ?? 0)), 0)
  const outOfStock = (products ?? []).filter((p) => p.stock === 0).length
  const lowStock = (products ?? []).filter((p) => p.stock > 0 && p.stock <= 15).length

  const doc = new jsPDF()
  doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64)
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal")
  doc.setFont("Amiri")
  ;(doc as any).setR2L(true)

  const storeName = profile?.store_name || profile?.full_name || "المتجر"
  const periodText = `${new Date(weekAgo).toLocaleDateString("en-GB")} - ${new Date().toLocaleDateString("en-GB")}`

  doc.setFontSize(18)
  doc.text(ar("تقرير أسبوعي"), 195, 18, { align: "right" })
  doc.setFontSize(12)
  doc.text(ar(storeName), 195, 26, { align: "right" })
  doc.setFontSize(9)
  doc.setFont("helvetica")
  doc.text(periodText, 195, 32, { align: "right" })
  doc.setFont("Amiri")

  autoTable(doc, {
    startY: 40,
    head: [[ar("القيمة"), ar("المؤشر")]],
    body: [
      [totalSales.toString(), ar("إجمالي المبيعات (٧ أيام)")],
      [(orders ?? []).length.toString(), ar("عدد الفواتير")],
      [inventoryValue.toString(), ar("قيمة المخزون الحالية")],
      [outOfStock.toString(), ar("منتجات نفدت")],
      [lowStock.toString(), ar("منتجات قاربت النفاد")],
      [outstandingDebts.toString(), ar("ديون مستحقة")],
    ],
    theme: "grid",
    headStyles: { fillColor: [17, 17, 17], font: "Amiri", fontStyle: "normal", halign: "right" },
    styles: { font: "Amiri", fontStyle: "normal", halign: "right" },
    columnStyles: { 0: { halign: "left" } },
  })

  const afterSummaryY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(13)
  doc.text(ar("الفواتير"), 195, afterSummaryY, { align: "right" })
  autoTable(doc, {
    startY: afterSummaryY + 4,
    head: [[ar("الحالة"), ar("المبلغ"), ar("عدد الأصناف"), ar("الزبون"), ar("التاريخ")]],
    body: (orders ?? []).map((o) => [
      ar(o.status),
      String(Number(o.total_amount ?? 0)),
      String(o.items_count),
      ar(o.customer_name),
      new Date(o.created_at).toLocaleDateString("en-GB"),
    ]),
    theme: "striped",
    headStyles: { fillColor: [17, 17, 17], font: "Amiri", fontStyle: "normal", halign: "right" },
    styles: { font: "Amiri", fontStyle: "normal", halign: "right" },
  })

  const afterOrdersY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(13)
  doc.text(ar("المخزون"), 195, afterOrdersY, { align: "right" })
  autoTable(doc, {
    startY: afterOrdersY + 4,
    head: [[ar("الحالة"), ar("السعر"), ar("الكمية"), ar("الصنف"), ar("المنتج")]],
    body: (products ?? []).map((p) => [
      p.stock === 0 ? ar("نفاذ") : p.stock <= 15 ? ar("قارب على النفاد") : ar("متوفر"),
      String(Number(p.price ?? 0)),
      String(p.stock),
      ar(p.category ?? "غير مصنف"),
      ar(p.title),
    ]),
    theme: "striped",
    headStyles: { fillColor: [17, 17, 17], font: "Amiri", fontStyle: "normal", halign: "right" },
    styles: { font: "Amiri", fontStyle: "normal", halign: "right" },
  })

  const afterProductsY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(13)
  doc.text(ar("الديون"), 195, afterProductsY, { align: "right" })
  autoTable(doc, {
    startY: afterProductsY + 4,
    head: [[ar("الحالة"), ar("تاريخ الاستحقاق"), ar("المبلغ المتبقي"), ar("الهاتف"), ar("الزبون")]],
    body: (debts ?? []).map((d) => [
      ar(d.status),
      d.due_date ?? "-",
      String(Number(d.total_amount ?? 0) - Number(d.paid_amount ?? 0)),
      d.phone ?? "-",
      ar(d.customer_name),
    ]),
    theme: "striped",
    headStyles: { fillColor: [17, 17, 17], font: "Amiri", fontStyle: "normal", halign: "right" },
    styles: { font: "Amiri", fontStyle: "normal", halign: "right" },
  })

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"))
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="taqrir-usbuei.pdf"`,
    },
  })
}
