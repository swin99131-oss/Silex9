"use client";

import { useEffect, useRef, useState } from "react";
import { X, ImagePlus, RotateCcw } from "lucide-react";

export type CapturedMedia = { type: "image" | "video"; blob: Blob; url: string };

const LONG_PRESS_MS = 350;
const MAX_VIDEO_MS = 15000;

export function StoryCamera({
  onClose,
  onCaptured,
}: {
  onClose: () => void;
  onCaptured: (media: CapturedMedia) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordStart = useRef<number>(0);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [err, setErr] = useState("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startStream() {
    stopStream();
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setErr("تعذّر الوصول إلى الكاميرا. تأكد من منح الإذن، أو استخدم المعرض بدلاً منها.");
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    startStream();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // انعكاس الصورة أفقياً للكاميرا الأمامية فقط (مرآة طبيعية)
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCaptured({ type: "image", blob, url: URL.createObjectURL(blob) });
      },
      "image/jpeg",
      0.9
    );
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      if (blob.size > 0) {
        onCaptured({ type: "video", blob, url: URL.createObjectURL(blob) });
      }
    };
    rec.start();
    recorderRef.current = rec;
    recordStart.current = Date.now();
    setRecording(true);
    setRecordMs(0);
    tickRef.current = setInterval(() => setRecordMs(Date.now() - recordStart.current), 100);
    maxTimer.current = setTimeout(() => stopRecording(), MAX_VIDEO_MS);
  }

  function stopRecording() {
    if (maxTimer.current) clearTimeout(maxTimer.current);
    if (tickRef.current) clearInterval(tickRef.current);
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function onPressStart() {
    pressTimer.current = setTimeout(() => {
      startRecording();
    }, LONG_PRESS_MS);
  }

  function onPressEnd() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (recording) {
      stopRecording();
    } else if (!recorderRef.current || recorderRef.current.state === "inactive") {
      // لمسة قصيرة = صورة (بس لو ماكانش في تسجيل شغال بالفعل)
      if (recordMs === 0) takePhoto();
    }
  }

  function pickFromGallery(file: File) {
    const isVideo = file.type.startsWith("video/");
    onCaptured({ type: isVideo ? "video" : "image", blob: file, url: URL.createObjectURL(file) });
  }

  const seconds = Math.floor(recordMs / 1000);

  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
      <div className="relative w-full h-full md:max-w-[400px] md:h-[88vh] md:rounded-[28px] overflow-hidden bg-black flex flex-col">
        {/* معاينة الكاميرا */}
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }}
          />
          {err && (
            <div className="absolute inset-0 flex items-center justify-center px-8">
              <p className="text-white text-sm text-center">{err}</p>
            </div>
          )}
        </div>

        {/* الرأس */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
          >
            <X size={18} />
          </button>

          {recording && (
            <div className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold" dir="ltr">
              ● {seconds}s
            </div>
          )}

          <button
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
            aria-label="تبديل الكاميرا"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="flex-1" />

        {/* أدوات أسفل الشاشة */}
        <div className="relative z-10 px-6 pb-8 flex items-center justify-between">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-white"
            aria-label="اختر من المعرض"
          >
            <ImagePlus size={18} />
          </button>

          {/* دائرة الالتقاط - لمسة = صورة، مطوّلة = فيديو */}
          <button
            onPointerDown={onPressStart}
            onPointerUp={onPressEnd}
            onPointerLeave={() => {
              if (recording) stopRecording();
              if (pressTimer.current) {
                clearTimeout(pressTimer.current);
                pressTimer.current = null;
              }
            }}
            aria-label="التقاط"
            className="w-[72px] h-[72px] rounded-full border-[4px] border-white flex items-center justify-center touch-none select-none"
          >
            <span
              className={`rounded-full bg-white transition-all ${recording ? "w-7 h-7 !rounded-md bg-red-500" : "w-[58px] h-[58px]"}`}
            />
          </button>

          <div className="w-11 h-11" />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFromGallery(f);
          }}
        />
      </div>
    </div>
  );
}
