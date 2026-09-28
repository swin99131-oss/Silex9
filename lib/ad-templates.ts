export type AdType = "product" | "company" | "promotion";

export const AD_TEMPLATES: { type: AdType; title: string; desc: string }[] = [
  { type: "product", title: "تعزيز منتج", desc: "يظهر منتجك أكثر في الرئيسية والاستكشاف" },
  { type: "company", title: "ترويج المتجر", desc: "يظهر متجرك ضمن المتاجر المقترحة" },
  { type: "promotion", title: "بانر إعلاني", desc: "صورة وعنوان مخصصان أعلى الرئيسية" },
];

export const AD_TYPE_LABEL: Record<string, string> = {
  product: "تعزيز منتج",
  company: "ترويج المتجر",
  promotion: "بانر إعلاني",
};

// أرقام مبدئية بالدينار العراقي، عدّلها من هنا
export const AD_PACKAGES = [
  { id: "basic", label: "أساسي", days: 3, daily: 5000 },
  { id: "standard", label: "متوسط", days: 7, daily: 10000 },
  { id: "premium", label: "مميز", days: 14, daily: 15000 },
];

export const PROVINCES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "السليمانية", "دهوك", "كركوك", "الأنبار", "صلاح الدين",
  "ديالى", "بابل", "كربلاء", "النجف", "القادسية", "واسط", "ميسان", "ذي قار", "المثنى",
];

export const AD_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-secondary text-muted-foreground" },
  pending_payment: { label: "بانتظار الدفع", cls: "bg-amber-100 text-amber-700" },
  pending_review: { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-700" },
  active: { label: "نشطة", cls: "bg-emerald-100 text-emerald-700" },
  paused: { label: "متوقفة", cls: "bg-secondary text-muted-foreground" },
  rejected: { label: "مرفوضة", cls: "bg-red-100 text-red-700" },
  finished: { label: "منتهية", cls: "bg-secondary text-muted-foreground" },
};

export const DELETABLE_STATUSES = ["draft", "pending_payment", "pending_review", "rejected", "finished"];
