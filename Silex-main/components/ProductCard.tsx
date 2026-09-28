"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { syncLike, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart-context";

export function ProductCard({
  product,
  size = "md",
}: {
  product: Product;
  size?: "md" | "lg";
}) {
  const { toggleFavorite, isFavorite } = useCart();
  const saved = isFavorite(product.id);
  const h = size === "lg" ? "h-[300px]" : "h-[220px]";

  return (
    <Link
      href={`/product/${product.id}`}
      className="block w-full shrink-0 rounded-card bg-card shadow-soft overflow-hidden"
    >
      <div className={`relative ${h} w-full`}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="400px"
          className="object-cover"
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(product.id);
            void syncLike(product.id, !saved);
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center"
          aria-label="حفظ"
        >
          <Bookmark
            size={16}
            className={saved ? "fill-ink text-ink" : "text-ink"}
          />
        </button>
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded-pill px-3 py-1 text-xs font-semibold">
          ${product.price}
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-[11px] text-muted uppercase tracking-wide">
          {product.merchant}
        </p>
        <h3 className="font-display text-[17px] leading-tight mt-0.5 line-clamp-2">
          {product.name}
        </h3>
      </div>
    </Link>
  );
}
