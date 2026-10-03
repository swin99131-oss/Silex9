"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/useNotificationRecords";

let lastSoundAt = 0;

export function NotificationBell({ userId, className, showLabel = false }: {
  userId: string | null;
  className: string;
  showLabel?: boolean;
}) {
  const { items, loading, unreadCount } = useNotifications(userId);
  const previousIds = useRef<Set<string> | null>(null);
  const previousUserId = useRef<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (loading) return;
    const currentIds = new Set(items.map((item) => item.id));
    if (previousUserId.current !== userId || previousIds.current === null) {
      previousUserId.current = userId;
      previousIds.current = currentIds;
      return;
    }

    const hasNewUnread = items.some((item) => !item.readAt && !previousIds.current?.has(item.id));
    previousIds.current = currentIds;
    if (!hasNewUnread) return;

    const now = Date.now();
    if (now - lastSoundAt < 2000) return;
    lastSoundAt = now;

    audio.current ??= new Audio("/sounds/notification.wav");
    audio.current.currentTime = 0;
    void audio.current.play().catch(() => undefined);
  }, [items, loading, userId]);

  return (
    <Link href="/notifications" aria-label="الإشعارات" className={`relative ${className}`}>
      <span className="relative inline-flex">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -left-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </span>
      {showLabel && <span>الإشعارات</span>}
    </Link>
  );
}
