import { supabase } from "@/lib/supabase";
import type { MerchantGroup } from "@/lib/whatsapp";

export async function createCartOrder(customerId: string, group: MerchantGroup) {
  const items = group.items.map(({ product, qty, color, size }) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    qty,
    color: color ?? null,
    size: size ?? null,
  }));

  const { error } = await supabase.from("orders").insert({
    customer_id: customerId,
    merchant_id: group.merchantId,
    status: "قيد المعالجة",
    total: group.total,
    items,
  });

  if (error) throw new Error(error.message);
}
