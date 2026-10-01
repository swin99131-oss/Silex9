"use client";

import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pin, Trash2 } from "lucide-react";
import { getInbox, clearConversation, togglePinConversation, InboxItem } from "@/lib/chat";
import { supabase } from "@/lib/supabase";

const LONG_PRESS_MS = 500;

export default function ChatInboxPage() {
  const router = useRouter();
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<InboxItem | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    try {
      const items = await getInbox(user.id);
      setInbox(items);
    } catch (err) {
      console.error("Error loading inbox:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    function onFocus() {
      loadData();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadData]);

  function startPress(item: InboxItem) {
    timerRef.current = setTimeout(() => setMenuFor(item), LONG_PRESS_MS);
  }
  function cancelPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  async function handlePin() {
    if (!menuFor || !userId) return;
    await togglePinConversation(menuFor.conversation_id, userId, !menuFor.pinned);
    setMenuFor(null);
    loadData();
  }

  async function handleDeleteChat() {
    if (!menuFor || !userId) return;
    if (!confirm("سيتم حذف هذه المحادثة من عندك فقط. هل تريد المتابعة؟")) {
      setMenuFor(null);
      return;
    }
    await clearConversation(menuFor.conversation_id, userId);
    setMenuFor(null);
    loadData();
  }

  const filteredInbox = inbox.filter((item) =>
    item.partner_name.toLowerCase().includes(search.toLowerCase()) ||
    (item.partner_username && item.partner_username.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-paper text-ink flex flex-col dir-rtl">
      <div className="p-4 border-b border-line/40 sticky top-0 bg-paper/95 backdrop-blur-md z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-[19px]">المحادثات</h1>
        </div>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث في المحادثات..."
            className="w-full bg-chip border border-transparent rounded-2xl py-2.5 px-4 pr-10 text-sm text-ink placeholder-muted focus:outline-none focus:border-ink/20 transition"
          />
          <span className="absolute right-3 top-3 text-muted text-sm">🔍</span>
        </div>
      </div>

      <div className="flex-1 divide-y divide-line/30 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center p-12 text-muted text-sm">
            جاري تحميل المحادثات...
          </div>
        ) : filteredInbox.length === 0 ? (
          <div className="text-center py-16 text-muted text-sm">
            لا توجد محادثات مطابقة
          </div>
        ) : (
          filteredInbox.map((item) => (
            <Link
              key={item.conversation_id}
              href={`/chat/${item.conversation_id}`}
              onMouseDown={() => startPress(item)}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onTouchStart={() => startPress(item)}
              onTouchEnd={cancelPress}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuFor(item);
              }}
              className={`flex items-center gap-3.5 p-4 hover:bg-chip/60 transition active:bg-chip select-none ${
                item.pinned ? "bg-chip/40" : ""
              }`}
            >
              <div className="relative flex-shrink-0 w-12 h-12 rounded-full bg-chip overflow-hidden border border-line/30">
                {item.partner_avatar ? (
                  <img src={item.partner_avatar} alt={item.partner_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display text-ink/50">
                    {item.partner_name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {item.pinned && <Pin size={12} className="text-muted shrink-0" />}
                    <h3 className="flex min-w-0 items-center gap-1 text-sm font-semibold text-ink">
                      <span className="truncate">{item.partner_name}</span>
                      <VerifiedBadge show={item.partner_verified} size={13} />
                    </h3>
                  </div>
                  {item.last_at && (
                    <span className="text-[11px] text-muted shrink-0">
                      {new Date(item.last_at).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted truncate max-w-[80%]">
                    {item.last_message || "اضغط لبدء المحادثة..."}
                  </p>
                  {item.unread > 0 && (
                    <span className="bg-ink text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      {item.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {menuFor && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center"
          onClick={() => setMenuFor(null)}
        >
          <div
            className="bg-paper w-full md:max-w-xs md:rounded-3xl rounded-t-3xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold px-2 pb-3 truncate">{menuFor.partner_name}</p>
            <button
              onClick={handlePin}
              className="w-full flex items-center gap-2.5 px-3 py-3 text-sm rounded-xl hover:bg-chip"
            >
              <Pin size={17} />
              {menuFor.pinned ? "إلغاء التثبيت" : "تثبيت المحادثة"}
            </button>
            <button
              onClick={handleDeleteChat}
              className="w-full flex items-center gap-2.5 px-3 py-3 text-sm rounded-xl text-red-600 hover:bg-red-500/5"
            >
              <Trash2 size={17} />
              حذف المحادثة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
