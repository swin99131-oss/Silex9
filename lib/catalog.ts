import { supabase } from "@/lib/supabase";

export type Product = {
  id: string;
  name: string;
  merchant: string;
  merchantId: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  category: string;
  image: string;
  description: string;
  colors?: string[];
  sizes?: string[];
};

export type Category = {
  id: string;
  name: string;
  image: string;
};

type Row = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  old_price: number | null;
  cover_url: string | null;
  category: string | null;
  colors: string[] | null;
  sizes: string[] | null;
  rating: number | null;
  reviews: number | null;
  merchant_id: string;
  merchant: { full_name: string | null; username: string | null; store_name?: string | null } | null;
};

const COLS =
  "id, title, description, price, old_price, cover_url, category, colors, sizes, rating, reviews, merchant_id, merchant:profiles!merchant_id(full_name, username, store_name)";

// المنتجات التي لها غلاف فقط
const base = () => supabase.from("products").select(COLS).not("cover_url", "is", null).eq("is_active", true);

function toProduct(r: Row): Product {
  return {
    id: r.id,
    name: r.title,
    merchant: r.merchant?.store_name ?? r.merchant?.full_name ?? r.merchant?.username ?? "متجر",
    merchantId: r.merchant_id,
    price: Number(r.price ?? 0),
    oldPrice: r.old_price != null ? Number(r.old_price) : undefined,
    rating: Number(r.rating ?? 0),
    reviews: r.reviews ?? 0,
    category: r.category ?? "",
    image: r.cover_url as string,
    description: r.description ?? "",
    colors: r.colors?.length ? r.colors : undefined,
    sizes: r.sizes?.length ? r.sizes : undefined,
  };
}

const toList = (data: unknown) => ((data ?? []) as Row[]).map(toProduct);

export async function getCategories(): Promise<Category[]> {
  const { data } = await supabase.from("categories").select("id, name, image").order("sort");
  return (data ?? []) as Category[];
}

export async function getProducts(
  opts: { category?: string; limit?: number; order?: "new" | "top" } = {}
): Promise<Product[]> {
  let q = base();
  if (opts.category && opts.category !== "all") q = q.eq("category", opts.category);
  q =
    opts.order === "top"
      ? q.order("promoted", { ascending: false }).order("views", { ascending: false })
      : q.order("created_at", { ascending: false });
  if (opts.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return toList(data);
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data } = await base().eq("id", id).maybeSingle();
  return data ? toProduct(data as unknown as Row) : null;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const { data } = await base().in("id", ids);
  return toList(data);
}

export async function relatedProducts(p: Product): Promise<Product[]> {
  if (!p.category) return [];
  const { data } = await base().eq("category", p.category).neq("id", p.id).limit(8);
  return toList(data);
}

export async function searchProducts(q: string): Promise<Product[]> {
  const s = q.trim().replace(/[%,()*]/g, " ").trim();
  if (!s) return [];
  const { data: ms } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "merchant")
    .or(`full_name.ilike.%${s}%,store_name.ilike.%${s}%`)
    .limit(20);
  const ids = (ms ?? []).map((m: { id: string }) => m.id);
  const filters = [`title.ilike.%${s}%`, `category.ilike.%${s}%`];
  if (ids.length) filters.push(`merchant_id.in.(${ids.join(",")})`);
  const { data } = await base().or(filters.join(","));
  return toList(data);
}

// عدّاد المشاهدات: مرة واحدة لكل جلسة لكل منتج
export function trackView(id: string) {
  try {
    const k = `pv:${id}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch {
    /* التخزين غير متاح */
  }
  supabase.rpc("increment_product_views", { pid: id }).then(() => {});
}

// حفظ المنتج (المفضلة) يُسجَّل كتفاعل عند تسجيل الدخول
export async function syncLike(productId: string, on: boolean) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  if (on) {
    await supabase
      .from("product_likes")
      .upsert({ product_id: productId, user_id: uid }, { onConflict: "product_id,user_id", ignoreDuplicates: true });
  } else {
    await supabase.from("product_likes").delete().eq("product_id", productId).eq("user_id", uid);
  }
}

export async function getMerchantProducts(merchantId: string): Promise<Product[]> {
  const { data } = await supabase
    .from("products")
    .select(COLS)
    .not("cover_url", "is", null)
    .eq("merchant_id", merchantId)
    .order("promoted", { ascending: false })
    .order("created_at", { ascending: false });
  return toList(data);
}

export type Suggestions = {
  categories: { id: string; name: string; count: number }[];
  terms: string[];
};

// تطبيع النص العربي للمطابقة: إزالة التشكيل، توحيد الألف/الياء/التاء المربوطة، شِل المسافات الزائدة
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // التشكيل والتطويل
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getSuggestions(): Promise<Suggestions> {
  const [{ data: cats }, { data: prods }] = await Promise.all([
    supabase.from("categories").select("id, name, image, products(count)").order("sort"),
    base().order("views", { ascending: false }).limit(8),
  ]);

  const categories = ((cats ?? []) as unknown as { id: string; name: string; products: { count: number }[] }[])
    .map((c) => ({ id: c.id, name: c.name, count: c.products?.[0]?.count ?? 0 }))
    .filter((c) => c.count > 0);

  const terms = ((prods ?? []) as unknown as Row[]).map((p) => p.title).filter(Boolean);

  return { categories, terms };
}


export type PersonResult = { id: string; name: string; username: string | null; avatar: string | null };

export async function searchPeople(q: string): Promise<PersonResult[]> {
  const s = q.trim().replace(/[%,()*]/g, " ").trim().replace(/^@/, "");
  if (s.length < 2) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, store_name, avatar_url, role")
    .or(`username.ilike.%${s}%,full_name.ilike.%${s}%,store_name.ilike.%${s}%`)
    .limit(12);
  type Row = {
    id: string;
    full_name: string | null;
    username: string | null;
    store_name: string | null;
    avatar_url: string | null;
    role: string | null;
  };
  return ((data ?? []) as Row[])
    .filter((p) => p.role !== "admin")
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      name: p.store_name || p.full_name || p.username || "مستخدم",
      username: p.username,
      avatar: p.avatar_url,
    }));
}
