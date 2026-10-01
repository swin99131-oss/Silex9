import { supabase } from "@/lib/supabase";
import type { FeedPost } from "@/components/PostCard";

const COLS =
  "id, user_id, title, caption, hashtags, image_url, media_type, product_id, created_at, author:profiles!user_id(full_name, username, avatar_url, store_name, verified_at)";

async function enrich(rows: any[], userId: string): Promise<FeedPost[]> {
  if (!rows.length) return [];
  const ids = rows.map((p) => p.id);
  const [likes, cmts, mine, mySaved] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", ids),
    supabase.from("post_comments").select("post_id").in("post_id", ids),
    supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", ids),
    supabase.from("post_saves").select("post_id").eq("user_id", userId).in("post_id", ids),
  ]);
  const count = (arr: any[] | null) => {
    const m: Record<string, number> = {};
    (arr ?? []).forEach((r) => (m[r.post_id] = (m[r.post_id] ?? 0) + 1));
    return m;
  };
  const lc = count(likes.data), cc = count(cmts.data);
  const myLikes = new Set((mine.data ?? []).map((r: any) => r.post_id));
  const mySaves = new Set((mySaved.data ?? []).map((r: any) => r.post_id));
  return rows.map((p) => ({
    ...p,
    likes: lc[p.id] ?? 0,
    comments: cc[p.id] ?? 0,
    liked: myLikes.has(p.id),
    saved: mySaves.has(p.id),
  }));
}

// منشورات من يتابعهم + من تفاعل معهم
export async function getFollowingFeed(userId: string): Promise<FeedPost[]> {
  const [f, l, s] = await Promise.all([
    supabase.from("follows").select("merchant_id").eq("follower_id", userId),
    supabase.from("post_likes").select("post:posts(user_id)").eq("user_id", userId),
    supabase.from("post_saves").select("post:posts(user_id)").eq("user_id", userId),
  ]);
  const authors = new Set<string>();
  (f.data ?? []).forEach((r: any) => r.merchant_id && authors.add(r.merchant_id));
  [...(l.data ?? []), ...(s.data ?? [])].forEach((r: any) => r.post?.user_id && authors.add(r.post.user_id));
  authors.delete(userId);
  if (!authors.size) return [];
  const { data } = await supabase
    .from("posts").select(COLS)
    .in("user_id", Array.from(authors))
    .order("created_at", { ascending: false }).limit(20);
  return enrich((data ?? []) as any[], userId);
}

// منشورات وفيديوهات من الجميع (للحساب الجديد)
export async function getDiscoverFeed(userId: string): Promise<FeedPost[]> {
  const { data } = await supabase
    .from("posts").select(COLS)
    .neq("user_id", userId)
    .order("created_at", { ascending: false }).limit(20);
  return enrich((data ?? []) as any[], userId);
}

export type SuggestedStore = {
  id: string; full_name: string | null; username: string | null;
  store_name: string | null; avatar_url: string | null;
};

// متاجر مقترحة للمتابعة
export async function getSuggestedStores(userId: string): Promise<SuggestedStore[]> {
  const { data: f } = await supabase.from("follows").select("merchant_id").eq("follower_id", userId);
  const followed = new Set((f ?? []).map((r: any) => r.merchant_id));
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, store_name, avatar_url")
    .eq("role", "merchant").neq("id", userId).limit(20);
  return ((data ?? []) as SuggestedStore[]).filter((s) => !followed.has(s.id)).slice(0, 10);
}
