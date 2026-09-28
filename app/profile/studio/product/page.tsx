"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import { ProductStudio } from "@/components/ProductStudio";

export default function AddProductPage() {
  const router = useRouter();
  const { user, profile, loading } = useProfile();

  if (loading) return null;
  if (!user || !profile) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex items-center gap-3 px-6 pt-6 pb-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-chip flex items-center justify-center"
        >
          <ChevronRight size={18} />
        </button>
        <h1 className="font-display text-[18px]">إضافة منتج</h1>
      </div>

      <div className="px-6 max-w-sm mx-auto w-full">
        <ProductStudio profile={profile} />
      </div>
    </div>
  );
}
