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
import { Wallet, ArrowDownCircle, ArrowUpCircle, SearchX } from "lucide-react"
import { useStore, formatIQD, normalizeDigits } from "@/components/store/store-context"
import { toast } from "sonner"

export function DebtsContent() {
  const { debtors, addDebtor, collectDebt, query, isLoading, dataError } = useStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")

  const summary = useMemo(() => {
    const active = debtors.filter((d) => !d.paid)
    const total = active.reduce((s, d) => s + d.amount, 0)
    const overdue = active.filter((d) => d.overdue).reduce((s, d) => s + d.amount, 0)
    const collected = debtors.filter((d) => d.paid).reduce((s, d) => s + d.amount, 0)
    return [
      { title: "إجمالي الديون", value: formatIQD(total), icon: Wallet, iconClass: "bg-orange-100 text-orange-700" },
      { title: "متأخر السداد", value: formatIQD(overdue), icon: ArrowUpCircle, iconClass: "bg-red-100 text-red-700" },
      { title: "تم تحصيله", value: formatIQD(collected), icon: ArrowDownCircle, iconClass: "bg-emerald-100 text-emerald-700" },
    ]
  }, [debtors])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return debtors
    return debtors.filter((d) => d.name.includes(q) || d.phone.includes(q))
  }, [debtors, query])

  async function handleAdd() {
    const value = Number(normalizeDigits(amount))
    if (!name.trim() || !value || value <= 0) {
      toast.error("يرجى إدخال اسم الزبون ومبلغ صحيح")
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    const due = date || today
    try {
      await addDebtor({
        name: name.trim(),
        phone: phone.trim() || "—",
        amount: value,
        date: due,
        overdue: due < today,
      })
      toast.success(`تمت إضافة دين ${name.trim()} بنجاح`)
      setName("")
      setPhone("")
      setAmount("")
      setDate("")
      setOpen(false)
    } catch (error) {
      toast.error((error as any)?.message || "تعذر إضافة الدين")
    }
  }

  async function handleCollect(id: string, debtorName: string) {
    try {
      await collectDebt(id)
      toast.success(`تم استلام دين ${debtorName}`)
    } catch (error) {
      toast.error((error as any)?.message || "تعذر تحديث الدين")
    }
  }

  const field = "h-11 rounded-xl"

  return (
    <div className="flex flex-col gap-6">
      <Header
        title="دفتر الديون"
        description="سجّل ديون الزبائن وتابع تواريخ الاستحقاق والتحصيل."
        actions={
          <Button onClick={() => setOpen(true)} className="h-11 rounded-full px-6">
            + إضافة دين جديد
          </Button>
        }
      />

      {dataError && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{dataError}</p>}
      {isLoading && <p className="text-sm text-muted">جار تحميل الديون...</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.map((item) => (
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
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">قائمة الزبائن المدينين</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-chip">
              <SearchX aria-hidden="true" className="size-5 text-muted" />
            </span>
            <p className="font-medium">لا توجد نتائج</p>
            <p className="text-sm text-muted">لم يتم العثور على زبائن مطابقين لبحثك.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-5 py-3 font-medium">الزبون</th>
                  <th className="px-5 py-3 font-medium">الهاتف</th>
                  <th className="px-5 py-3 font-medium">المبلغ</th>
                  <th className="px-5 py-3 font-medium">تاريخ الاستحقاق</th>
                  <th className="px-5 py-3 font-medium">الحالة</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((debtor) => (
                  <tr key={debtor.id} className="hover:bg-chip/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                          {debtor.name.slice(0, 2)}
                        </span>
                        <span className="font-medium">{debtor.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted" dir="ltr">{debtor.phone}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold">{formatIQD(debtor.amount)}</td>
                    <td className="px-5 py-4 text-muted">{debtor.date}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] ${
                          debtor.paid
                            ? "bg-emerald-100 text-emerald-700"
                            : debtor.overdue
                              ? "bg-red-100 text-red-700"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {debtor.paid ? "تم الاستلام" : debtor.overdue ? "متأخر" : "ضمن المدة"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={debtor.paid}
                        onClick={() => handleCollect(debtor.id, debtor.name)}
                        className="h-8 rounded-full bg-transparent px-4 text-xs disabled:opacity-40"
                      >
                        استلام
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>إضافة دين جديد</DialogTitle>
            <DialogDescription>أدخل بيانات الزبون والمبلغ المستحق.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="debt-name">اسم الزبون</Label>
              <Input id="debt-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: حسن علي" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-phone">رقم الهاتف</Label>
              <Input
                id="debt-phone"
                className={`${field} text-right`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="٠٧٧٠ ١٢٣ ٤٥٦"
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="debt-amount">المبلغ (د.ع)</Label>
                <Input
                  id="debt-amount"
                  type="text"
                  inputMode="decimal"
                  className={`${field} text-right`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-date">تاريخ الاستحقاق</Label>
                <Input id="debt-date" type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="h-11 rounded-full bg-transparent px-6">
              إلغاء
            </Button>
            <Button onClick={handleAdd} className="h-11 rounded-full px-6">
              حفظ الدين
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
