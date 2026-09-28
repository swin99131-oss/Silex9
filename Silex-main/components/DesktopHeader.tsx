"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";

const links = [
  { href: "/home", label: "الرئيسية" },
  { href: "/category", label: "التصنيفات" },
  { href: "/profile", label: "حسابي" },
];

export default function DesktopHeader() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <header className="hidden md:flex items-center justify-between px-10 py-6 border-b border-line max-w-6xl mx-auto w-full">
      <nav className="flex items-center gap-8">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm font-medium transition ${
              pathname === l.href ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <Link
          href="/search"
          className="w-10 h-10 rounded-full bg-chip flex items-center justify-center"
          aria-label="بحث"
        >
          <Search size={17} />
        </Link>
        <Link
          href="/cart"
          className="relative w-10 h-10 rounded-full bg-chip flex items-center justify-center"
          aria-label="السلة"
        >
          <ShoppingBag size={17} />
          {count > 0 && (
            <span className="absolute -top-1 -left-1 bg-ink text-white text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
