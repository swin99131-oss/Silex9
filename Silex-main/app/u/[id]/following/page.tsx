"use client";

import { useParams } from "next/navigation";
import { UserListPage } from "@/components/UserList";

export default function FollowingPage() {
  const params = useParams<{ id: string }>();
  return <UserListPage userId={params.id} mode="following" title="يتابع" />;
}
