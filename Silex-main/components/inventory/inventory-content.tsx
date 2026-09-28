"use client"

import { useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Package, PackageX, Boxes, TrendingDown, SearchX, Plus } from "lucide-react"
import { useStore, formatIQD, toArabicNumber, normalizeDigits, type Product } from "@/components/store/store-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

function statusOf(p: Product) {
  if (p.stock === 0) return { label: "نفاذ", className: "bg-red-100 text-red-700 border-red-200" }
  if (p.stock <= 15) return { label: "منخفض", className: "bg-orange-100 text-orange-700 border-orange-200" }
  return { label: "متوفر", className: "bg-emerald-100 text-emerald-700 border-emerald-200" }
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

  const stats = useMemo(() => {
    const total = products.length
    const low = products.filter((p) => p.stock > 0 && p.stock <= 15).length
    const out = products.filter((p) => p.stock === 0).length
    const value = products.reduce((s, p) => s + p.stock * p.price, 0)
    return [
      { title: "إجمالي المنتجات", value: toArabicNumber(total), icon: Boxes, accent: "text-emerald-700", bg: "bg-emerald-50" },
      { title: "منتجات قاربت النفاد", value: toArabicNumber(low), icon: TrendingDown, accent: "text-orange-700", bg: "bg-orange-50" },
      { title: "نفدت من المخزن", value: toArabicNumber(out), icon: PackageX, accent: "text-red-700", bg: "bg-red-50" },
      { title: "قيمة المخزون", value: formatIQD(value), icon: Package, accent: "text-emerald-700", bg: "bg-emerald-50" },
    ]
  }, [products])

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
    try {
      let imageUrl: string | null = null
      if (image) {
        if (!supabase) throw new Error("لم يتم إعداد اتصال Supabase")
        const filePath = `${crypto.randomUUID()}-${image.name}`
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

  return (
    <>
      <Header
        title="المخازن"
        description="تابع كميات المنتجات وقيمة المخزون والأصناف القريبة من النفاد."
        actions={
          <Button
            onClick={() => setOpen(true)}
            className="w-full sm:w-auto h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30"
          >
            + إضافة منتج
          </Button>
        }
      />

      <div className="mt-4 md:mt-5 space-y-4">
        {dataError && <p className="text-sm text-destructive">{dataError}</p>}
        {isLoading && <p className="text-sm text-muted-foreground">جار تحميل المنتجات...</p>}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((item) => (
            <Card key={item.title} className={`p-4 rounded-2xl border-0 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${item.bg ?? "bg-white"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{item.title}</span>
                <item.icon className={`w-4 h-4 ${item.accent ?? "text-primary"}`} />
              </div>
              <p className={`text-xl font-bold ${item.accent ?? "text-foreground"}`}>{item.value}</p>
            </Card>
          ))}
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">قائمة المنتجات</h2>
            <div className="flex flex-wrap gap-1.5">
              {["الكل", ...Array.from(new Set(products.map((p) => p.category))).slice(0, 3)].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 ${
                    filter === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX className="w-6 h-6" />
                </EmptyMedia>
                <EmptyTitle>لا توجد منتجات</EmptyTitle>
                <EmptyDescription>لم يتم العثور على منتجات مطابقة.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">الصنف</TableHead>
                    <TableHead className="text-right">المخزون</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((product) => {
                    const status = statusOf(product)
                    return (
                      <TableRow key={product.id} className="hover:bg-secondary/40 transition-colors">
                        <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{product.category}</TableCell>
                        <TableCell className="w-40">
                          <div className="flex items-center gap-2">
                            <Progress value={(product.stock / product.max) * 100} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-6 text-left">
                              {toArabicNumber(product.stock)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground whitespace-nowrap">
                          {formatIQD(product.price)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`font-normal border ${status.className}`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestock(product.id, product.name)}
                            className="h-7 text-xs bg-transparent gap-1"
                          >
                            <Plus className="w-3 h-3" /> استلام
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>إضافة منتج جديد</DialogTitle>
            <DialogDescription>أدخل تفاصيل المنتج وكميته وسعره.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="prod-name">اسم المنتج</Label>
              <Input
                id="prod-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: رز عنبر ٥ كغم"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prod-category">الصنف</Label>
              <Input
                id="prod-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="اكتب أي تصنيف يناسب منتجك"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prod-stock">الكمية</Label>
                <Input
                  id="prod-stock"
                  type="text" inputMode="decimal"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="50"
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-price">السعر (د.ع)</Label>
                <Input
                  id="prod-price"
                  type="text" inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="3000"
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prod-image">صورة المنتج</Label>
              <Input id="prod-image" type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} className="bg-transparent">
              إلغاء
            </Button>
            <Button onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
              حفظ المنتج
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
