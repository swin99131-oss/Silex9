export type Product = {
  id: string;
  name: string;
  merchant: string;
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

export const categories: Category[] = [
  { id: "shoes", name: "أحذية", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80" },
  { id: "bags", name: "حقائب", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80" },
  { id: "watches", name: "ساعات", image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&q=80" },
  { id: "audio", name: "إلكترونيات", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80" },
  { id: "home", name: "المنزل", image: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&q=80" },
  { id: "beauty", name: "العناية", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80" },
];

export const products: Product[] = [
  {
    id: "p1",
    name: "حذاء أريا الجلدي",
    merchant: "نورثفيلد ستوديو",
    price: 128,
    oldPrice: 160,
    rating: 4.8,
    reviews: 214,
    category: "shoes",
    image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80",
    description:
      "حذاء رياضي أنيق مصنوع من الجلد الطبيعي الكامل بنعل رغوي معاد تدويره مريح. يناسب الإطلالات الرسمية والكاجوال على حد سواء.",
    colors: ["#111111", "#D8CFC0", "#8B5E3C"],
    sizes: ["39", "40", "41", "42", "43", "44"],
  },
  {
    id: "p2",
    name: "حقيبة فولد كروسبودي",
    merchant: "مارتا آند كو",
    price: 96,
    rating: 4.6,
    reviews: 98,
    category: "bags",
    image: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&q=80",
    description:
      "حقيبة كروسبودي منظمة من الجلد الطبيعي المدبوغ نباتياً بحزام قابل للتعديل وإغلاق مغناطيسي. تتسع للهاتف والبطاقات والمفاتيح.",
    colors: ["#111111", "#7A4B32"],
  },
  {
    id: "p3",
    name: "ساعة هالو الأوتوماتيكية",
    merchant: "كيبلر تايم",
    price: 340,
    oldPrice: 399,
    rating: 4.9,
    reviews: 152,
    category: "watches",
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80",
    description:
      "ساعة أوتوماتيكية بقياس 39 ملم بزجاج ياقوتي وهيكل ستانلس ستيل ووجه مصنوع يدوياً. مقاومة للماء حتى 100 متر.",
    colors: ["#111111", "#C0A16B"],
  },
  {
    id: "p4",
    name: "سماعات أوربت اللاسلكية",
    merchant: "ويف لاب",
    price: 79,
    rating: 4.5,
    reviews: 341,
    category: "audio",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
    description: "سماعات لاسلكية بخاصية إلغاء الضوضاء وبطارية تدوم 30 ساعة مع علبة الشحن ومقاومة للماء.",
    colors: ["#111111", "#FFFFFF"],
  },
  {
    id: "p5",
    name: "مفرش طاولة كتان",
    merchant: "فيلد هاوس",
    price: 34,
    rating: 4.7,
    reviews: 61,
    category: "home",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    description: "مفرش طاولة من الكتان الأوروبي المغسول يزداد نعومة مع كل غسلة. المقاس 180×40 سم.",
    colors: ["#EDE6D6", "#43503B"],
  },
  {
    id: "p6",
    name: "طقم أكواب سيراميك",
    merchant: "فيلد هاوس",
    price: 42,
    rating: 4.4,
    reviews: 47,
    category: "home",
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80",
    description: "طقم من كوبين سيراميك مصنوعين يدوياً بطلاء مطفي، آمنان لغسالة الصحون.",
  },
  {
    id: "p7",
    name: "بلسم العناية اليومي",
    merchant: "ألموند آند أوت",
    price: 28,
    rating: 4.6,
    reviews: 129,
    category: "beauty",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
    description: "بلسم خفيف الوزن للحاجز الجلدي بخلاصة الشوفان والسيراميد للبشرة الحساسة والجافة.",
  },
  {
    id: "p8",
    name: "حقيبة سفر كانفس",
    merchant: "نورثفيلد ستوديو",
    price: 118,
    rating: 4.7,
    reviews: 84,
    category: "bags",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
    description: "حقيبة سفر من قماش الكانفس الشمعي بحواف جلدية وحزام كتف قابل للفصل.",
  },
];

export const featuredIds = ["p1", "p3", "p4"];

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}

export function relatedProducts(id: string) {
  const current = getProduct(id);
  if (!current) return [];
  return products.filter((p) => p.category === current.category && p.id !== id);
}

export type OrderStatus = "تم التسليم" | "في الطريق" | "قيد المعالجة";

export type Order = {
  id: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: { product: Product; qty: number }[];
};

export const orders: Order[] = [
  {
    id: "SLX-10482",
    date: "14 سبتمبر 2026",
    status: "في الطريق",
    total: 128,
    items: [{ product: products[0], qty: 1 }],
  },
  {
    id: "SLX-10331",
    date: "29 أغسطس 2026",
    status: "تم التسليم",
    total: 121,
    items: [
      { product: products[3], qty: 1 },
      { product: products[6], qty: 1 },
    ],
  },
];
