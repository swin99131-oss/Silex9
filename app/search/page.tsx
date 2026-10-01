"use client";

import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import {
  getSuggestions,
  norm,
  searchProducts,
  type Product,
  type Suggestions,
} from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import ScreenHeader from "@/components/ScreenHeader";

const KEY = "recent-searches";
const chip = "px-4 py-2 rounded-pill bg-chip text-sm";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* التخزين غير متاح */
  }
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [done, setDone] = useState(false);
  const [sugg, setSugg] = useState<Suggestions>({ categories: [], terms: [] });
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    getSuggestions().then(setSugg);
    setRecent(readRecent());
  }, []);

  useEffect(() => {
    setDone(false);
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      searchProducts(term).then((r) => {
        if (!alive) return;
        setResults(r);
        setDone(true);
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  // يُحفظ البحث عند الضغط على Enter أو فتح نتيجة، لا مع كل حرف
  function commit(term: string) {
    if (!term) return;
    const next = [term, ...recent.filter((x) => x !== term)].slice(0, 6);
    setRecent(next);
    saveRecent(next);
  }

  const nq = norm(q);
  const matches = useMemo(() => {
    if (!nq) return [];
    const pool = [...sugg.categories.map((c) => c.name), ...sugg.terms];
    return pool.filter((t) => norm(t).includes(nq) && norm(t) !== nq).slice(0, 6);
  }, [nq, sugg]);

  const categoryChips = (
    <>
      {sugg.categories.map((c) => (
        <button key={c.id} onClick={() => setQ(c.name)} className={chip}>
          {c.name} <span className="text-xs text-muted">{c.count}</span>
        </button>
      ))}
    </>
  );

  return (
    <div>
      <ScreenHeader title="بحث" />

      <div className="px-6 mt-2 md:px-10">
        <div className="flex items-center gap-2 bg-chip rounded-pill px-4 py-3">
          <SearchIcon size={18} className="text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length) commit(q.trim());
            }}
            placeholder="ابحث عن منتج أو تاجر..."
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="مسح">
              <X size={16} className="text-muted" />
            </button>
          )}
        </div>
      </div>

      {!q && (
        <div className="px-6 mt-6 md:px-10 flex flex-col gap-6">
          {recent.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted">عمليات بحث سابقة</p>
                <button
                  onClick={() => {
                    setRecent([]);
                    saveRecent([]);
                  }}
                  className="text-xs text-muted"
                >
                  مسح الكل
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <span key={r} className={`${chip} flex items-center gap-2`}>
                    <button onClick={() => setQ(r)}>{r}</button>
                    <button
                      aria-label="حذف"
                      onClick={() => {
                        const next = recent.filter((x) => x !== r);
                        setRecent(next);
                        saveRecent(next);
                      }}
                    >
                      <X size={14} className="text-muted" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {sugg.categories.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-3">تصنيفات متوفرة</p>
              <div className="flex flex-wrap gap-2">{categoryChips}</div>
            </div>
          )}

          {sugg.terms.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-3">الأكثر مشاهدة</p>
              <div className="flex flex-wrap gap-2">
                {sugg.terms.map((t) => (
                  <button key={t} onClick={() => setQ(t)} className={`${chip} max-w-[220px] truncate`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {q && (
        <div className="px-6 mt-6 md:px-10">
          {matches.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {matches.map((m) => (
                <button key={m} onClick={() => setQ(m)} className={`${chip} max-w-[220px] truncate`}>
                  {m}
                </button>
              ))}
            </div>
          )}

          {done && results.length > 0 && (
            <p className="text-xs text-muted mb-3">
              {results.length} نتيجة لـ «{q}»
            </p>
          )}

          <div
            className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
            onClickCapture={() => commit(q.trim())}
          >
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {done && results.length === 0 && (
            <div className="text-center mt-10">
              <p className="text-sm text-muted">لا توجد نتائج لـ «{q}»</p>
              {sugg.categories.length > 0 && (
                <>
                  <p className="text-xs text-muted mt-6 mb-3">جرّب أحد التصنيفات المتوفرة</p>
                  <div className="flex flex-wrap justify-center gap-2">{categoryChips}</div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
