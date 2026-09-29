"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { supabase } from "@/lib/supabase";

const BARS = [8, 14, 20, 12, 24, 10, 18, 15, 22, 9, 16, 20, 11, 19, 13, 21, 8, 17, 12, 15];

export function VoiceMessage({ path, isMe }: { path: string; isMe: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.storage
      .from("chat")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (alive && data) setUrl(data.signedUrl);
      });
    return () => {
      alive = false;
    };
  }, [path]);

  function toggle() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const r = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  }

  if (!url) {
    return <div className="w-48 h-11 rounded-2xl bg-line/30 animate-pulse" />;
  }

  const barColor = isMe ? "bg-white" : "bg-ink";
  const barDim = isMe ? "bg-white/30" : "bg-ink/25";

  return (
    <div className="flex items-center gap-2.5 w-52">
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          isMe ? "bg-white/20" : "bg-ink text-white"
        }`}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-[2.5px] h-6">
          {BARS.map((h, i) => {
            const barProgress = (i / BARS.length) * 100;
            const active = barProgress <= progress;
            return (
              <span
                key={i}
                className={`w-[3px] rounded-full transition-colors ${active ? barColor : barDim}`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <span className={`text-[10px] font-mono ${isMe ? "text-white/70" : "text-muted"}`}>
          {duration ? fmt(playing || currentTime > 0 ? currentTime : duration) : "..."}
        </span>
      </div>

      <audio
        ref={audioRef}
        src={url}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCurrentTime(a.currentTime);
          if (a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        className="hidden"
      />
    </div>
  );
}
