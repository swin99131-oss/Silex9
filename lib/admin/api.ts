import { createClient } from '@/lib/supabase'
import type {
  AuditLog,
  Campaign,
  Conversation,
  Notification,
  Order,
  PlatformSetting,
  PlatformSettingKey,
  Product,
  Profile,
  Report,
} from './types'

export const PAGE_SIZE = 25

export type Page<T> = { rows: T[]; total: number }
export type ListOpts = { page?: number; search?: string }

const supabase = createClient()

async function list<T>(
  table: string,
  { page = 0 }: ListOpts = {},
  build?: (q: any) => any,
): Promise<Page<T>> {
  let q = supabase.from(table).select('*', { count: 'exact' })
  if (build) q = build(q)
  const from = page * PAGE_SIZE
  const { data, count, error } = await q
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
  if (error) throw new Error(error.message)
  return { rows: (data ?? []) as T[], total: count ?? 0 }
}

const clean = (s: string) => s.replace(/[,()%]/g, ' ').trim()

function profileSearch(q: any, search?: string) {
  const s = search ? clean(search) : ''
  if (!s) return q
  return q.or(
    `full_name.ilike.%${s}%,display_name.ilike.%${s}%,store_name.ilike.%${s}%,phone.ilike.%${s}%`,
  )
}

export const listUsers = (o: ListOpts = {}) =>
  list<Profile>('profiles', o, (q) => profileSearch(q, o.search))

export const listMerchants = (o: ListOpts = {}) =>
  list<Profile>('profiles', o, (q) => profileSearch(q.eq('role', 'merchant'), o.search))

export const listAdmins = (o: ListOpts = {}) =>
  list<Profile>('profiles', o, (q) => q.eq('role', 'admin'))

export const listProducts = (o: ListOpts = {}) =>
  list<Product>('products', o, (q) => {
    const s = o.search ? clean(o.search) : ''
    return s ? q.ilike('title', `%${s}%`) : q
  })

export const listOrders = (o: ListOpts = {}) => list<Order>('orders', o)
export const listReports = (o: ListOpts = {}) => list<Report>('reports', o)
export const listConversations = (o: ListOpts = {}) =>
  list<Conversation>('conversations', o)
export const listNotifications = (o: ListOpts = {}) =>
  list<Notification>('notifications', o)
export const listCampaigns = (o: ListOpts = {}) => list<Campaign>('campaigns', o)
export const listAuditLogs = (o: ListOpts = {}) => list<AuditLog>('audit_logs', o)

export async function getCounts() {
  const count = async (table: string, build?: (q: any) => any) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true })
    if (build) q = build(q)
    const { count: c, error } = await q
    if (error) throw new Error(error.message)
    return c ?? 0
  }
  const [users, merchants, products, orders, reports, campaigns] = await Promise.all([
    count('profiles'),
    count('profiles', (q) => q.eq('role', 'merchant')),
    count('products'),
    count('orders'),
    count('reports'),
    count('campaigns'),
  ])
  return { users, merchants, products, orders, reports, campaigns }
}

export async function logAction(
  action: string,
  entityType?: string,
  entityId?: string,
  details: Record<string, unknown> = {},
) {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  await supabase.from('audit_logs').insert({
    actor_id: data.user.id,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    details,
  })
}

export async function getSettings(): Promise<Record<PlatformSettingKey, string>> {
  const { data, error } = await supabase.from('platform_settings').select('*')
  if (error) throw new Error(error.message)
  const out = {
    support_email: '',
    support_whatsapp: '',
    terms_text: '',
    privacy_text: '',
  } as Record<PlatformSettingKey, string>
  for (const r of (data ?? []) as PlatformSetting[]) out[r.key] = r.value
  return out
}

export async function saveSettings(values: Record<PlatformSettingKey, string>) {
  const { data: u } = await supabase.auth.getUser()
  const now = new Date().toISOString()
  const rows = (Object.keys(values) as PlatformSettingKey[]).map((key) => ({
    key,
    value: values[key],
    updated_at: now,
    updated_by: u.user?.id ?? null,
  }))
  const { error } = await supabase.from('platform_settings').upsert(rows)
  if (error) throw new Error(error.message)
  await logAction('settings.update', 'platform_settings')
}

export async function setUserRole(userId: string, role: 'admin' | 'merchant' | 'customer') {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw new Error(error.message)
  await logAction('user.role_change', 'profiles', userId, { role })
}
