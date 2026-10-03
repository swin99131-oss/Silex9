"use client";

import { useEffect, useMemo, useState } from "react";

// رمز الدولة (ISO) ومفتاح الاتصال
const DIAL: [string, string][] = [
  ["IQ", "964"], ["SY", "963"], ["LB", "961"], ["JO", "962"], ["PS", "970"], ["EG", "20"],
  ["SA", "966"], ["AE", "971"], ["KW", "965"], ["QA", "974"], ["BH", "973"], ["OM", "968"],
  ["YE", "967"], ["LY", "218"], ["TN", "216"], ["DZ", "213"], ["MA", "212"], ["SD", "249"],
  ["TR", "90"], ["IR", "98"], ["GB", "44"], ["US", "1"], ["DE", "49"], ["FR", "33"],
  ["SE", "46"], ["NL", "31"], ["AU", "61"], ["IN", "91"], ["PK", "92"],
];

const CODES_DESC = Array.from(new Set(DIAL.map(([, c]) => c))).sort((a, b) => b.length - a.length);

function split(v: string): { code: string; local: string } {
  const d = v.replace(/\D/g, "");
  const hit = CODES_DESC.find((c) => d.startsWith(c));
  return hit ? { code: hit, local: d.slice(hit.length) } : { code: "", local: d };
}

export function isValidWhatsapp(v: string) {
  const d = v.replace(/\D/g, "");
  const code = CODES_DESC.find((c) => d.startsWith(c));
  return !!code && d.length - code.length >= 6 && d.length <= 15;
}

export function WhatsappInput({
  value,
  onChange,
  defaultCode = "964",
}: {
  value: string;
  onChange: (v: string) => void;
  defaultCode?: string;
}) {
  const initial = useMemo(() => split(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [code, setCode] = useState(initial.code || defaultCode);
  const [local, setLocal] = useState(initial.local);

  // مزامنة عند وصول القيمة من الخارج (تحميل البروفايل)
  useEffect(() => {
    const composed = local ? code + local : "";
    if (value !== composed) {
      const p = split(value);
      setCode(p.code || defaultCode);
      setLocal(p.local);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const options = useMemo(() => {
    let dn: Intl.DisplayNames | null = null;
    try {
      dn = new Intl.DisplayNames(["ar"], { type: "region" });
    } catch {}
    return DIAL.map(([iso, c]) => {
      let n = iso;
      try {
        n = dn?.of(iso) ?? iso;
      } catch {}
      return { iso, code: c, label: `${n} (+${c})` };
    });
  }, []);

  const emit = (c: string, l: string) => onChange(l ? c + l : "");

  return (
    <div className="flex gap-2" dir="ltr">
      <select
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          emit(e.target.value, local);
        }}
        aria-label="مفتاح الدولة"
        className="w-36 shrink-0 rounded-xl border border-line/40 bg-chip px-2 py-2.5 text-xs outline-none focus:border-ink"
      >
        {options.map((o) => (
          <option key={o.iso} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        value={local}
        inputMode="tel"
        dir="ltr"
        placeholder="رقمك بدون الصفر"
        onChange={(e) => {
          const l = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 12);
          setLocal(l);
          emit(code, l);
        }}
        className="min-w-0 flex-1 rounded-xl border border-line/40 bg-chip px-3 py-2.5 text-xs outline-none focus:border-ink"
      />
    </div>
  );
}
