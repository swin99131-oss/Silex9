"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

export default function ScreenHeader({
  title,
  right,
}: {
  title?: string;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-2 md:px-10 md:pt-8">
      <button
        onClick={() => router.back()}
        className="w-10 h-10 rounded-full bg-chip flex items-center justify-center"
        aria-label="رجوع"
      >
        <ChevronRight size={18} />
      </button>
      {title && <h1 className="font-display text-[17px] md:text-[20px]">{title}</h1>}
      {right ?? <div className="w-10 h-10" />}
    </div>
  );
}
