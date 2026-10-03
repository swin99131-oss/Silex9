export type Role = 'admin' | 'merchant' | 'customer' | string

export type Profile = {
  id: string
  display_name: string | null
  full_name: string | null
  username: string | null
  phone: string | null
  whatsapp: string | null
  role: Role
  avatar_url: string | null
  city: string | null
  store_name: string | null
  store_category: string | null
  store_bio: string | null
  verified_at: string | null
  created_at: string
  updated_at: string | null
}

export type Merchant = Profile

export type Product = {
  id: string
  merchant_id: string
  title: string
  description: string | null
  price: number | null
  old_price: number | null
  category: string | null
  stock: number | null
  status: string | null
  is_active: boolean | null
  promoted: boolean | null
  views: number | null
  rating: number | null
  reviews: number | null
  cover_url: string | null
  created_at: string
}

export type Order = {
  id: string
  merchant_id: string
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  items_count: number | null
  total_amount: number | null
  status: string | null
  created_at: string
  updated_at: string | null
}

export type Report = {
  id: string
  reporter_id: string | null
  reported_id: string | null
  conversation_id: string | null
  post_id: string | null
  reason: string | null
  details: string | null
  status: string
  admin_note: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export type Conversation = {
  id: string
  customer_id: string
  merchant_id: string
  last_message_at: string | null
  ai_muted: boolean | null
  bot_paused: boolean | null
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  title: string | null
  body: string | null
  type: string | null
  read_at: string | null
  created_at: string
}

export type Campaign = {
  id: string
  merchant_id: string
  type: string | null
  title: string | null
  description: string | null
  status: string | null
  daily_budget: number | null
  total_budget: number | null
  duration_days: number | null
  target_province: string | null
  target_category: string | null
  created_at: string
  updated_at: string | null
}

export type AuditLog = {
  id: string
  actor_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export type PlatformSettingKey =
  | 'support_email'
  | 'support_whatsapp'
  | 'terms_text'
  | 'privacy_text'
  | 'payments_enabled'
  | 'payment_provider'
  | 'payment_merchant_id'
  | 'payment_api_key'
  | 'payment_currency'
  | 'payment_exchange_rate'
  | 'payment_webhook_url'
  | 'payment_status'

export type PlatformSetting = {
  key: PlatformSettingKey
  value: string
  updated_at: string
}

