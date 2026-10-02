import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    enabled: false,
    provider: 'disabled',
    merchantId: '',
    apiKey: '',
    currency: 'USD',
    exchangeRate: '1',
    webhookUrl: '',
    status: 'off',
  })
}
