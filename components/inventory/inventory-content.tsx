"use client"

import { useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Package, PackageX, Boxes, TrendingDown, SearchX, Plus } from "lucide-react"
import { useStore, formatIQD, toArabicNumber, normalizeDigits, type Product } from "@/components/store/store-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

function statusOf(p: Product) {
  if (p.stock === 0) return { label: "نفاذ", chip: "bg-red-100 text-red-700", bar: "bg-red-500" }
  if (p.stock <= 15) return { label: "منخفض", chip: "bg-orange-100 text-orange-700", bar: "bg-orange-500" }
  return { label: "متوفر", chip: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" }
}

export function InventoryContent() {
  const { products, addProduct, restockProduct, getOrCreateCategory, query, isLoading, dataError } = useStore()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("الكل")
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [stock, setStock] = useState("")
  const [price, setPrice] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const stats = useMemo(() => {
    const total = products.length
    const low = products.filter((p) => p.stock > 0 && p.stock <= 15).length
    const out = products.filter((p) => p.stock === 0).length
    const value = products.reduce((s, p) => s + p.stock * p.price, 0)
    return [
      { title: "إجمالي المنتجات", value: toArabicNumber(total), icon: Boxes, iconClass: "bg-emerald-100 text-emerald-700" },
      { title: "منتجات قاربت النفاد", value: toArabicNumber(low), icon: TrendingDown, iconClass: "bg-orange-100 text-orange-700" },
      { title: "نفدت من المخزن", value: toArabicNumber(out), icon: PackageX, iconClass: "bg-red-100 text-red-700" },
      { title: "قيمة المخزون", value: formatIQD(value), icon: Package, iconClass: "bg-primary/10 text-primary" },
    ]
  }, [products])

  const categories = useMemo(
    () => ["الكل", ...Array.from(new Set(products.map((p) => p.category))).slice(0, 3)],
    [products],
  )

  const filtered = useMemo(() => {
    const q = query.trim()
    return products.filter((p) => {
      const matchesCat = filter === "الكل" || p.category === filter
      const matchesQuery = !q || p.name.includes(q) || p.category.includes(q)
      return matchesCat && matchesQuery
    })
  }, [products, filter, query])

  async function handleAdd() {
    const s = Number(normalizeDigits(stock))
    const pr = Number(normalizeDigits(price))
    if (!name.trim() || pr <= 0 || Number.isNaN(s) || s < 0) {
      toast.error("يرجى إدخال اسم المنتج وسعر وكمية صحيحة")
      return
    }
    if (!category.trim()) {
      toast.error("يرجى كتابة تصنيف للمنتج")
      return
    }
    setSaving(true)
    try {
      let imageUrl: string | null = null
      if (image) {
        if (!supabase) throw new Error("لم يتم إعداد اتصال Supabase")
        const ext = (image.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")
        const filePath = `${crypto.randomUUID()}.${ext || "jpg"}`
        const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, image)
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from("product-images").getPublicUrl(filePath)
        imageUrl = data.publicUrl
      }
      const categoryId = await getOrCreateCategory(category)
      await addProduct({ name: name.trim(), category: categoryId, stock: s, max: Math.max(100, s * 2), price: pr, imageUrl })
      toast.success(`تمت إضافة ${name.trim()} إلى المخزن`)
      setName("")
      setStock("")
      setPrice("")
      setImage(null)
      setCategory("")
      setOpen(false)
    } catch (error) {
      toast.error((error as any)?.message || "تعذر إضافة المنتج")
    } finally {
      setSaving(false)
    }
  }

  async function handleRestock(id: string, productName: string) {
    try {
      await restockProduct(id, 20)
      toast.success(`تم استلام ٢٠ وحدة من ${productName}`)
    } catch (error) {
      toast.error((error as any)?.message || "تعذر تحديث المخزون")
    }
  }

  const field = "h-11 rounded-xl"

  return (
    <div className="flex flex-col gap-6">
      <Header
        title="المخازن"
        description="تابع كميات المنتجات وقيمة المخزون والأصناف القريبة من النفاد."
        actions={
          <Button onClick={() => setOpen(true)} className="h-11 rounded-full px-6">
            + إضافة منتج
          </Button>
        }
      />

      {dataError && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{dataError}</p>}
      {isLoading && <p className="text-sm text-muted">جار تحميل المنتجات...</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((item) => (
          <article key={item.title} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted">{item.title}</p>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${item.iconClass}`}>
                <item.icon aria-hidden="true" className="size-4" />
              </span>
            </div>
            <p className="mt-4 truncate text-2xl font-semibold tracking-tight">{item.value}</p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col justify-between gap-3 border-b border-border p-5 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold">قائمة المنتجات</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`rounded-full border px-4 py-1.5 text-xs transition ${
                  filter === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted hover:border-foreground/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-chip">
              <SearchX aria-hidden="true" className="size-5 text-muted" />
            </span>
            <p className="font-medium">لا توجد منتجات</p>
            <p className="text-sm text-muted">لم يتم العثور على منتجات مطابقة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-5 py-3 font-medium">المنتج</th>
                  <th className="px-5 py-3 font-medium">الصنف</th>
                  <th className="px-5 py-3 font-medium">المخزون</th>
                  <th className="px-5 py-3 font-medium">السعر</th>
                  <th className="px-5 py-3 font-medium">الحالة</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((product) => {
                  const status = statusOf(product)
                  const pct = Math.min(100, Math.max(0, (product.stock / (product.max || 1)) * 100))
                  return (
                    <tr key={product.id} className="hover:bg-chip/50">
                      <td className="px-5 py-4 font-medium">{product.name}</td>
                      <td className="px-5 py-4 text-muted">{product.category}</td>
                      <td className="w-48 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-chip">
                            <span className={`block h-full rounded-full ${status.bar}`} style={{ width: `${pct}%` }} />
                          </span>
                          <span className="w-8 text-xs text-muted">{toArabicNumber(product.stock)}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold">{formatIQD(product.price)}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-[11px] ${status.chip}`}>{status.label}</span>
                      </td>
                      <td className="px-5 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestock(product.id, product.name)}
                          className="h-8 gap-1 rounded-full bg-transparent px-4 text-xs"
                        >
                          <Plus aria-hidden="true" className="size-3" /> استلام
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>إضافة منتج جديد</DialogTitle>
            <DialogDescription>أدخل تفاصيل المنتج وكميته وسعره.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="prod-name">اسم المنتج</Label>
              <Input id="prod-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: رز عنبر ٥ كغم" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-category">الصنف</Label>
              <Input id="prod-category" className={field} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="اكتب أي تصنيف يناسب منتجك" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prod-stock">الكمية</Label>
                <Input id="prod-stock" type="text" inputMode="decimal" className={`${field} text-right`} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="50" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-price">السعر (د.ع)</Label>
                <Input id="prod-price" type="text" inputMode="decimal" className={`${field} text-right`} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="3000" dir="ltr" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-image">صورة المنتج</Label>
              <Input id="prod-image" type="file" accept="image/*" className="h-11 rounded-xl" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="h-11 rounded-full bg-transparent px-6">
              إلغاء
            </Button>
            <Button onClick={handleAdd} disabled={saving} className="h-11 rounded-full px-6">
              {saving ? "جارٍ الحفظ..." : "حفظ المنتج"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
