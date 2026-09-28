"use client";

import { PageLoading } from "@/components/ui/Skeleton";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import { StoryStudio } from "@/components/StoryStudio";

export default function MyStoriesPage() {
  const router = useRouter();
  const { user, profile, loading } = useProfile();

  if (loading) return <PageLoading />;
  if (!user || !profile) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="px-6 py-6 md:px-10 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-chip flex items-center justify-center"
        >
          <ChevronRight size={18} />
        </button>
        <h1 className="font-display text-[18px]">قصصي</h1>
      </div>
      <StoryStudio profile={profile} />
    </div>
  );
}
