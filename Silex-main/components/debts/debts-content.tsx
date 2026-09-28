"use client"

import { useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
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
    const dueSoon = active.filter((d) => d.overdue).reduce((s, d) => s + d.amount, 0)
    const collected = debtors.filter((d) => d.paid).reduce((s, d) => s + d.amount, 0)
    return [
      { title: "إجمالي الديون", value: formatIQD(total), icon: Wallet, accent: "text-orange-700", bg: "bg-orange-50" },
      { title: "متأخر السداد", value: formatIQD(dueSoon), icon: ArrowUpCircle, accent: "text-red-700", bg: "bg-red-50" },
      { title: "تم تحصيله", value: formatIQD(collected), icon: ArrowDownCircle, accent: "text-emerald-700", bg: "bg-emerald-50" },
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
    try {
      await addDebtor({
        name: name.trim(),
        phone: phone.trim() || "—",
        amount: value,
        date: date || new Date().toISOString().slice(0, 10),
        overdue: true,
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

  return (
    <>
      <Header
        title="دفتر الديون"
        description="سجّل ديون الزبائن وتابع تواريخ الاستحقاق والتحصيل."
        actions={
          <Button
            onClick={() => setOpen(true)}
            className="w-full sm:w-auto h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30"
          >
            + إضافة دين جديد
          </Button>
        }
      />

      <div className="mt-4 md:mt-5 space-y-4">
        {dataError && <p className="text-sm text-destructive">{dataError}</p>}
        {isLoading && <p className="text-sm text-muted-foreground">جار تحميل الديون...</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {summary.map((item) => (
            <Card key={item.title} className={`p-4 rounded-2xl border-0 shadow-sm flex items-center gap-3 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${item.bg ?? "bg-white"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.bg ?? "bg-secondary"}`}>
                <item.icon className={`w-5 h-5 ${item.accent}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.title}</p>
                <p className={`text-lg font-bold truncate ${item.accent}`}>{item.value}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">قائمة الزبائن المدينين</h2>
          </div>

          {filtered.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX className="w-6 h-6" />
                </EmptyMedia>
                <EmptyTitle>لا توجد نتائج</EmptyTitle>
                <EmptyDescription>لم يتم العثور على زبائن مطابقين لبحثك.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الزبون</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((debtor) => (
                    <TableRow key={debtor.id} className="hover:bg-secondary/40 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-secondary">{debtor.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{debtor.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm" dir="ltr">
                        {debtor.phone}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground whitespace-nowrap">
                        {formatIQD(debtor.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{debtor.date}</TableCell>
                      <TableCell>
                        {debtor.paid ? (
                          <Badge className="font-normal border bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                            تم الاستلام
                          </Badge>
                        ) : (
                          <Badge className={`font-normal border ${debtor.overdue ? "bg-red-100 text-red-700 border-red-200" : "bg-orange-100 text-orange-700 border-orange-200"}`}>
                            {debtor.overdue ? "متأخر" : "ضمن المدة"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={debtor.paid}
                          onClick={() => handleCollect(debtor.id, debtor.name)}
                          className="h-7 text-xs bg-transparent disabled:opacity-40"
                        >
                          {debtor.paid ? "تم الاستلام" : "استلام"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>إضافة دين جديد</DialogTitle>
            <DialogDescription>أدخل بيانات الزبون والمبلغ المستحق.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="debt-name">اسم الزبون</Label>
              <Input id="debt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: حسن علي" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="debt-phone">رقم الهاتف</Label>
              <Input
                id="debt-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="٠٧٧٠ ١٢٣ ٤٥٦"
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="debt-amount">المبلغ (د.ع)</Label>
                <Input
                  id="debt-amount"
                  type="text" inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="debt-date">تاريخ الاستحقاق</Label>
                <Input
                  id="debt-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} className="bg-transparent">
              إلغاء
            </Button>
            <Button onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
              حفظ الدين
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
