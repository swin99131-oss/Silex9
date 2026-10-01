"use client";

import { submitReport } from "@/lib/report";
import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Send, User as UserIcon, MoreVertical, Trash2, Flag, Pencil, X, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: { full_name: string | null; username: string | null; avatar_url: string | null; verified_at?: string | null } | null;
};

export default function PostCommentsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user: viewer } = useProfile();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    supabase
      .from("post_comments")
      .select("id, user_id, content, created_at, author:profiles!user_id(full_name, username, avatar_url, verified_at)")
      .eq("post_id", params.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setComments((data as unknown as Comment[]) ?? []));
  }, [params.id]);

  async function send() {
    if (!viewer) {
      router.push("/login");
      return;
    }
    const t = text.trim();
    if (!t) return;
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: params.id, user_id: viewer.id, content: t })
      .select("id, user_id, content, created_at, author:profiles!user_id(full_name, username, avatar_url, verified_at)")
      .single();
    if (!error && data) {
      setComments((prev) => [...prev, data as unknown as Comment]);
      setText("");
    }
  }

  async function deleteComment(commentId: string) {
    if (!confirm("حذف هذا التعليق؟")) return;
    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
    setShowMenuId(null);
  }

  function startEdit(c: Comment) {
    setEditingId(c.id);
    setEditText(c.content);
    setShowMenuId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(commentId: string) {
    const t = editText.trim();
    if (!t) return;
    const { error } = await supabase
      .from("post_comments")
      .update({ content: t })
      .eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, content: t } : c)));
      setEditingId(null);
      setEditText("");
    } else {
      toast.error("تعذّر حفظ التعديل");
    }
  }

  async function reportComment(commentId: string) {
    const reason = prompt("ما سبب الإبلاغ؟");
    if (!reason) return;
    const ok = await submitReport("comment", commentId, reason);
    if (ok) toast.success("شكراً، وصلنا بلاغك وسنراجعه"); else toast.error("تعذّر إرسال البلاغ");
    setShowMenuId(null);
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col bg-paper">
      {/* الهيدر */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-chip bg-card">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-chip flex items-center justify-center hover:bg-chip/80"
        >
          <ChevronRight size={16} />
        </button>
        <h1 className="font-display text-base">التعليقات</h1>
      </div>

      {/* قائمة التعليقات */}
      <div className="flex-1 px-4 mt-4 flex flex-col gap-4 pb-4 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">لا توجد تعليقات بعد، كن أول من يعلّق</p>
        ) : (
          comments.map((c) => {
            const isCommentOwner = viewer?.id === c.user_id;
            const isEditing = editingId === c.id;
            return (
              <div key={c.id} className="bg-card rounded-xl p-3 border border-chip">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-chip flex items-center justify-center overflow-hidden">
                      {c.author?.avatar_url ? (
                        <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={12} className="text-ink/40" />
                      )}
                    </div>
                    <p className="text-xs font-semibold">
                      {c.author?.full_name ?? c.author?.username ?? "مستخدم"}<VerifiedBadge show={verifiedOf(c.author)} size={12} className="mr-1 align-middle" />
                    </p>
                  </div>

                  {!isEditing && (
                    <div className="relative">
                      <button
                        onClick={() => setShowMenuId(showMenuId === c.id ? null : c.id)}
                        className="w-6 h-6 rounded-full bg-chip flex items-center justify-center hover:bg-chip/80"
                      >
                        <MoreVertical size={12} />
                      </button>

                      {showMenuId === c.id && (
                        <div className="absolute left-0 top-8 bg-card shadow-float rounded-lg overflow-hidden z-50 w-40 border border-chip">
                          {isCommentOwner ? (
                            <>
                              <button
                                onClick={() => startEdit(c)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-chip/60"
                              >
                                <Pencil size={12} />
                                تعديل
                              </button>
                              <button
                                onClick={() => deleteComment(c.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-500/10"
                              >
                                <Trash2 size={12} />
                                حذف
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => reportComment(c.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 hover:bg-amber-500/10"
                            >
                              <Flag size={12} />
                              إبلاغ
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(c.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                      className="flex-1 bg-chip rounded-full px-3 py-1.5 text-sm outline-none"
                    />
                    <button
                      onClick={() => saveEdit(c.id)}
                      disabled={!editText.trim()}
                      className="w-7 h-7 rounded-full bg-ink flex items-center justify-center text-white disabled:opacity-50"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="w-7 h-7 rounded-full bg-chip flex items-center justify-center hover:bg-chip/80"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-ink/80 leading-relaxed">{c.content}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* شريط الشات: نص + إرسال */}
      <div className="sticky bottom-0 bg-card border-t border-chip px-4 py-3">
        {viewer ? (
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="أضف تعليقاً..."
              className="flex-1 bg-chip rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted"
            />
            <button
              onClick={send}
              disabled={!text.trim()}
              className="w-8 h-8 rounded-full bg-ink flex items-center justify-center text-white disabled:opacity-50 hover:bg-ink/90"
            >
              <Send size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2 text-center text-sm text-muted hover:bg-chip rounded-lg"
          >
            سجل الدخول لإضافة تعليق
          </button>
        )}
      </div>
    </div>
  );
}
