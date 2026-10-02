import { NextResponse } from 'next/server'
import { getPaymentSystemState, getProvider } from '@/lib/payment'

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}))
    const config = getPaymentSystemState()
    const provider = getProvider(config)
    const result = await provider.handleWebhook(payload, config)

    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch (error) {
    return NextResponse.json(
      { ok: false, disabled: true, status: 'off', provider: 'disabled', message: 'Webhook غير جاهز حاليًا' },
      { status: 500 },
    )
  }
}
