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

export type WithCity<T> = T & { city: string | null }
export type Page<T> = { rows: T[]; total: number }
export type ListOpts = { page?: number; search?: string }

const supabase = createClient()

async function attachCity<T extends Record<string, any>>(
  rows: T[],
  key: string,
): Promise<WithCity<T>[]> {
  const ids = Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))) as string[]
  if (!ids.length) return rows.map((r) => ({ ...r, city: null }))
  const { data } = await supabase.from('profiles').select('id, city').in('id', ids)
  const map = new Map((data ?? []).map((p: any) => [p.id, p.city as string | null]))
  return rows.map((r) => ({ ...r, city: map.get(r[key]) ?? null }))
}

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

async function listWithCity<T extends Record<string, any>>(
  table: string,
  ownerKey: string,
  o: ListOpts = {},
  build?: (q: any) => any,
): Promise<Page<WithCity<T>>> {
  const res = await list<T>(table, o, build)
  return { rows: await attachCity(res.rows, ownerKey), total: res.total }
}

const clean = (s: string) => s.replace(/[,()%]/g, ' ').trim()

function profileSearch(q: any, search?: string) {
  const s = search ? clean(search) : ''
  if (!s) return q
  return q.or(
    `full_name.ilike.%${s}%,display_name.ilike.%${s}%,store_name.ilike.%${s}%,phone.ilike.%${s}%,city.ilike.%${s}%`,
  )
}

export const listUsers = (o: ListOpts = {}) =>
  list<Profile>('profiles', o, (q) => profileSearch(q, o.search))

export const listMerchants = (o: ListOpts = {}) =>
  list<Profile>('profiles', o, (q) => profileSearch(q.eq('role', 'merchant'), o.search))

export const listAdmins = (o: ListOpts = {}) =>
  list<Profile>('profiles', o, (q) => q.eq('role', 'admin'))

export const listProducts = (o: ListOpts = {}) =>
  listWithCity<Product>('products', 'merchant_id', o, (q) => {
    const s = o.search ? clean(o.search) : ''
    return s ? q.ilike('title', `%${s}%`) : q
  })

export const listOrders = (o: ListOpts = {}) =>
  listWithCity<Order>('orders', 'customer_id', o)
export const listReports = (o: ListOpts = {}) =>
  listWithCity<Report>('reports', 'reported_id', o)
export const listConversations = (o: ListOpts = {}) =>
  listWithCity<Conversation>('conversations', 'customer_id', o)
export const listNotifications = (o: ListOpts = {}) =>
  listWithCity<Notification>('notifications', 'user_id', o)
export const listCampaigns = (o: ListOpts = {}) =>
  listWithCity<Campaign>('campaigns', 'merchant_id', o)
export const listAuditLogs = (o: ListOpts = {}) => list<AuditLog>('audit_logs', o)

export async function getCityStats(): Promise<{ city: string; count: number }[]> {
  const { data, error } = await supabase.from('profiles').select('city')
  if (error) throw new Error(error.message)
  const tally = new Map<string, number>()
  for (const r of data ?? []) {
    const c = ((r as any).city as string | null)?.trim() || 'غير محدد'
    tally.set(c, (tally.get(c) ?? 0) + 1)
  }
  return Array.from(tally, ([city, count]) => ({ city, count })).sort(
    (a, b) => b.count - a.count,
  )
}

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

export const listReportedChats = (o: ListOpts = {}) =>
  listWithCity<Report>('reports', 'reported_id', o, (q) =>
    q.not('conversation_id', 'is', null),
  )

export type ChatMessage = {
  id: string
  sender_id: string
  content: string | null
  media_type: string | null
  created_at: string
  deleted_at: string | null
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, content, media_type, created_at, deleted_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw new Error(error.message)
  return (data ?? []) as ChatMessage[]
}

export const listCampaignsByStatus = (o: ListOpts = {}, status?: string) =>
  listWithCity<Campaign>('campaigns', 'merchant_id', o, (q) =>
    status ? q.eq('status', status) : q,
  )

export async function setCampaignStatus(id: string, status: 'active' | 'rejected' | 'paused') {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data?.length) throw new Error('لم يتم التعديل، تحقق من الصلاحيات')
  await logAction('campaign.' + status, 'campaigns', id)
}
