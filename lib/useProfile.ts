import { useEffect, useState } from "react";

import { supabase } from "./supabase";

import type { Profile } from "./types";

async function loadOrCreateProfile(userId: string, meta: Record<string, any>) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (data) return data as Profile;

  // أول جلسة حقيقية لهذا المستخدم (بعد تأكيد البريد أو عبر جوجل) ولا يوجد له صف بعد
  const fullName = meta?.full_name || meta?.name || null;
  const avatarUrl = meta?.avatar_url || meta?.picture || null;

  const { data: created } = await supabase
    .from("profiles")
    .upsert({ id: userId, full_name: fullName, avatar_url: avatarUrl })
    .select("*")
    .maybeSingle();

  return (created as Profile) ?? null;
}

export function useProfile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function sync(currentUser: any) {
      setUser(currentUser);
      if (currentUser) {
        const p = await loadOrCreateProfile(currentUser.id, currentUser.user_metadata ?? {});
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      sync(session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      sync(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, setProfile, loading };
}
