"use client"

import { useState } from "react"
import Link from "next/link"
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
import { useStore } from "@/components/store/store-context"
import { toast } from "sonner"

export function QuickActions() {
  const { addOrder } = useStore()
  const [open, setOpen] = useState(false)
  const [customer, setCustomer] = useState("")
  const [items, setItems] = useState("")
  const [total, setTotal] = useState("")

  function handleCreate() {
    const itemsNum = Number(items)
    const totalNum = Number(total)
    if (!customer.trim() || itemsNum <= 0 || totalNum <= 0) {
      toast.error("يرجى إدخال اسم الزبون وعدد الأصناف والمبلغ")
      return
    }
    addOrder({ customer: customer.trim(), items: itemsNum, total: totalNum, status: "قيد التجهيز" })
    toast.success(`تم إنشاء فاتورة لـ ${customer.trim()}`)
    setCustomer("")
    setItems("")
    setTotal("")
    setOpen(false)
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:scale-105"
      >
        + فاتورة جديدة
      </Button>
      <Button
        asChild
        variant="outline"
        className="w-full sm:w-auto h-9 text-sm transition-all duration-300 hover:shadow-md hover:scale-105 bg-transparent"
      >
        <Link href="/dashboard/inventory">إضافة منتج</Link>
      </Button>
      <Button
        asChild
        variant="outline"
        className="w-full sm:w-auto h-9 text-sm transition-all duration-300 hover:shadow-md hover:scale-105 bg-transparent"
      >
        <Link href="/dashboard/ads">إعلان جديد</Link>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>فاتورة جديدة</DialogTitle>
            <DialogDescription>سجّل طلباً جديداً لأحد الزبائن.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="order-customer">اسم الزبون</Label>
              <Input
                id="order-customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="مثال: حسن علي"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="order-items">عدد الأصناف</Label>
                <Input
                  id="order-items"
                  type="text" inputMode="decimal"
                  value={items}
                  onChange={(e) => setItems(e.target.value)}
                  placeholder="3"
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order-total">المبلغ (د.ع)</Label>
                <Input
                  id="order-total"
                  type="text" inputMode="decimal"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="15000"
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} className="bg-transparent">
              إلغاء
            </Button>
            <Button onClick={handleCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
              حفظ الفاتورة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
