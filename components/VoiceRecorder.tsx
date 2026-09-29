"use client";

import { useRef, useState, useEffect } from "react";
import { Mic, Square, Send, Trash2, Play, Pause } from "lucide-react";

const BAR_HEIGHTS = [6, 14, 9, 18, 11, 20, 8, 16, 12, 22, 7, 15, 10, 19, 13, 6, 14, 9, 18, 11];
const MAX_SECONDS = 300;

export function VoiceRecorder({
  onSend,
  onCancel,
}: {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_SECONDS) {
            mr.stop();
            if (timerRef.current) clearInterval(timerRef.current);
            setRecording(false);
          }
          return next;
        });
      }, 1000);
    } catch {
      onCancel();
      alert("يرجى السماح باستخدام الميكروفون");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  function discard() {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current?.stop();
    setBlob(null);
    setPreviewUrl(null);
    setSeconds(0);
    onCancel();
  }

  function send() {
    if (!blob) return;
    onSend(blob, seconds);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const r = (s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  }

  // شريط الموجات الوهمية أثناء التسجيل
  const Waveform = ({ animated }: { animated: boolean }) => (
    <div className="flex items-center gap-[3px] h-6 flex-1 overflow-hidden">
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-ink/70 ${animated ? "animate-pulse" : ""}`}
          style={{
            height: `${h}px`,
            animationDelay: `${i * 80}ms`,
            opacity: animated ? undefined : 0.35,
          }}
        />
      ))}
    </div>
  );

  // معاينة قبل الإرسال
  if (blob && previewUrl) {
    return (
      <div className="flex items-center gap-3 bg-chip rounded-2xl px-3 py-2.5">
        <button onClick={discard} className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 shrink-0">
          <Trash2 size={16} />
        </button>

        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center shrink-0"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <div className="flex-1 h-1 rounded-full bg-line/60 overflow-hidden">
          <div className="h-full bg-ink transition-all" style={{ width: `${progress}%` }} />
        </div>

        <span className="text-xs text-muted shrink-0 font-mono">{fmt(seconds)}</span>

        <audio
          ref={audioRef}
          src={previewUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            if (a.duration) setProgress((a.currentTime / a.duration) * 100);
          }}
          className="hidden"
        />

        <button onClick={send} className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center shrink-0">
          <Send size={15} />
        </button>
      </div>
    );
  }

  // أثناء التسجيل
  return (
    <div className="flex items-center gap-3 bg-chip rounded-2xl px-3 py-2.5">
      <button onClick={discard} className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 shrink-0">
        <Trash2 size={16} />
      </button>

      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />

      <Waveform animated={recording} />

      <span className="text-xs text-ink/70 shrink-0 font-mono">{fmt(seconds)}</span>

      <button
        onClick={stopRecording}
        className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center shrink-0"
      >
        <Square size={13} className="fill-white" />
      </button>
    </div>
  );
}
