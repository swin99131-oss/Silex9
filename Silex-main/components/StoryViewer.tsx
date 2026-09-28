"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Heart, Share2, MessageCircle, Eye, ShoppingBag, MoreVertical, Pencil, Trash2, Check, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createConversation } from "@/lib/chat";
import type { Story, StoryMerchant } from "@/lib/types";
import { FollowButton } from "./FollowButton";

const DURATION = 5000;

type Viewer = { id: string; full_name: string | null; username: string | null };

interface Props {
  merchant: StoryMerchant;
  stories: Story[];
  viewerId: string | null;
  startIndex?: number;
  onClose: () => void;
  onSeen?: (storyId: string) => void;
  onHidden?: (storyId: string) => void;
  onDeleted?: (storyId: string) => void;
}

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} د`;
  if (diffHour < 24) return `منذ ${diffHour} س`;
  return "منذ يوم";
}

export function StoryViewer({ merchant, stories: initialStories, viewerId, startIndex = 0, onClose, onSeen, onHidden, onDeleted }: Props) {
  const router = useRouter();
  const [stories, setStories] = useState(initialStories);
  const [i, setI] = useState(startIndex);
  const [filled, setFilled] = useState(-1);
  const [liked, setLiked] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const story = stories[i];
  const sid = story?.id;
  const isOwner = viewerId === merchant.id;
  const name = merchant.store_name ?? merchant.full_name ?? merchant.username ?? "متجر";

  useEffect(() => {
    if (!story) onClose();
  }, [story, onClose]);

  useEffect(() => {
    if (!sid) return;
    let alive = true;
    setLiked(false);
    if (viewerId && !isOwner) {
      supabase
        .from("story_views")
        .upsert({ story_id: sid, viewer_id: viewerId }, { onConflict: "story_id,viewer_id", ignoreDuplicates: true })
        .then(() => onSeen?.(sid));
      supabase
        .from("story_likes")
        .select("story_id")
        .eq("story_id", sid)
        .eq("user_id", viewerId)
        .maybeSingle()
        .then(({ data }) => {
          if (alive) setLiked(!!data);
        });
    }
    if (isOwner) {
      supabase
        .from("story_views")
        .select("viewer:profiles!viewer_id(id, full_name, username)")
        .eq("story_id", sid)
        .order("viewed_at", { ascending: false })
        .then(({ data }) => {
          if (alive) setViewers(((data ?? []) as unknown as { viewer: Viewer }[]).map((r) => r.viewer));
        });
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid, viewerId, isOwner]);

  useEffect(() => {
    if (!sid || sheet || editing || paused || reply) return;
    setFilled(-1);
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setFilled(i)));
    const t = setTimeout(() => {
      if (i + 1 >= stories.length) onClose();
      else setI(i + 1);
    }, DURATION);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, sid, sheet, editing, paused, reply]);

  if (!story) return null;

  function go(n: number) {
    if (n < 0) return;
    if (n >= stories.length) onClose();
    else setI(n);
  }

  function flash(msg: string) {
    setNote(msg);
    setTimeout(() => setNote(""), 1600);
  }

  async function toggleLike() {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    const next = !liked;
    setLiked(next);
    const { error } = next
      ? await supabase.from("story_likes").insert({ story_id: story.id, user_id: viewerId })
      : await supabase.from("story_likes").delete().eq("story_id", story.id).eq("user_id", viewerId);
    if (error) setLiked(!next);
  }

  async function share() {
    const url = `${location.origin}/home`;
    const text = `${name}: ${story.text}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        flash("تم نسخ الرابط");
      }
      if (viewerId) {
        await supabase.from("story_shares").insert({ story_id: story.id, user_id: viewerId });
      }
    } catch {
      /* أُلغيت المشاركة */
    }
  }

  async function messageOwner() {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    try {
      const convId = await createConversation(viewerId, merchant.id);
      router.push(`/chat/${convId}?story=${story.id}`);
    } catch {
      flash("تعذّر فتح المحادثة");
    }
  }

  async function sendQuickReply() {
    const t = reply.trim();
    if (!t) return;
    if (!viewerId) {
      router.push("/login");
      return;
    }
    setSendingReply(true);
    try {
      const convId = await createConversation(viewerId, merchant.id);
      router.push(`/chat/${convId}?draft=${encodeURIComponent(t)}&story=${story.id}`);
    } catch {
      flash("تعذّر إرسال الرد");
    } finally {
      setSendingReply(false);
    }
  }

  function startEdit() {
    setEditText(story.text);
    setEditing(true);
    setShowMenu(false);
  }

  async function saveEdit() {
    const t = editText.trim();
    const { error } = await supabase.from("stories").update({ text: t }).eq("id", story.id);
    if (!error) {
      setStories((prev) => prev.map((s) => (s.id === story.id ? { ...s, text: t } : s)));
      setEditing(false);
    } else {
      flash("تعذّر حفظ التعديل");
    }
  }

  async function deleteStory() {
    if (!confirm("حذف هذه القصة نهائياً؟")) return;
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) {
      flash("تعذّر الحذف");
      return;
    }
    onDeleted?.(story.id);
    const remaining = stories.filter((s) => s.id !== story.id);
    if (!remaining.length) {
      onClose();
      return;
    }
    setStories(remaining);
    setI((prev) => Math.min(prev, remaining.length - 1));
    setShowMenu(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* خلفية ضبابية على الويب فقط - تملأ الفراغ حول البطاقة */}
      <div
        className="hidden md:block absolute inset-0 scale-110 blur-3xl opacity-60"
        style={{ background: story.image_url ? `url(${story.image_url}) center/cover` : story.bg_color }}
      />
      <div className="absolute inset-0 bg-black/70" />

      <div
        className="relative w-full h-full md:max-w-[420px] md:h-[92vh] md:rounded-[32px] overflow-hidden flex flex-col text-white shadow-2xl"
        style={{ background: story.bg_color }}
      >
        {story.image_url && (
          <img src={story.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}

        <div className="absolute top-0 inset-x-0 z-20 px-3 pt-3 flex gap-1">
          {stories.map((s, j) => (
            <div key={s.id} className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{
                  width: j < i || filled === j ? "100%" : "0%",
                  transition: filled === j && j === i && !paused ? `width ${DURATION}ms linear` : "none",
                }}
              />
            </div>
          ))}
        </div>

        <button
          aria-label="السابق"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onClick={() => go(i - 1)}
          className="absolute inset-y-0 right-0 w-1/2 z-10"
        />
        <button
          aria-label="التالي"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onClick={() => go(i + 1)}
          className="absolute inset-y-0 left-0 w-1/2 z-10"
        />

        <div className="relative z-20 flex items-center gap-3 px-4 pt-8">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-display shrink-0">
            {name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{name}</p>
            <p className="text-[11px] text-white/70">{timeAgo(story.created_at)}</p>
          </div>
          {!isOwner && <FollowButton merchantId={merchant.id} viewerId={viewerId} size="sm" onDark />}

          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                aria-label="خيارات"
                className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
              >
                <MoreVertical size={18} />
              </button>
              {showMenu && (
                <div className="absolute left-0 top-11 bg-card text-ink shadow-float rounded-xl overflow-hidden z-50 w-40 border border-chip">
                  <button
                    onClick={startEdit}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-chip"
                  >
                    <Pencil size={14} />
                    تعديل
                  </button>
                  <button
                    onClick={deleteStory}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                    حذف
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {!editing && (
          <div className="flex-1 flex items-center justify-center px-8 relative z-[1]">
            {story.text && (
              <p
                className="font-display text-[28px] leading-snug text-center break-words"
                style={story.image_url ? { textShadow: "0 2px 10px rgba(0,0,0,0.6)" } : undefined}
              >
                {story.text}
              </p>
            )}
          </div>
        )}

        {editing && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-6">
            <div className="w-full flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value.slice(0, 120))}
                rows={3}
                autoFocus
                dir="auto"
                className="bg-white/10 backdrop-blur rounded-2xl px-4 py-3 text-white text-center outline-none border border-white/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 bg-white/15 rounded-pill py-3 text-sm font-semibold"
                >
                  إلغاء
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 bg-white text-black rounded-pill py-3 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  حفظ
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-20 px-4 pb-6 flex flex-col gap-3">
          {note && <p className="text-center text-xs">{note}</p>}
          {story.product_id && (
            <Link
              href={`/product/${story.product_id}`}
              className="self-center bg-white text-ink rounded-pill px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <ShoppingBag size={14} />
              عرض المنتج
            </Link>
          )}

          {isOwner ? (
            <button
              onClick={() => setSheet(true)}
              className="w-full h-11 rounded-pill bg-white/15 flex items-center justify-center gap-2 text-sm"
            >
              <Eye size={16} />
              {viewers.length} مشاهدة
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {/* حقل رد سريع */}
              <div className="flex-1 flex items-center gap-2 bg-white/15 rounded-pill px-3 h-11">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendQuickReply();
                  }}
                  placeholder="أرسل رداً..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/60 min-w-0"
                />
                {reply.trim() && (
                  <button onClick={sendQuickReply} disabled={sendingReply} aria-label="إرسال">
                    <Send size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={messageOwner}
                aria-label="فتح المحادثة"
                className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0"
              >
                <MessageCircle size={18} />
              </button>
              <button
                onClick={toggleLike}
                aria-label="إعجاب"
                className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0"
              >
                <Heart size={18} fill={liked ? "currentColor" : "none"} />
              </button>
              <button
                onClick={share}
                aria-label="مشاركة"
                className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0"
              >
                <Share2 size={18} />
              </button>
            </div>
          )}
        </div>

        {sheet && (
          <div className="absolute inset-0 z-30 flex items-end bg-black/50" onClick={() => setSheet(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[65%] overflow-y-auto bg-card text-ink rounded-t-card p-5"
            >
              <h3 className="font-display text-[18px] mb-3">المشاهدون ({viewers.length})</h3>
              {viewers.length === 0 ? (
                <p className="text-sm text-muted">لا مشاهدات بعد</p>
              ) : (
                <div className="divide-y divide-line">
                  {viewers.map((v) => (
                    <div key={v.id} className="py-3 text-sm">
                      <span className="font-semibold">{v.full_name ?? "مستخدم"}</span>
                      {v.username && <span className="text-muted"> @{v.username}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
