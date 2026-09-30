"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Mic, MicOff, Phone, PhoneOff, User as UserIcon, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
} from "agora-rtc-sdk-ng";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";

type CallKind = "voice" | "video";
type Phase = "idle" | "outgoing" | "incoming" | "connecting" | "connected";
type CallRow = {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  channel_name: string;
  status: string;
  kind: CallKind;
  created_at?: string;
};
type Peer = { name: string; avatar: string | null };

const TERMINAL = ["ended", "missed", "declined"];
const ACTIVE = ["ringing", "connecting", "connected"];
const RING_TIMEOUT_MS = 45_000;
const COLS = "id, conversation_id, caller_id, callee_id, channel_name, status, kind, created_at";

type CallContextType = {
  startCall: (o: { conversationId: string; calleeId: string; kind: CallKind }) => Promise<void>;
  inCall: boolean;
};

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useProfile();
  const uid = user?.id;
  const uidRef = useRef<string | undefined>(uid);
  uidRef.current = uid;

  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<CallRow | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [remoteVideo, setRemoteVideo] = useState<IRemoteVideoTrack | null>(null);
  const [localVideo, setLocalVideo] = useState<ICameraVideoTrack | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const sessionRef = useRef<CallRow | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camRef = useRef<ICameraVideoTrack | null>(null);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringLoop = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const ringAudio = useRef<HTMLAudioElement | null>(null);
  const remoteEl = useRef<HTMLDivElement>(null);
  const localEl = useRef<HTMLDivElement>(null);

  const updatePhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const stopRing = useCallback(() => {
    if (ringLoop.current) {
      clearInterval(ringLoop.current);
      ringLoop.current = null;
    }
    if (ringAudio.current) {
      try {
        ringAudio.current.pause();
        ringAudio.current.currentTime = 0;
      } catch {}
    }
    try {
      navigator.vibrate?.(0);
    } catch {}
  }, []);

  const startRing = useCallback(
    (vibrate: boolean) => {
      stopRing();
      try {
        if (!ringAudio.current) {
          ringAudio.current = new Audio("/sounds/ringtone.wav");
          ringAudio.current.loop = true;
        }
        ringAudio.current.currentTime = 0;
        void ringAudio.current.play().catch(() => {});
      } catch {}
      if (vibrate) {
        const pulse = () => {
          try {
            navigator.vibrate?.([300, 150, 300]);
          } catch {}
        };
        pulse();
        ringLoop.current = setInterval(pulse, 2000);
      }
    },
    [stopRing]
  );

  const loadPeer = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, username, store_name, avatar_url")
      .eq("id", id)
      .maybeSingle();
    const p = data as {
      full_name: string | null;
      username: string | null;
      store_name: string | null;
      avatar_url: string | null;
    } | null;
    setPeer({ name: p?.store_name ?? p?.full_name ?? p?.username ?? "مستخدم", avatar: p?.avatar_url ?? null });
  }, []);

  const cleanup = useCallback(async () => {
    if (ringTimer.current) {
      clearTimeout(ringTimer.current);
      ringTimer.current = null;
    }
    stopRing();
    const mic = micRef.current;
    const cam = camRef.current;
    const client = clientRef.current;
    micRef.current = null;
    camRef.current = null;
    clientRef.current = null;
    sessionRef.current = null;
    try {
      mic?.stop();
      mic?.close();
    } catch {}
    try {
      cam?.stop();
      cam?.close();
    } catch {}
    try {
      await client?.leave();
    } catch {}
    setSession(null);
    setPeer(null);
    setRemoteVideo(null);
    setLocalVideo(null);
    setMuted(false);
    setCamOff(false);
    setSeconds(0);
    updatePhase("idle");
  }, [stopRing, updatePhase]);

  const endCall = useCallback(
    async (notify: boolean) => {
      const s = sessionRef.current;
      const startedSeconds = seconds;
      if (s && notify) {
        const wasConnected = phaseRef.current === "connected";
        const status = wasConnected ? "ended" : phaseRef.current === "outgoing" ? "missed" : "declined";
        const { data: updated } = await supabase
          .from("call_sessions")
          .update({ status, ended_at: new Date().toISOString() })
          .eq("id", s.id)
          .in("status", ACTIVE)
          .select("id");

        // نرسل رسالة الإنهاء فقط من الطرف الذي غيّر الحالة فعلياً أول مرة،
        // لمنع تكرار فقاعة "مكالمة فائتة/منتهية" عند كلا الطرفين
        const iWasFirst = (updated?.length ?? 0) > 0;
        const me = uidRef.current;
        if (me && iWasFirst) {
          const callStatus = wasConnected ? "completed" : phaseRef.current === "outgoing" ? "missed" : "declined";
          const label =
            callStatus === "completed"
              ? `مكالمة ${s.kind === "video" ? "فيديو" : "صوتية"} — ${Math.floor(startedSeconds / 60)
                  .toString()
                  .padStart(2, "0")}:${(startedSeconds % 60).toString().padStart(2, "0")}`
              : callStatus === "missed"
                ? `مكالمة ${s.kind === "video" ? "فيديو" : "صوتية"} فائتة`
                : `مكالمة ${s.kind === "video" ? "فيديو" : "صوتية"} مرفوضة`;

          await supabase.from("messages").insert({
            conversation_id: s.conversation_id,
            sender_id: me,
            content: label,
            media_type: "call",
            call_duration: wasConnected ? startedSeconds : null,
            call_status: callStatus,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", s.conversation_id);
        }
      }
      await cleanup();
    },
    [cleanup, seconds]
  );

  const markConnected = useCallback(async () => {
    if (phaseRef.current === "connected") return;
    updatePhase("connected");
    const s = sessionRef.current;
    if (s && s.callee_id === uidRef.current) {
      sessionRef.current = { ...s, status: "connected" };
      await supabase
        .from("call_sessions")
        .update({ status: "connected", started_at: new Date().toISOString() })
        .eq("id", s.id)
        .eq("status", "connecting");
    }
  }, [updatePhase]);

  const joinChannel = useCallback(
    async (row: CallRow) => {
      updatePhase("connecting");
      try {
        const { data } = await supabase.auth.getSession();
        const jwt = data.session?.access_token;
        const res = await fetch("/api/agora-token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({ sessionId: row.id }),
        });
        if (!res.ok) throw new Error("token");
        const { token, uid: rtcUid, channel, appId } = await res.json();

        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.on("user-published", async (remote, mediaType) => {
          await client.subscribe(remote, mediaType);
          if (mediaType === "audio") remote.audioTrack?.play();
          if (mediaType === "video" && remote.videoTrack) setRemoteVideo(remote.videoTrack);
          void markConnected();
        });
        client.on("user-left", () => {
          void endCall(true);
        });

        await client.join(appId, channel, token, rtcUid);

        const mic = await AgoraRTC.createMicrophoneAudioTrack();
        micRef.current = mic;
        const tracks: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [mic];
        if (row.kind === "video") {
          const cam = await AgoraRTC.createCameraVideoTrack();
          camRef.current = cam;
          setLocalVideo(cam);
          tracks.push(cam);
        }
        await client.publish(tracks);
      } catch (e) {
        console.error(e);
        toast.error("تعذّر بدء المكالمة، تأكد من السماح للمايك");
        await endCall(true);
      }
    },
    [endCall, markConnected, updatePhase]
  );

  const onInsert = useCallback(
    async (row: CallRow) => {
      if (row.status !== "ringing") return;
      if (row.created_at && Date.now() - new Date(row.created_at).getTime() > 40_000) return;
      if (phaseRef.current !== "idle") {
        await supabase
          .from("call_sessions")
          .update({ status: "declined", ended_at: new Date().toISOString() })
          .eq("id", row.id)
          .eq("status", "ringing");
        return;
      }
      sessionRef.current = row;
      setSession(row);
      void loadPeer(row.caller_id);
      updatePhase("incoming");
      startRing(true);
      ringTimer.current = setTimeout(() => {
        if (phaseRef.current === "incoming") void cleanup();
      }, RING_TIMEOUT_MS);
    },
    [cleanup, loadPeer, startRing, updatePhase]
  );

  const onUpdate = useCallback(
    async (row: CallRow) => {
      const s = sessionRef.current;
      if (!s || s.id !== row.id) return;
      if (TERMINAL.includes(row.status)) {
        if (row.status === "declined" && phaseRef.current === "outgoing") toast.info("تم رفض المكالمة");
        else if (phaseRef.current === "connecting" || phaseRef.current === "connected") toast.info("انتهت المكالمة");
        await cleanup();
        return;
      }
      sessionRef.current = { ...s, status: row.status };
      if (row.status === "connecting" && phaseRef.current === "outgoing") {
        if (ringTimer.current) {
          clearTimeout(ringTimer.current);
          ringTimer.current = null;
        }
        stopRing();
        await joinChannel({ ...s, status: "connecting" });
      }
    },
    [cleanup, joinChannel, stopRing]
  );

  const startCall = useCallback(
    async ({ conversationId, calleeId, kind }: { conversationId: string; calleeId: string; kind: CallKind }) => {
      if (!uid) return;
      if (phaseRef.current !== "idle") {
        toast.info("أنت في مكالمة حالياً");
        return;
      }
      const channel = `call_${crypto.randomUUID().replace(/-/g, "")}`;
      const { data, error } = await supabase
        .from("call_sessions")
        .insert({
          conversation_id: conversationId,
          caller_id: uid,
          callee_id: calleeId,
          provider: "agora",
          channel_name: channel,
          status: "ringing",
          kind,
        })
        .select(COLS)
        .single();
      if (error || !data) {
        console.error(error);
        toast.error("تعذّر بدء المكالمة");
        return;
      }
      const row = data as CallRow;
      sessionRef.current = row;
      setSession(row);
      void loadPeer(calleeId);
      updatePhase("outgoing");
      startRing(false);
      ringTimer.current = setTimeout(() => {
        if (phaseRef.current === "outgoing") {
          toast.info("لم يتم الرد");
          void endCall(true);
        }
      }, RING_TIMEOUT_MS);
    },
    [uid, endCall, loadPeer, startRing, updatePhase]
  );

  const acceptCall = async () => {
    const s = sessionRef.current;
    if (!s) return;
    stopRing();
    if (ringTimer.current) {
      clearTimeout(ringTimer.current);
      ringTimer.current = null;
    }
    const { data, error } = await supabase
      .from("call_sessions")
      .update({ status: "connecting" })
      .eq("id", s.id)
      .eq("status", "ringing")
      .select("id");
    if (error || !data || data.length === 0) {
      toast.info("انتهت المكالمة");
      await cleanup();
      return;
    }
    const row = { ...s, status: "connecting" };
    sessionRef.current = row;
    setSession(row);
    await joinChannel(row);
  };

  const declineCall = async () => {
    const s = sessionRef.current;
    stopRing();
    if (s) {
      await supabase
        .from("call_sessions")
        .update({ status: "declined", ended_at: new Date().toISOString() })
        .eq("id", s.id)
        .eq("status", "ringing");
    }
    await cleanup();
  };

  const toggleMute = async () => {
    const next = !muted;
    await micRef.current?.setEnabled(!next);
    setMuted(next);
  };

  const toggleCam = async () => {
    const next = !camOff;
    await camRef.current?.setEnabled(!next);
    setCamOff(next);
  };

  const toggleSpeaker = () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    try {
      const audioEls = document.querySelectorAll("audio");
      audioEls.forEach((el) => {
        (el as HTMLAudioElement).volume = next ? 1 : 0.3;
      });
    } catch {}
  };

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`calls-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_sessions", filter: `callee_id=eq.${uid}` },
        (p) => void onInsert(p.new as CallRow)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_sessions", filter: `callee_id=eq.${uid}` },
        (p) => void onUpdate(p.new as CallRow)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_sessions", filter: `caller_id=eq.${uid}` },
        (p) => void onUpdate(p.new as CallRow)
      )
      .subscribe();

    supabase
      .from("call_sessions")
      .select(COLS)
      .eq("callee_id", uid)
      .eq("status", "ringing")
      .gte("created_at", new Date(Date.now() - 40_000).toISOString())
      .limit(1)
      .then(({ data }) => {
        const r = (data ?? [])[0] as CallRow | undefined;
        if (r) void onInsert(r);
      });

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [uid, onInsert, onUpdate]);

  useEffect(() => {
    if (phase !== "connected") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (remoteVideo && remoteEl.current) remoteVideo.play(remoteEl.current);
  }, [remoteVideo, phase]);

  useEffect(() => {
    if (localVideo && localEl.current) localVideo.play(localEl.current);
  }, [localVideo, phase]);

  const value = useMemo(() => ({ startCall, inCall: phase !== "idle" }), [startCall, phase]);

  const isVideo = session?.kind === "video";
  const showVideo = isVideo && (phase === "connecting" || phase === "connected");
  const statusText =
    phase === "outgoing"
      ? "جارٍ الاتصال..."
      : phase === "incoming"
        ? isVideo
          ? "مكالمة فيديو واردة"
          : "مكالمة صوتية واردة"
        : phase === "connecting"
          ? "جارٍ الربط..."
          : fmt(seconds);
  const btn = "flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-95";
  const inRoom = phase === "connecting" || phase === "connected";

  return (
    <CallContext.Provider value={value}>
      {children}
      {phase !== "idle" && session && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-ink text-white" dir="rtl">
          {showVideo && (
            <>
              <div ref={remoteEl} className="absolute inset-0" />
              <div ref={localEl} className="absolute left-4 top-4 z-10 h-36 w-24 overflow-hidden rounded-2xl bg-black/40" />
            </>
          )}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            {!(showVideo && phase === "connected") && (
              <div className="relative flex h-28 w-28 items-center justify-center">
                {(phase === "incoming" || phase === "outgoing") && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                    <span
                      className="absolute inset-0 rounded-full bg-white/10 animate-ping"
                      style={{ animationDelay: "0.5s" }}
                    />
                  </>
                )}
                <div className="relative h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white/10 flex">
                  {peer?.avatar ? (
                    <img src={peer.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon size={44} className="text-white/60" />
                  )}
                </div>
              </div>
            )}
            <p className="font-display text-2xl">{peer?.name ?? "..."}</p>
<p className="flex items-center gap-1.5 text-xs text-white/60">{isVideo ? <Video size={14} /> : <Phone size={14} />}{isVideo ? "مكالمة فيديو" : "مكالمة صوتية"}</p>
            <p className="text-sm text-white/70">{statusText}</p>
          </div>
          <div className="relative z-10 flex items-center justify-center gap-6 pb-[max(3rem,env(safe-area-inset-bottom))] pt-6">
            {phase === "incoming" ? (
              <>
                <button onClick={declineCall} aria-label="رفض" className={`${btn} bg-red-600`}>
                  <PhoneOff size={24} />
                </button>
                <button onClick={acceptCall} aria-label="رد" className={`${btn} bg-emerald-500`}>
                  <Phone size={24} />
                </button>
              </>
            ) : (
              <>
                {(inRoom || phase === "outgoing") && (
                  <button onClick={toggleMute} aria-label="كتم" className={`${btn} ${muted ? "bg-white text-ink" : "bg-white/15"}`}>
                    {muted ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>
                )}
                {inRoom && isVideo && (
                  <button onClick={toggleCam} aria-label="الكاميرا" className={`${btn} ${camOff ? "bg-white text-ink" : "bg-white/15"}`}>
                    {camOff ? <VideoOff size={22} /> : <Video size={22} />}
                  </button>
                )}
                {(inRoom || phase === "outgoing") && (
                  <button onClick={toggleSpeaker} aria-label="السبيكر" className={`${btn} ${speakerOn ? "bg-white text-ink" : "bg-white/15"}`}>
                    {speakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
                  </button>
                )}
                <button onClick={() => void endCall(true)} aria-label="إنهاء" className={`${btn} bg-red-600`}>
                  <PhoneOff size={24} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}
