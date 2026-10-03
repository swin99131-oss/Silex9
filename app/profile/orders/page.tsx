"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/useProfile";
import { OrdersList } from "@/components/orders/OrdersList";
import { PageLoading } from "@/components/ui/Skeleton";

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { profile, loading } = useProfile();

  useEffect(() => {
    if (!loading && profile && profile.role !== "merchant") {
      router.replace("/profile");
    }
  }, [loading, profile, router]);

  if (loading || !profile || profile.role !== "merchant") return <PageLoading />;

  return <OrdersList mode="customer" />;
}
