"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import { getReports, setReportStatus, type AdminReport, type ReportStatus } from "@/lib/admin/reports";

const TABS: { key: ReportStatus; label: string }[] = [
  { key: "open", label: "مفتوحة" },
  { key: "resolved", label: "تم حلها" },
  { key: "dismissed", label: "متجاهلة" },
];

const TARGETS: Record<string, string> = {
  post: "منشور",
  comment: "تعليق",
  story: "ستوري",
  product: "منتج",
  user: "مستخدم",
};

function targetLink(r: AdminReport): string | null {
  if (r.target_type === "post" && r.target_id) return `/post/${r.target_id}`;
  if (r.target_type === "product" && r.target_id) return `/product/${r.target_id}`;
  if (r.reported) return `/u/${r.reported.id}`;
  return null;
}

export default function AdminReportsPage() {
  const [tab, setTab] = useState<ReportStatus>("open");
  const [rows, setRows] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (status: ReportStatus) => {
    setLoading(true);
    setError(false);
    try {
      setRows(await getReports(status));
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  async function act(id: string, status: ReportStatus) {
    try {
      await setReportStatus(id, status);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("تم تحديث حالة البلاغ");
    } catch {
      toast.error("تعذّر تحديث البلاغ");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الشكاوى والبلاغات" subtitle="راجع البلاغات القادمة من المستخدمين واتخذ الإجراء المناسب." />

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-pill px-4 py-2 text-sm ${tab === t.key ? "bg-ink text-white" : "bg-chip"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-chip" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="تعذّر تحميل البلاغات" description="تحقق من الاتصال ومن صلاحيات الأدمن." />
      ) : rows.length === 0 ? (
        <EmptyState title="لا توجد بلاغات هنا" description="ستظهر البلاغات الجديدة في هذا القسم." />
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const link = targetLink(r);
            return (
              <article key={r.id} className="rounded-card border border-line bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-pill bg-chip px-3 py-1">{TARGETS[r.target_type ?? ""] ?? "محادثة"}</span>
                  <span className="text-muted">{new Date(r.created_at).toLocaleString("ar-IQ")}</span>
                </div>
                <p className="mt-2 font-semibold">{r.reason ?? "بدون سبب"}</p>
                {r.details && <p className="mt-1 break-words text-sm text-muted">{r.details}</p>}
                <p className="mt-2 text-xs text-muted">
                  المُبلِّغ: {r.reporter?.name ?? "—"} · المُبلَّغ عنه: {r.reported?.name ?? "—"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {link && (
                    <Link href={link} target="_blank" className="rounded-pill border border-line px-4 py-2 text-xs">
                      عرض
                    </Link>
                  )}
                  {tab !== "resolved" && (
                    <button onClick={() => act(r.id, "resolved")} className="rounded-pill bg-ink px-4 py-2 text-xs text-white">
                      تم الحل
                    </button>
                  )}
                  {tab !== "dismissed" && (
                    <button onClick={() => act(r.id, "dismissed")} className="rounded-pill bg-chip px-4 py-2 text-xs">
                      تجاهل
                    </button>
                  )}
                  {tab !== "open" && (
                    <button onClick={() => act(r.id, "open")} className="rounded-pill bg-chip px-4 py-2 text-xs">
                      إعادة فتح
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
