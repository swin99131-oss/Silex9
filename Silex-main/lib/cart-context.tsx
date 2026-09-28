"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { syncLike, type Product } from "./catalog";
import { supabase } from "./supabase";

export type CartLine = {
  key: string;
  product: Product;
  qty: number;
  color: string | null;
  size: string | null;
};

type AddOptions = { color?: string | null; size?: string | null };

type CartContextType = {
  lines: CartLine[];
  add: (product: Product, qty?: number, opts?: AddOptions) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  count: number;
  subtotal: number;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
};

const CartContext = createContext<CartContextType | null>(null);

const lineKey = (id: string, color: string | null, size: string | null) =>
  [id, color ?? "", size ?? ""].join("|");

const CART_KEY = "silex:cart";

function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadCart);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [uid, setUid] = useState<string | undefined>(undefined);

  // حفظ السلة بالمتصفح عند أي تغيير، حتى تبقى بعد تسجيل الدخول أو تحديث الصفحة
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      /* التخزين غير متاح */
    }
  }, [lines]);

  const favRef = useRef<string[]>([]);
  favRef.current = favorites;
  const hadUser = useRef(false);

  // إنشاء كائن Supabase بشكل آمن

  // متابعة حالة تسجيل الدخول
  useEffect(() => {
    if (!supabase || !supabase.auth) return;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUid(session?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // دخول: تحميل المفضلة من Supabase ورفع ما حفظه الزائر. خروج: تفريغ المفضلة
  useEffect(() => {
    if (!uid || !supabase) {
      if (hadUser.current) setFavorites([]);
      hadUser.current = false;
      return;
    }
    hadUser.current = true;
    let alive = true;
    supabase
      .from("product_likes")
      .select("product_id")
      .eq("user_id", uid)
      .then(({ data }) => {
        if (!alive) return;
        const remote = (data ?? []).map((r: { product_id: string }) => r.product_id);
        const localOnly = favRef.current.filter((id) => !remote.includes(id));
        localOnly.forEach((id) => {
          void syncLike(id, true);
        });
        setFavorites(Array.from(new Set([...remote, ...localOnly])));
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  const add = (product: Product, qty = 1, opts: AddOptions = {}) => {
    const color = opts.color ?? null;
    const size = opts.size ?? null;
    const key = lineKey(product.id, color, size);
    setLines((prev) =>
      prev.some((l) => l.key === key)
        ? prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l))
        : [...prev, { key, product, qty, color, size }]
    );
  };

  const remove = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const setQty = (key: string, qty: number) =>
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, qty } : l))
    );

  const toggleFavorite = (id: string) =>
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );

  const isFavorite = (id: string) => favorites.includes(id);

  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.qty * l.product.price, 0),
    [lines]
  );

  return (
    <CartContext.Provider
      value={{ lines, add, remove, setQty, count, subtotal, favorites, toggleFavorite, isFavorite }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
