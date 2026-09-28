"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Props {
  merchantId: string;
  viewerId: string | null;
  initial?: boolean;
  size?: "sm" | "md";
  onDark?: boolean;
  onChange?: (following: boolean) => void;
}

export function FollowButton({ merchantId, viewerId, initial, size = "md", onDark = false, onChange }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initial ?? false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial !== undefined || !viewerId) return;
    supabase
      .from("follows")
      .select("merchant_id")
      .eq("follower_id", viewerId)
      .eq("merchant_id", merchantId)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [initial, viewerId, merchantId]);

  async function toggle() {
    if (!viewerId) {
      router.push("/profile");
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    const { error } = next
      ? await supabase.from("follows").insert({ follower_id: viewerId, merchant_id: merchantId })
      : await supabase.from("follows").delete().eq("follower_id", viewerId).eq("merchant_id", merchantId);
    if (error) setFollowing(!next);
    else onChange?.(next);
    setBusy(false);
  }

  const sizing = size === "sm" ? "px-3 py-1.5 text-xs" : "w-full py-2.5 text-sm";
  const color = onDark
    ? following
      ? "bg-white/20 text-white"
      : "bg-white text-ink"
    : following
    ? "bg-chip text-ink/70"
    : "bg-ink text-white";

  return (
    <button onClick={toggle} disabled={busy} className={`${sizing} ${color} rounded-pill font-medium transition shrink-0`}>
      {following ? "متابَع" : "متابعة"}
    </button>
  );
}
