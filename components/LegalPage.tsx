import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-paper px-5 py-8 text-ink">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted">
        <ArrowRight size={16} />
        العودة
      </Link>
      <h1 className="font-display text-2xl">{title}</h1>
      <p className="mt-1 text-xs text-muted">آخر تحديث: {updated}</p>
      <div className="mt-6 space-y-6 text-sm leading-7 text-ink/85">{children}</div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-base text-ink">{title}</h2>
      {children}
    </section>
  );
}
