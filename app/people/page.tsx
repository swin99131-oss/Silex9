"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, User as UserIcon, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ScreenHeader from "@/components/ScreenHeader";

type Person = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

const RECENT_KEY = "recent-people-searches";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(values: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(values));
  } catch {
    /* التخزين غير متاح */
  }
}

export default function PeoplePage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  function commit(term: string) {
    const normalized = term.trim();
    if (!normalized) return;
    const next = [normalized, ...recent.filter((item) => item !== normalized)].slice(0, 8);
    setRecent(next);
    saveRecent(next);
  }

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, bio")
        .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
        .limit(20)
        .then(({ data }) => {
          if (!alive) return;
          setResults((data ?? []) as Person[]);
          setLoading(false);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div>
      <ScreenHeader title="البحث عن أشخاص" />

      <div className="px-6 mt-2 md:px-10">
        <div className="flex items-center gap-2 bg-chip rounded-pill px-4 py-3">
          <SearchIcon size={18} className="text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(q);
            }}
            placeholder="ابحث بالاسم أو اسم المستخدم..."
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted"
          />
        </div>
      </div>

      {!q && recent.length > 0 && (
        <section className="px-6 mt-5 md:px-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted">عمليات بحث سابقة</h2>
            <button
              type="button"
              onClick={() => {
                setRecent([]);
                saveRecent([]);
              }}
              className="text-xs text-muted hover:text-ink"
            >
              مسح الكل
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {recent.map((term) => (
              <div key={term} className="flex items-center gap-2 rounded-xl bg-chip px-3 py-2">
                <button
                  type="button"
                  onClick={() => setQ(term)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-right text-sm"
                >
                  <SearchIcon size={15} className="shrink-0 text-muted" />
                  <span className="truncate">{term}</span>
                </button>
                <button
                  type="button"
                  aria-label={`حذف بحث ${term}`}
                  onClick={() => {
                    const next = recent.filter((item) => item !== term);
                    setRecent(next);
                    saveRecent(next);
                  }}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-line/50 hover:text-ink"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="px-6 mt-4 md:px-10">
        {loading && <p className="text-xs text-muted text-center py-6">جارٍ البحث...</p>}

        {!loading && q && results.length === 0 && (
          <p className="text-xs text-muted text-center py-6">لا يوجد نتائج</p>
        )}

        <div className="flex flex-col gap-2">
          {results.map((p) => (
            <Link
              key={p.id}
              href={`/u/${p.id}`}
              onClick={() => commit(q)}
              className="flex items-center gap-3 bg-chip hover:bg-line/40 transition-colors rounded-2xl px-4 py-3"
            >
              <div className="w-11 h-11 rounded-full bg-line/40 flex items-center justify-center overflow-hidden shrink-0">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={20} className="text-ink/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{p.full_name ?? "مستخدم"}</p>
                {p.username && <p className="text-xs text-muted truncate">@{p.username}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
