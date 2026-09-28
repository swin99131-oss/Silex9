"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { useProfile } from "@/lib/useProfile"

export type Debtor = {
  id: string
  name: string
  phone: string
  amount: number
  date: string
  overdue: boolean
  paid: boolean
}

export type Product = {
  id: string
  name: string
  category: string
  stock: number
  max: number
  price: number
  imageUrl?: string | null
}

export type Campaign = {
  id: string
  title: string
  desc: string
  type: string
  active: boolean
}

export type Order = {
  id: string
  customer: string
  items: number
  total: number
  status: string
  time: string
}

export type TopProduct = {
  name: string
  quantity: number
  total: number
}

export type StoreSettings = {
  debt_notifications: boolean
  inventory_notifications: boolean
  order_notifications: boolean
  weekly_reports: boolean
  dark_mode: boolean
}

export type NotificationItem = {
  id: string
  title: string
  message: string
  type: "debt" | "inventory" | "order" | "report"
  createdAt: string
}

type StoreContextValue = {
  debtors: Debtor[]
  products: Product[]
  campaigns: Campaign[]
  orders: Order[]
  topProducts: TopProduct[]
  settings: StoreSettings
  notifications: NotificationItem[]
  query: string
  setQuery: (q: string) => void
  isLoading: boolean
  dataError: string | null
  addDebtor: (d: Omit<Debtor, "id" | "paid">) => Promise<void>
  collectDebt: (id: string) => Promise<void>
  addProduct: (p: Omit<Product, "id">) => Promise<void>
  getOrCreateCategory: (name: string) => Promise<string>
  restockProduct: (id: string, amount: number) => Promise<void>
  updateSetting: (key: keyof StoreSettings, value: boolean) => Promise<void>
  addCampaign: (c: Omit<Campaign, "id">) => void
  toggleCampaign: (id: string) => void
  addOrder: (o: Omit<Order, "id" | "time">) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

let counter = 0
const uid = () => `id-${Date.now()}-${counter++}`

const defaultSettings: StoreSettings = {
  debt_notifications: true,
  inventory_notifications: true,
  order_notifications: false,
  weekly_reports: false,
  dark_mode: false,
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: profileLoading } = useProfile()

  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings)
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStoreData() {
      if (profileLoading) return

      if (!user) {
        setDataError("يجب تسجيل الدخول للوصول للوحة التاجر")
        setIsLoading(false)
        return
      }

      if (profile?.role !== "merchant") {
        setDataError("هذا الحساب غير مفعّل كحساب تاجر")
        setIsLoading(false)
        return
      }

      const merchantId = user.id

      const savedDarkMode = typeof window !== "undefined" ? localStorage.getItem("mataji-dark-mode") : null

      const [
        { data: productRows, error: productsError },
        { data: debtRows, error: debtsError },
        { data: profileSettingsRow, error: settingsError },
      ] = await Promise.all([
        supabase.from("products").select("*, categories(name)").eq("merchant_id", merchantId).order("title"),
        supabase.from("debts").select("*").eq("merchant_id", merchantId).order("due_date", { ascending: true }),
        supabase
          .from("profiles")
          .select("debt_notifications, inventory_notifications, order_notifications, weekly_reports")
          .eq("id", merchantId)
          .single(),
      ])

      if (productsError || debtsError) {
        setDataError(productsError?.message ?? debtsError?.message ?? "تعذر تحميل بيانات المتجر")
      } else {
        setProducts(
          (productRows ?? []).map((row) => ({
            id: row.id,
            name: row.title,
            category: row.categories?.name ?? row.category ?? "غير مصنف",
            stock: Number(row.stock ?? 0),
            max: Math.max(100, Number(row.stock ?? 0) * 2),
            price: Number(row.price),
            imageUrl: row.cover_url,
          })),
        )
        setDebtors(
          (debtRows ?? []).map((row) => ({
            id: row.id,
            name: row.customer_name,
            phone: row.phone ?? "—",
            amount: Number(row.total_amount ?? 0) - Number(row.paid_amount ?? 0),
            date: row.due_date ?? "غير محدد",
            overdue: row.status === "overdue",
            paid: row.status === "paid",
          })),
        )
      }

      if (settingsError) {
        console.warn("settings query failed:", settingsError.message)
      }

      setSettings({
        debt_notifications: profileSettingsRow?.debt_notifications ?? true,
        inventory_notifications: profileSettingsRow?.inventory_notifications ?? true,
        order_notifications: profileSettingsRow?.order_notifications ?? false,
        weekly_reports: profileSettingsRow?.weekly_reports ?? false,
        dark_mode: savedDarkMode === "true",
      })

      const [{ data: orderRows, error: ordersError }, { data: itemRows, error: itemsError }] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("merchant_id", merchantId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("order_items")
          .select("product_name, quantity, line_total")
          .eq("merchant_id", merchantId),
      ])

      if (ordersError) {
        console.warn("orders query failed:", ordersError.message)
      } else {
        setOrders(
          (orderRows ?? []).map((row) => ({
            id: row.id,
            customer: row.customer_name ?? "زبون",
            items: row.items_count ?? 0,
            total: Number(row.total_amount ?? 0),
            status: row.status ?? "قيد التجهيز",
            time: new Date(row.created_at).toLocaleString("ar-IQ", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }),
          })),
        )
      }

      if (itemsError) {
        console.warn("order_items query failed:", itemsError.message)
      } else {
        const grouped = new Map<string, { quantity: number; total: number }>()
        for (const item of itemRows ?? []) {
          const key = item.product_name ?? "منتج"
          const prev = grouped.get(key) ?? { quantity: 0, total: 0 }
          grouped.set(key, {
            quantity: prev.quantity + Number(item.quantity ?? 0),
            total: prev.total + Number(item.line_total ?? 0),
          })
        }
        const sorted = Array.from(grouped.entries())
          .map(([name, v]) => ({ name, quantity: v.quantity, total: v.total }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)
        setTopProducts(sorted)
      }

      setIsLoading(false)
    }

    void loadStoreData()
  }, [user, profile, profileLoading])

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = []

    if (settings.inventory_notifications) {
      products
        .filter((product) => product.stock > 0 && product.stock <= 10)
        .slice(0, 3)
        .forEach((product) => {
          items.push({
            id: `inventory-${product.id}`,
            title: "منتج قريب من النفاد",
            message: `${product.name} تبقى ${product.stock} وحدات فقط`,
            type: "inventory",
            createdAt: new Date().toISOString(),
          })
        })
    }

    if (settings.debt_notifications) {
      debtors
        .filter((debtor) => !debtor.paid && debtor.overdue)
        .slice(0, 3)
        .forEach((debtor) => {
          items.push({
            id: `debt-${debtor.id}`,
            title: "دين مستحق",
            message: `${debtor.name} لديه مبلغ ${debtor.amount} د.ع مستحق`,
            type: "debt",
            createdAt: new Date().toISOString(),
          })
        })
    }

    if (settings.order_notifications) {
      orders.slice(0, 2).forEach((order) => {
        items.push({
          id: `order-${order.id}`,
          title: "طلب جديد",
          message: `${order.customer} أرسل طلباً جديداً بقيمة ${order.total} د.ع`,
          type: "order",
          createdAt: new Date().toISOString(),
        })
      })
    }

    if (settings.weekly_reports) {
      items.push({
        id: "report-weekly",
        title: "تقرير الأسبوع",
        message: "ملخص المبيعات الأسبوعي جاهز للمراجعة.",
        type: "report",
        createdAt: new Date().toISOString(),
      })
    }

    return items.slice(0, 6)
  }, [debtors, orders, products, settings])

  const value = useMemo<StoreContextValue>(
    () => ({
      debtors,
      products,
      campaigns,
      orders,
      topProducts,
      settings,
      notifications,
      query,
      setQuery,
      isLoading,
      dataError,
      addDebtor: async (d) => {
        if (!user) return
        const { data, error } = await supabase
          .from("debts")
          .insert({
            merchant_id: user.id,
            customer_name: d.name,
            phone: d.phone,
            total_amount: d.amount,
            paid_amount: 0,
            due_date: d.date,
            status: "overdue",
          })
          .select()
          .single()
        if (error) throw error
        setDebtors((prev) => [{ ...d, id: data.id, paid: false }, ...prev])
      },
      collectDebt: async (id) => {
        if (!user) return
        const debtor = debtors.find((item) => item.id === id)
        if (!debtor) return
        const { error } = await supabase
          .from("debts")
          .update({ status: "paid", paid_amount: debtor.amount })
          .eq("id", id)
          .eq("merchant_id", user.id)
        if (error) throw error
        setDebtors((prev) => prev.map((x) => (x.id === id ? { ...x, paid: true, overdue: false } : x)))
      },
      addProduct: async (p) => {
        if (!user) return
        const { data, error } = await supabase
          .from("products")
          .insert({
            merchant_id: user.id,
            title: p.name,
            price: p.price,
            stock: p.stock,
            status: p.stock === 0 ? "نفاذ" : "متوفر",
            cover_url: p.imageUrl ?? null,
            category: p.category,
          })
          .select()
          .single()
        if (error) throw error
        setProducts((prev) => [{ ...p, id: data.id, max: Math.max(100, p.stock * 2) }, ...prev])
      },
      getOrCreateCategory: async (name: string) => {
        const trimmed = name.trim()
        if (!trimmed) throw new Error("اسم التصنيف مطلوب")
        if (!supabase) throw new Error("لم يتم إعداد اتصال Supabase")

        const { data: existing } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", trimmed)
          .maybeSingle()

        if (existing) return existing.id

        const slug = trimmed
          .replace(/\s+/g, "-")
          .replace(/[^\p{L}\p{N}-]/gu, "")
          .toLowerCase()
        const id = `${slug}-${Date.now().toString(36)}`

        const { data: created, error } = await supabase
          .from("categories")
          .insert({ id, name: trimmed, image: "", sort: 999 })
          .select("id")
          .single()

        if (error) throw error
        return created.id
      },
      restockProduct: async (id, amount) => {
        if (!user) return
        const product = products.find((item) => item.id === id)
        if (!product) return
        const stock = Math.min(product.max, product.stock + amount)
        const { error } = await supabase
          .from("products")
          .update({ stock, status: "متوفر" })
          .eq("id", id)
          .eq("merchant_id", user.id)
        if (error) throw error
        setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, stock } : x)))
      },
      updateSetting: async (key, value) => {
        if (key === "dark_mode") {
          if (typeof window !== "undefined") {
            localStorage.setItem("mataji-dark-mode", String(value))
          }
          setSettings((prev) => ({ ...prev, dark_mode: value }))
          return
        }
        if (!user) return
        const { error } = await supabase
          .from("profiles")
          .update({ [key]: value })
          .eq("id", user.id)
        if (!error) setSettings((prev) => ({ ...prev, [key]: value }))
      },
      addCampaign: (c) => setCampaigns((prev) => [{ ...c, id: uid() }, ...prev]),
      toggleCampaign: (id) =>
        setCampaigns((prev) => prev.map((x) => (x.id === id ? { ...x, active: !x.active } : x))),
      addOrder: (o) => setOrders((prev) => [{ ...o, id: uid(), time: "الآن" }, ...prev]),
    }),
    [debtors, products, campaigns, orders, settings, notifications, query, isLoading, dataError, user],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function normalizeDigits(input: string): string {
  const easternArabic = "٠١٢٣٤٥٦٧٨٩"
  const persian = "۰۱۲۳۴۵۶۷۸۹"
  return input.replace(/[٠-٩۰-۹]/g, (ch) => {
    const i1 = easternArabic.indexOf(ch)
    if (i1 !== -1) return String(i1)
    const i2 = persian.indexOf(ch)
    if (i2 !== -1) return String(i2)
    return ch
  })
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]
export function toArabicNumber(n: number): string {
  return n
    .toLocaleString("en-US")
    .replace(/,/g, "٬")
    .replace(/\d/g, (d) => arabicDigits[Number(d)])
}
export function formatIQD(n: number): string {
  return `${toArabicNumber(n)} د.ع`
}
