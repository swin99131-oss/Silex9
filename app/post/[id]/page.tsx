"use client";

import { askReportReason } from "@/components/askReportReason";
import { submitReport } from "@/lib/report";
import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { CartButton } from "@/components/ui/CartButton";
import { toast } from "sonner";
import { PageLoading } from "@/components/ui/Skeleton";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreVertical,
  Trash2,
  Edit,
  Volume2,
  VolumeX,
  Play,
  Pause,
  User as UserIcon,
  Eye,
  Flag,
  ShoppingBag,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { CommentsSheet } from "@/components/CommentsSheet";
import { useCart } from "@/lib/cart-context";
import { getProduct } from "@/lib/catalog";

type PostDetail = {
  id: string;
  user_id: string;
  title: string | null;
  caption: string | null;
  hashtags: string[] | null;
  image_url: string | null;
  media_type: "image" | "video" | "text";
  product_id: string | null;
  created_at: string;
  author: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: { full_name: string | null; username: string | null; avatar_url: string | null; verified_at?: string | null } | null;
};

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user: viewer } = useProfile();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [post, setPost] = useState<PostDetail | null | undefined>(undefined);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.5 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, [post]);

  async function addToCart() {
    if (!post?.product_id) return;
    const p = await getProduct(post.product_id);
    if (!p) return toast.error("هذا المنتج غير متوفر");
    add(p, 1, { color: null, size: null });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("posts")
        .select(
          "id, user_id, title, caption, hashtags, image_url, media_type, product_id, created_at, author:profiles!user_id(full_name, username, avatar_url, verified_at)"
        )
        .eq("id", params.id)
        .maybeSingle();
      if (!alive) return;
      setPost((data as unknown as PostDetail) ?? null);

      const { count } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", params.id);
      if (alive) setLikeCount(count ?? 0);

      if (viewer) {
        const { data: myLike } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("post_id", params.id)
          .eq("user_id", viewer.id)
          .maybeSingle();
        if (alive) setLiked(!!myLike);

        const { data: mySave } = await supabase
          .from("post_saves")
          .select("post_id")
          .eq("post_id", params.id)
          .eq("user_id", viewer.id)
          .maybeSingle();
        if (alive) setSaved(!!mySave);
      }

      const { data: cmts } = await supabase
        .from("post_comments")
        .select(
          "id, user_id, content, created_at, author:profiles!user_id(full_name, username, avatar_url, verified_at)"
        )
        .eq("post_id", params.id)
        .order("created_at", { ascending: true });
      if (alive) setComments((cmts as unknown as Comment[]) ?? []);
    }
    load();
    return () => {
      alive = false;
    };
  }, [params.id, viewer]);

  async function toggleLike() {
    if (!viewer) {
      router.push("/login");
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (next) {
      await supabase.from("post_likes").insert({ post_id: params.id, user_id: viewer.id });
    } else {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", params.id)
        .eq("user_id", viewer.id);
    }
  }

  async function toggleSave() {
    if (!viewer) {
      router.push("/login");
      return;
    }
    const next = !saved;
    setSaved(next);
    if (next) {
      await supabase.from("post_saves").insert({ post_id: params.id, user_id: viewer.id });
    } else {
      await supabase
        .from("post_saves")
        .delete()
        .eq("post_id", params.id)
        .eq("user_id", viewer.id);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/post/${params.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        /* ألغى */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط");
    }
  }

  async function handleDelete() {
    if (!confirm("هل تريد حذف هذا المنشور نهائياً؟")) return;
    await supabase.from("posts").delete().eq("id", params.id);
    router.push("/profile");
  }

  async function handleHide() {
    toast.success("تم إخفاء هذا المنشور");
  }

  async function handleReport() {
    const reason = await askReportReason();
    if (!reason) return;
    if (!viewer) {
      router.push("/login");
      return;
    }
    const targetId = window.location.pathname.split("/")[2];
    if (!targetId) return;
    const ok = await submitReport("post", targetId, reason);
    if (ok) toast.success("شكراً، وصلنا بلاغك وسنراجعه"); else toast.error("تعذّر إرسال البلاغ");
  }

  function toggleMute() {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  }

  if (post === undefined) {
    return <PageLoading />;
  }
  if (!post) {
    return <p className="p-6 text-sm text-muted text-center">هذا المنشور غير موجود.</p>;
  }

  const isOwner = viewer?.id === post.user_id;
  const authorName = post.author?.full_name ?? post.author?.username ?? "مستخدم";

  return (
    <div className="max-w-lg mx-auto pb-8 px-4">
      <div className="bg-card rounded-2xl overflow-hidden shadow-float mt-4">
        {/* الهيدر */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-chip">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-full bg-chip flex items-center justify-center"
            >
              <ChevronRight size={16} />
            </button>
            <Link href={`/u/${post.user_id}`} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-chip flex items-center justify-center overflow-hidden">
                {post.author?.avatar_url ? (
                  <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={14} className="text-ink/40" />
                )}
              </div>
              <p className="flex items-center gap-1 text-sm font-semibold">
                  {authorName}
                  <VerifiedBadge show={verifiedOf(post.author)} size={14} />
                </p>
            </Link>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-8 h-8 rounded-full bg-chip flex items-center justify-center"
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <div className="absolute left-0 top-10 bg-card shadow-float rounded-xl overflow-hidden z-50 w-44 border border-chip">
                {isOwner ? (
                  <>
                    <Link
                      href={`/post/${params.id}/edit`}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-chip"
                      onClick={() => setShowMenu(false)}
                    >
                      <Edit size={14} />
                      تعديل
                    </Link>
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                      حذف
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        handleHide();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-chip"
                    >
                      <Eye size={14} />
                      إخفاء
                    </button>
                    <button
                      onClick={() => {
                        handleReport();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-amber-600 hover:bg-amber-500/10"
                    >
                      <Flag size={14} />
                      إبلاغ
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* الصورة/الفيديو */}
        {post.media_type !== "text" && post.image_url && (
          <div className="relative w-full aspect-square bg-chip">
            {post.media_type === "image" ? (
              <img
                src={post.image_url}
                alt={post.title ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={post.image_url}
                  muted={muted}
                  loop
                  playsInline
                  autoPlay
                  onClick={toggleMute}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
                  >
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* أزرار التفاعل */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-chip">
          <button onClick={toggleLike} className="flex items-center gap-1.5">
            <Heart size={22} className={liked ? "fill-red-500 text-red-500" : "text-ink"} />
            <span className="text-sm">{likeCount}</span>
          </button>
          <button onClick={() => setShowComments(true)} className="flex items-center gap-1.5">
            <MessageCircle size={22} />
            <span className="text-sm">{comments.length}</span>
          </button>
          <button onClick={handleShare}>
            <Share2 size={20} />
          </button>
          <button onClick={toggleSave} className="ml-auto">
            <Bookmark size={22} className={saved ? "fill-ink text-ink" : "text-ink"} />
          </button>
        </div>

        {post.product_id && !isOwner && (
          <div className="px-4 py-3 border-b border-chip">
            <CartButton productId={post.product_id} onAdd={addToCart} className="w-full" />
          </div>
        )}

        {/* العنوان والوصف */}
        {(post.title || post.caption) && (
          <div className="px-4 py-3 border-b border-chip">
            {post.title && <h1 className="font-display text-base">{post.title}</h1>}
            {post.caption && <p className="text-sm text-ink/80 mt-1">{post.caption}</p>}
            {post.hashtags && post.hashtags.length > 0 && (
              <p className="text-xs text-muted mt-2">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>
            )}
          </div>
        )}

        {/* معاينة مختصرة + زر فتح شاشة التعليقات (Bottom Sheet) */}
        <button onClick={() => setShowComments(true)} className="w-full text-right px-4 py-3">
          {comments.length > 0 ? (
            <>
              <p className="text-xs text-muted mb-1.5">عرض كل التعليقات ({comments.length})</p>
              <p className="text-xs truncate">
                <span className="font-semibold">
                  {comments[comments.length - 1].author?.full_name ??
                    comments[comments.length - 1].author?.username ??
                    "مستخدم"}
                </span>{" "}
                <span className="text-ink/70">{comments[comments.length - 1].content}</span>
              </p>
            </>
          ) : (
            <p className="text-xs text-muted">أضف تعليقاً</p>
          )}
        </button>
      </div>

      <CommentsSheet
        postId={params.id}
        open={showComments}
        onOpenChange={setShowComments}
        comments={comments}
        setComments={setComments}
        viewer={viewer}
      />
    </div>
  );
}
