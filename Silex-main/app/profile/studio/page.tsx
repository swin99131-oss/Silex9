"use client";

import { Dropdown } from "@/components/ui/Dropdown";
import { Notice } from "@/components/ui/Notice";
import { toast } from "sonner";
import { PageLoading } from "@/components/ui/Skeleton";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Check, Play, AlertCircle, RefreshCw, Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { getCategories, type Category } from "@/lib/catalog";

type Step = "media" | "details" | "publishing" | "done";

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
const IMG_OK = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
const VID_OK = ["video/mp4", "video/quicktime", "video/webm"];

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};
const toEnglishDigits = (s: string) => s.replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS[d] ?? d);

function explain(e: any): string {
  const m = String(e?.message || e || "").toLowerCase();
  if (!navigator.onLine || m.includes("failed to fetch") || m.includes("network"))
    return "فشل النشر بسبب ضعف أو انقطاع الإنترنت. تحقق من الاتصال وحاول مجدداً.";
  if (m.includes("payload") || m.includes("too large") || m.includes("size"))
    return "فشل النشر: حجم الملف كبير جداً.";
  if (m.includes("mime") || m.includes("type") || m.includes("not supported"))
    return "فشل النشر: نوع الملف غير مدعوم.";
  if (m.includes("row-level") || m.includes("policy") || m.includes("permission") || m.includes("jwt"))
    return "فشل النشر: لا تملك صلاحية النشر. سجّل الدخول مجدداً.";
  if (m.includes("bucket")) return "فشل النشر: مخزن الملفات غير مهيأ في الخادم.";
  return `فشل النشر: ${e?.message || "خطأ غير معروف"}`;
}

function captureFrame(file: File, atSeconds: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    const cleanup = () => URL.revokeObjectURL(url);
    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 8000);
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(atSeconds, Math.max(0, v.duration - 0.1));
    };
    v.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        clearTimeout(timer);
        cleanup();
        resolve(null);
        return;
      }
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (b) => {
          clearTimeout(timer);
          cleanup();
          resolve(b);
        },
        "image/jpeg",
        0.85
      );
    };
    v.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve(null);
    };
  });
}

export default function StudioPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useProfile();

  const [step, setStep] = useState<Step>("media");
  const [cats, setCats] = useState<Category[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);

  const [thumbBlob, setThumbBlob] = useState<Blob | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [thumbSeed, setThumbSeed] = useState(1);
  const [thumbBusy, setThumbBusy] = useState(false);

  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [caption, setCaption] = useState("");
  const [promote, setPromote] = useState(false);

  const [progress, setProgress] = useState(0);
  const [pickErr, setPickErr] = useState("");
  const [err, setErr] = useState("");
  const [fieldErr, setFieldErr] = useState<{ category?: string; title?: string; price?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCategories().then((c) => {
      console.log("CATEGORIES LOADED:", c);
      setCats(c);
    });
  }, []);

  if (authLoading) return <PageLoading />;
  if (!user) {
    router.replace("/login");
    return null;
  }
  if (profile && profile.role !== "merchant") {
    router.replace("/profile");
    return null;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const video = f.type.startsWith("video");
    const okType = video ? VID_OK.includes(f.type) : IMG_OK.includes(f.type);
    if (!okType) {
      setPickErr("هذا النوع من الملفات غير مدعوم. اختر صورة (JPG/PNG/WEBP) أو فيديو (MP4/MOV).");
      return;
    }
    if (f.size > (video ? MAX_VIDEO : MAX_IMAGE)) {
      setPickErr(video ? "الفيديو أكبر من 50 ميغابايت." : "الصورة أكبر من 10 ميغابايت.");
      return;
    }
    setPickErr("");
    setFile(f);
    setIsVideo(video);
    setPreview(URL.createObjectURL(f));

    if (video) {
      setThumbBusy(true);
      const blob = await captureFrame(f, 1);
      setThumbBlob(blob);
      if (blob) setThumbPreview(URL.createObjectURL(blob));
      setThumbBusy(false);
    } else {
      setThumbBlob(null);
      setThumbPreview(null);
    }
    setStep("details");
  }

  async function refreshCover() {
    if (!file || !isVideo) return;
    setThumbBusy(true);
    const nextSeed = thumbSeed + 2;
    setThumbSeed(nextSeed);
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    const blob = await captureFrame(file, nextSeed);
    setThumbBlob(blob);
    if (blob) setThumbPreview(URL.createObjectURL(blob));
    setThumbBusy(false);
  }

  function goBack() {
    if (step === "details") setStep("media");
    else router.back();
  }

  async function publish() {
    if (!file) return;
    const priceNum = Number(toEnglishDigits(price).replace(/[^\d.]/g, ""));
    const errors: { category?: string; title?: string; price?: string } = {};
    if (!category) errors.category = "اختر التصنيف";
    if (title.trim().length < 3) errors.title = "العنوان قصير جداً (3 أحرف على الأقل)";
    if (!priceNum || priceNum <= 0) errors.price = "أدخل سعراً صحيحاً";
    else if (priceNum > 1000000) errors.price = "السعر مرتفع جداً";
    setFieldErr(errors);
    if (Object.keys(errors).length) {
      if (errors.category) toast.error(errors.category);
      return;
    }

    setStep("publishing");
    setErr("");
    setProgress(8);
    const tick = setInterval(() => setProgress((p) => (p < 80 ? p + 4 : p)), 350);

    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("posts").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: mediaData } = supabase.storage.from("posts").getPublicUrl(path);

      let thumbUrl: string | null = null;
      if (isVideo && thumbBlob) {
        const thumbPath = `${user!.id}/${Date.now()}-cover.jpg`;
        const { error: thumbErr } = await supabase.storage
          .from("posts")
          .upload(thumbPath, thumbBlob, { contentType: "image/jpeg" });
        if (!thumbErr) {
          thumbUrl = supabase.storage.from("posts").getPublicUrl(thumbPath).data.publicUrl;
        }
      }

      setProgress(88);

      // 1) إنشاء المنتج
      const { data: newProduct, error: prodErr } = await supabase
        .from("products")
        .insert({
          merchant_id: user!.id,
          title: title.trim(),
          description: caption.trim() || null,
          price: priceNum,
          category,
          cover_url: isVideo ? thumbUrl ?? mediaData.publicUrl : mediaData.publicUrl,
          promoted: promote,
        })
        .select("id")
        .single();
      if (prodErr) throw prodErr;

      setProgress(94);

      // 2) إنشاء المنشور المرتبط
      const tags = Array.from(new Set(caption.match(/#[^\s#]+/g)?.map((t) => t.slice(1)) ?? []));
      const { error: postErr } = await supabase.from("posts").insert({
        user_id: user!.id,
        product_id: newProduct.id,
        category,
        title: title.trim(),
        caption: caption.trim() || null,
        hashtags: tags.length ? tags : null,
        image_url: mediaData.publicUrl,
        thumb_url: thumbUrl,
        media_type: isVideo ? "video" : "image",
      });
      if (postErr) throw postErr;

      clearInterval(tick);
      setProgress(100);
      setStep("done");
      setTimeout(() => router.push("/profile"), 1000);
    } catch (e: any) {
      clearInterval(tick);
      console.error("RAW PUBLISH ERROR:", e);
      console.error("RAW PUBLISH ERROR JSON:", JSON.stringify(e, null, 2));
      setErr(explain(e));
      setStep("details");
    }
  }

  const titles: Record<Step, string> = {
    media: "أضف محتوى",
    details: "تفاصيل المنتج",
    publishing: "جارٍ النشر...",
    done: "تم النشر",
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="flex items-center gap-3 px-6 pt-6 pb-3">
        {step !== "publishing" && step !== "done" && (
          <button onClick={goBack} aria-label="رجوع" className="w-9 h-9 rounded-full bg-chip flex items-center justify-center">
            <ChevronRight size={18} />
          </button>
        )}
        <h1 className="font-display text-[18px] flex-1">{titles[step]}</h1>
        {(step === "media" || step === "details") && (
          <span className="text-xs text-muted">{step === "media" ? 1 : 2}/2</span>
        )}
      </div>

      {/* المرحلة 1: رفع الوسائط */}
      {step === "media" && (
        <div className="px-6 mt-6 max-w-sm mx-auto w-full flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="إضافة"
            className="w-full aspect-square rounded-3xl border-2 border-dashed border-ink/25 bg-transparent flex items-center justify-center hover:bg-chip transition-colors"
          >
            <Plus size={44} strokeWidth={1.6} className="text-ink/60" />
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
          <p className="text-xs text-muted text-center">صورة (حتى 10MB) أو فيديو (حتى 50MB)</p>
          {pickErr && (
            <Notice type="error">{pickErr}</Notice>
          )}
        </div>
      )}

      {/* المرحلة 2: تفاصيل المنتج + غلاف الفيديو + ترويج + نشر */}
      {step === "details" && (
        <div className="px-6 mt-4 max-w-sm mx-auto w-full flex flex-col gap-4 pb-8">
          <div className="relative aspect-square rounded-2xl bg-chip overflow-hidden">
            {preview &&
              (isVideo ? (
                <video src={preview} muted playsInline className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs"
            >
              تغيير
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />

          {/* غلاف الفيديو */}
          {isVideo && (
            <div className="bg-card rounded-2xl p-3 shadow-soft flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-chip shrink-0">
                {thumbBusy ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                  </div>
                ) : thumbPreview ? (
                  <img src={thumbPreview} alt="غلاف الفيديو" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play size={18} className="text-ink/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">غلاف الفيديو</p>
                <p className="text-[11px] text-muted mt-0.5">يظهر كصورة مصغّرة للمنشور</p>
              </div>
              <button
                type="button"
                onClick={refreshCover}
                disabled={thumbBusy}
                aria-label="تجديد الغلاف"
                className="w-9 h-9 rounded-full bg-chip flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                <RefreshCw size={15} className={thumbBusy ? "animate-spin" : ""} />
              </button>
            </div>
          )}

          {/* التصنيف */}
          <div>
            <p className="text-[11px] text-muted mb-1.5 px-1">التصنيف</p>
            {cats.length === 0 ? (
              <Notice type="error">لا توجد تصنيفات متاحة حالياً. تواصل مع الدعم.</Notice>
            ) : (
              <Dropdown options={cats.map((c) => ({ value: c.id, label: c.name }))} value={category} onChange={setCategory} placeholder="اختر التصنيف" />
            )}
          </div>

          {/* العنوان */}
          <div>
            <p className="text-[11px] text-muted mb-1.5 px-1">عنوان المنتج</p>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value.slice(0, 80)); setFieldErr((f) => ({ ...f, title: undefined })); }}
              placeholder="مثال: حقيبة جلد طبيعي"
              className="w-full bg-chip rounded-2xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-ink/20"
            />
            {fieldErr.title && <p className="text-[11px] text-red-600 mt-1 px-1">{fieldErr.title}</p>}
          </div>

          {/* السعر */}
          <div>
            <p className="text-[11px] text-muted mb-1.5 px-1">السعر</p>
            <input
              value={price}
              onChange={(e) => { const v = toEnglishDigits(e.target.value).replace(/[^\d.]/g, ""); const parts = v.split("."); setPrice(parts.length > 1 ? parts[0] + "." + parts.slice(1).join("").slice(0, 2) : v); setFieldErr((f) => ({ ...f, price: undefined })); }}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full bg-chip rounded-2xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-ink/20"
            />
            {fieldErr.price && <p className="text-[11px] text-red-600 mt-1 px-1">{fieldErr.price}</p>}
          </div>

          {/* نبذة */}
          <div>
            <p className="text-[11px] text-muted mb-1.5 px-1">نبذة (اختياري)</p>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder="اكتب وصفاً للمنتج..."
              className="w-full bg-chip rounded-2xl p-4 text-sm outline-none resize-none focus:ring-1 focus:ring-ink/20"
            />
          </div>

          {/* ترويج */}
          <button
            type="button"
            onClick={() => setPromote((v) => !v)}
            className={`flex items-center gap-3 rounded-2xl p-4 text-right transition-colors ${
              promote ? "bg-ink text-white" : "bg-chip text-ink"
            }`}
          >
            <Megaphone size={18} className="shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">ترويج هذا المنشور</p>
              <p className={`text-[11px] mt-0.5 ${promote ? "text-white/70" : "text-muted"}`}>
                يظهر بأولوية أعلى للزوار
              </p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              promote ? "border-white bg-white" : "border-ink/30"
            }`}>
              {promote && <Check size={12} className="text-ink" />}
            </div>
          </button>

          {err && <Notice type="error">{err}</Notice>}

          <button onClick={publish} className="w-full bg-ink text-white rounded-pill py-3.5 text-sm font-semibold">
            نشر
          </button>
        </div>
      )}

      {step === "publishing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-10">
          <div className="w-10 h-10 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
          <div className="w-full max-w-xs h-1.5 rounded-full bg-chip overflow-hidden">
            <div className="h-full bg-ink transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-muted">جارٍ رفع المنشور... {progress}%</p>
        </div>
      )}

      {step === "done" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check size={28} className="text-green-600" />
          </div>
          <p className="text-sm font-semibold">تم النشر بنجاح</p>
        </div>
      )}
    </div>
  );
}
