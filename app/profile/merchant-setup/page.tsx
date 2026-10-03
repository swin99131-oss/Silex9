"use client";

import { WhatsappInput, isValidWhatsapp } from "@/components/ui/WhatsappInput";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { Dropdown } from "@/components/ui/Dropdown";
import { Notice } from "@/components/ui/Notice";
import { PageLoading } from "@/components/ui/Skeleton";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { getCategories, type Category } from "@/lib/catalog";

const COUNTRY_CODES = "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(" ");

function countryOptions() {
  let dn: Intl.DisplayNames | null = null;
  try {
    dn = new Intl.DisplayNames(["ar"], { type: "region" });
  } catch {}
  const name = (code: string) => {
    try {
      return dn?.of(code) ?? code;
    } catch {
      return code;
    }
  };
  return COUNTRY_CODES.map((code) => ({ value: code, label: name(code) })).sort((a, b) =>
    a.label.localeCompare(b.label, "ar")
  );
}

export default function MerchantSetupPage() {
  const router = useRouter();
  const { user, profile, loading } = useProfile();

  const [storeName, setStoreName] = useState("");
  const [category, setCategory] = useState("");
  const [storeBio, setStoreBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const countries = useMemo(countryOptions, []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!profile) return;
    setStoreName(profile.store_name ?? "");
    setCategory(profile.store_category ?? "");
    setStoreBio(profile.store_bio ?? "");
    setWhatsapp(profile.whatsapp ?? "");
    setCountry((profile as any).country ?? "");
    setCity((profile as any).city ?? "");
  }, [profile]);

  if (loading) return <PageLoading />;
  if (!user) {
    router.replace("/login");
    return null;
  }

  const isMerchant = profile?.role === "merchant";

  async function submit() {
    if (!user) return;
    if (!storeName.trim()) return setErr("اسم المتجر مطلوب");
    if (!category) return setErr("اختر نوع منتجاتك");
    if (!country) return setErr("اختر دولتك");
    if (!city.trim()) return setErr("اكتب مدينتك");
    if (!isValidWhatsapp(whatsapp)) return setErr("رقم الواتساب مطلوب ليتواصل الزبائن معك");
    setBusy(true);
    setErr("");
    const patch = {
      role: "merchant" as const,
      store_name: storeName.trim(),
      store_category: category,
      country,
      city: city.trim(),
      store_bio: storeBio.trim() || null,
      whatsapp: whatsapp.trim(),
    };
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) {
      setBusy(false);
      return setErr(`تعذّر الحفظ: ${error.message}`);
    }
    await supabase.from("products").update({ is_active: true }).eq("merchant_id", user.id);
    setBusy(false);
    router.push("/profile/studio");
  }

  const field =
    "w-full px-4 py-2.5 rounded-xl bg-chip border border-line/40 text-ink text-sm focus:outline-none focus:border-ink";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3 border-b border-line/30 pb-4">
        <Link href="/profile/settings" className="p-2 rounded-full hover:bg-chip">
          <ArrowRight size={20} />
        </Link>
        <h1 className="text-lg font-bold">{isMerchant ? "إعدادات المتجر" : "إعداد حساب التاجر"}</h1>
      </div>

      <div className="bg-card border border-line/40 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-muted">
          <Store size={16} />
          <p className="text-xs">هذه البيانات تظهر للزبائن في صفحة متجرك.</p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">اسم المتجر</label>
          <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className={field} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">نوع منتجاتك</label>
          <Dropdown options={categories.map((c) => ({ value: c.id, label: c.name }))} value={category} onChange={setCategory} placeholder="اختر التصنيف" className={field} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">الدولة</label>
          <CountrySelect options={countries} value={country} onChange={setCountry} className={field} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">المدينة</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={field} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">رقم الواتساب للحجز</label>
          <WhatsappInput value={whatsapp} onChange={setWhatsapp} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">نبذة عن المتجر</label>
          <textarea
            value={storeBio}
            onChange={(e) => setStoreBio(e.target.value)}
            rows={3}
            className={`${field} resize-none`}
          />
        </div>

        {err && (
          <Notice type="error">{err}</Notice>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full py-3.5 rounded-xl bg-ink text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "جارٍ الحفظ..." : isMerchant ? "حفظ" : "تفعيل حساب التاجر"}
        </button>
      </div>
    </div>
  );
}
