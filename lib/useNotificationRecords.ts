"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  kind: "general" | "like" | "comment" | "follow" | "message" | "call" | "order" | "ad";
  title: string;
  message: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  read_at: string | null;
  created_at: string;
};

function getKind(type: string): AppNotification["kind"] {
  if (type === "campaign" || type === "ad" || type === "admin_campaign") return "ad";
  if (type.includes("like")) return "like";
  if (type.includes("comment")) return "comment";
  if (type.includes("follow")) return "follow";
  if (type.includes("reply")) return "message";
  if (type.includes("share")) return "general";
  if (type.includes("call")) return "call";
  if (type.includes("message")) return "message";
  if (type.includes("order")) return "order";
  return "general";
}

function getHref(type: string): string {
  if (type.startsWith("story_")) return "/profile/stories";
  if (type === "admin_verification") return "/admin/verifications";
  if (type === "admin_campaign") return "/admin/campaigns";
  if (type === "admin_report") return "/admin/reports";
  if (type === "verification") return "/dashboard/settings";
  if (type === "campaign" || type === "ad") return "/dashboard/ads";
  if (type.includes("like") || type.includes("comment")) return "/home";
  if (type.includes("follow")) return "/profile/followers";
  if (type.includes("message") || type.includes("call")) return "/chat";
  return "/notifications";
}

export function useNotifications(userId: string | null) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, type, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) {
      setItems(((data ?? []) as NotificationRow[]).map((row) => ({
        id: row.id,
        kind: getKind(row.type),
        title: row.title,
        message: row.body,
        href: getHref(row.type),
        createdAt: row.created_at,
        readAt: row.read_at,
      })));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    void load();
    if (!userId) return;
    const timer = window.setInterval(() => void load(), 60000);
    const channelId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(`notifications-${userId}-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const readAt = new Date().toISOString();
    setItems((previous) => previous.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) void load();
  }, [load, userId]);

  const markRead = useCallback(async (id: string) => {
    const readAt = new Date().toISOString();
    setItems((previous) => previous.map((item) => (item.id === id && !item.readAt ? { ...item, readAt } : item)));
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", id)
      .is("read_at", null);
    if (error) void load();
  }, [load]);

  const unreadCount = items.reduce((count, item) => count + Number(!item.readAt), 0);
  return { items, loading, unreadCount, markAllRead, markRead };
}
