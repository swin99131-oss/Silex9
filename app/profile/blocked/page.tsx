"use client";

import { PageLoading } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, User as UserIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";

type Blocked = {
  blocked_id: string;
  profile: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
};

export default function BlockedUsersPage() {
  const router = useRouter();
  const { user, loading } = useProfile();
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("blocks")
      .select("blocked_id, profile:profiles!blocked_id(full_name, username, avatar_url)")
      .eq("blocker_id", user.id)
      .then(({ data }) => setBlocked((data ?? []) as unknown as Blocked[]));
  }, [user]);

  async function unblock(blockedId: string) {
    if (!user) return;
    await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", blockedId);
    setBlocked((prev) => (prev ?? []).filter((b) => b.blocked_id !== blockedId));
  }

  if (loading) return <PageLoading />;
  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 px-6 pt-6 pb-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-chip flex items-center justify-center">
          <ChevronRight size={18} />
        </button>
        <h1 className="font-display text-[18px]">الحسابات المحظورة</h1>
      </div>

      <div className="px-6 mt-2 flex flex-col gap-2">
        {blocked === null ? (
          <PageLoading />
        ) : blocked.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">لا يوجد حسابات محظورة</p>
        ) : (
          blocked.map((b) => (
            <div key={b.blocked_id} className="flex items-center gap-3 bg-chip rounded-2xl px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-line/40 flex items-center justify-center overflow-hidden shrink-0">
                {b.profile?.avatar_url ? (
                  <img src={b.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={16} className="text-ink/40" />
                )}
              </div>
              <p className="flex-1 text-sm font-medium truncate">
                {b.profile?.full_name ?? b.profile?.username ?? "مستخدم"}
              </p>
              <button
                onClick={() => unblock(b.blocked_id)}
                className="text-xs font-semibold text-ink bg-paper border border-line/40 rounded-pill px-3 py-1.5"
              >
                إلغاء الحظر
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
