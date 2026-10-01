"use client";

import { ReportPostButton } from "@/components/ReportPostButton";
import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { CartButton } from "@/components/ui/CartButton";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Share2, User as UserIcon, Volume2, VolumeX, ShoppingBag, MoreHorizontal, Flag, Pencil, Trash2, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useCart } from "@/lib/cart-context";
import { getProduct } from "@/lib/catalog";
import { FollowButton } from "@/components/FollowButton";

export type FeedPost = {
  id: string;
  user_id: string;
  title: string | null;
  caption: string | null;
  hashtags: string[] | null;
  image_url: string | null;
  media_type: "image" | "video" | "text";
  product_id?: string | null;
  created_at: string;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  author: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    store_name?: string | null;
  } | null;
};

let followingCache: { uid: string; ids: Set<string>; promise?: Promise<Set<string>> } | null = null;

function loadFollowing(uid: string): Promise<Set<string>> {
  if (followingCache && followingCache.uid === uid) {
    if (followingCache.promise) return followingCache.promise;
    return Promise.resolve(followingCache.ids);
  }
  const promise = Promise.resolve(
    supabase.from("follows").select("merchant_id").eq("follower_id", uid)
  ).then(({ data }) => {
    const ids = new Set(((data ?? []) as { merchant_id: string }[]).map((r) => r.merchant_id));
    followingCache = { uid, ids };
    return ids;
  });
  followingCache = { uid, ids: new Set(), promise };
  return promise;
}

const REPORT_REASONS = ["محتوى مسيء", "احتيال أو نصب", "محتوى مزعج (سبام)", "أخرى"];

export function PostCard({ post }: { post: FeedPost }) {
  const router = useRouter();
  const { user: viewer } = useProfile();
  const { add } = useCart();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(post.saved);
  const [added, setAdded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [menu, setMenu] = useState<"closed" | "main" | "reasons">("closed");
  const [gone, setGone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shownTitle, setShownTitle] = useState(post.title ?? "");
  const [shownCaption, setShownCaption] = useState(post.caption ?? "");
  const [draftTitle, setDraftTitle] = useState(post.title ?? "");
  const [draftCaption, setDraftCaption] = useState(post.caption ?? "");
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const authorName =
    post.author?.store_name ?? post.author?.full_name ?? post.author?.username ?? "مستخدم";
  const isOwner = viewer?.id === post.user_id;

  useEffect(() => {
    if (!viewer || viewer.id === post.user_id) return;
    let alive = true;
    loadFollowing(viewer.id).then((ids) => {
      if (alive) setFollowing(ids.has(post.user_id));
    });
    return () => { alive = false; };
  }, [viewer?.id, post.user_id]);

  // تشغيل تلقائي عند الظهور وإيقاف عند الخروج
  useEffect(() => {
    const v = videoRef.current;
    const box = boxRef.current;
    if (!v || !box) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(box);
    return () => io.disconnect();
  }, []);

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  }

  async function toggleLike() {
    if (!viewer) return router.push("/login");
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (next) await supabase.from("post_likes").insert({ post_id: post.id, user_id: viewer.id });
    else await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", viewer.id);
  }

  async function toggleSave() {
    if (!viewer) return router.push("/login");
    const next = !saved;
    setSaved(next);
    if (next) await supabase.from("post_saves").insert({ post_id: post.id, user_id: viewer.id });
    else await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", viewer.id);
  }

  async function share() {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط");
    }
  }

  async function report(reason: string) {
    setMenu("closed");
    if (!viewer) return router.push("/login");
    const { error } = await supabase.from("reports").insert({
      reporter_id: viewer.id,
      reported_id: post.user_id,
      post_id: post.id,
      reason,
    });
    if (error) {
      toast.error(error.code === "23505" ? "سبق أن أبلغت عن هذا المنشور" : "تعذر إرسال البلاغ");
      return;
    }
    toast.success("تم إرسال البلاغ، شكراً لك");
  }

  async function hidePost() {
    setMenu("closed");
    if (!viewer) return router.push("/login");
    setGone(true);
    const { error } = await supabase.from("post_hides").insert({ user_id: viewer.id, post_id: post.id });
    if (error && error.code !== "23505") toast.error("تعذر حفظ الإخفاء");
    else toast.success("تم إخفاء المنشور");
  }

  async function deletePost() {
    setMenu("closed");
    if (!viewer || !window.confirm("حذف المنشور نهائياً؟")) return;
    const { data, error } = await supabase
      .from("posts").delete().eq("id", post.id).eq("user_id", viewer.id).select("id");
    if (error || !data?.length) return toast.error("تعذر حذف المنشور");
    setGone(true);
    toast.success("تم حذف المنشور");
  }

  async function saveEdit() {
    if (!viewer) return;
    setSaving(true);
    const t = draftTitle.trim();
    const c = draftCaption.trim();
    const { data, error } = await supabase
      .from("posts").update({ title: t || null, caption: c || null })
      .eq("id", post.id).eq("user_id", viewer.id).select("id");
    setSaving(false);
    if (error || !data?.length) return toast.error("تعذر حفظ التعديل");
    setShownTitle(t);
    setShownCaption(c);
    setEditing(false);
    toast.success("تم حفظ التعديل");
  }

  async function addToCart() {
    if (!post.product_id) return;
    const p = await getProduct(post.product_id);
    if (!p) return toast.error("هذا المنتج غير متوفر");
    add(p, 1, { color: null, size: null });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (gone) return null;

  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-float">
      <div className="flex items-center gap-2 px-4 py-3">
        <Link href={`/u/${post.user_id}`} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-chip flex items-center justify-center overflow-hidden shrink-0">
            {post.author?.avatar_url ? (
              <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={14} className="text-ink/40" />
            )}
          </div>
          <p className="flex min-w-0 items-center gap-1 text-sm font-semibold">
            <span className="truncate">{authorName}</span>
            <VerifiedBadge show={verifiedOf(post.author)} size={14} />
          </p>
        </Link>
        {viewer && !isOwner && <ReportPostButton postId={post.id} reportedId={post.user_id} />}
        {!isOwner && viewer && following !== null && (
          <FollowButton
            merchantId={post.user_id}
            viewerId={viewer.id}
            initial={following}
            size="sm"
            onChange={(f) => {
              setFollowing(f);
              if (followingCache && followingCache.uid === viewer.id) {
                if (f) followingCache.ids.add(post.user_id);
                else followingCache.ids.delete(post.user_id);
              }
            }}
          />
        )}
              <div className="relative">
          <button
            onClick={() => setMenu(menu === "closed" ? "main" : "closed")}
            aria-label="المزيد"
            className="w-8 h-8 rounded-full hover:bg-chip flex items-center justify-center"
          >
            <MoreHorizontal size={18} />
          </button>
          {menu !== "closed" && (
            <>
              <button aria-label="إغلاق" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu("closed")} />
              <div className="absolute left-0 top-9 z-20 min-w-44 rounded-2xl border border-line bg-card p-1.5 text-right shadow-float">
                {menu === "reasons" ? (
                  <>
                    <p className="px-3 py-1.5 text-xs text-muted">سبب الإبلاغ</p>
                    {REPORT_REASONS.map((r) => (
                      <button key={r} onClick={() => report(r)} className="block w-full rounded-xl px-3 py-2 text-right text-sm hover:bg-chip">
                        {r}
                      </button>
                    ))}
                  </>
                ) : isOwner ? (
                  <>
                    <button
                      onClick={() => { setMenu("closed"); setDraftTitle(shownTitle); setDraftCaption(shownCaption); setEditing(true); }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-chip"
                    >
                      <Pencil size={15} /> تعديل
                    </button>
                    <button onClick={deletePost} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-chip text-red-600">
                      <Trash2 size={15} /> حذف
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={hidePost} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-chip">
                      <EyeOff size={15} /> إخفاء المنشور
                    </button>
                    <button onClick={() => setMenu("reasons")} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-chip text-red-600">
                      <Flag size={15} /> إبلاغ
                    </button>
                  </>
                )}
              </div>
            </>
          )}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-5 text-right shadow-float">
                <h3 className="mb-4 font-display text-lg">تعديل المنشور</h3>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="العنوان"
                  className="mb-3 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm"
                />
                <textarea
                  value={draftCaption}
                  onChange={(e) => setDraftCaption(e.target.value)}
                  placeholder="الوصف"
                  rows={5}
                  className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm"
                />
                <div className="mt-4 flex gap-2">
                  <button onClick={saveEdit} disabled={saving} className="flex-1 rounded-pill bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {saving ? "جارٍ الحفظ..." : "حفظ"}
                  </button>
                  <button onClick={() => setEditing(false)} className="flex-1 rounded-pill bg-chip py-2.5 text-sm font-semibold">
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {post.media_type !== "text" && post.image_url && (
        <div ref={boxRef} className="relative w-full aspect-square bg-chip">
          {post.media_type === "image" ? (
            <Link href={`/post/${post.id}`} className="block w-full h-full">
              <img src={post.image_url} alt={post.title ?? ""} className="w-full h-full object-cover" />
            </Link>
          ) : (
            <>
              <video
                ref={videoRef}
                src={post.image_url}
                muted
                loop
                playsInline
                preload="metadata"
                onClick={toggleSound}
                className="w-full h-full object-cover"
              />
              <button
                onClick={toggleSound}
                aria-label="الصوت"
                className="absolute bottom-3 left-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-3">
        <button onClick={toggleLike} className="flex items-center gap-1.5">
          <Heart size={22} className={liked ? "fill-red-500 text-red-500" : "text-ink"} />
          <span className="text-sm">{likeCount}</span>
        </button>
        <Link href={`/post/${post.id}`} className="flex items-center gap-1.5">
          <MessageCircle size={22} />
          <span className="text-sm">{post.comments}</span>
        </Link>
        <button onClick={share} aria-label="مشاركة">
          <Share2 size={20} />
        </button>
        <button onClick={toggleSave} aria-label="حفظ" className="ml-auto">
          <Bookmark size={22} className={saved ? "fill-ink text-ink" : "text-ink"} />
        </button>
      </div>

      {post.product_id && !isOwner && (
        <CartButton productId={post.product_id} onAdd={addToCart} className="w-[calc(100%-32px)] mx-4 mb-3" />
      )}

      {(shownTitle || shownCaption) && (
        <Link href={`/post/${post.id}`} className="block px-4 pb-4">
          {shownTitle && <h2 className="font-display text-base">{shownTitle}</h2>}
          {shownCaption && <p className="text-sm text-ink/80 mt-1 line-clamp-3">{shownCaption}</p>}
          {post.hashtags && post.hashtags.length > 0 && (
            <p className="text-xs text-muted mt-2">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>
          )}
        </Link>
      )}
    </div>
  );
}
