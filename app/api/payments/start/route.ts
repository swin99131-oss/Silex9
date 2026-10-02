import { NextResponse } from 'next/server'
import { getPaymentSystemState, getProvider } from '@/lib/payment'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const campaignId = typeof body?.campaignId === 'string' ? body.campaignId : ''
    const merchantId = typeof body?.merchantId === 'string' ? body.merchantId : ''
    const amount = Number(body?.amount ?? 0)

    if (!campaignId || !merchantId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'بيانات الدفع غير مكتملة' }, { status: 400 })
    }

    const config = getPaymentSystemState()
    const provider = getProvider(config)

    const result = await provider.createCheckout(
      { campaignId, merchantId, amount, currency: config.currency },
      config,
    )

    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch (error) {
    return NextResponse.json(
      { ok: false, disabled: true, status: 'off', provider: 'disabled', message: 'تعذر إنشاء جلسة الدفع' },
      { status: 500 },
    )
  }
}
