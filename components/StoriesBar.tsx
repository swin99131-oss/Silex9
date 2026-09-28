"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import type { Story, StoryMerchant } from "@/lib/types";
import { StoryViewer } from "./StoryViewer";
import { StoryCamera, type CapturedMedia } from "./StoryCamera";
import { StoryEditor } from "./StoryEditor";

type Row = Story & { merchant: StoryMerchant };
type Group = { merchant: StoryMerchant; stories: Story[]; seen: boolean; followed: boolean; firstUnseen: number };

const ids = (rows: unknown, key: string) =>
  new Set(((rows ?? []) as Record<string, string>[]).map((r) => r[key]));

export function StoriesBar() {
  const { user, profile, loading } = useProfile();
  const uid = user?.id;
  const [rows, setRows] = useState<Row[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [captured, setCaptured] = useState<CapturedMedia | null>(null);
  const [products, setProducts] = useState<{ id: string; title: string }[]>([]);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const mine = async (table: string, col: string) =>
      uid ? (await supabase.from(table).select("*").eq(col, uid)).data ?? [] : [];
    const [s, v, h, f] = await Promise.all([
      supabase
        .from("stories")
        .select("*, merchant:profiles!merchant_id(id, full_name, username, avatar_url, whatsapp, store_name)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true }),
      mine("story_views", "viewer_id"),
      mine("story_hides", "user_id"),
      mine("follows", "follower_id"),
    ]);
    setRows((s.data ?? []) as unknown as Row[]);
    setSeen(ids(v, "story_id"));
    setHidden(ids(h, "story_id"));
    setFollows(ids(f, "merchant_id"));
  }, [uid]);

  useEffect(() => {
    if (loading) return;
    load();
  }, [loading, load]);

  useEffect(() => {
    if (!uid) return;
    supabase
      .from("products")
      .select("id, title")
      .eq("merchant_id", uid)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts((data ?? []) as { id: string; title: string }[]));
  }, [uid]);

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const st of rows) {
      if (hidden.has(st.id)) continue;
      const g =
        map.get(st.merchant_id) ??
        { merchant: st.merchant, stories: [], seen: true, followed: follows.has(st.merchant_id), firstUnseen: -1 };
      if (!seen.has(st.id)) {
        g.seen = false;
        if (g.firstUnseen === -1) g.firstUnseen = g.stories.length;
      }
      g.stories.push(st);
      map.set(st.merchant_id, g);
    }
    return [...map.values()].sort(
      (a, b) => Number(a.seen) - Number(b.seen) || Number(b.followed) - Number(a.followed)
    );
  }, [rows, seen, hidden, follows]);

  // بعد النشر: أعد التحميل وافتح القصة الجديدة تلقائياً
  useEffect(() => {
    if (!pendingOpenId) return;
    if (rows.some((r) => r.id === pendingOpenId)) {
      setOpen(uid ?? null);
      setPendingOpenId(null);
    }
  }, [pendingOpenId, rows, uid]);

  if (!groups.length && !uid) return null;

  const current = groups.find((g) => g.merchant.id === open);
  const myGroup = groups.find((g) => g.merchant.id === uid);
  const otherGroups = groups.filter((g) => g.merchant.id !== uid);

  async function handlePublished(newStoryId: string) {
    setCaptured(null);
    setPendingOpenId(newStoryId);
    await load();
  }

  return (
    <>
      <div className="w-full border-b border-chip bg-card/40 py-3">
        <div className="px-6 flex gap-3 overflow-x-auto no-scrollbar md:px-10 md:gap-6">
          {/* فقاعة "قصتي" / كاميرا الإضافة */}
          {uid && (
            <div className="shrink-0 w-[84px] text-center">
              {myGroup ? (
                <div className="relative">
                  <button onClick={() => setOpen(uid)} className="block w-full">
                    <div className={`w-[72px] h-[72px] rounded-full mx-auto p-[3px] ${myGroup.seen ? "bg-line" : "bg-ink"}`}>
                      <div
                        className="w-full h-full rounded-full border-2 border-card flex items-center justify-center text-white text-lg font-display"
                        style={{ background: myGroup.stories[myGroup.stories.length - 1].bg_color }}
                      >
                        {(myGroup.merchant.full_name ?? myGroup.merchant.username ?? "أنا").charAt(0)}
                      </div>
                    </div>
                    <p className="text-xs mt-2 truncate">قصتي</p>
                  </button>
                  <button
                    onClick={() => setShowCamera(true)}
                    aria-label="أضف قصة جديدة"
                    className="absolute bottom-5 left-0 z-10 w-7 h-7 rounded-full bg-black border-[3px] border-card flex items-center justify-center shadow-lg"
                  >
                    <Plus size={14} className="text-white" strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowCamera(true)} className="block w-full">
                  <div className="w-[72px] h-[72px] rounded-full mx-auto border-2 border-dashed border-line bg-chip flex items-center justify-center">
                    <Plus size={26} className="text-ink/60" strokeWidth={2} />
                  </div>
                  <p className="text-xs mt-2 truncate">أضف قصة</p>
                </button>
              )}
            </div>
          )}

          {otherGroups.map((g) => {
            const label = g.merchant.store_name ?? g.merchant.full_name ?? g.merchant.username ?? "متجر";
            const last = g.stories[g.stories.length - 1];
            return (
              <button
                key={g.merchant.id}
                onClick={() => setOpen(g.merchant.id)}
                className="shrink-0 w-[84px] text-center"
              >
                <div className={`w-[72px] h-[72px] rounded-full mx-auto p-[3px] ${g.seen ? "bg-line" : "bg-ink"}`}>
                  <div
                    className="w-full h-full rounded-full border-2 border-card flex items-center justify-center text-white text-lg font-display overflow-hidden"
                    style={{ background: last.bg_color }}
                  >
                    {last.image_url ? (
                      <img src={last.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      label.charAt(0)
                    )}
                  </div>
                </div>
                <p className="text-xs mt-2 truncate">{label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {current && (
        <StoryViewer
          key={current.merchant.id}
          merchant={current.merchant}
          stories={current.stories}
          viewerId={uid ?? null}
          startIndex={Math.max(0, current.firstUnseen)}
          onClose={() => {
            setOpen(null);
            load();
          }}
          onSeen={(id) => setSeen((p) => new Set(p).add(id))}
          onHidden={(id) => setHidden((p) => new Set(p).add(id))}
          onDeleted={() => load()}
        />
      )}

      {showCamera && (
        <StoryCamera
          onClose={() => setShowCamera(false)}
          onCaptured={(media) => {
            setCaptured(media);
            setShowCamera(false);
          }}
        />
      )}

      {captured && profile && (
        <StoryEditor
          profile={profile}
          products={products}
          initialMedia={captured}
          onClose={() => setCaptured(null)}
          onBack={() => {
            setCaptured(null);
            setShowCamera(true);
          }}
          onPublished={handlePublished}
        />
      )}
    </>
  );
}
