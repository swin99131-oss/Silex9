"use client";

import { Notice } from "@/components/ui/Notice";
import { Dropdown } from "@/components/ui/Dropdown";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Trash2, ImagePlus, X, Type } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { STORY_COLORS, type Profile, type Story, type StoryMerchant } from "@/lib/types";
import { StoryViewer } from "./StoryViewer";

type Row = Story & { story_views: { count: number }[] };

export function StoryStudio({ profile }: { profile: Profile }) {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [color, setColor] = useState(STORY_COLORS[0]);
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
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

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

  // سحب موضع النص فوق الصورة
  function onPointerDown() {
    dragging.current = true;
  }
  function onPointerUp() {
    dragging.current = false;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
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
      bg_color: color,
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
                className="absolute font-display text-white text-[15px] text-center leading-snug break-words px-2 cursor-move"
                style={{
                  left: `${capPos.x}%`,
                  top: `${capPos.y}%`,
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
            className="mx-auto w-[150px] aspect-[9/16] rounded-card flex items-center justify-center p-4 text-center text-white font-display text-[15px] leading-snug break-words"
            style={{ background: color }}
          >
            {text || "نص قصتك"}
          </div>
        )}

        {/* حقل النص */}
        <div>
          <textarea
            className="w-full bg-chip rounded-2xl px-4 py-3 text-sm outline-none"
            rows={2}
            maxLength={40}
            value={mode === "image" ? caption : text}
            onChange={(e) => (mode === "image" ? setCaption(e.target.value) : setText(e.target.value))}
            placeholder={mode === "image" ? "أضف تعليقاً فوق الصورة (اختياري، اسحبه لتحريكه)" : "اكتب قصتك (حتى 40 حرفاً)"}
          />
          <p className="text-xs text-muted mt-1 text-left" dir="ltr">
            {(mode === "image" ? caption : text).length}/40
          </p>
        </div>

        {/* ألوان الخلفية - فقط لوضع النص */}
        {mode === "text" && (
          <div className="flex gap-3 justify-center">
            {STORY_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c}
                className={`w-8 h-8 rounded-full ${color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-card" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        )}

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
                    <span className="w-9 h-9 rounded-full shrink-0" style={{ background: r.bg_color }} />
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
