"use client";

import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";
import { useCart, type CartLine } from "@/lib/cart-context";

export function CartButton({
  productId,
  onAdd,
  match,
  size = "sm",
  className = "",
}: {
  productId: string;
  onAdd: () => unknown;
  match?: (line: CartLine) => boolean;
  size?: "sm" | "lg";
  className?: string;
}) {
  const { lines } = useCart();
  const inCart = lines.some((l) => (match ? match(l) : l.product.id === productId));
  const base = `rounded-pill ${size === "lg" ? "py-3.5" : "py-2.5"} text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${className}`;

  if (inCart) {
    return (
      <Link href="/cart" className={`${base} border-2 border-ink text-ink bg-transparent`}>
        <Check size={16} strokeWidth={2.5} />
        مضاف للسلة
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => void onAdd()} className={`${base} bg-ink text-white`}>
      <ShoppingBag size={15} />
      أضف للسلة
    </button>
  );
}
