"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] text-ink flex flex-col justify-between p-6 md:p-16">
      <header className="w-full flex justify-center md:justify-start">
        <Logo size="responsive" variant="dark" />
      </header>

      <main className="my-auto text-center md:text-right max-w-3xl mx-auto md:mx-0">
        <h1 className="font-display text-[32px] sm:text-[48px] md:text-[60px] font-bold leading-tight">
          تسوّق مباشرةً من الصنّاع، <br />
          اكتشف قطعاً صُممت لأجلك.
        </h1>

        <p className="text-muted text-base sm:text-lg mt-4 max-w-lg mx-auto md:mx-0">
          منصة واحدة تجمع أفضل المتاجر المستقلة في مكان واحد.
        </p>

        <div className="mt-8 flex justify-center md:justify-start">
          <Link
            href="/login"
            className="w-full sm:w-auto bg-ink text-white rounded-pill px-10 py-4 text-base font-semibold hover:opacity-90 transition-all text-center"
          >
            سجّل الآن
          </Link>
        </div>
      </main>

      <footer className="text-center md:text-right text-xs text-muted pt-6">
        <p>© {new Date().getFullYear()} Salix. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
