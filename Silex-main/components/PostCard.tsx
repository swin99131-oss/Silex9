"use client";

import { CartButton } from "@/components/ui/CartButton";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Share2, User as UserIcon, Volume2, VolumeX, ShoppingBag } from "lucide-react";
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

  async function addToCart() {
    if (!post.product_id) return;
    const p = await getProduct(post.product_id);
    if (!p) return toast.error("هذا المنتج غير متوفر");
    add(p, 1, { color: null, size: null });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

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
          <p className="text-sm font-semibold truncate">{authorName}</p>
        </Link>
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

      {(post.title || post.caption) && (
        <Link href={`/post/${post.id}`} className="block px-4 pb-4">
          {post.title && <h2 className="font-display text-base">{post.title}</h2>}
          {post.caption && <p className="text-sm text-ink/80 mt-1 line-clamp-3">{post.caption}</p>}
          {post.hashtags && post.hashtags.length > 0 && (
            <p className="text-xs text-muted mt-2">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>
          )}
        </Link>
      )}
    </div>
  );
}
