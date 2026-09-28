"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, User as UserIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FollowButton } from "@/components/FollowButton";
import { useProfile } from "@/lib/useProfile";

type Person = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export function UserListPage({
  userId,
  mode,
  title,
}: {
  userId: string;
  mode: "followers" | "following";
  title: string;
}) {
  const router = useRouter();
  const { user: viewer } = useProfile();
  const [people, setPeople] = useState<Person[] | null>(null);

  useEffect(() => {
    async function load() {
      if (mode === "followers") {
        const { data } = await supabase
          .from("follows")
          .select("profile:profiles!follower_id(id, full_name, username, avatar_url)")
          .eq("merchant_id", userId);
        setPeople(((data ?? []) as unknown as { profile: Person }[]).map((r) => r.profile));
      } else {
        const { data } = await supabase
          .from("follows")
          .select("profile:profiles!merchant_id(id, full_name, username, avatar_url)")
          .eq("follower_id", userId);
        setPeople(((data ?? []) as unknown as { profile: Person }[]).map((r) => r.profile));
      }
    }
    load();
  }, [userId, mode]);

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 px-6 pt-6 pb-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-chip flex items-center justify-center">
          <ChevronRight size={18} />
        </button>
        <h1 className="font-display text-[18px]">{title}</h1>
      </div>

      <div className="px-6 flex flex-col gap-1 mt-2">
        {people === null ? (
          <p className="text-sm text-muted text-center py-10">جارٍ التحميل...</p>
        ) : people.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">لا يوجد أحد هنا بعد</p>
        ) : (
          people.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2.5">
              <Link href={`/u/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-full bg-chip flex items-center justify-center overflow-hidden shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={18} className="text-ink/40" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{p.full_name ?? "مستخدم"}</p>
                  {p.username && <p className="text-xs text-muted truncate">@{p.username}</p>}
                </div>
              </Link>
              {viewer && viewer.id !== p.id && (
                <FollowButton merchantId={p.id} viewerId={viewer.id} size="sm" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
