"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Heart, MessageCircle, PhoneCall, ShoppingBag, Megaphone, UserRound, CheckCheck } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import { useNotifications, type AppNotification } from "@/lib/useNotificationRecords";
import { EnablePushNotifications } from "@/components/EnablePushNotifications";

const icons = {
  general: Bell,
  like: Heart,
  comment: MessageCircle,
  follow: UserRound,
  message: MessageCircle,
  call: PhoneCall,
  order: ShoppingBag,
  ad: Megaphone,
};

function timeAgo(value: string | null) {
  if (!value) return "نشاط جديد";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

function NotificationRow({ item }: { item: AppNotification }) {
  const Icon = icons[item.kind];
  return (
    <Link href={item.href} className="flex items-start gap-3 border-b border-line/60 px-4 py-4 hover:bg-chip/60">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-chip text-ink">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-6">{item.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{item.message}</span>
        <span className="mt-1 block text-[11px] text-muted">{timeAgo(item.createdAt)}</span>
      </span>
    </Link>
  );
}

export default function NotificationsPage() {
  const { user, profile, loading: profileLoading } = useProfile();
  const { items, loading, unreadCount, markAllRead } = useNotifications(user?.id ?? null);
  const marked = useRef(false);

  useEffect(() => {
    if (!loading && !profileLoading && !marked.current) {
      markAllRead();
      marked.current = true;
    }
  }, [loading, profileLoading, markAllRead]);

  return (
    <section className="mx-auto min-h-[60vh] max-w-2xl">
      <header className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold">الإشعارات</h1>
          <p className="mt-1 text-sm text-muted">تفاعلات ورسائل وتحديثات حسابك</p>
        </div>
        <EnablePushNotifications />
      </header>

      {loading || profileLoading ? (
        <div className="py-12 text-center text-sm text-muted">جارٍ تحميل الإشعارات…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <CheckCheck size={28} className="text-muted" />
          <p className="mt-3 text-sm font-semibold">لا توجد إشعارات جديدة</p>
          <p className="mt-1 text-xs text-muted">ستظهر هنا التفاعلات والتحديثات الجديدة.</p>
        </div>
      ) : (
        <>
          {unreadCount > 0 && <p className="px-4 py-3 text-xs font-semibold text-muted">{unreadCount} غير مقروء</p>}
          <div className="-mx-4">{items.map((item) => <NotificationRow key={item.id} item={item} />)}</div>
        </>
      )}
    </section>
  );
}
