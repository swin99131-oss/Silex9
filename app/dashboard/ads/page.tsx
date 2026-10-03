"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Copy, ImagePlus, Package, Receipt, Store, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useProfile } from "@/lib/useProfile"
import { formatIQD } from "@/components/store/store-context"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AD_STATUS, AD_TYPE_LABEL, DELETABLE_STATUSES, PROVINCES } from "@/lib/ad-templates"

type Ad = {
  id: string
  type: string
  title: string
  status: string
  price: number
  total_budget: number
  is_free: boolean
  duration_days: number
  target_province: string | null
  target_category: string | null
  review_note: string | null
}
type Pkg = { id: string; label: string; days: number; daily_price: number }
type Tpl = { type: string; title: string; description: string }
type MyProduct = { id: string; title: string; cover_url: string | null }
type Cat = { id: string; name: string }
type PayInfo = { card: string; holder: string; note: string }

const ICONS: Record<string, typeof Package> = { product: Package, company: Store, promotion: ImagePlus }

const ERR: Record<string, string> = {
  NOT_MERCHANT: "هذه الخدمة للتجار فقط",
  TEMPLATE_DISABLED: "هذا القالب غير متاح حالياً",
  PACKAGE_UNAVAILABLE: "الباقة غير متاحة حالياً",
  BAD_TARGET: "المنتج غير صالح",
  BAD_TITLE: "العنوان قصير جداً",
  IMAGE_REQUIRED: "أضف صورة للبانر",
  BAD_REF: "رقم العملية غير صالح (من 6 إلى 40 حرفاً أو رقماً)",
  BAD_RECEIPT: "تعذّر قبول الإيصال",
  NOT_PAYABLE: "هذا الإعلان لا يحتاج دفعاً الآن",
  REF_USED: "رقم العملية مستخدم سابقاً",
}

function errText(e: unknown) {
  const m = (e as { message?: string } | null)?.message ?? ""
  for (const k of Object.keys(ERR)) if (m.includes(k)) return ERR[k]
  return "تعذّر تنفيذ العملية، حاول مجدداً"
}

function pickImage(e: React.ChangeEvent<HTMLInputElement>, max: number): File | null {
  const f = e.target.files?.[0]
  e.target.value = ""
  if (!f) return null
  if (!f.type.startsWith("image/")) {
    toast.error("اختر صورة فقط")
    return null
  }
  if (f.size > max) {
    toast.error(`حجم الصورة أكبر من ${Math.round(max / 1024 / 1024)}MB`)
    return null
  }
  return f
}

export default function AdsPage() {
  const { user, loading } = useProfile()
  const uid = user?.id

  const [ads, setAds] = useState<Ad[]>([])
  const [pkgs, setPkgs] = useState<Pkg[]>([])
  const [tpls, setTpls] = useState<Tpl[]>([])
  const [products, setProducts] = useState<MyProduct[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [payInfo, setPayInfo] = useState<PayInfo>({ card: "", holder: "", note: "" })
  const [freeLeft, setFreeLeft] = useState(0)
  const [storeName, setStoreName] = useState("")
  const [fetching, setFetching] = useState(true)

  const [creating, setCreating] = useState(false)
  const [tpl, setTpl] = useState<string | null>(null)
  const [productId, setProductId] = useState("")
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pkgId, setPkgId] = useState("")
  const [busy, setBusy] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [pay, setPay] = useState<{ id: string; price: number } | null>(null)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [payRef, setPayRef] = useState("")

  const fileRef = useRef<HTMLInputElement>(null)
  const receiptRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!uid) return
    const [c, pk, tp, p, k, s, q, me] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, type, title, status, price, total_budget, is_free, duration_days, target_province, target_category, review_note")
        .eq("merchant_id", uid)
        .order("created_at", { ascending: false }),
      supabase.from("ad_packages").select("id, label, days, daily_price").eq("active", true).order("sort"),
      supabase.from("ad_templates").select("type, title, description").eq("enabled", true).order("sort"),
      supabase.from("products").select("id, title, cover_url").eq("merchant_id", uid),
      supabase.from("categories").select("id, name").order("sort"),
      supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["payment_card_number", "payment_card_holder", "payment_note"]),
      supabase.rpc("ad_quota_left"),
      supabase.from("profiles").select("store_name, full_name").eq("id", uid).maybeSingle(),
    ])
    setAds((c.data ?? []) as Ad[])
    setPkgs((pk.data ?? []) as Pkg[])
    setTpls((tp.data ?? []) as Tpl[])
    setProducts((p.data ?? []) as MyProduct[])
    setCats((k.data ?? []) as Cat[])
    const cfg: Record<string, string> = {}
    for (const r of (s.data ?? []) as { key: string; value: string }[]) cfg[r.key] = r.value ?? ""
    setPayInfo({ card: cfg.payment_card_number ?? "", holder: cfg.payment_card_holder ?? "", note: cfg.payment_note ?? "" })
    setFreeLeft(typeof q.data === "number" ? q.data : 0)
    const prof = me.data as { store_name?: string | null; full_name?: string | null } | null
    setStoreName(prof?.store_name ?? prof?.full_name ?? "")
    setFetching(false)
  }, [uid])

  useEffect(() => {
    if (loading) return
    if (!uid) {
      setFetching(false)
      return
    }
    void load()
  }, [loading, uid, load])

  useEffect(() => {
    if (!pkgId && pkgs.length) setPkgId((pkgs[1] ?? pkgs[0]).id)
  }, [pkgs, pkgId])

  const pkg = pkgs.find((p) => p.id === pkgId)
  const total = pkg ? pkg.days * pkg.daily_price : 0
  const willBeFree = freeLeft > 0 || total === 0

  function resetForm() {
    if (preview) URL.revokeObjectURL(preview)
    setCreating(false)
    setTpl(null)
    setProductId("")
    setTitle("")
    setDesc("")
    setFile(null)
    setPreview(null)
  }

  function closePay() {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview)
    setPay(null)
    setReceipt(null)
    setReceiptPreview(null)
    setPayRef("")
  }

  async function submit() {
    if (!uid || !tpl || !pkg) return
    let adTitle = ""
    let adDesc: string | null = null
    let imageUrl: string | null = null
    let targetId: string | null = null

    if (tpl === "product") {
      const prod = products.find((p) => p.id === productId)
      if (!prod) return toast.error("اختر المنتج المراد تعزيزه")
      adTitle = prod.title
      imageUrl = prod.cover_url
      targetId = prod.id
    } else if (tpl === "company") {
      adTitle = storeName || "متجري"
    } else {
      if (title.trim().length < 3) return toast.error("اكتب عنواناً للإعلان (3 أحرف على الأقل)")
      if (!file) return toast.error("أضف صورة للبانر")
      adTitle = title.trim()
      adDesc = desc.trim() || null
    }

    setBusy(true)
    try {
      if (tpl === "promotion" && file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
        const path = `${uid}/ad-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from("posts").upload(path, file, { contentType: file.type })
        if (upErr) throw upErr
        imageUrl = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl
      }
      const { data, error } = await supabase.rpc("create_campaign", {
        p_type: tpl,
        p_package_id: pkg.id,
        p_title: adTitle,
        p_description: adDesc,
        p_image_url: imageUrl,
        p_target_id: targetId,
        p_province: null,
        p_category: null,
      })
      if (error) throw error
      const row = data as { id: string; status: string; price: number }
      resetForm()
      await load()
      if (row.status === "pending_payment") {
        setPay({ id: row.id, price: row.price })
        toast.info("أرسل إيصال الدفع لتبدأ مراجعة إعلانك")
      } else {
        toast.success("تم إرسال إعلانك المجاني للمراجعة")
      }
    } catch (e) {
      console.error(e)
      toast.error(errText(e))
    } finally {
      setBusy(false)
    }
  }

  async function submitPayment() {
    if (!uid || !pay) return
    if (!receipt) return toast.error("أرفق صورة الإيصال")
    if (payRef.trim().length < 6) return toast.error("اكتب رقم العملية")
    setBusy(true)
    try {
      const ext = (receipt.name.split(".").pop() || "jpg").toLowerCase()
      const path = `${uid}/${pay.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, receipt, { contentType: receipt.type })
      if (upErr) throw upErr
      const { error } = await supabase.rpc("submit_campaign_payment", {
        p_campaign_id: pay.id,
        p_receipt_path: path,
        p_payment_ref: payRef,
      })
      if (error) throw error
      toast.success("تم إرسال الإيصال للمراجعة")
      closePay()
      await load()
    } catch (e) {
      console.error(e)
      toast.error(errText(e))
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    const id = deleteId
    setDeleteId(null)
    if (!id) return
    const { error } = await supabase.from("campaigns").delete().eq("id", id)
    if (error) return toast.error("تعذّر حذف الإعلان")
    toast.success("تم حذف الإعلان")
    setAds((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <main className="flex-1 p-3 pb-28 md:p-4 lg:p-5">
        <Header
          title="الإعلانات"
          description="روّج لمنتجاتك ومتجرك للوصول لزبائن أكثر"
          actions={
            !creating ? (
              <Button onClick={() => setCreating(true)} className="h-9 w-full text-sm sm:w-auto">
                + إعلان جديد
              </Button>
            ) : undefined
          }
        />

        <div className="mt-4 max-w-3xl space-y-6">
          {freeLeft > 0 && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              لديك {freeLeft} {freeLeft === 1 ? "إعلان مجاني" : "إعلانات مجانية"} متبقية.
            </div>
          )}

          {creating && (
            <div className="space-y-5 rounded-xl border border-border bg-card p-4">
              <div className="space-y-2">
                <Label>1. اختر القالب</Label>
                {tpls.length === 0 ? (
                  <p className="text-xs text-muted-foreground">لا توجد قوالب متاحة حالياً.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {tpls.map((t) => {
                      const Icon = ICONS[t.type] ?? Package
                      const active = tpl === t.type
                      return (
                        <button
                          key={t.type}
                          type="button"
                          onClick={() => setTpl(t.type)}
                          className={`rounded-xl border p-3 text-right transition-colors ${
                            active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                          }`}
                        >
                          <Icon className="mb-2 h-5 w-5 text-foreground" />
                          <p className="text-sm font-semibold">{t.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {tpl === "product" && (
                <div className="space-y-1.5">
                  <Label>2. المنتج</Label>
                  {products.length === 0 ? (
                    <p className="text-xs text-muted-foreground">لا توجد منتجات لتعزيزها، أضف منتجاً أولاً.</p>
                  ) : (
                    <Select value={productId} onValueChange={setProductId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {tpl === "promotion" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ad-title">2. عنوان الإعلان</Label>
                    <Input
                      id="ad-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                      placeholder="مثال: خصم 20% على كل المنتجات"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ad-desc">نبذة (اختياري)</Label>
                    <textarea
                      id="ad-desc"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value.slice(0, 200))}
                      rows={2}
                      className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>صورة البانر</Label>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border hover:bg-secondary"
                    >
                      {preview ? (
                        <img src={preview} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      )}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = pickImage(e, 5 * 1024 * 1024)
                        if (!f) return
                        if (preview) URL.revokeObjectURL(preview)
                        setFile(f)
                        setPreview(URL.createObjectURL(f))
                      }}
                    />
                  </div>
                </div>
              )}

              {tpl && (
                <>
                  <div className="space-y-2">
                    <Label>3. المدة والميزانية</Label>
                    {pkgs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">لا توجد باقات متاحة حالياً.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {pkgs.map((p) => {
                          const active = pkgId === p.id
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPkgId(p.id)}
                              className={`rounded-xl border p-3 text-center transition-colors ${
                                active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                              }`}
                            >
                              <p className="text-sm font-semibold">{p.label}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{p.days} أيام</p>
                              <p className="text-[11px] text-muted-foreground">{formatIQD(p.daily_price)} / يوم</p>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted">يُحدَّد الجمهور تلقائياً حسب بلد ومدينة ونوع منتجات متجرك.</p>

              <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm">
                    <span className="text-muted-foreground">التكلفة</span>
                    <span className="font-bold">{willBeFree ? `مجاني (متبقي ${freeLeft})` : formatIQD(total)}</span>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button onClick={submit} disabled={!tpl || !pkg || busy} className="h-10 flex-1 text-sm">
                  {busy ? "جارٍ الإرسال..." : willBeFree ? "إرسال للمراجعة" : "متابعة للدفع"}
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={busy} className="h-10 bg-transparent text-sm">
                  إلغاء
                </Button>
              </div>
            </div>
          )}

          {fetching ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />
              ))}
            </div>
          ) : ads.length === 0 && !creating ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              ما عندك إعلانات بعد. اضغط "إعلان جديد" وابدأ.
            </div>
          ) : (
            <div className="space-y-3">
              {ads.map((c) => {
                const st = AD_STATUS[c.status] ?? { label: c.status, cls: "bg-secondary text-muted-foreground" }
                const catName = cats.find((k) => k.id === c.target_category)?.name
                return (
                  <div key={c.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{AD_TYPE_LABEL[c.type] ?? c.type}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{c.duration_days} أيام</span>
                      <span>{c.is_free ? "مجاني" : formatIQD(c.price || c.total_budget)}</span>
                      <span>{c.target_province ?? "حسب متجرك"}</span>
                      {catName && <span>{catName}</span>}
                    </div>
                    {c.review_note && (c.status === "rejected" || c.status === "pending_payment") && (
                      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        ملاحظة الإدارة: {c.review_note}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {c.status === "pending_payment" && !c.is_free ? (
                        <Button
                          size="sm"
                          onClick={() => setPay({ id: c.id, price: c.price || c.total_budget })}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          ادفع وأرسل الإيصال
                        </Button>
                      ) : (
                        <span />
                      )}
                      {DELETABLE_STATUSES.includes(c.status) && (
                        <button
                          type="button"
                          onClick={() => setDeleteId(c.id)}
                          className="flex items-center gap-1 text-xs text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Dialog open={pay !== null} onOpenChange={(o) => { if (!o && !busy) closePay() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>دفع قيمة الإعلان</DialogTitle>
            <DialogDescription>حوّل المبلغ للبطاقة التالية ثم أرسل صورة الإيصال ورقم العملية.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
              <span className="text-muted-foreground">المبلغ المطلوب</span>
              <span className="font-bold">{formatIQD(pay?.price ?? 0)}</span>
            </div>
            {payInfo.card ? (
              <div className="space-y-1.5 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span dir="ltr" className="font-mono text-base tracking-wider">
                    {payInfo.card}
                  </span>
                  <button
                    type="button"
                    aria-label="نسخ"
                    onClick={() => {
                      void navigator.clipboard.writeText(payInfo.card).then(() => toast.success("تم نسخ رقم البطاقة"))
                    }}
                    className="rounded-full p-2 hover:bg-secondary"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                {payInfo.holder && <p className="text-xs text-muted-foreground">باسم: {payInfo.holder}</p>}
                {payInfo.note && <p className="text-xs text-muted-foreground">{payInfo.note}</p>}
              </div>
            ) : (
              <p className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
                لم تُضبط بيانات الدفع بعد، تواصل مع الدعم.
              </p>
            )}
            <div className="space-y-1.5">
              <Label>صورة الإيصال</Label>
              <button
                type="button"
                onClick={() => receiptRef.current?.click()}
                className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border hover:bg-secondary"
              >
                {receiptPreview ? (
                  <img src={receiptPreview} alt="" className="h-full w-full object-contain" />
                ) : (
                  <ImagePlus className="h-7 w-7 text-muted-foreground" />
                )}
              </button>
              <input
                ref={receiptRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = pickImage(e, 5 * 1024 * 1024)
                  if (!f) return
                  if (receiptPreview) URL.revokeObjectURL(receiptPreview)
                  setReceipt(f)
                  setReceiptPreview(URL.createObjectURL(f))
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">رقم العملية</Label>
              <Input
                id="pay-ref"
                dir="ltr"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value.slice(0, 40))}
                placeholder="مثال: 123456789"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closePay} disabled={busy} className="bg-transparent">
              لاحقاً
            </Button>
            <Button onClick={submitPayment} disabled={busy}>
              {busy ? "جارٍ الإرسال..." : "إرسال الإيصال"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-right">
            <DialogTitle>حذف الإعلان</DialogTitle>
            <DialogDescription>سيتم حذف هذا الإعلان نهائياً. هل تريد المتابعة؟</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="bg-transparent">
              إلغاء
            </Button>
            <Button onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-700">
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
