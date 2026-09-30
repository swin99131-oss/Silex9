"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImagePlus, Package, Store, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useProfile } from "@/lib/useProfile"
import { formatIQD } from "@/components/store/store-context"
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
import {
  AD_PACKAGES,
  AD_STATUS,
  AD_TEMPLATES,
  AD_TYPE_LABEL,
  DELETABLE_STATUSES,
  PROVINCES,
  type AdType,
} from "@/lib/ad-templates"

import { Header } from "@/components/dashboard/header"

type AdCampaign = {
  id: string
  type: string
  title: string
  status: string
  total_budget: number
  duration_days: number
  target_province: string | null
  target_category: string | null
  created_at: string
}
type MyProduct = { id: string; title: string; cover_url: string | null }
type Cat = { id: string; name: string }

const TEMPLATE_ICON = { product: Package, company: Store, promotion: ImagePlus } as const

export default function AdsPage() {
  const { user, loading } = useProfile()
  const uid = user?.id

  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [products, setProducts] = useState<MyProduct[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [storeName, setStoreName] = useState("")
  const [fetching, setFetching] = useState(true)

  const [creating, setCreating] = useState(false)
  const [tpl, setTpl] = useState<AdType | null>(null)
  const [productId, setProductId] = useState("")
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pkgId, setPkgId] = useState<string>(AD_PACKAGES[1].id)
  const [province, setProvince] = useState("all")
  const [category, setCategory] = useState("all")
  const [busy, setBusy] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!uid) return
    const [c, p, k, s] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, type, title, status, total_budget, duration_days, target_province, target_category, created_at")
        .eq("merchant_id", uid)
        .order("created_at", { ascending: false }),
      supabase.from("products").select("id, title, cover_url").eq("merchant_id", uid),
      supabase.from("categories").select("id, name").order("sort"),
      supabase.from("profiles").select("store_name, full_name").eq("id", uid).maybeSingle(),
    ])
    setCampaigns((c.data ?? []) as AdCampaign[])
    setProducts((p.data ?? []) as MyProduct[])
    setCats((k.data ?? []) as Cat[])
    const prof = s.data as { store_name?: string | null; full_name?: string | null } | null
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

  function resetForm() {
    if (preview) URL.revokeObjectURL(preview)
    setCreating(false)
    setTpl(null)
    setProductId("")
    setTitle("")
    setDesc("")
    setFile(null)
    setPreview(null)
    setPkgId(AD_PACKAGES[1].id)
    setProvince("all")
    setCategory("all")
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    if (!f.type.startsWith("image/")) {
      toast.error("اختر صورة فقط")
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة أكبر من 5MB")
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const pkg = AD_PACKAGES.find((p) => p.id === pkgId) ?? AD_PACKAGES[1]

  async function submit() {
    if (!uid || !tpl) return
    let adTitle = ""
    let adDesc: string | null = null
    let imageUrl: string | null = null
    let targetId: string | null = null

    if (tpl === "product") {
      const prod = products.find((p) => p.id === productId)
      if (!prod) {
        toast.error("اختر المنتج المراد تعزيزه")
        return
      }
      adTitle = prod.title
      imageUrl = prod.cover_url
      targetId = prod.id
    } else if (tpl === "company") {
      adTitle = storeName || "متجري"
      targetId = uid
    } else {
      if (title.trim().length < 3) {
        toast.error("اكتب عنواناً للإعلان (3 أحرف على الأقل)")
        return
      }
      if (!file) {
        toast.error("أضف صورة للبانر")
        return
      }
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
      const { error } = await supabase.from("campaigns").insert({
        merchant_id: uid,
        type: tpl,
        title: adTitle,
        description: adDesc,
        image_url: imageUrl,
        target_id: targetId,
        target_province: province === "all" ? null : province,
        target_category: category === "all" ? null : category,
        daily_budget: pkg.daily,
        total_budget: pkg.daily * pkg.days,
        duration_days: pkg.days,
        status: "pending_review",
      })
      if (error) throw error
      toast.success("تم إرسال الإعلان للمراجعة")
      resetForm()
      await load()
    } catch (e) {
      console.error(e)
      toast.error("تعذّر إرسال الإعلان، حاول مجدداً")
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    const id = deleteId
    setDeleteId(null)
    if (!id) return
    const { error } = await supabase.from("campaigns").delete().eq("id", id)
    if (error) {
      toast.error("تعذّر حذف الإعلان")
      return
    }
    toast.success("تم حذف الإعلان")
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <>
<Header title="الإعلانات" description="روّج لمنتجاتك ومتجرك للوصول لزبائن أكثر" />
        <div className="mt-4 md:mt-5 pb-28 space-y-6 max-w-3xl">
          <div className="flex items-center justify-end gap-3">
            {!creating && (
              <Button onClick={() => setCreating(true)} className="h-9 text-sm">
                + إعلان جديد
              </Button>
            )}
          </div>

      {creating && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-5">
          <div className="space-y-2">
            <Label>1. اختر القالب</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {AD_TEMPLATES.map((t) => {
                const Icon = TEMPLATE_ICON[t.type]
                const active = tpl === t.type
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setTpl(t.type)}
                    className={`text-right rounded-xl border p-3 transition-colors ${
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-2 text-foreground" />
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </button>
                )
              })}
            </div>
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
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
              </div>
            </div>
          )}

          {tpl && (
            <>
              <div className="space-y-2">
                <Label>3. المدة والميزانية</Label>
                <div className="grid grid-cols-3 gap-2">
                  {AD_PACKAGES.map((p) => {
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
                        <p className="text-xs text-muted-foreground mt-0.5">{p.days} أيام</p>
                        <p className="text-[11px] text-muted-foreground">{formatIQD(p.daily)} / يوم</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>4. الاستهداف</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={province} onValueChange={setProvince}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="المحافظة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل العراق</SelectItem>
                      {PROVINCES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل التصنيفات</SelectItem>
                      {cats.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm">
                <span className="text-muted-foreground">التكلفة الإجمالية</span>
                <span className="font-bold">{formatIQD(pkg.daily * pkg.days)}</span>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button onClick={submit} disabled={!tpl || busy} className="flex-1 h-10 text-sm">
              {busy ? "جارٍ الإرسال..." : "إرسال للمراجعة"}
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={busy} className="h-10 text-sm bg-transparent">
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
      ) : campaigns.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          ما عندك إعلانات بعد. اضغط "إعلان جديد" وابدأ.
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const st = AD_STATUS[c.status] ?? { label: c.status, cls: "bg-secondary text-muted-foreground" }
            const catName = cats.find((k) => k.id === c.target_category)?.name
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl p-4">
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
                  <span>{formatIQD(c.total_budget)}</span>
                  <span>{c.target_province ?? "كل العراق"}</span>
                  {catName && <span>{catName}</span>}
                </div>
                {DELETABLE_STATUSES.includes(c.status) && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDeleteId(c.id)}
                      className="flex items-center gap-1 text-xs text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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
</>
  )
}
