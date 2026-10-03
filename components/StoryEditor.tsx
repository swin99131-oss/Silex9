"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, Tag, Check, ChevronRight, Type } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  encodeStoryAppearance,
  STORY_COLORS,
  STORY_TEXT_COLORS,
  type Profile,
  type StoryTextStyle,
} from "@/lib/types";
import type { CapturedMedia } from "./StoryCamera";

const STYLE_LABEL: Partial<Record<StoryTextStyle, string>> = { classic: "عادي", strong: "عريض", label: "خلفية" };

export function StoryEditor({
  profile,
  products,
  initialMedia,
  onClose,
  onBack,
  onPublished,
}: {
  profile: Profile;
  products: { id: string; title: string }[];
  initialMedia: CapturedMedia | null;
  onBack: () => void;
  onClose: () => void;
  onPublished: (newStoryId: string) => void;
}) {
  const [text, setText] = useState("");
  const [color, setColor] = useState(STORY_COLORS[0]);
  const [textColor, setTextColor] = useState(STORY_TEXT_COLORS[0]);
  const [textStyle, setTextStyle] = useState<StoryTextStyle>("classic");
  const [textSize, setTextSize] = useState(28);
  const [productId, setProductId] = useState("");
  const [showProducts, setShowProducts] = useState(false);
  const [textPos, setTextPos] = useState({ x: 50, y: 50 });

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const MAX_CHARS = 40;

  const hasMedia = !!initialMedia;
  const isVideo = initialMedia?.type === "video";

  useEffect(() => {
    return () => {
      if (initialMedia) URL.revokeObjectURL(initialMedia.url);
    };
  }, [initialMedia]);

  function startDrag(e: React.PointerEvent) {
    dragging.current = true;
  }
  function endDrag() {
    dragging.current = false;
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTextPos({ x: Math.min(90, Math.max(10, x)), y: Math.min(90, Math.max(10, y)) });
  }

  async function publish() {
    const t = text.trim();
    if (!hasMedia && !t) {
      setErr("اكتب نصاً أو أضف وسائط");
      return;
    }

    setBusy(true);
    setErr("");
    setProgress(15);

    let imageUrl: string | null = null;
    let videoUrl: string | null = null;
    let mediaType: "text" | "image" | "video" = "text";

    if (initialMedia) {
      const ext = initialMedia.type === "video" ? "webm" : "jpg";
      const path = `${profile.id}/${Date.now()}.${ext}`;
      setProgress(35);
      const { error: upErr } = await supabase.storage
        .from("stories")
        .upload(path, initialMedia.blob, { contentType: initialMedia.blob.type });
      if (upErr) {
        setErr(`تعذّر رفع الملف: ${upErr.message}`);
        setBusy(false);
        setProgress(0);
        return;
      }
      setProgress(75);
      const { data } = supabase.storage.from("stories").getPublicUrl(path);
      if (initialMedia.type === "video") {
        videoUrl = data.publicUrl;
        mediaType = "video";
      } else {
        imageUrl = data.publicUrl;
        mediaType = "image";
      }
    }

    setProgress(90);
    const { data: inserted, error } = await supabase
      .from("stories")
      .insert({
        merchant_id: profile.id,
        text: t,
        bg_color: encodeStoryAppearance({ background: color, textColor, textStyle, textSize, ...textPos }),
        image_url: imageUrl,
        video_url: videoUrl,
        media_type: mediaType,
        product_id: productId || null,
      })
      .select("id")
      .single();

    setProgress(100);

    if (error || !inserted) {
      setErr(`تعذّر النشر: ${error?.message ?? "خطأ غير معروف"}`);
      setBusy(false);
      setProgress(0);
      return;
    }

    setTimeout(() => {
      setBusy(false);
      onPublished(inserted.id);
    }, 200);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      <div className="relative w-full h-full md:max-w-[400px] md:h-[88vh] md:rounded-[28px] overflow-hidden bg-black flex flex-col">
        {/* منطقة القصة */}
        <div
          ref={canvasRef}
          onPointerMove={onMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className="absolute inset-0"
          style={{ background: hasMedia ? "#000" : color }}
        >
          {hasMedia && !isVideo && (
            <img src={initialMedia!.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {hasMedia && isVideo && (
            <video
              ref={videoPreviewRef}
              src={initialMedia!.url}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          )}

          {hasMedia && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />
          )}

          <div
            onPointerDown={startDrag}
            className="absolute cursor-move select-none touch-none w-[84%] max-w-[280px] z-[1]"
            style={{ left: `${textPos.x}%`, top: `${textPos.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="اكتب هنا"
              rows={2}
              dir="auto"
              onPointerDown={(e) => e.stopPropagation()}
              className={`w-full resize-none text-center leading-relaxed outline-none ${
                textStyle === "strong" ? "font-black" : "font-semibold"
              } ${textStyle === "label" ? "rounded-xl px-4 py-2" : "bg-transparent"} placeholder:text-white/50`}
              style={{
                color: textColor,
                fontSize: textSize,
                background: textStyle === "label" ? "rgba(0,0,0,0.6)" : undefined,
                textShadow: hasMedia && textStyle !== "label" ? "0 2px 10px rgba(0,0,0,0.8)" : "none",
              }}
            />
          </div>
        </div>

        {/* الشريط العلوي */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-4">
          <button
            onClick={onBack}
            aria-label="رجوع"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition"
          >
            <ChevronRight size={20} />
          </button>

          <span className="rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-[10px] text-white" dir="ltr">
            {text.length}/{MAX_CHARS}
          </span>

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* الأدوات الجانبية */}
        <div className="absolute top-20 left-4 z-20 flex flex-col items-center gap-3">
          {products.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowProducts((v) => !v)}
                aria-label="ربط منتج"
                className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition shadow-lg ${
                  productId ? "bg-white text-black" : "bg-black/40 text-white hover:bg-black/60"
                }`}
              >
                <Tag size={19} />
              </button>

              {showProducts && (
                <div className="absolute left-14 top-0 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl z-30 w-48 max-h-56 overflow-y-auto">
                  <button
                    onClick={() => {
                      setProductId("");
                      setShowProducts(false);
                    }}
                    className="text-right px-3 py-2 rounded-xl text-xs text-white/70 hover:bg-white/10 flex items-center justify-between"
                  >
                    بدون منتج
                    {!productId && <Check size={13} />}
                  </button>
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setProductId(p.id);
                        setShowProducts(false);
                      }}
                      className="text-right px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{p.title}</span>
                      {productId === p.id && <Check size={13} className="shrink-0 text-amber-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => {
                if (textStyle === "classic") setTextStyle("strong");
                else if (textStyle === "strong") setTextStyle("label");
                else setTextStyle("classic");
              }}
              aria-label="نمط الخط"
              className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition shadow-lg"
            >
              <Type size={19} />
            </button>
            <span className="text-[10px] text-white/90 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">
              {STYLE_LABEL[textStyle] ?? ""}
            </span>
          </div>
        </div>

        {/* الجزء السفلي */}
        <div className="relative z-20 mt-auto pb-6 pt-3 flex flex-col gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {!hasMedia && (
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-4">
              {STORY_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className="w-11 h-11 rounded-full shrink-0 border-2 transition-transform duration-150"
                  style={{
                    background: c,
                    borderColor: color === c ? "#ffffff" : "transparent",
                    transform: color === c ? "scale(1.12)" : "scale(1)",
                    boxShadow: color === c ? "0 2px 10px rgba(0,0,0,0.4)" : "none",
                  }}
                />
              ))}
            </div>
          )}

          <div className="mx-4 flex items-center justify-center gap-3 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
            <div className="flex items-center gap-1.5">
              {STORY_TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTextColor(c)}
                  aria-label={`لون النص ${c}`}
                  className="w-5 h-5 rounded-full border border-white/50 transition-transform"
                  style={{
                    background: c,
                    transform: textColor === c ? "scale(1.2)" : "scale(1)",
                    boxShadow: textColor === c ? "0 0 0 2px #fff" : "none",
                  }}
                />
              ))}
            </div>

            <div className="w-px h-4 bg-white/20 mx-1" />

            <input
              type="range"
              min={18}
              max={42}
              value={textSize}
              aria-label="حجم النص"
              onChange={(e) => setTextSize(Number(e.target.value))}
              className="w-20 accent-white cursor-pointer"
            />
          </div>

          {err && (
            <p className="mx-4 text-xs text-red-300 bg-red-500/20 backdrop-blur-md rounded-xl px-3 py-2 text-center border border-red-500/30">
              {err}
            </p>
          )}

          <button
            onClick={publish}
            disabled={busy}
            className="mx-4 h-12 rounded-full bg-white text-black text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-xl hover:bg-neutral-100 transition active:scale-[0.98]"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>جارٍ النشر… {progress}%</span>
              </>
            ) : (
              <span>مشاركة القصة</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
