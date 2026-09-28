"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/onboarding"), 1400);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="app-shell flex items-center justify-center min-h-screen">
      <Logo variant="dark" size="lg" />
    </div>
  );
}
