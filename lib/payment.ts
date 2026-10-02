export type PaymentProviderName = 'disabled' | 'zaincash'

export type PaymentStatus =
  | 'off'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'pending_review'

export type PaymentSystemConfig = {
  enabled: boolean
  provider: PaymentProviderName
  merchantId: string
  apiKey: string
  apiSecret: string
  currency: string
  exchangeRate: string
  webhookUrl: string
  status: 'off' | 'configured' | 'ready' | 'active'
}

export type CreateCheckoutInput = {
  campaignId: string
  merchantId: string
  amount: number
  currency: string
  metadata?: Record<string, unknown>
}

export type CreateCheckoutResult = {
  ok: boolean
  disabled: boolean
  status: PaymentStatus
  provider: PaymentProviderName
  paymentUrl?: string
  transactionId?: string
  message: string
}

export interface PaymentProvider {
  name: PaymentProviderName
  createCheckout(input: CreateCheckoutInput, config: PaymentSystemConfig): Promise<CreateCheckoutResult>
  verifyTransaction(txnId: string, config: PaymentSystemConfig): Promise<CreateCheckoutResult>
  handleWebhook(payload: unknown, config: PaymentSystemConfig): Promise<CreateCheckoutResult>
}

export const DEFAULT_PAYMENT_CONFIG: PaymentSystemConfig = {
  enabled: false,
  provider: 'disabled',
  merchantId: '',
  apiKey: '',
  apiSecret: '',
  currency: 'USD',
  exchangeRate: '1',
  webhookUrl: '',
  status: 'off',
}

export function getPaymentSystemState(
  overrides: Partial<PaymentSystemConfig> = {},
): PaymentSystemConfig {
  const envEnabled = String(process.env.PAYMENTS_ENABLED ?? '').toLowerCase() === 'true'
  const envProvider = String(process.env.PAYMENT_PROVIDER ?? 'disabled').toLowerCase()
  const enabled = envEnabled || overrides.enabled === true

  const provider =
    overrides.provider ??
    (enabled && envProvider === 'zaincash' ? 'zaincash' : 'disabled')

  return {
    ...DEFAULT_PAYMENT_CONFIG,
    ...overrides,
    enabled: enabled && provider !== 'disabled',
    provider,
    merchantId: overrides.merchantId ?? process.env.PAYMENT_MERCHANT_ID ?? '',
    apiKey: overrides.apiKey ?? process.env.PAYMENT_API_KEY ?? '',
    apiSecret: overrides.apiSecret ?? process.env.PAYMENT_API_SECRET ?? '',
    currency: overrides.currency ?? process.env.PAYMENT_CURRENCY ?? 'USD',
    exchangeRate: overrides.exchangeRate ?? process.env.PAYMENT_EXCHANGE_RATE ?? '1',
    webhookUrl: overrides.webhookUrl ?? process.env.PAYMENT_WEBHOOK_URL ?? '',
    status: enabled && provider !== 'disabled' ? 'ready' : 'off',
  }
}

export class DisabledPaymentProvider implements PaymentProvider {
  name: PaymentProviderName = 'disabled'

  async createCheckout(
    input: CreateCheckoutInput,
    _config: PaymentSystemConfig,
  ): Promise<CreateCheckoutResult> {
    return {
      ok: false,
      disabled: true,
      status: 'off',
      provider: 'disabled',
      message: `الدفع معطل حاليًا. تم إنشاء الطلب ${input.campaignId} لكنه لا يُعالج حتى يتم تفعيل المزود.`,
    }
  }

  async verifyTransaction(
    txnId: string,
    _config: PaymentSystemConfig,
  ): Promise<CreateCheckoutResult> {
    return {
      ok: false,
      disabled: true,
      status: 'off',
      provider: 'disabled',
      transactionId: txnId,
      message: 'لا يوجد مزود نشط حاليًا للتحقق من المعاملة.',
    }
  }

  async handleWebhook(
    _payload: unknown,
    _config: PaymentSystemConfig,
  ): Promise<CreateCheckoutResult> {
    return {
      ok: false,
      disabled: true,
      status: 'off',
      provider: 'disabled',
      message: 'Webhook معطل لأن نظام الدفع غير مفعل.',
    }
  }
}

export function getProvider(config: PaymentSystemConfig): PaymentProvider {
  if (config.provider === 'zaincash' && config.enabled) {
    return new DisabledPaymentProvider()
  }
  return new DisabledPaymentProvider()
}
