"use client";

import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/lib/useProfile";
import { supabase } from "@/lib/supabase";
import { StoriesBar } from "@/components/StoriesBar";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { FollowButton } from "@/components/FollowButton";
import { SponsoredCard, type AdItem } from "@/components/SponsoredCard";
import { getFollowingFeed, getDiscoverFeed, getSuggestedStores, type SuggestedStore } from "@/lib/feed";

export default function HomePage() {
  const { user } = useProfile();
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [stores, setStores] = useState<SuggestedStore[]>([]);
  const [following, setFollowing] = useState(0);
  const [ads, setAds] = useState<AdItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [mine, discover, sug, hides, adsRes] = await Promise.all([
        getFollowingFeed(user.id),
        getDiscoverFeed(user.id),
        getSuggestedStores(user.id),
        supabase.from("post_hides").select("post_id").eq("user_id", user.id),
        supabase.rpc("get_active_ads", { p_limit: 6 }),
      ]);
      if (!alive) return;
      const hidden = new Set(((hides.data ?? []) as { post_id: string }[]).map((r) => r.post_id));
      const seen = new Set(mine.map((p) => p.id));
      setFeed(
        [...mine, ...discover.filter((p) => !seen.has(p.id))].filter((p) => !hidden.has(p.id))
      );
      setFollowing(mine.length);
      setStores(sug);
      setAds(Array.isArray(adsRes.data) ? (adsRes.data as AdItem[]) : []);
      setReady(true);
    })();
    return () => { alive = false; };
  }, [user]);

  return (
    <div className="pb-10">

      <StoriesBar />

      {user && stores.length > 0 && following < 5 && (
        <div className="mt-5">
          <h2 className="font-display text-[17px] px-6 md:px-10">متاجر مقترحة لك</h2>
          <div className="flex gap-3 px-6 mt-3 overflow-x-auto no-scrollbar md:px-10">
            {stores.map((s) => {
              const name = s.store_name ?? s.full_name ?? s.username ?? "متجر";
              return (
                <div key={s.id} className="shrink-0 w-[132px] bg-card rounded-2xl shadow-soft p-3 text-center">
                  <Link href={`/store/${s.id}`} className="block">
                    <div className="w-14 h-14 rounded-full bg-chip mx-auto overflow-hidden flex items-center justify-center font-display">
                      {s.avatar_url ? <img src={s.avatar_url} alt="" className="w-full h-full object-cover" /> : name.charAt(0)}
                    </div>
                    <p className="text-xs font-semibold mt-2 truncate">{name}<VerifiedBadge show={verifiedOf(s)} size={13} className="mr-1 align-middle" /></p>
                  </Link>
                  <div className="mt-2 flex justify-center">
                    <FollowButton merchantId={s.id} viewerId={user.id} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 px-6 mt-5 max-w-lg mx-auto md:px-0">
        {feed.map((p, idx) => (
          <Fragment key={p.id}>
            <PostCard post={p} />
            {ads.length > 0 && (idx + 1) % 4 === 0 && (
              <SponsoredCard ad={ads[Math.floor(idx / 4) % ads.length]} />
            )}
          </Fragment>
        ))}
        {ready && ads.length > 0 && feed.length > 0 && feed.length < 4 && <SponsoredCard ad={ads[0]} />}
        {ready && feed.length === 0 && (
          <p className="text-center text-sm text-muted py-10">لا توجد منشورات بعد</p>
        )}
      </div>
    </div>
  );
}
