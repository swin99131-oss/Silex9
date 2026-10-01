"use client";

import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { PageLoading } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Grid3x3, MessageCircle, User as UserIcon, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { FollowButton } from "@/components/FollowButton";
import { SocialLinksDisplay } from "@/components/SocialLinks";
import type { Profile } from "@/lib/types";

type Post = {
  id: string;
  image_url: string;
  caption: string | null;
};

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user: viewer } = useProfile();

  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setProfile(data as Profile | null);
      });

    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", params.id)
      .then(({ count }) => alive && setFollowers(count ?? 0));

    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", params.id)
      .then(({ count }) => alive && setFollowing(count ?? 0));

    supabase
      .from("posts")
      .select("id, image_url, caption")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => alive && setPosts((data ?? []) as Post[]));

    return () => {
      alive = false;
    };
  }, [params.id]);

  async function handleMessage() {
    if (!viewer) {
      router.push("/login");
      return;
    }
    setStarting(true);
    try {
      const a = viewer.id;
      const b = params.id as string;

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(customer_id.eq.${a},merchant_id.eq.${b}),and(customer_id.eq.${b},merchant_id.eq.${a})`
        )
        .maybeSingle();

      if (existing) {
        router.push(`/chat/${existing.id}`);
        return;
      }

      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ customer_id: a, merchant_id: b })
        .select("id")
        .single();

      if (error) throw error;
      router.push(`/chat/${created.id}`);
    } catch (err) {
      console.error("handleMessage error:", err);
      toast.error("تعذّر بدء المحادثة، حاول مجدداً");
    } finally {
      setStarting(false);
    }
  }

  if (profile === undefined) {
    return <PageLoading />;
  }

  if (!profile) {
    return <p className="p-6 text-sm text-muted text-center">هذا المستخدم غير موجود.</p>;
  }

  const displayName = profile.full_name || profile.username || "مستخدم";
  const isOwnProfile = viewer?.id === profile.id;

  return (
    <div className="pb-10">
      <div className="flex items-center px-6 pt-2 md:px-10">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-chip flex items-center justify-center"
          aria-label="رجوع"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex flex-col items-center text-center px-6 mt-2">
        <div className="w-24 h-24 rounded-full bg-chip flex items-center justify-center overflow-hidden border-2 border-line/40">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={36} className="text-ink/40" />
          )}
        </div>
        <h1 className="font-display text-[20px] mt-3">
          {displayName}
          <VerifiedBadge show={verifiedOf(profile)} size={18} className="mr-1 align-middle" />
        </h1>
        {profile.username && <p className="text-xs text-muted mt-0.5">@{profile.username}</p>}
        {profile.bio && (
          <p className="text-sm text-ink/70 mt-2 max-w-xs leading-relaxed">{profile.bio}</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-8 mt-5">
        <div className="text-center">
          <p className="font-display text-[18px]">{posts.length}</p>
          <p className="text-[11px] text-muted mt-0.5">منشورات</p>
        </div>
        <Link href={`/u/${profile.id}/followers`} className="text-center">
          <p className="font-display text-[18px]">{followers}</p>
          <p className="text-[11px] text-muted mt-0.5">متابعون</p>
        </Link>
        <Link href={`/u/${profile.id}/following`} className="text-center">
          <p className="font-display text-[18px]">{following}</p>
          <p className="text-[11px] text-muted mt-0.5">متابَعون</p>
        </Link>
      </div>

      {!isOwnProfile && (
        <div className="flex items-center gap-3 px-6 mt-5 md:max-w-md md:mx-auto">
          <div className="flex-1">
            <FollowButton merchantId={profile.id} viewerId={viewer?.id ?? null} />
          </div>
          <button
            onClick={handleMessage}
            disabled={starting}
            className="flex-1 flex items-center justify-center gap-1.5 bg-chip hover:bg-line/40 transition-colors rounded-pill py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            <MessageCircle size={16} />
            {starting ? "..." : "مراسلة"}
          </button>
        </div>
      )}

      <div className="mt-5 px-6">
        <SocialLinksDisplay userId={profile.id} />
      </div>

      <div className="flex items-center justify-center border-y border-line/40 mt-6">
        <div className="flex-1 flex flex-col items-center gap-1 py-3 border-b-2 border-ink text-ink">
          <Grid3x3 size={18} />
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-sm text-muted py-14">لا يوجد منشورات بعد</p>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {posts.map((p) => (
            <Link key={p.id} href={`/post/${p.id}`} className="aspect-square bg-chip overflow-hidden block">
              {p.image_url ? (
                <img src={p.image_url} alt={p.caption ?? ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-ink/70 leading-tight">
                  {p.caption ?? ""}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
