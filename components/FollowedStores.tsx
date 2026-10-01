"use client";

import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { FollowButton } from "./FollowButton";

type Store = Pick<Profile, "id" | "full_name" | "username" | "bio" | "store_name">;

export function FollowedStores({ userId }: { userId: string }) {
  const [stores, setStores] = useState<Store[] | null>(null);

  useEffect(() => {
    supabase
      .from("follows")
      .select("store:profiles!merchant_id(id, full_name, username, bio, store_name, verified_at)")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) =>
        setStores(((data ?? []) as unknown as { store: Store }[]).map((r) => r.store))
      );
  }, [userId]);

  if (!stores) return null;
  if (!stores.length) return <p className="text-sm text-muted">لم تتابع أي متجر بعد</p>;

  return (
    <div className="flex flex-col gap-3">
      {stores.map((s) => (
        <div key={s.id} className="bg-card rounded-card p-4 shadow-soft flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-chip flex items-center justify-center font-display shrink-0">
            {(s.store_name ?? s.full_name ?? s.username ?? "؟").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="flex min-w-0 items-center gap-1 text-sm font-semibold">
              <span className="truncate">{s.store_name ?? s.full_name ?? s.username}</span>
              <VerifiedBadge show={verifiedOf(s)} size={13} />
            </p>
            <p className="text-xs text-muted truncate">
              {s.username ? `@${s.username}` : ""}
              {s.bio ? ` ${s.bio}` : ""}
            </p>
          </div>
          <FollowButton merchantId={s.id} viewerId={userId} initial size="sm" />
        </div>
      ))}
    </div>
  );
}
