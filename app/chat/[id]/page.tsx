"use client";

import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus, X, MoreVertical, ShieldAlert, Flag, User as UserIcon, Trash2, Reply, Mic, Phone, Video } from "lucide-react";
import {
  getMessages,
  sendMessage,
  deleteMessage,
  markAsRead,
  subscribeToMessages,
  clearConversation,
  ChatMessage,
} from "@/lib/chat";
import { supabase } from "@/lib/supabase";
import { useCall } from "@/components/CallProvider";
import { ChatImage } from "@/components/ChatImage";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { VoiceMessage } from "@/components/VoiceMessage";
import { getProduct } from "@/lib/catalog";

const REPORT_REASONS = ["محتوى غير لائق", "إزعاج أو تحرش", "احتيال أو نصب", "سبب آخر"];

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const convId = params.id as string;
  const { startCall, inCall } = useCall();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"image" | "video" | null>(null);
  const [sending, setSending] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [attachStory, setAttachStory] = useState<{ id: string; text: string; bg: string; image: string | null } | null>(null);
  const [attachProduct, setAttachProduct] = useState<{ id: string; name: string; price: number; image: string } | null>(null);
  const [partnerVerified, setPartnerVerified] = useState(false);
  const [partner, setPartner] = useState<{ id: string; name: string; avatar: string | null } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      setUserId(user.id);
      try {
        const sp = new URLSearchParams(window.location.search);
        const pid = sp.get("product");
        if (pid) {
          getProduct(pid).then((pr) => {
            if (pr) setAttachProduct({ id: pr.id, name: pr.name, price: pr.price, image: pr.image });
          });
        }
        const sid = sp.get("story");
        if (sid) {
          supabase
            .from("stories")
            .select("id, text, bg_color, image_url")
            .eq("id", sid)
            .maybeSingle()
            .then(({ data: st }) => {
              if (st) setAttachStory({ id: st.id, text: st.text ?? "", bg: st.bg_color, image: st.image_url });
            });
        }
        const d = sp.get("draft");
        if (d) {
          setText(d.slice(0, 1000));
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch {}

      const { data: conv } = await supabase
        .from("conversations")
        .select("customer_id, merchant_id, customer:profiles!customer_id(id, full_name, username, avatar_url, store_name, verified_at), merchant:profiles!merchant_id(id, full_name, username, avatar_url, store_name, verified_at)")
        .eq("id", convId)
        .maybeSingle();

      if (conv && alive) {
        const other = (conv as any).customer_id === user.id ? (conv as any).merchant : (conv as any).customer;
        if (other) {
          setPartner({ id: other.id, name: other.store_name || other.full_name || other.username || "مستخدم", avatar: other.avatar_url });
          setPartnerVerified(!!other.verified_at);
        }
      }

      const msgs = await getMessages(convId, user.id);
      if (!alive) return;
      setMessages(msgs);
      await markAsRead(convId, user.id);

      const channel = subscribeToMessages(
        convId,
        (newMsg) => {
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          markAsRead(convId, user.id);
        },
        (updated) => {
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        }
      );

      unsub = () => channel.unsubscribe();
    }

    init();
    return () => {
      alive = false;
      unsub?.();
    };
  }, [convId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handlePickMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const kind = f.type.startsWith("video") ? "video" : "image";
    setMediaFile(f);
    setMediaKind(kind);
    setMediaPreview(URL.createObjectURL(f));
  }

  async function handleSend() {
    if ((!text.trim() && !mediaFile && !attachProduct && !attachStory) || !userId || sending) return;
    setSending(true);
    const value = text || (attachProduct ? `🛍️ ${attachProduct.name}` : attachStory ? "📖 رد على قصة" : "");
    const reply = replyTo?.id;
    const file = mediaFile;
    const kind = mediaKind;
    const prod = attachProduct;
    setAttachProduct(null);
    const stor = attachStory;
    setAttachStory(null);

    setText("");
    setReplyTo(null);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaKind(null);

    try {
      let mediaPath: string | undefined;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${convId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat").upload(path, file);
        if (upErr) throw upErr;
        mediaPath = path;
      }

      await sendMessage(
        userId,
        convId,
        value || (kind === "video" ? "🎥 فيديو" : kind === "image" ? "📷 صورة" : ""),
        mediaPath,
        kind ?? undefined,
        reply,
        prod ? { type: "product", id: prod.id, name: prod.name, price: prod.price, image: prod.image } : stor ? { type: "story", id: stor.id, text: stor.text, bg: stor.bg, image: stor.image } : undefined
      );
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الإرسال");
      setText(value);
    } finally {
      setSending(false);
    }
  }

  async function handleSendVoice(blob: Blob, duration: number) {
    if (!userId) return;
    setSending(true);
    setShowRecorder(false);
    try {
      const mime = (blob.type || "audio/webm").split(";")[0];
      const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
      const path = `${convId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat").upload(path, blob, { contentType: mime });
      if (upErr) throw upErr;
      await sendMessage(userId, convId, "🎤 رسالة صوتية", path, "audio", replyTo?.id);
      setReplyTo(null);
    } catch (err: any) {
      alert(err.message || "تعذّر إرسال الرسالة الصوتية");
    } finally {
      setSending(false);
    }
  }

  async function confirmDelete() {
    if (!userId || !deleteTarget) return;
    await deleteMessage(deleteTarget, userId);
    setMessages((prev) => prev.filter((m) => m.id !== deleteTarget));
    setDeleteTarget(null);
  }

  async function handleClearChat() {
    if (!userId) return;
    if (!confirm("سيتم حذف هذه المحادثة من عندك فقط، ولن تظهر لك بعد الآن. هل تريد المتابعة؟")) return;
    await clearConversation(convId, userId);
    setShowMenu(false);
    router.push("/chat");
  }

  async function handleBlock() {
    if (!userId || !partner) return;
    if (!confirm(`هل تريد حظر ${partner.name}؟`)) return;
    const { error } = await supabase.from("blocks").insert({ blocker_id: userId, blocked_id: partner.id });
    setShowMenu(false);
    if (error) {
      toast.error("تعذّر الحظر، حاول مجدداً");
      return;
    }
    router.push("/chat");
  }

  async function submitReport() {
    if (!userId || !partner) return;
    const reason = reportDetails.trim() ? `${reportReason}: ${reportDetails.trim()}` : reportReason;
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      reported_id: partner.id,
      conversation_id: convId,
      reason,
    });
    setShowReport(false);
    setReportDetails("");
    if (error) {
      toast.error("تعذّر إرسال البلاغ، حاول مجدداً");
      return;
    }
    toast.success("تم إرسال البلاغ، شكراً لك");
  }

  function findMessage(id: string | null | undefined) {
    return id ? messages.find((m) => m.id === id) : undefined;
  }

  return (
    <div className="max-w-2xl mx-auto h-screen bg-paper text-ink flex flex-col dir-rtl">
      <div className="p-3 border-b border-line/40 bg-paper/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-chip flex items-center justify-center shrink-0">
            ➔
          </button>
          {partner && (
            <Link href={`/u/${partner.id}`} className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-chip overflow-hidden flex items-center justify-center shrink-0">
                {partner.avatar ? (
                  <img src={partner.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={16} className="text-ink/40" />
                )}
              </div>
              <span className="font-semibold text-sm truncate">{partner.name}</span>
              <VerifiedBadge show={partnerVerified} size={14} />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {partner && (
            <>
              <button
                onClick={() => startCall({ conversationId: convId, calleeId: partner.id, kind: "voice" })}
                disabled={inCall}
                className="w-9 h-9 rounded-full bg-chip flex items-center justify-center disabled:opacity-40"
                aria-label="مكالمة صوتية"
              >
                <Phone size={16} />
              </button>
              <button
                onClick={() => startCall({ conversationId: convId, calleeId: partner.id, kind: "video" })}
                disabled={inCall}
                className="w-9 h-9 rounded-full bg-chip flex items-center justify-center disabled:opacity-40"
                aria-label="مكالمة فيديو"
              >
                <Video size={16} />
              </button>
            </>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu((v) => !v)} className="w-9 h-9 rounded-full bg-chip flex items-center justify-center">
              <MoreVertical size={17} />
            </button>
          {showMenu && (
            <div className="absolute left-0 top-11 bg-card shadow-float rounded-2xl overflow-hidden z-[70] w-44 border border-line/30">
              <button
                onClick={handleClearChat}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-chip"
              >
                <Trash2 size={18} />
                حذف المحادثة
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowReport(true);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-chip"
              >
                <Flag size={18} />
                إبلاغ
              </button>
              <button
                onClick={handleBlock}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-500/5"
              >
                <ShieldAlert size={18} />
                حظر المستخدم
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-muted py-10">ابدأ المحادثة الآن</p>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === userId;
            const quoted = findMessage(m.reply_to_id);
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? "items-start" : "items-end"}`}>
                <div
                  className={`group relative max-w-[82%] rounded-2xl p-3 text-sm leading-relaxed ${
                    isMe ? "bg-ink text-white rounded-br-none" : "bg-chip text-ink rounded-bl-none"
                  }`}
                >
                  {quoted && (
                    <div className={`text-[11px] opacity-75 border-r-2 pr-2 mb-1.5 truncate ${isMe ? "border-white/50" : "border-ink/30"}`}>
                      {quoted.content}
                    </div>
                  )}

                  {m.media_type === "image" && m.media_url && <ChatImage path={m.media_url} kind="image" />}
                  {m.media_type === "video" && m.media_url && <ChatImage path={m.media_url} kind="video" />}
                  {m.media_type === "audio" && m.media_url && <VoiceMessage path={m.media_url} isMe={isMe} />}
                  {m.media_type === "call" && (() => {
                    const missed = m.call_status !== "completed";
                    const isVideo = m.content.includes("فيديو");
                    const CallIcon = isVideo ? Video : Phone;
                    const title = missed
                      ? m.call_status === "declined"
                        ? `مكالمة ${isVideo ? "فيديو" : "صوتية"} مرفوضة`
                        : `مكالمة ${isVideo ? "فيديو" : "صوتية"} فائتة`
                      : `مكالمة ${isVideo ? "فيديو" : "صوتية"}`;
                    const subtitle = missed
                      ? "لم يتم الرد"
                      : m.call_duration != null
                        ? `${Math.floor(m.call_duration / 60).toString().padStart(2, "0")}:${(m.call_duration % 60).toString().padStart(2, "0")}`
                        : "";
                    return (
                      <div className="flex items-center gap-2.5 min-w-[150px] py-0.5">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            missed ? "bg-red-500/15" : isMe ? "bg-white/15" : "bg-ink/10"
                          }`}
                        >
                          <CallIcon size={15} className={missed ? "text-red-500" : ""} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${missed ? "text-red-500" : ""}`}>{title}</p>
                          {subtitle && (
                            <p className={`text-[11px] mt-0.5 ${isMe ? "opacity-70" : "text-muted"}`}>{subtitle}</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {m.meta?.type === "story" && (
                  <div className="mb-2 w-32">
                    <p className="text-[10px] opacity-70 mb-1">رد على قصة</p>
                    <div
                      className="relative h-44 rounded-xl overflow-hidden flex items-center justify-center p-2 text-center text-white text-xs"
                      style={{ background: m.meta.bg }}
                    >
                      {m.meta.image && (
                        <img src={m.meta.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      {m.meta.text && <span className="relative line-clamp-5">{m.meta.text}</span>}
                    </div>
                  </div>
                )}

                {m.meta?.type === "product" && (
                  <Link
                    href={`/product/${m.meta.id}`}
                    className="flex gap-2.5 bg-white/95 text-ink rounded-xl p-2 mb-2 w-56"
                  >
                    <img src={m.meta.image} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold line-clamp-2">{m.meta.name}</p>
                      <p className="text-xs text-muted mt-1">${m.meta.price}</p>
                    </div>
                  </Link>
                )}

                {m.content && m.media_type !== "call" && !(m.meta?.type === "product" && m.content === `🛍️ ${m.meta.name}`) && (
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                )}

                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70">
                    <span>{new Date(m.created_at).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}</span>
                    {isMe && <span>{m.read_at ? "✓✓" : "✓"}</span>}
                  </div>

                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <button
                    onClick={() => setReplyTo(m)}
                    className="flex items-center gap-1 text-[11px] text-muted border border-line/50 rounded-full px-2.5 py-1 hover:bg-chip transition"
                  >
                    <Reply size={12} />
                    رد
                  </button>
                  {isMe && (
                    <button
                      onClick={() => setDeleteTarget(m.id)}
                      className="flex items-center gap-1 text-[11px] text-red-600 border border-red-200 rounded-full px-2.5 py-1 hover:bg-red-500/5 transition"
                    >
                      <Trash2 size={12} />
                      حذف
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="bg-chip border-t border-line/40 px-4 py-2 flex items-center justify-between text-xs text-ink/70">
          <span className="truncate">الرد على: {replyTo.content}</span>
          <button onClick={() => setReplyTo(null)} className="text-muted hover:text-ink shrink-0 mr-2">✕</button>
        </div>
      )}

      {attachStory && (
        <div className="border-t border-line/40 px-4 py-2 flex items-center gap-3">
          <div
            className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0"
            style={{ background: attachStory.bg }}
          >
            {attachStory.image && (
              <img src={attachStory.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
          </div>
          <p className="flex-1 min-w-0 text-xs text-muted truncate">رد على قصة: {attachStory.text || "صورة"}</p>
          <button onClick={() => setAttachStory(null)} className="text-muted hover:text-ink shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {attachProduct && (
        <div className="border-t border-line/40 px-4 py-2 flex items-center gap-3">
          <img src={attachProduct.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{attachProduct.name}</p>
            <p className="text-[11px] text-muted">${attachProduct.price}</p>
          </div>
          <button onClick={() => setAttachProduct(null)} className="text-muted hover:text-ink shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {mediaPreview && (
        <div className="border-t border-line/40 px-4 py-2 flex items-center gap-2">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-chip">
            {mediaKind === "video" ? (
              <video src={mediaPreview} className="w-full h-full object-cover" />
            ) : (
              <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
            )}
            <button
              onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaKind(null); }}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
            >
              <X size={12} />
            </button>
          </div>
          <p className="text-xs text-muted">جاهز للإرسال</p>
        </div>
      )}

      <div className="p-3 border-t border-line/40 bg-paper">
        {showRecorder ? (
          <VoiceRecorder onSend={handleSendVoice} onCancel={() => setShowRecorder(false)} />
        ) : (
          <div className="flex items-center gap-2 bg-chip rounded-2xl p-1.5 focus-within:ring-1 focus-within:ring-ink/20 transition">
            <label className="p-2 text-muted hover:text-ink transition cursor-pointer shrink-0">
              <ImagePlus size={19} />
              <input type="file" accept="image/*,video/*" className="hidden" onChange={handlePickMedia} />
            </label>

            <input
              type="text"
              maxLength={1000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-transparent px-2 text-sm text-ink placeholder-muted focus:outline-none"
            />

            {text.trim() || mediaFile || attachProduct || attachStory ? (
              <button
                onClick={handleSend}
                disabled={sending}
                className="bg-ink hover:opacity-90 disabled:opacity-30 text-white font-bold p-2.5 rounded-xl text-sm transition shrink-0"
              >
                {sending ? "..." : "إرسال"}
              </button>
            ) : (
              <button onClick={() => setShowRecorder(true)} className="p-2 text-muted hover:text-ink transition shrink-0">
                <Mic size={19} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* نافذة تأكيد الحذف */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-paper rounded-3xl p-6 max-w-xs w-full text-center">
            <p className="text-sm font-semibold mb-1">حذف الرسالة؟</p>
            <p className="text-xs text-muted mb-5">لا يمكن التراجع عن هذا الإجراء</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-pill bg-chip text-sm font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-pill bg-red-600 text-white text-sm font-semibold"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الإبلاغ */}
      {showReport && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center">
          <div className="bg-paper w-full md:max-w-sm md:rounded-3xl rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[92dvh] overflow-y-auto">
            <h2 className="font-display text-[17px] mb-4">الإبلاغ عن {partner?.name}</h2>

            <div className="flex flex-col gap-2 mb-4">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2.5 bg-chip rounded-xl px-3 py-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reportReason === r}
                    onChange={() => setReportReason(r)}
                    className="accent-ink"
                  />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>

            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="تفاصيل إضافية (اختياري)"
              rows={2}
              className="w-full bg-chip rounded-xl p-3 text-sm outline-none resize-none mb-4"
            />

            <div className="flex gap-2">
              <button onClick={() => setShowReport(false)} className="flex-1 py-2.5 rounded-pill bg-chip text-sm font-semibold">
                إلغاء
              </button>
              <button onClick={submitReport} className="flex-1 py-2.5 rounded-pill bg-ink text-white text-sm font-semibold">
                إرسال البلاغ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
