"use client";

import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { PageLoading } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, Grid3x3, Bookmark, Heart, Share2, User as UserIcon, Search, Plus, Store, ShieldCheck } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart-context";
import { getProductsByIds, type Product } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { SocialLinksDisplay } from "@/components/SocialLinks";

type Post = { id: string; image_url: string; caption: string | null };

export default function ProfilePage() {
  const { user, profile, loading } = useProfile();
  const { favorites } = useCart();

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [saved, setSaved] = useState<Post[]>([]);
  const [liked, setLiked] = useState<Post[]>([]);
  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<"posts" | "saved" | "liked">("posts");

  useEffect(() => {
    if (!user) return;
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("merchant_id", user.id)
      .then(({ count }) => setFollowers(count ?? 0));
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id)
      .then(({ count }) => setFollowing(count ?? 0));
    supabase.from("posts").select("id, image_url, caption").eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPosts((data ?? []) as Post[]));
    supabase.from("post_saves").select("post:posts(id, image_url, caption)").eq("user_id", user.id)
      .then(({ data }) => setSaved(((data ?? []) as unknown as { post: Post }[]).map((r) => r.post).filter(Boolean)));
    supabase.from("post_likes").select("post:posts(id, image_url, caption)").eq("user_id", user.id)
      .then(({ data }) => setLiked(((data ?? []) as unknown as { post: Post }[]).map((r) => r.post).filter(Boolean)));
  }, [user]);

  useEffect(() => {
    let alive = true;
    if (!favorites.length) { setFavProducts([]); return; }
    getProductsByIds(favorites).then((p) => {
      if (alive) setFavProducts(p.filter((x) => favorites.includes(x.id)));
    });
    return () => { alive = false; };
  }, [favorites]);

  async function handleShare() {
    const url = `${window.location.origin}/u/${user?.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: profile?.full_name ?? "ساليكس", url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ رابط الملف الشخصي");
    }
  }

  if (loading) return <PageLoading />;

  if (!user) {
    return (
      <div className="px-6 py-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-chip flex items-center justify-center mb-4">
          <UserIcon size={28} className="text-ink/60" />
        </div>
        <h1 className="font-display text-[22px] mb-2">لم تسجّل الدخول بعد</h1>
        <Link href="/login" className="bg-ink text-white rounded-pill px-8 py-3.5 text-sm font-semibold mt-4">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const isMerchant = profile?.role === "merchant";
  const isAdmin = profile?.role === "admin";
  const displayName = (isMerchant && profile?.store_name) || profile?.full_name || user.email?.split("@")[0] || "مستخدم";
  const tabs = [
    { key: "posts" as const, icon: Grid3x3 },
    { key: "saved" as const, icon: Bookmark },
    { key: "liked" as const, icon: Heart },
  ];
  const grid = tab === "posts" ? posts : tab === "saved" ? saved : liked;

  return (
    <div className="pb-10">
      <div className="flex items-center justify-end gap-2 px-6 pt-2 md:px-10">
        <Link href="/people" aria-label="بحث عن أشخاص" className="w-9 h-9 rounded-full bg-chip flex items-center justify-center">
          <Search size={16} />
        </Link>
        <Link href="/profile/app-settings" aria-label="الإعدادات" className="w-9 h-9 rounded-full bg-chip flex items-center justify-center">
          <Settings size={17} />
        </Link>
      </div>

      <div className="flex flex-col items-center text-center px-6 mt-2">
        <div className="w-24 h-24 rounded-full bg-chip flex items-center justify-center overflow-hidden border-2 border-line/40">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={36} className="text-ink/40" />
          )}
        </div>
        <h1 className="font-display text-[20px] mt-3">
          {displayName}
          <VerifiedBadge show={verifiedOf(profile)} size={18} className="mr-1 align-middle" />
        </h1>
        {profile?.username && <p className="text-xs text-muted mt-0.5">@{profile.username}</p>}
        {profile?.bio && <p className="text-sm text-ink/70 mt-2 max-w-xs leading-relaxed">{profile.bio}</p>}
      </div>

      <div className="flex items-center justify-center gap-8 mt-5">
        <div className="text-center">
          <p className="font-display text-[18px]">{posts.length}</p>
          <p className="text-[11px] text-muted mt-0.5">منشورات</p>
        </div>
        <Link href="/profile/followers" className="text-center">
          <p className="font-display text-[18px]">{followers}</p>
          <p className="text-[11px] text-muted mt-0.5">متابعون</p>
        </Link>
        <Link href="/profile/following" className="text-center">
          <p className="font-display text-[18px]">{following}</p>
          <p className="text-[11px] text-muted mt-0.5">متابَعون</p>
        </Link>
      </div>

      <div className="flex items-center gap-2 px-6 mt-5 md:max-w-md md:mx-auto">
        <Link href="/profile/settings" className="flex-1 bg-chip rounded-pill py-2.5 text-sm font-semibold text-center">
          تعديل الملف
        </Link>
        {isMerchant && (
          <Link href="/profile/studio" aria-label="نشر" className="w-11 h-11 shrink-0 flex items-center justify-center text-ink hover:opacity-70 transition-opacity">
            <Plus size={24} strokeWidth={2} />
          </Link>
        )}
        <button onClick={handleShare} aria-label="مشاركة" className="w-11 h-11 shrink-0 rounded-full bg-chip flex items-center justify-center">
          <Share2 size={17} />
        </button>
      </div>

      <div className="px-6 mt-3 md:max-w-md md:mx-auto">
        {isAdmin ? (
          <Link href="/admin" className="flex items-center justify-center gap-2 border border-line rounded-pill py-2.5 text-sm font-semibold">
            <ShieldCheck size={15} />
            لوحتي
          </Link>
        ) : isMerchant ? (
          <Link href="/dashboard" className="flex items-center justify-center gap-2 border border-line rounded-pill py-2.5 text-sm font-semibold">
            <Store size={15} />
            لوحتي
          </Link>
        ) : (
          <Link href="/profile/merchant-setup" className="flex items-center justify-center gap-2 border border-ink rounded-pill py-2.5 text-sm font-semibold">
            <Store size={15} />
            التبديل إلى حساب تاجر
          </Link>
        )}
      </div>

      <div className="mt-5 px-6">
        <SocialLinksDisplay userId={user.id} />
      </div>

      <div className="flex items-center justify-around border-y border-line/40 mt-6">
        {tabs.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex justify-center py-3 border-b-2 transition-colors ${
              tab === key ? "border-ink text-ink" : "border-transparent text-muted"
            }`}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      {grid.length === 0 && !(tab === "saved" && favProducts.length) ? (
        <p className="text-center text-sm text-muted py-14">لا يوجد محتوى بعد</p>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {grid.map((p) => (
            <Link key={p.id} href={`/post/${p.id}`} className="aspect-square bg-chip overflow-hidden block">
              {p.image_url ? (
                <img src={p.image_url} alt={p.caption ?? ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-ink/70">{p.caption ?? ""}</div>
              )}
            </Link>
          ))}
        </div>
      )}

      {tab === "saved" && favProducts.length > 0 && (
        <>
          <p className="px-6 mt-6 text-xs text-muted">منتجات محفوظة</p>
          <div className="grid grid-cols-2 gap-4 px-6 mt-3 md:grid-cols-4">
            {favProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
