"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createConversation, sendMessage } from "@/lib/chat";

type CartItemMeta = {
  id: string;
  name: string;
  price: number;
  image: string;
  qty?: number;
  color?: string | null;
  size?: string | null;
};

export function BookChatButton({
  merchantId,
  message,
  productId,
  items,
  beforeOpen,
  label = "حجز بالدردشة",
  className = "",
}: {
  merchantId: string;
  message?: string;
  productId?: string;
  items?: CartItemMeta[];
  beforeOpen?: (userId: string) => Promise<void>;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return router.push("/login");
      if (uid === merchantId) return;
      await beforeOpen?.(uid);

      const convId = await createConversation(uid, merchantId);

      if (items && items.length > 0) {
        // إرسال كل منتج كبطاقة منفصلة (صورة + اسم + سعر)
        for (const it of items) {
          const opts = [it.color ? `اللون: ${it.color}` : "", it.size ? `مقاس ${it.size}` : ""]
            .filter(Boolean)
            .join("، ");
          const qtyTxt = it.qty && it.qty > 1 ? ` × ${it.qty}` : "";
          await sendMessage(
            uid,
            convId,
            `🛍️ ${it.name}${qtyTxt}${opts ? ` (${opts})` : ""}`,
            undefined,
            undefined,
            undefined,
            { type: "product", id: it.id, name: it.name, price: it.price, image: it.image }
          );
        }
        if (message) {
          await sendMessage(uid, convId, message);
        }
        router.push(`/chat/${convId}`);
        return;
      }

      const q = new URLSearchParams();
      if (message) q.set("draft", message.replace(/\n+/g, " — ").slice(0, 1000));
      if (productId) q.set("product", productId);
      const qs = q.toString();
      router.push(`/chat/${convId}${qs ? `?${qs}` : ""}`);
    } catch (e: any) {
      toast.error(e?.message || "تعذّر فتح الدردشة، حاول مجدداً");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={go} disabled={busy} className={`${className} disabled:opacity-50`}>
      <MessageCircle size={15} />
      {busy ? "جارٍ الفتح..." : label}
    </button>
  );
}
