"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Eye, Heart, ImagePlus, Megaphone, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadCover } from "@/lib/image";
import { getCategories, type Category } from "@/lib/catalog";
import { CategorySelect } from "@/components/CategorySelect";
import type { MerchantProduct, Profile } from "@/lib/types";

type Row = MerchantProduct & { product_likes: { count: number }[] };

const COLORS = [
  "#111111",
  "#FFFFFF",
  "#D8CFC0",
  "#8B5E3C",
  "#C0A16B",
  "#43503B",
  "#1D4ED8",
  "#9D174D",
  "#B45309",
  "#6D28D9",
];

const inp = "w-full bg-chip rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ink/10 transition-all";
const iconBtn = "w-9 h-9 rounded-full bg-chip flex items-center justify-center";
const sectionLabel = "text-[11px] font-semibold text-muted";
const emptyForm = {
  title: "",
  description: "",
  hashtags: "",
  price: "",
  oldPrice: "",
  category: "",
  colors: [] as string[],
  sizes: "",
};

const parseTags = (raw: string) =>
  Array.from(new Set(raw.split(/[\s,،#]+/).filter(Boolean))).slice(0, 10);
const parseSizes = (raw: string) =>
  Array.from(new Set(raw.split(/[\s,،]+/).filter(Boolean))).slice(0, 12);

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};
const toEnglishDigits = (s: string) => s.replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS[d] ?? d);

export function ProductStudio({ profile }: { profile: Profile }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [f, setF] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("*, product_likes(count)")
      .eq("merchant_id", profile.id)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
  }, [profile.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getCategories().then(setCats);
  }, []);

  function startNew() {
    setEditing(null);
    setF(emptyForm);
    setFile(null);
    setPreview(null);
    setErr("");
    setAiErr("");
    setOpen(true);
  }

  function startEdit(r: Row) {
    setEditing(r);
    setF({
      title: r.title,
      description: r.description ?? "",
      hashtags: (r.hashtags ?? []).map((h) => `#${h}`).join(" "),
      price: r.price?.toString() ?? "",
      oldPrice: r.old_price?.toString() ?? "",
      category: r.category ?? "",
      colors: r.colors ?? [],
      sizes: (r.sizes ?? []).join(" "),
    });
    setFile(null);
    setPreview(r.cover_url);
    setErr("");
    setAiErr("");
    setOpen(true);
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  async function generateDescription() {
    if (!f.title.trim()) {
      setAiErr("اكتب عنوان المنتج أولاً");
      return;
    }
    setAiBusy(true);
    setAiErr("");
    try {
      const categoryName = cats.find((c) => c.id === f.category)?.name ?? "";
      const response = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.title.trim(), category: categoryName }),
      });
      const result = (await response.json()) as { description?: string; error?: string };
      if (!response.ok || !result.description) throw new Error(result.error ?? "تعذر توليد الوصف");
      setF((prev) => ({ ...prev, description: result.description! }));
    } catch (error) {
      setAiErr(error instanceof Error ? error.message : "تعذر توليد الوصف حاليًا");
    } finally {
      setAiBusy(false);
    }
  }

  async function save() {
    if (!f.title.trim()) return setErr("العنوان مطلوب");
    if (!(Number(f.price) > 0)) return setErr("السعر مطلوب");
    if (f.oldPrice && !(Number(f.oldPrice) > Number(f.price)))
      return setErr("السعر قبل الخصم يجب أن يكون أعلى من السعر");
    if (!f.category) return setErr("اختر التصنيف");
    if (!editing && !file) return setErr("أضف صورة الغلاف");
    setBusy(true);
    setErr("");
    try {
      let cover = editing?.cover_url ?? null;
      if (file) cover = await uploadCover(file, profile.id);
      const payload = {
        title: f.title.trim(),
        description: f.description.trim() || null,
        hashtags: parseTags(f.hashtags),
        price: Number(f.price),
        old_price: f.oldPrice ? Number(f.oldPrice) : null,
        category: f.category,
        colors: f.colors,
        sizes: parseSizes(f.sizes),
        cover_url: cover,
      };
      const { error } = editing
        ? await supabase.from("products").update(payload).eq("id", editing.id)
        : await supabase.from("products").insert({ ...payload, merchant_id: profile.id });
      if (error) throw error;
      setOpen(false);
      load();
    } catch {
      setErr("تعذّر الحفظ، حاول مرة أخرى");
    }
    setBusy(false);
  }

  async function togglePromote(r: Row) {
    await supabase.from("products").update({ promoted: !r.promoted }).eq("id", r.id);
    load();
  }

  async function remove(r: Row) {
    if (!confirm("حذف هذا المنتج نهائياً؟")) return;
    await supabase.from("products").delete().eq("id", r.id);
    load();
  }

  const initial = (profile.full_name ?? "؟").charAt(0);
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={startNew}
        className="self-start flex items-center gap-2 bg-ink text-white rounded-pill px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Plus size={16} />
        منتج جديد
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="font-display text-lg font-semibold text-ink">
                {editing ? "تعديل المنتج" : "إضافة منتج جديد"}
              </h3>
              <button onClick={() => setOpen(false)} className={iconBtn}>
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <p className={`${sectionLabel} mb-1.5`}>غلاف المنتج</p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="relative w-full aspect-square rounded-2xl bg-chip overflow-hidden flex flex-col items-center justify-center text-xs text-muted border-2 border-dashed border-line hover:border-ink/30 transition-colors"
                  >
                    {preview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        <span className="relative z-10 bg-black/60 text-white rounded-pill px-3 py-1 text-[11px]">
                          تغيير الصورة
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <ImagePlus size={22} />
                        <span>اختر صورة</span>
                      </div>
                    )}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <div>
                    <p className={`${sectionLabel} mb-1`}>عنوان المنتج</p>
                    <input
                      className={inp}
                      placeholder="مثال: عطر فرنسي فواح"
                      maxLength={80}
                      value={f.title}
                      onChange={(e) => setF({ ...f, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className={`${sectionLabel} mb-1`}>التصنيف</p>
                      <CategorySelect
                        categories={cats}
                        value={f.category}
                        onChange={(id) => setF({ ...f, category: id })}
                        className={inp}
                      />
                    </div>
                    <div>
                      <p className={`${sectionLabel} mb-1`}>السعر (د.ع)</p>
                      <input
                        className={inp}
                        dir="ltr"
                        inputMode="decimal"
                        placeholder="0"
                        value={f.price}
                        onChange={(e) => setF({ ...f, price: toEnglishDigits(e.target.value).replace(/[^\d.]/g, "") })}
                      />
                    </div>
                  </div>
                  <div>
                    <p className={`${sectionLabel} mb-1`}>السعر قبل الخصم (اختياري)</p>
                    <input
                      className={inp}
                      dir="ltr"
                      inputMode="decimal"
                      placeholder="0"
                      value={f.oldPrice}
                      onChange={(e) => setF({ ...f, oldPrice: toEnglishDigits(e.target.value).replace(/[^\d.]/g, "") })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className={sectionLabel}>الوصف</p>
                  <button
                    type="button"
                    onClick={generateDescription}
                    disabled={aiBusy || !f.title.trim()}
                    className="flex items-center gap-1.5 bg-ink text-white rounded-pill px-3 py-1.5 text-xs font-medium disabled:opacity-40 transition-opacity"
                  >
                    <Sparkles size={13} />
                    {aiBusy ? "جارٍ الكتابة..." : "اكتب وصفًا بالذكاء الاصطناعي"}
                  </button>
                </div>
                <textarea
                  className={inp}
                  rows={2}
                  maxLength={300}
                  placeholder="وصف مختصر ومجذب للمنتج..."
                  value={f.description}
                  onChange={(e) => setF({ ...f, description: e.target.value })}
                />
                {aiErr && <p className="text-xs text-red-500">{aiErr}</p>}
              </div>

              <div className="space-y-1.5">
                <p className={sectionLabel}>الألوان المتوفرة (اختياري)</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => {
                    const on = f.colors.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-label={c}
                        onClick={() =>
                          setF({ ...f, colors: on ? f.colors.filter((x) => x !== c) : [...f.colors, c] })
                        }
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform active:scale-95 ${
                          on ? "border-ink scale-110" : "border-transparent"
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full border border-black/10"
                          style={{ backgroundColor: c }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className={`${sectionLabel} mb-1`}>المقاسات (اختياري)</p>
                  <input
                    className={inp}
                    placeholder="S, M, L أو 39, 40, 41"
                    value={f.sizes}
                    onChange={(e) => setF({ ...f, sizes: e.target.value })}
                  />
                </div>
                <div>
                  <p className={`${sectionLabel} mb-1`}>الوسوم / الهاشتاغات</p>
                  <input
                    className={inp}
                    placeholder="حقائب أزياء موضة"
                    value={f.hashtags}
                    onChange={(e) => setF({ ...f, hashtags: e.target.value })}
                  />
                </div>
              </div>

              {err && <p className="text-xs text-red-500 font-medium">{err}</p>}
            </div>

            <div className="flex gap-2 p-4 bg-chip border-t border-line">
              <button
                onClick={save}
                disabled={busy}
                className="flex-1 bg-ink text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 hover:opacity-95 transition-opacity"
              >
                {busy ? "جارٍ الحفظ…" : editing ? "حفظ التعديلات" : "نشر المنتج"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="bg-white text-ink/70 rounded-xl px-4 py-2.5 text-sm font-medium hover:text-ink transition-colors border border-line"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {rows?.length === 0 && !open && <p className="text-sm text-muted">لم تنشر أي منتج بعد</p>}

      {rows?.map((r) => (
        <article key={r.id} className="bg-card rounded-card shadow-soft overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-full bg-chip flex items-center justify-center text-sm font-display shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{profile.full_name}</p>
              <p className="text-xs text-muted">
                {new Date(r.created_at).toLocaleDateString("ar")}
                {catName(r.category) ? ` · ${catName(r.category)}` : ""}
              </p>
            </div>
            {r.promoted && (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-pill bg-ink text-white">مروَّج</span>
            )}
          </div>

          <div className="relative aspect-square bg-chip">
            {r.cover_url && (
              <Image
                src={r.cover_url}
                alt={r.title}
                fill
                sizes="(min-width: 768px) 480px, 100vw"
                className="object-cover"
              />
            )}
          </div>

          <div className="p-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <Eye size={16} />
                {r.views}
              </span>
              <span className="flex items-center gap-1.5">
                <Heart size={16} />
                {r.product_likes?.[0]?.count ?? 0}
              </span>
              <span className="flex-1" />
              <button onClick={() => togglePromote(r)} aria-label="ترويج" className={iconBtn}>
                <Megaphone size={15} fill={r.promoted ? "currentColor" : "none"} />
              </button>
              <button onClick={() => startEdit(r)} aria-label="تعديل" className={iconBtn}>
                <Pencil size={15} />
              </button>
              <button onClick={() => remove(r)} aria-label="حذف" className={iconBtn}>
                <Trash2 size={15} />
              </button>
            </div>

            <h3 className="font-semibold text-sm mt-3">{r.title}</h3>
            <div className="flex items-baseline gap-2 mt-1">
              {r.price != null && <span className="text-sm">{r.price} د.ع</span>}
              {r.old_price != null && (
                <span className="text-xs text-muted line-through">{r.old_price} د.ع</span>
              )}
            </div>
            {r.description && <p className="text-sm text-muted mt-1">{r.description}</p>}
            {!!r.hashtags?.length && (
              <p className="text-xs mt-2 flex flex-wrap gap-x-2">
                {r.hashtags.map((t) => (
                  <span key={t}>#{t}</span>
                ))}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
