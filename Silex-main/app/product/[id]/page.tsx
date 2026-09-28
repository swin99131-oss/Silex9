"use client";

import { CartButton } from "@/components/ui/CartButton";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Bookmark, Star } from "lucide-react";
import {
  getProduct,
  relatedProducts,
  syncLike,
  trackView,
  type Product,
} from "@/lib/catalog";
import { useCart } from "@/lib/cart-context";
import { useProfile } from "@/lib/useProfile";
import { ProductCard } from "@/components/ProductCard";
import { FollowButton } from "@/components/FollowButton";
import { BookChatButton } from "@/components/BookChatButton";

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useProfile();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [related, setRelated] = useState<Product[]>([]);
  const { add, toggleFavorite, isFavorite } = useCart();
  const [color, setColor] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let alive = true;
    setProduct(undefined);
    getProduct(params.id).then((p) => {
      if (!alive) return;
      setProduct(p);
      if (!p) return;
      setSize(p.sizes?.[1] ?? p.sizes?.[0] ?? null);
      trackView(p.id);
      relatedProducts(p).then((r) => {
        if (alive) setRelated(r);
      });
    });
    return () => {
      alive = false;
    };
  }, [params.id]);

  if (product === undefined) return null;

  if (!product) {
    return <p className="p-6 text-sm text-muted">المنتج غير موجود.</p>;
  }

  const saved = isFavorite(product.id);
  const viewerId = user?.id ?? null;

  return (
    <div className="md:grid md:grid-cols-2 md:gap-10 md:px-10 md:pt-8">
      <div className="relative h-[340px] w-full md:h-[520px] md:rounded-card md:overflow-hidden">
        <Image src={product.image} alt={product.name} fill className="object-cover" priority />
        <button
          onClick={() => router.back()}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center"
          aria-label="رجوع"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={() => {
            toggleFavorite(product.id);
            void syncLike(product.id, !saved);
          }}
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center"
          aria-label="حفظ"
        >
          <Bookmark size={16} className={saved ? "fill-ink text-ink" : "text-ink"} />
        </button>
      </div>

      <div className="bg-paper rounded-t-[32px] -mt-6 relative px-6 pt-6 pb-4 md:mt-0 md:rounded-none md:px-0 md:pt-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/store/${product.merchantId}`}
                className="text-[11px] text-muted uppercase tracking-wide"
              >
                {product.merchant}
              </Link>
              {!loading && viewerId !== product.merchantId && (
                <FollowButton
                  merchantId={product.merchantId}
                  viewerId={viewerId}
                  size="sm"
                />
              )}
            </div>
            <h1 className="font-display text-[24px] leading-tight mt-1 md:text-[30px]">
              {product.name}
            </h1>
          </div>
          {product.reviews > 0 && (
            <div className="flex items-center gap-1 bg-chip rounded-pill px-2.5 py-1 shrink-0 mt-1">
              <Star size={13} className="fill-ink text-ink" />
              <span className="text-xs font-semibold">{product.rating}</span>
            </div>
          )}
        </div>

        {product.reviews > 0 && (
          <p className="text-xs text-muted mt-1">{product.reviews} تقييم</p>
        )}

        {product.description && (
          <p className="text-sm text-ink/70 mt-4 leading-relaxed">
            {expanded || product.description.length <= 90
              ? product.description
              : `${product.description.slice(0, 90)}...`}{" "}
            {product.description.length > 90 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="font-semibold text-ink underline underline-offset-2"
              >
                {expanded ? "عرض أقل" : "قراءة المزيد"}
              </button>
            )}
          </p>
        )}

        {product.colors && (
          <div className="mt-5">
            <p className="text-xs text-muted mb-2">اللون</p>
            <div className="flex gap-3">
              {product.colors.map((c, i) => (
                <button
                  key={c}
                  onClick={() => setColor(i)}
                  className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: color === i ? "#111111" : "transparent" }}
                  aria-label={c}
                >
                  <span
                    className="w-6 h-6 rounded-full border border-black/10"
                    style={{ backgroundColor: c }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {product.sizes && (
          <div className="mt-5">
            <p className="text-xs text-muted mb-2">المقاس</p>
            <div className="flex gap-2 flex-wrap">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`w-11 h-11 rounded-full text-sm font-medium flex items-center justify-center ${
                    size === s ? "bg-ink text-white" : "bg-chip text-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mt-6 pt-5 border-t border-line">
          <div className="flex-1">
            <p className="text-xs text-muted">السعر</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[22px]">${product.price}</span>
              {product.oldPrice && (
                <span className="text-sm text-muted line-through">
                  ${product.oldPrice}
                </span>
              )}
            </div>
          </div>
          {!loading && viewerId !== product.merchantId && (
            <CartButton
              productId={product.id}
              size="lg"
              className="flex-1"
              match={(l) =>
                l.product.id === product.id &&
                (l.color ?? null) === (product.colors?.[color] ?? null) &&
                (l.size ?? null) === (size ?? null)
              }
              onAdd={() => add(product, 1, { color: product.colors?.[color] ?? null, size })}
            />
          )}
        </div>

        {!loading && viewerId !== product.merchantId && (
          <BookChatButton
            merchantId={product.merchantId}
            productId={product.id}
            message="مرحباً، أرغب بحجز هذا المنتج"
            className="w-full mt-3 bg-chip text-ink rounded-pill py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
          />
        )}

        {related.length > 0 && (
          <div className="mt-6 md:mt-10">
            <h2 className="font-display text-[18px] mb-3">قد يعجبك أيضاً</h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar">
              {related.map((p) => (
                <div key={p.id} className="w-[180px] shrink-0">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
