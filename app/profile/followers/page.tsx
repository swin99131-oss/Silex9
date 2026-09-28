"use client";

import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/useProfile";
import { UserListPage } from "@/components/UserList";

export default function MyFollowersPage() {
  const router = useRouter();
  const { user, loading } = useProfile();

  if (loading) return null;
  if (!user) {
    router.replace("/login");
    return null;
  }

  return <UserListPage userId={user.id} mode="followers" title="المتابعون" />;
}
