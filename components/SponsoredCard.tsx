"use client";

import Link from "next/link";
import { Store, ShoppingBag } from "lucide-react";

export type AdItem = {
  id: string;
  type: "product" | "company" | "promotion";
  title: string;
  description: string | null;
  image_url: string | null;
  merchant_id: string;
  merchant_name: string;
  merchant_avatar: string | null;
  product_id: string | null;
  product_title: string | null;
  product_image: string | null;
  product_price: number | null;
};

export function SponsoredCard({ ad }: { ad: AdItem }) {
  const isProduct = ad.type === "product" && !!ad.product_id;
  const href = isProduct ? `/product/${ad.product_id}` : `/store/${ad.merchant_id}`;
  const image = isProduct ? ad.product_image : ad.image_url ?? ad.merchant_avatar;
  const title = isProduct ? ad.product_title ?? ad.title : ad.title;
  const CtaIcon = isProduct ? ShoppingBag : Store;

  return (
    <Link href={href} className="block overflow-hidden rounded-card bg-card shadow-soft">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip font-display text-sm">
          {ad.merchant_avatar ? (
            <img src={ad.merchant_avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            ad.merchant_name.charAt(0)
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{ad.merchant_name}</span>
        <span className="shrink-0 rounded-pill bg-chip px-2.5 py-1 text-[10px] text-muted">ممول</span>
      </div>

      {image && (
        <div className="aspect-square w-full bg-chip">
          <img src={image} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        {ad.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{ad.description}</p>}
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-ink px-4 py-2 text-xs font-semibold text-white">
          <CtaIcon size={14} />
          {isProduct ? "عرض المنتج" : "زيارة المتجر"}
        </span>
      </div>
    </Link>
  );
}
