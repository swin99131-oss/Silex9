"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Compass, User } from "lucide-react";
import { useCart } from "@/lib/cart-context";

const items = [
  { href: "/home", icon: Home, label: "الرئيسية" },
  { href: "/category", icon: Compass, label: "استكشف" },
  { href: "/search", icon: Search, label: "بحث" },
  { href: "/profile", icon: User, label: "حسابي" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-40px)] max-w-[360px] md:hidden">
      <div className="flex items-center justify-between bg-ink rounded-pill px-5 py-3.5 shadow-float">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="relative flex items-center justify-center"
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 1.8}
                className={active ? "text-white" : "text-white/45"}
              />
              {href === "/cart" && count > 0 && (
                <span className="absolute -top-2 -left-2 bg-white text-ink text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                  {count}
                </span>
              )}
              {active && (
                <span className="absolute -bottom-2 w-1 h-1 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
