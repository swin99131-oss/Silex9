"use client";

import { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { requestOneSignalPermission } from "@/components/OneSignalProvider";

export function EnablePushNotifications() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const configured = Boolean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const granted = await requestOneSignalPermission();
      setMessage(granted ? "تم تفعيل إشعارات الجهاز" : "لم يتم السماح بالإشعارات من إعدادات المتصفح");
    } catch {
      setMessage("تعذّر تفعيل الإشعارات حالياً");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={enable}
        disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-white disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
        تفعيل إشعارات الجهاز
      </button>
      {message && <span role="status" className="text-[11px] text-muted">{message}</span>}
    </div>
  );
}
