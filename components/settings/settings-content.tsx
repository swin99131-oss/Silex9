"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useStore } from "@/components/store/store-context"
import { useProfile } from "@/lib/useProfile"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export function SettingsContent() {
  const { settings, updateSetting } = useStore()
  const { profile, setProfile } = useProfile()
  const [assistantEnabled, setAssistantEnabled] = useState(profile?.assistant_enabled ?? false)
  const [instructions, setInstructions] = useState(profile?.assistant_instructions ?? "")
  const [hoursEnabled, setHoursEnabled] = useState((profile as any)?.bot_hours_enabled ?? false)
  const [hoursStart, setHoursStart] = useState((profile as any)?.bot_hours_start?.slice(0, 5) ?? "09:00")
  const [hoursEnd, setHoursEnd] = useState((profile as any)?.bot_hours_end?.slice(0, 5) ?? "22:00")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    const p = profile as any
    setAssistantEnabled(p.assistant_enabled ?? false)
    setInstructions(p.assistant_instructions ?? "")
    setHoursEnabled(p.bot_hours_enabled ?? false)
    setHoursStart(p.bot_hours_start?.slice(0, 5) ?? "09:00")
    setHoursEnd(p.bot_hours_end?.slice(0, 5) ?? "22:00")
  }, [profile?.id])

  const notificationItems = [
    { key: "debt_notifications" as const, label: "إشعارات الديون المستحقة", description: "تنبيه عند اقتراب موعد استحقاق دين" },
    { key: "inventory_notifications" as const, label: "تنبيهات نفاد المخزون", description: "تنبيه عند قرب نفاد أحد المنتجات" },
    { key: "order_notifications" as const, label: "طلبات الزبائن الجديدة", description: "إشعار عند وصول طلب جديد" },
    { key: "weekly_reports" as const, label: "تقارير المبيعات الأسبوعية", description: "ملخص أسبوعي لأداء المتجر" },
  ]

  async function toggleAssistant(checked: boolean) {
    if (!profile) return
    setAssistantEnabled(checked)
    const { error } = await supabase.from("profiles").update({ assistant_enabled: checked }).eq("id", profile.id)
    if (error) {
      toast.error("تعذر تحديث حالة المساعد")
      setAssistantEnabled(!checked)
    } else {
      setProfile({ ...profile, assistant_enabled: checked } as any)
      toast.success(checked ? "تم تفعيل المساعد الذكي" : "تم إيقاف المساعد الذكي")
    }
  }

  async function saveInstructions() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update({
        assistant_instructions: instructions.trim() || null,
        bot_hours_enabled: hoursEnabled,
        bot_hours_start: hoursStart,
        bot_hours_end: hoursEnd,
      })
      .eq("id", profile.id)
    setSaving(false)
    if (error) {
      toast.error("تعذر حفظ الإعدادات")
    } else {
      setProfile({
        ...profile,
        assistant_instructions: instructions.trim(),
        bot_hours_enabled: hoursEnabled,
        bot_hours_start: hoursStart,
        bot_hours_end: hoursEnd,
      } as any)
      toast.success("تم حفظ إعدادات المساعد")
    }
  }

  const input = "w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40"

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">المساعد الذكي</h3>
            <p className="mt-1 text-sm text-muted">
              يرد تلقائيًا على رسائل الزبائن باسمك، بناءً على منتجاتك الحقيقية وأسلوبك المحدد.
            </p>
          </div>
          <Switch checked={assistantEnabled} onCheckedChange={toggleAssistant} />
        </div>

        {assistantEnabled && (
          <div className="mt-5 space-y-5 border-t border-border pt-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">قواعد وتعليمات إلزامية للبوت (اختياري)</label>
              <p className="text-xs text-muted">
                مثال: رد بأسلوب ودود ومختصر، واذكر إن التوصيل خلال يومين. اتركه فارغًا لأسلوب افتراضي مهني.
              </p>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="اكتب كيف تريد أن يرد المساعد على زبائنك..."
                className={input}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-sm font-medium">تحديد أوقات عمل المساعد</label>
                <p className="text-xs text-muted">إذا كان متوقفًا، يرد المساعد على مدار الساعة.</p>
              </div>
              <Switch checked={hoursEnabled} onCheckedChange={setHoursEnabled} />
            </div>

            {hoursEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium">من الساعة</label>
                  <input type="time" value={hoursStart} onChange={(e) => setHoursStart(e.target.value)} className={input} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium">إلى الساعة</label>
                  <input type="time" value={hoursEnd} onChange={(e) => setHoursEnd(e.target.value)} className={input} />
                </div>
              </div>
            )}

            <Button onClick={saveInstructions} disabled={saving} className="h-11 rounded-full px-6">
              {saving ? "جارٍ الحفظ..." : "حفظ الأسلوب"}
            </Button>
            <p className="text-xs text-muted">
              ملاحظة: إذا رددت أنت بنفسك يدويًا على أي زبون، يتوقف المساعد تلقائيًا في تلك المحادثة فقط، حتى تفعّله لها من جديد من داخل الشات.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-2 text-lg font-semibold">الإشعارات</h3>
        <ul className="divide-y divide-border">
          {notificationItems.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted">{item.description}</p>
              </div>
              <Switch
                checked={settings[item.key]}
                onCheckedChange={(checked) => void updateSetting(item.key, checked)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
