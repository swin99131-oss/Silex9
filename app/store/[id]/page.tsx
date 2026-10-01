"use client";

import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getMerchantProducts, getCategories, type Product } from "@/lib/catalog";
import { useProfile } from "@/lib/useProfile";
import { waLink } from "@/lib/whatsapp";
import type { Story, StoryMerchant } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { FollowButton } from "@/components/FollowButton";
import { StoryViewer } from "@/components/StoryViewer";
import ScreenHeader from "@/components/ScreenHeader";
import { BookChatButton } from "@/components/BookChatButton";

type Store = StoryMerchant & {
  bio: string | null;
  store_name: string | null;
  store_category: string | null;
  store_bio: string | null;
};

export default function StorePage() {
  const params = useParams<{ id: string }>();
  const { user, loading } = useProfile();
  const viewerId = user?.id ?? null;

  const [store, setStore] = useState<Store | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [followers, setFollowers] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [catName, setCatName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setStore(undefined);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, bio, avatar_url, whatsapp, store_name, store_category, store_bio, verified_at")
        .eq("id", params.id)
        .eq("role", "merchant")
        .maybeSingle();
      if (!alive) return;
      setStore((data as Store | null) ?? null);
      if (!data) return;
      if (data.store_category) {
        getCategories().then((cs) => {
          if (alive) setCatName(cs.find((c) => c.id === data.store_category)?.name ?? null);
        });
      }
      const [prods, st, fc] = await Promise.all([
        getMerchantProducts(params.id),
        supabase
          .from("stories")
          .select("*")
          .eq("merchant_id", params.id)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: true }),
        supabase.rpc("followers_count", { mid: params.id }),
      ]);
      if (!alive) return;
      setProducts(prods);
      setStories((st.data ?? []) as Story[]);
      setFollowers(typeof fc.data === "number" ? fc.data : null);
    })();
    return () => {
      alive = false;
    };
  }, [params.id]);

  // القصص التي أخفاها الزبون سابقاً
  useEffect(() => {
    if (!viewerId) return;
    supabase
      .from("story_hides")
      .select("story_id")
      .eq("user_id", viewerId)
      .then(({ data }) =>
        setHidden(new Set(((data ?? []) as { story_id: string }[]).map((r) => r.story_id)))
      );
  }, [viewerId]);

  if (store === undefined) return null;
  if (!store) return <p className="p-6 text-sm text-muted">المتجر غير موجود.</p>;

  const name = store.store_name ?? store.full_name ?? store.username ?? "متجر";
  const visible = stories.filter((s) => !hidden.has(s.id));
  const isOwner = viewerId === store.id;

  return (
    <div>
      <ScreenHeader title={name} />

      <div className="px-6 mt-2 flex items-center gap-4 md:px-10">
        <button
          onClick={() => visible.length > 0 && setOpen(true)}
          aria-label="القصص"
          className={`w-[72px] h-[72px] rounded-full p-[3px] shrink-0 ${
            visible.length > 0 ? "bg-ink" : "bg-line"
          }`}
        >
          <span className="w-full h-full rounded-full border-2 border-card bg-chip flex items-center justify-center text-lg font-display">
            {name.charAt(0)}
          </span>
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-[20px] md:text-[24px] truncate">{name}<VerifiedBadge show={verifiedOf(store)} size={18} className="mr-1 align-middle" /></h1>
          {store.username && <p className="text-sm text-muted truncate">@{store.username}</p>}
          <p className="text-xs text-muted mt-0.5">
            {products.length} منتج{followers !== null ? ` · ${followers} متابع` : ""}
          </p>
        </div>
      </div>

      {catName && (
        <p className="px-6 mt-3 md:px-10">
          <span className="inline-block bg-chip rounded-pill px-3 py-1 text-xs text-ink/70">{catName}</span>
        </p>
      )}
      {(store.store_bio ?? store.bio) && (
        <p className="px-6 mt-3 text-sm md:px-10">{store.store_bio ?? store.bio}</p>
      )}

      <div className="px-6 mt-4 flex flex-wrap gap-2 md:px-10">
        {!loading && !isOwner && (
          <FollowButton
            merchantId={store.id}
            viewerId={viewerId}
            onChange={(f) => setFollowers((n) => (n === null ? n : n + (f ? 1 : -1)))}
          />
        )}
        {!loading && !isOwner && (
          <BookChatButton
            merchantId={store.id}
            label="دردشة"
            className="px-4 py-2 rounded-pill text-sm font-medium bg-chip text-ink/70 flex items-center gap-2"
          />
        )}
        {store.whatsapp && !isOwner && (
          <a
            href={waLink(store.whatsapp, `مرحباً ${name}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-pill text-sm font-medium bg-chip text-ink/70 flex items-center gap-2"
          >
            <MessageCircle size={15} />
            واتساب
          </a>
        )}
      </div>

      {products.length === 0 ? (
        <p className="px-6 mt-10 text-sm text-muted text-center md:px-10">
          لم ينشر هذا المتجر منتجات بعد
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 px-6 mt-6 md:grid-cols-4 md:px-10 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {open && visible.length > 0 && (
        <StoryViewer
          merchant={store}
          stories={visible}
          viewerId={viewerId}
          onClose={() => setOpen(false)}
          onHidden={(id) => setHidden((p) => new Set(p).add(id))}
        />
      )}
    </div>
  );
}
