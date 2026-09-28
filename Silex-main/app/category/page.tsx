"use client";

import { PageLoading } from "@/components/ui/Skeleton";
import { useEffect, useState, Suspense, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCategories, type Category } from "@/lib/catalog";
import ScreenHeader from "@/components/ScreenHeader";

type Post = {
  id: string;
  image_url: string | null;
  caption: string | null;
  likes: number;
};

async function getTrendingPosts(category?: string): Promise<Post[]> {
  let q = supabase
    .from("posts")
    .select("id, image_url, caption, product:products(is_active)")
    .order("created_at", { ascending: false })
    .limit(60);
  if (category && category !== "all") q = q.eq("category", category);
  const { data } = await q;

  const base = ((data ?? []) as unknown as { id: string; image_url: string | null; caption: string | null; product: { is_active: boolean } | null }[])
    .filter((p) => p.product?.is_active !== false)
    .map(({ id, image_url, caption }) => ({ id, image_url, caption }));
  if (!base.length) return [];
  const ids = base.map((p) => p.id);

  const [likesRes, savesRes] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", ids),
    supabase.from("post_saves").select("post_id").in("post_id", ids),
  ]);

  const likes: Record<string, number> = {};
  const saves: Record<string, number> = {};
  (likesRes.data ?? []).forEach((r: { post_id: string }) => {
    likes[r.post_id] = (likes[r.post_id] ?? 0) + 1;
  });
  (savesRes.data ?? []).forEach((r: { post_id: string }) => {
    saves[r.post_id] = (saves[r.post_id] ?? 0) + 1;
  });

  return base
    .map((p) => ({ ...p, likes: likes[p.id] ?? 0, score: (likes[p.id] ?? 0) + (saves[p.id] ?? 0) * 2 }))
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...p }) => p);
}

function ExploreContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [active, setActive] = useState(params.get("c") ?? "all");
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    getTrendingPosts(active).then((p) => {
      if (!alive) return;
      setPosts(p);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [active]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const v = q.trim();
    router.push(v ? `/search?q=${encodeURIComponent(v)}` : "/search");
  }

  return (
    <div className="pb-10">
      <ScreenHeader title="استكشف" />

      <form onSubmit={onSearch} className="px-6 mt-3 md:px-10">
        <div className="flex items-center gap-3 bg-chip rounded-pill px-4 py-3">
          <SearchIcon size={16} className="text-ink/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن منتج"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink/40"
          />
        </div>
      </form>

      <div className="flex gap-2 px-6 mt-4 overflow-x-auto no-scrollbar md:px-10">
        <button
          onClick={() => setActive("all")}
          className={`px-4 py-2 rounded-pill text-sm font-medium shrink-0 ${
            active === "all" ? "bg-ink text-white" : "bg-chip text-ink/70"
          }`}
        >
          الكل
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`px-4 py-2 rounded-pill text-sm font-medium shrink-0 ${
              active === c.id ? "bg-ink text-white" : "bg-chip text-ink/70"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {!loaded ? (
        <PageLoading />
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-muted py-14">لا توجد منشورات في هذا التصنيف بعد</p>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 mt-4 md:px-10 md:gap-1">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/post/${p.id}`}
              className="relative aspect-square bg-chip overflow-hidden block"
            >
              {p.image_url ? (
                <img src={p.image_url} alt={p.caption ?? ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-ink/70 leading-tight">
                  {p.caption ?? ""}
                </div>
              )}
              {p.likes > 0 && (
                <span className="absolute bottom-1 right-1 flex items-center gap-1 text-white text-[10px] bg-black/40 rounded-full px-1.5 py-0.5">
                  <Heart size={10} fill="currentColor" />
                  {p.likes}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreContent />
    </Suspense>
  );
}
