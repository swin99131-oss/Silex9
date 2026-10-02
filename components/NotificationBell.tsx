"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/useNotificationRecords";

export function NotificationBell({ userId, className, showLabel = false }: {
  userId: string | null;
  className: string;
  showLabel?: boolean;
}) {
  const { unreadCount } = useNotifications(userId);

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
