"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, User as UserIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ScreenHeader from "@/components/ScreenHeader";

type Person = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function PeoplePage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

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
            placeholder="ابحث بالاسم أو اسم المستخدم..."
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted"
          />
        </div>
      </div>

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
