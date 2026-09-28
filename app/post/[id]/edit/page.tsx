"use client";

import { Notice } from "@/components/ui/Notice";
import { PageLoading } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useProfile();

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase
      .from("posts")
      .select("title, caption, hashtags, user_id")
      .eq("id", params.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTitle(data.title ?? "");
          setCaption(data.caption ?? "");
          setHashtagsInput((data.hashtags ?? []).join(" "));
        }
        setLoading(false);
      });
  }, [params.id]);

  async function save() {
    if (!user) return;
    setSaving(true);
    setErr("");
    const hashtags = hashtagsInput
      .split(/[\s,]+/)
      .map((h) => h.replace(/^#/, "").trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("posts")
      .update({
        title: title.trim() || null,
        caption: caption.trim() || null,
        hashtags: hashtags.length ? hashtags : null,
      })
      .eq("id", params.id)
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      setErr("تعذّر حفظ التعديلات، حاول مجدداً");
      return;
    }
    router.refresh();
    router.push(`/post/${params.id}`);
  }

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-sm mx-auto px-6 py-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-chip flex items-center justify-center">
          <ChevronRight size={18} />
        </button>
        <h1 className="font-display text-[18px]">تعديل المنشور</h1>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-ink mb-1.5">العنوان</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-chip rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-ink/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1.5">الوصف</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 1000))}
            rows={5}
            className="w-full bg-chip rounded-xl p-3 text-sm outline-none resize-none focus:ring-1 focus:ring-ink/20"
          />
          <p className="text-[10px] text-muted mt-1 text-left" dir="ltr">
            {caption.length}/1000
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1.5">الهاشتاغات</label>
          <input
            type="text"
            value={hashtagsInput}
            onChange={(e) => setHashtagsInput(e.target.value)}
            className="w-full bg-chip rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-ink/20"
          />
        </div>

        {err && (
          <Notice type="error">{err}</Notice>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-ink text-white rounded-pill py-3.5 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </button>
      </div>
    </div>
  );
}
