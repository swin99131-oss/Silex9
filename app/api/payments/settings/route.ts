import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPaymentSystemState } from '@/lib/payment'

function safeState() {
  const state = getPaymentSystemState()
  return {
    enabled: false,
    provider: 'disabled',
    merchantId: '',
    apiKey: '',
    currency: state.currency,
    exchangeRate: state.exchangeRate,
    webhookUrl: '',
    status: 'off',
  }
}

function sanitizeSettings(body: any) {
  const rawProvider = String(body?.provider ?? 'disabled').toLowerCase()
  const provider = rawProvider === 'zaincash' ? 'zaincash' : 'disabled'
  const enabled = Boolean(body?.enabled === true && provider === 'zaincash')

  return {
    is_enabled: enabled,
    provider,
    merchant_id: enabled ? String(body?.merchantId ?? '').trim() : '',
    api_key: enabled ? String(body?.apiKey ?? '').trim() : '',
    currency: String(body?.currency ?? 'USD').trim() || 'USD',
    exchange_rate: Number(body?.exchangeRate ?? 1) || 1,
    webhook_url: enabled ? String(body?.webhookUrl ?? '').trim() : '',
    payment_status: enabled ? 'ready' : 'off',
  }
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET() {
  try {
    const state = getPaymentSystemState()
    return NextResponse.json({
      enabled: false,
      provider: 'disabled',
      merchantId: '',
      apiKey: '',
      currency: state.currency,
      exchangeRate: state.exchangeRate,
      webhookUrl: '',
      status: 'off',
    })
  } catch {
    return NextResponse.json(safeState(), { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    const client = adminClient()
    if (!client) {
      return NextResponse.json({ error: 'backend_not_configured' }, { status: 503 })
    }

    const { data: userData, error: userError } = await client.auth.getUser(jwt)
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const payload = sanitizeSettings(body)
    const persisted = {
      ...payload,
      updated_at: new Date().toISOString(),
      updated_by: userData.user.id,
    }

    try {
      const { error } = await client.from('payment_settings').upsert({
        id: '00000000-0000-0000-0000-000000000001',
        ...persisted,
      })

      if (error) {
        return NextResponse.json({ error: 'db_unavailable', details: error.message }, { status: 503 })
      }
    } catch {
      return NextResponse.json({
        ok: true,
        enabled: false,
        provider: 'disabled',
        status: 'off',
        message: 'قاعدة بيانات الدفع غير مفعلة بعد، ولكن التطبيق يبني بشكل آمن.',
      })
    }

    return NextResponse.json({
      ok: true,
      enabled: payload.is_enabled,
      provider: payload.provider,
      status: payload.payment_status,
      message: 'تم حفظ إعدادات الدفع في Backend، لا يتم كشف المفاتيح في الواجهة.',
    })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
