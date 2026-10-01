"use client";

import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Drawer } from "vaul";
import { Send, User as UserIcon, MoreVertical, Trash2, Flag, Pencil, X, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} د`;
  if (diffHour < 24) return `منذ ${diffHour} س`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  if (diffWeek < 5) return `منذ ${diffWeek} أسبوع`;
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: { full_name: string | null; username: string | null; avatar_url: string | null; verified_at?: string | null } | null;
};

export function CommentsSheet({
  postId,
  open,
  onOpenChange,
  comments,
  setComments,
  viewer,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  viewer: any;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  async function send() {
    if (!viewer) {
      router.push("/login");
      return;
    }
    const t = text.trim();
    if (!t) return;
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: viewer.id, content: t })
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
    const { error } = await supabase.from("post_comments").update({ content: t }).eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, content: t } : c)));
      setEditingId(null);
      setEditText("");
    } else {
      toast.error("تعذّر حفظ التعديل");
    }
  }

  async function reportComment(c: Comment) {
    setShowMenuId(null);
    if (!viewer) {
      router.push("/login");
      return;
    }
    const reason = prompt("ما سبب الإبلاغ؟");
    if (!reason?.trim()) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: viewer.id,
      reported_id: c.user_id,
      reason: "تعليق مسيء",
      details: `${reason.trim()} | نص التعليق: ${c.content.slice(0, 200)} | المنشور: ${postId}`,
    });
    if (error) {
      toast.error("تعذر إرسال البلاغ");
      return;
    }
    toast.success("تم إرسال البلاغ، شكراً لك");
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="bg-paper flex flex-col rounded-t-2xl fixed bottom-0 left-0 right-0 max-h-[80vh] z-50 mx-auto max-w-lg md:bottom-auto md:top-[12vh] md:max-h-[76vh] md:rounded-2xl">
          {/* مقبض السحب */}
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-chip" />

          <Drawer.Title className="text-sm font-display text-center py-3 border-b border-chip">
            التعليقات
          </Drawer.Title>

          {/* قائمة التعليقات - تمرير داخلي فقط */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">لا توجد تعليقات بعد، كن أول من يعلّق</p>
            ) : (
              comments.map((c) => {
                const isCommentOwner = viewer?.id === c.user_id;
                const isEditing = editingId === c.id;
                return (
                  <div key={c.id} className="bg-card rounded-xl p-3 border border-chip">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-chip flex items-center justify-center overflow-hidden">
                          {c.author?.avatar_url ? (
                            <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={11} className="text-ink/40" />
                          )}
                        </div>
                        <p className="text-xs font-semibold">
                          {c.author?.full_name ?? c.author?.username ?? "مستخدم"}<VerifiedBadge show={verifiedOf(c.author)} size={12} className="mr-1 align-middle" />
                        </p>
                        <span className="text-[10px] text-muted">{timeAgo(c.created_at)}</span>
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
                            <div className="absolute left-0 top-8 bg-card shadow-float rounded-lg overflow-hidden z-50 w-36 border border-chip">
                              {isCommentOwner ? (
                                <>
                                  <button
                                    onClick={() => startEdit(c)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-chip/60"
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
                                  onClick={() => reportComment(c)}
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
                          className="flex-1 bg-chip rounded-full px-3 py-1.5 text-xs outline-none"
                        />
                        <button
                          onClick={() => saveEdit(c.id)}
                          disabled={!editText.trim()}
                          className="w-6 h-6 rounded-full bg-ink flex items-center justify-center text-white disabled:opacity-50"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="w-6 h-6 rounded-full bg-chip flex items-center justify-center"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-ink/80 leading-relaxed">{c.content}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* شريط الكتابة - ثابت أسفل النافذة */}
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
              <Link href="/login" className="block text-center text-sm text-muted py-2">
                سجل الدخول لإضافة تعليق
              </Link>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
