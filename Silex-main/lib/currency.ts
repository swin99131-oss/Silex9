export type CurrencyCode =
  | "IQD" | "USD" | "SAR" | "AED" | "KWD" | "JOD" | "EGP" | "TRY"
  | "QAR" | "BHD" | "OMR" | "LYD" | "DZD" | "MAD" | "TND" | "SDG"
  | "LBP" | "SYP" | "YER"
  | "EUR" | "GBP" | "CHF" | "CAD" | "AUD" | "CNY" | "JPY" | "INR";

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "IQD", label: "دينار عراقي", symbol: "د.ع" },
  { code: "USD", label: "دولار أمريكي", symbol: "$" },
  { code: "SAR", label: "ريال سعودي", symbol: "ر.س" },
  { code: "AED", label: "درهم إماراتي", symbol: "د.إ" },
  { code: "KWD", label: "دينار كويتي", symbol: "د.ك" },
  { code: "JOD", label: "دينار أردني", symbol: "د.أ" },
  { code: "EGP", label: "جنيه مصري", symbol: "ج.م" },
  { code: "TRY", label: "ليرة تركية", symbol: "₺" },
  { code: "QAR", label: "ريال قطري", symbol: "ر.ق" },
  { code: "BHD", label: "دينار بحريني", symbol: "د.ب" },
  { code: "OMR", label: "ريال عماني", symbol: "ر.ع" },
  { code: "LYD", label: "دينار ليبي", symbol: "د.ل" },
  { code: "DZD", label: "دينار جزائري", symbol: "د.ج" },
  { code: "MAD", label: "درهم مغربي", symbol: "د.م." },
  { code: "TND", label: "دينار تونسي", symbol: "د.ت" },
  { code: "SDG", label: "جنيه سوداني", symbol: "ج.س" },
  { code: "LBP", label: "ليرة لبنانية", symbol: "ل.ل" },
  { code: "SYP", label: "ليرة سورية", symbol: "ل.س" },
  { code: "YER", label: "ريال يمني", symbol: "ر.ي" },
  { code: "EUR", label: "يورو", symbol: "€" },
  { code: "GBP", label: "جنيه إسترليني", symbol: "£" },
  { code: "CHF", label: "فرنك سويسري", symbol: "₣" },
  { code: "CAD", label: "دولار كندي", symbol: "$" },
  { code: "AUD", label: "دولار أسترالي", symbol: "$" },
  { code: "CNY", label: "يوان صيني", symbol: "¥" },
  { code: "JPY", label: "ين ياباني", symbol: "¥" },
  { code: "INR", label: "روبية هندية", symbol: "₹" },
];

const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toArabicNumber(n: number): string {
  return n
    .toLocaleString("en-US")
    .replace(/,/g, "٬")
    .replace(/\d/g, (d) => arabicDigits[Number(d)]);
}

export function formatPrice(amount: number, currencyCode?: string | null): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0];
  return `${toArabicNumber(amount)} ${currency.symbol}`;
}

export function currencySymbol(currencyCode?: string | null): string {
  return (CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0]).symbol;
}
