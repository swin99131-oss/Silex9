'use client'

import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '@/lib/admin/api'
import type { PlatformSettingKey } from '@/lib/admin/types'

type Values = Record<PlatformSettingKey, string>

const EMPTY: Values = {
  support_email: '',
  support_whatsapp: '',
  terms_text: '',
  privacy_text: '',
  payments_enabled: 'false',
  payment_provider: 'disabled',
  payment_merchant_id: '',
  payment_api_key: '',
  payment_currency: 'USD',
  payment_exchange_rate: '1',
  payment_webhook_url: '',
  payment_status: 'off',
}

export default function SettingsPage() {
  const [values, setValues] = useState<Values>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(() => {
    getSettings()
      .then(setValues)
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ غير معروف'))
      .finally(() => setLoading(false))
  }, [])

  const set = (k: PlatformSettingKey) => (e: { target: { value: string } }) => {
    setOk(false)
    setValues((v) => ({ ...v, [k]: e.target.value }))
  }

  async function save() {
    setSaving(true)
    try {
      await saveSettings(values)
      setError('')
      setOk(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted">جارٍ التحميل...</p>

  const input = 'w-full rounded-xl border border-border bg-card px-4 py-2 text-sm'

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">الإعدادات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">تم الحفظ</p>}

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">إعدادات الدعم</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            بريد الدعم
            <input dir="ltr" className={input} value={values.support_email} onChange={set('support_email')} />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            واتساب الدعم
            <input dir="ltr" className={input} value={values.support_whatsapp} onChange={set('support_whatsapp')} />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">إعدادات الدفع</h2>
        <p className="mb-4 text-xs text-muted">الدفع معطل حاليًا، والـ API Secret يبقى في Backend فقط ولا يُعرض في الواجهة.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            حالة الدفع
            <select className={input} value={values.payments_enabled} onChange={set('payments_enabled')}>
              <option value="false">OFF</option>
              <option value="true">ON</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            المزود
            <select className={input} value={values.payment_provider} onChange={set('payment_provider')}>
              <option value="disabled">Disabled</option>
              <option value="zaincash">ZainCash</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Merchant ID
            <input dir="ltr" className={input} value={values.payment_merchant_id} onChange={set('payment_merchant_id')} />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            API Key
            <input dir="ltr" className={input} value={values.payment_api_key} onChange={set('payment_api_key')} />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Currency
            <input dir="ltr" className={input} value={values.payment_currency} onChange={set('payment_currency')} />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Exchange Rate
            <input dir="ltr" className={input} value={values.payment_exchange_rate} onChange={set('payment_exchange_rate')} />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
            Webhook URL
            <input dir="ltr" className={input} value={values.payment_webhook_url} onChange={set('payment_webhook_url')} />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
            Payment Status
            <input dir="ltr" className={input} value={values.payment_status} onChange={set('payment_status')} />
          </label>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        الشروط والأحكام
        <textarea rows={8} className={input} value={values.terms_text} onChange={set('terms_text')} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        سياسة الخصوصية
        <textarea rows={8} className={input} value={values.privacy_text} onChange={set('privacy_text')} />
      </label>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="self-start rounded-full bg-ink px-8 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'جارٍ الحفظ...' : 'حفظ'}
      </button>
    </div>
  )
}
