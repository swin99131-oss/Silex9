import { supabase } from "@/lib/supabase";
import type { Product } from "./catalog";

export type CartItem = {
  product: Product;
  qty: number;
  color?: string | null;
  size?: string | null;
};

export type MerchantGroup = {
  merchantId: string;
  name: string;
  items: CartItem[];
  count: number;
  total: number;
};

const COLOR_NAMES: Record<string, string> = {
  "#111111": "أسود",
  "#FFFFFF": "أبيض",
  "#D8CFC0": "بيج",
  "#8B5E3C": "بني",
  "#C0A16B": "ذهبي",
  "#43503B": "أخضر زيتي",
  "#1D4ED8": "أزرق",
  "#9D174D": "عنابي",
  "#B45309": "برتقالي",
  "#6D28D9": "بنفسجي",
};

export const colorName = (hex: string) => COLOR_NAMES[hex.toUpperCase()] ?? hex;

// تجميع السلة حسب التاجر
export function groupByMerchant(lines: CartItem[]): MerchantGroup[] {
  const map = new Map<string, MerchantGroup>();
  for (const it of lines) {
    const g =
      map.get(it.product.merchantId) ??
      { merchantId: it.product.merchantId, name: it.product.merchant, items: [], count: 0, total: 0 };
    g.items.push(it);
    g.count += it.qty;
    g.total += it.qty * it.product.price;
    map.set(g.merchantId, g);
  }
  return Array.from(map.values());
}

// أرقام واتساب للتجار (ملفات التجار مقروءة للعامة)
export async function getWhatsappNumbers(merchantIds: string[]): Promise<Record<string, string>> {
  if (!merchantIds.length) return {};
  const { data } = await supabase.from("profiles").select("id, whatsapp").in("id", merchantIds);
  const out: Record<string, string> = {};
  for (const r of (data ?? []) as { id: string; whatsapp: string | null }[]) {
    if (r.whatsapp) out[r.id] = r.whatsapp;
  }
  return out;
}

export function buildOrderMessage(merchantName: string, items: CartItem[], origin: string): string {
  const total = items.reduce((s, it) => s + it.qty * it.product.price, 0);
  const rows = items.map((it, i) => {
    const opts = [it.color ? colorName(it.color) : "", it.size ? `مقاس ${it.size}` : ""]
      .filter(Boolean)
      .join("، ");
    return (
      `${i + 1}. ${it.product.name}${opts ? ` (${opts})` : ""} × ${it.qty}` +
      ` = $${(it.qty * it.product.price).toFixed(2)}\n${origin}/product/${it.product.id}`
    );
  });
  return [
    `مرحباً ${merchantName}، أرغب بطلب المنتجات التالية:`,
    "",
    ...rows,
    "",
    `الإجمالي: $${total.toFixed(2)}`,
    "الدفع كاش عند الاستلام.",
  ].join("\n");
}

export const waLink = (whatsapp: string, text: string) =>
  `https://wa.me/${whatsapp.replace(/\D/g, "").replace(/^00/, "")}?text=${encodeURIComponent(text)}`;
