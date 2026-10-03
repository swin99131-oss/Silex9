"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, Tag, Check, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  encodeStoryAppearance,
  STORY_COLORS,
  STORY_TEXT_COLORS,
  type Profile,
  type StoryTextStyle,
} from "@/lib/types";
import type { CapturedMedia } from "./StoryCamera";

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
            className="absolute cursor-move select-none touch-none w-[80%] max-w-[260px] z-[1]"
            style={{ left: `${textPos.x}%`, top: `${textPos.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="اكتب هنا"
              rows={2}
              dir="auto"
              onPointerDown={(e) => e.stopPropagation()}
              className={`w-full resize-none text-center leading-normal outline-none ${textStyle === "strong" ? "font-black" : "font-semibold"} ${textStyle === "label" ? "rounded-xl px-3 py-2" : "bg-transparent"} placeholder:text-white/50`}
              style={{
                color: textColor,
                fontSize: textSize,
                background: textStyle === "label" ? "rgba(0,0,0,0.48)" : undefined,
                textShadow: hasMedia && textStyle !== "label" ? "0 1px 8px rgba(0,0,0,0.65)" : "none",
              }}
            />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between px-4 pt-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-black/35 flex items-center justify-center text-white"
          >
            <ChevronRight size={18} />
          </button>

          <div className="flex items-center gap-2">


            {products.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowProducts((v) => !v)}
                  aria-label="ربط منتج"
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    productId ? "bg-white text-black" : "bg-black/35 text-white"
                  }`}
                >
                  <Tag size={15} />
                </button>
                {showProducts && (
                  <div className="absolute left-0 top-11 bg-neutral-800 rounded-2xl p-2 flex flex-col gap-1 shadow-xl z-20 w-44 max-h-52 overflow-y-auto">
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
                        {productId === p.id && <Check size={13} className="shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/35 flex items-center justify-center text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="relative z-10 self-center -mt-1 px-3 py-1 rounded-full bg-black/35 text-white text-[10px]" dir="ltr">
          {text.length}/{MAX_CHARS}
        </div>

        {!hasMedia && (
          <div className="relative z-10 flex items-center gap-3 overflow-x-auto no-scrollbar px-4 pb-3">
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

        <div className="relative z-10 mx-auto flex items-center gap-2 rounded-full bg-black/45 px-3 py-2">
          {STORY_TEXT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setTextColor(c)}
              aria-label={`لون النص ${c}`}
              className="size-6 rounded-full border border-white/70"
              style={{ background: c, boxShadow: textColor === c ? "0 0 0 2px #111, 0 0 0 3px #fff" : "none" }}
            />
          ))}
          <span className="mx-1 h-5 w-px bg-white/30" />
          {([
            ["classic", "عادي"],
            ["strong", "عريض"],
            ["label", "خلفية"],
          ] as [StoryTextStyle, string][]).map(([style, label]) => (
            <button
              key={style}
              onClick={() => setTextStyle(style)}
              aria-pressed={textStyle === style}
              className={`rounded-full px-2.5 py-1 text-[10px] ${textStyle === style ? "bg-white text-black" : "text-white"}`}
            >
              {label}
            </button>
          ))}
          <input
            type="range"
            min={18}
            max={42}
            value={textSize}
            aria-label="حجم النص"
            onChange={(e) => setTextSize(Number(e.target.value))}
            className="w-14 accent-white"
          />
        </div>

        <div className="flex-1" />

        <div className="relative z-10 px-4 pb-6 pt-3 flex flex-col gap-2">
          {err && (
            <p className="text-xs text-red-300 bg-red-500/15 rounded-xl px-3 py-2 text-center">{err}</p>
          )}
          <button
            onClick={publish}
            disabled={busy}
            className="h-12 rounded-full bg-white text-black text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                جارٍ النشر… {progress}%
              </>
            ) : (
              "مشاركة القصة"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
