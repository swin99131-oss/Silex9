"use client";

import { Notice } from "@/components/ui/Notice";
import { Dropdown } from "@/components/ui/Dropdown";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Trash2, ImagePlus, X, Type, Pencil, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  encodeStoryAppearance,
  parseStoryAppearance,
  STORY_COLORS,
  STORY_TEXT_COLORS,
  type Profile,
  type Story,
  type StoryMerchant,
  type StoryTextStyle,
} from "@/lib/types";
import { StoryViewer } from "./StoryViewer";

type Row = Story & { story_views: { count: number }[] };

export function StoryStudio({ profile }: { profile: Profile }) {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [color, setColor] = useState(STORY_COLORS[0]);
  const [textColor, setTextColor] = useState(STORY_TEXT_COLORS[0]);
  const [textStyle, setTextStyle] = useState<StoryTextStyle>("classic");
  const [textSize, setTextSize] = useState(24);
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState<{ id: string; title: string }[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [viewIdx, setViewIdx] = useState<number | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [capPos, setCapPos] = useState({ x: 50, y: 80 }); // نسبة مئوية
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragStart = useRef<{ pointerId: number; x: number; y: number; pos: { x: number; y: number } } | null>(null);
  const pinchStart = useRef<{ distance: number; size: number } | null>(null);

  const merchant: StoryMerchant = {
    id: profile.id,
    full_name: profile.full_name,
    username: profile.username,
    avatar_url: profile.avatar_url,
    whatsapp: profile.whatsapp,
  };

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([
      supabase.from("products").select("id, title").eq("merchant_id", profile.id).order("created_at", { ascending: false }),
      supabase
        .from("stories")
        .select("*, story_views(count)")
        .eq("merchant_id", profile.id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true }),
    ]);
    setProducts((p.data ?? []) as { id: string; title: string }[]);
    setRows((s.data ?? []) as unknown as Row[]);
  }, [profile.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function pickImage(file: File) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMode("image");
    setCaption("");
    setCapPos({ x: 50, y: 80 });
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setMode("text");
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragStart.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, pos: capPos };
      return;
    }
    if (pointers.current.size >= 2) {
      const [first, second] = Array.from(pointers.current.values());
      pinchStart.current = { distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)), size: textSize };
      dragStart.current = null;
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      dragStart.current = null;
      pinchStart.current = null;
    } else if (pointers.current.size === 1) {
      const [pointerId, point] = Array.from(pointers.current.entries())[0];
      dragStart.current = { pointerId, x: point.x, y: point.y, pos: capPos };
      pinchStart.current = null;
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinchStart.current) {
      const [first, second] = Array.from(pointers.current.values());
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      setTextSize(Math.min(42, Math.max(18, pinchStart.current.size * distance / pinchStart.current.distance)));
      return;
    }
    if (!canvasRef.current || dragStart.current?.pointerId !== e.pointerId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = dragStart.current.pos.x + ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const y = dragStart.current.pos.y + ((e.clientY - dragStart.current.y) / rect.height) * 100;
    setCapPos({
      x: Math.min(95, Math.max(5, x)),
      y: Math.min(95, Math.max(5, y)),
    });
  }

  async function send() {
    setBusy(true);
    setErr("");

    let imageUrl: string | null = null;

    if (mode === "image") {
      if (!imageFile) {
        setErr("اختر صورة أولاً");
        setBusy(false);
        return;
      }
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("stories").upload(path, imageFile);
      if (upErr) {
        setErr("تعذّر رفع الصورة، حاول مجدداً");
        setBusy(false);
        return;
      }
      const { data } = supabase.storage.from("stories").getPublicUrl(path);
      imageUrl = data.publicUrl;
    } else {
      const t = text.trim();
      if (!t) {
        setErr("اكتب نص القصة أولاً");
        setBusy(false);
        return;
      }
    }

    const { error } = await supabase.from("stories").insert({
      merchant_id: profile.id,
      text: mode === "image" ? caption.trim() : text.trim(),
      bg_color: encodeStoryAppearance({
        background: color,
        textColor,
        textStyle,
        textSize,
        x: capPos.x,
        y: capPos.y,
      }),
      image_url: imageUrl,
      product_id: productId || null,
    });

    setBusy(false);
    if (error) {
      setErr("تعذّر إرسال القصة، حاول مرة أخرى");
      return;
    }
    setText("");
    setCaption("");
    setProductId("");
    clearImage();
    load();
  }

  async function remove(id: string) {
    await supabase.from("stories").delete().eq("id", id);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card rounded-card shadow-soft p-4 flex flex-col gap-3">
        <h3 className="font-display text-[17px]">قصة جديدة</h3>

        {/* تبديل بين نص وصورة */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              clearImage();
              setMode("text");
            }}
            className={`flex-1 py-2 rounded-pill text-xs font-semibold flex items-center justify-center gap-1.5 ${
              mode === "text" ? "bg-ink text-white" : "bg-chip text-ink/70"
            }`}
          >
            <Type size={14} />
            نص فقط
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 py-2 rounded-pill text-xs font-semibold flex items-center justify-center gap-1.5 ${
              mode === "image" ? "bg-ink text-white" : "bg-chip text-ink/70"
            }`}
          >
            <ImagePlus size={14} />
            صورة
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickImage(f);
            }}
          />
        </div>

        {/* معاينة */}
        {mode === "image" && imagePreview ? (
          <div
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerMove={onPointerMove}
            className="relative mx-auto w-[220px] aspect-[9/16] rounded-card overflow-hidden bg-black select-none touch-none"
          >
            <img src={imagePreview} alt="" className="w-full h-full object-cover pointer-events-none" />
            <button
              onClick={clearImage}
              className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white z-10"
            >
              <X size={14} />
            </button>
            {caption && (
              <p
                className={`absolute font-display text-[15px] text-center leading-snug break-words px-2 cursor-move ${textStyle === "strong" ? "font-black" : "font-semibold"} ${textStyle === "label" ? "rounded-lg py-1" : ""}`}
                style={{
                  left: `${capPos.x}%`,
                  top: `${capPos.y}%`,
                  color: textColor,
                  fontSize: textSize,
                  background: textStyle === "label" ? "rgba(0,0,0,0.5)" : undefined,
                  transform: "translate(-50%, -50%)",
                  textShadow: "0 1px 6px rgba(0,0,0,0.6)",
                  maxWidth: "90%",
                }}
              >
                {caption}
              </p>
            )}
          </div>
        ) : (
          <div
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerMove={onPointerMove}
            className="relative mx-auto w-[150px] aspect-[9/16] touch-none select-none overflow-hidden rounded-card bg-chip"
            style={{ background: color }}
          >
            <p
              className={`absolute max-w-[88%] -translate-x-1/2 -translate-y-1/2 break-words px-2 text-center font-display leading-snug ${textStyle === "strong" ? "font-black" : "font-semibold"} ${textStyle === "label" ? "rounded-xl py-1" : ""}`}
              style={{
                left: `${capPos.x}%`,
                top: `${capPos.y}%`,
                color: textColor,
                fontSize: textSize,
                background: textStyle === "label" ? "rgba(0,0,0,0.48)" : undefined,
                textShadow: textStyle === "label" ? undefined : textColor === "#111111" ? "0 1px 8px rgba(255,255,255,0.8)" : "0 2px 10px rgba(0,0,0,0.9)",
              }}
            >
              {text || "نص قصتك"}
            </p>
          </div>
        )}

        {/* حقل النص */}
        <div>
          <textarea
            className="w-full bg-chip rounded-2xl px-4 py-3 text-sm outline-none"
            rows={2}
            maxLength={40}
            value={mode === "image" ? caption : text}
            ref={textInputRef}
            onChange={(e) => (mode === "image" ? setCaption(e.target.value) : setText(e.target.value))}
            placeholder={mode === "image" ? "أضف تعليقاً فوق الصورة (اختياري، اسحبه لتحريكه)" : "اكتب قصتك (حتى 40 حرفاً)"}
          />
          <p className="text-xs text-muted mt-1 text-left" dir="ltr">
            {(mode === "image" ? caption : text).length}/40
          </p>
        </div>

        {/* ألوان الخلفية - فقط لوضع النص */}
        {mode === "text" && (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                const current = STORY_COLORS.indexOf(color);
                setColor(STORY_COLORS[(current + 1) % STORY_COLORS.length]);
              }}
              aria-label="تغيير لون الخلفية"
              title="تغيير لون الخلفية"
              className="relative size-9 overflow-hidden rounded-full border-2 border-white shadow-md transition-transform active:scale-90"
              style={{ background: color }}
            >
              <RefreshCw size={13} className="absolute bottom-0 right-0 rounded-full bg-black/60 p-0.5 text-white" />
            </button>
            <button
              type="button"
              onClick={() => {
                setTextStyle("classic");
                textInputRef.current?.focus();
              }}
              aria-label="كتابة النص بالخط العادي"
              className="flex size-9 items-center justify-center rounded-full bg-chip text-ink"
            >
              <Pencil size={16} />
            </button>
            <span className="text-xs text-muted">حرّك النص أو كبّره بإصبعين</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {STORY_TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setTextColor(c)}
              aria-label={`لون النص ${c}`}
              className="size-7 rounded-full border border-line"
              style={{ background: c, boxShadow: textColor === c ? "0 0 0 2px #faf8f5, 0 0 0 4px #111" : "none" }}
            />
          ))}
          <span className="text-xs text-muted">اسحب النص، وقرّبه أو باعد إصبعيك لتغيير حجمه</span>
        </div>

        <Dropdown direction="up" options={[{ value: "", label: "بدون رابط منتج" }, ...products.map((p) => ({ value: p.id, label: p.title }))]} value={productId} onChange={setProductId} className="bg-chip rounded-2xl px-4 py-3 text-sm outline-none" />

        {err && <Notice type="error">{err}</Notice>}

        {/* زر النشر - أسود واضح */}
        <button
          onClick={send}
          disabled={busy || (mode === "text" ? !text.trim() : !imageFile)}
          className="bg-black text-white rounded-pill py-3.5 text-sm font-bold disabled:opacity-40 shadow-lg"
        >
          {busy ? "جارٍ النشر…" : "نشر القصة"}
        </button>
      </div>

      {rows.length > 0 && (
        <div>
          <h3 className="font-display text-[17px] mb-3">قصصي النشطة</h3>
          <div className="flex flex-col gap-3">
            {rows.map((r, idx) => (
              <div key={r.id} className="bg-card rounded-card p-3 shadow-soft flex items-center gap-3">
                <button onClick={() => setViewIdx(idx)} className="flex-1 min-w-0 flex items-center gap-3 text-right">
                  {r.image_url ? (
                    <img src={r.image_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-9 h-9 rounded-full shrink-0" style={{ background: parseStoryAppearance(r.bg_color).background }} />
                  )}
                  <span className="text-sm truncate flex-1">{r.text || "بدون تعليق"}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted shrink-0">
                    <Eye size={14} />
                    {r.story_views?.[0]?.count ?? 0}
                  </span>
                </button>
                <button
                  onClick={() => remove(r.id)}
                  aria-label="حذف"
                  className="w-9 h-9 rounded-full bg-chip flex items-center justify-center shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewIdx !== null && (
        <StoryViewer
          merchant={merchant}
          stories={rows}
          viewerId={profile.id}
          startIndex={viewIdx}
          onClose={() => {
            setViewIdx(null);
            load();
          }}
        />
      )}
    </div>
  );
}
