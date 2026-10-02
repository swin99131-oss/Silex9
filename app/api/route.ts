import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const defaultModel = "gemini-2.0-flash"

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? ""
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = admin()
  if (!supabase) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 })
  }

  const { data: userData } = await supabase.auth.getUser(auth.slice(7))
  const caller = userData.user
  if (!caller) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: { conversationId?: string; customerMessage?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 })
  }

  const conversationId = body.conversationId
  const customerMessage = body.customerMessage?.trim()
  if (!conversationId || !customerMessage) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 })
  }
  if (customerMessage.length > 1000) {
    return NextResponse.json({ error: "الرسالة طويلة جداً" }, { status: 400 })
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, customer_id, merchant_id, ai_muted")
    .eq("id", conversationId)
    .maybeSingle()

  if (!conv) return NextResponse.json({ skipped: true, reason: "conversation not found" })

  // يجب أن يكون المتصل طرفاً فعلياً في هذه المحادثة بالذات
  if (caller.id !== conv.customer_id && caller.id !== conv.merchant_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (conv.ai_muted) return NextResponse.json({ skipped: true, reason: "ai muted for this conversation" })

  const { data: merchant } = await supabase
    .from("profiles")
    .select("id, store_name, full_name, assistant_enabled, assistant_instructions")
    .eq("id", conv.merchant_id)
    .maybeSingle()

  if (!merchant?.assistant_enabled) {
    return NextResponse.json({ skipped: true, reason: "assistant disabled" })
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "لم يتم إعداد مفتاح الذكاء الاصطناعي" }, { status: 503 })
  }

  const { data: history } = await supabase
    .from("messages")
    .select("sender_id, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10)

  const { data: products } = await supabase
    .from("products")
    .select("title, price, stock, category")
    .eq("merchant_id", conv.merchant_id)
    .order("created_at", { ascending: false })
    .limit(30)

  const productLines = (products ?? [])
    .map((p) => `- ${p.title} | السعر: ${p.price} | الصنف: ${p.category ?? "غير مصنف"} | متوفر: ${p.stock > 0 ? "نعم (" + p.stock + ")" : "لا، نفد"}`)
    .join("\n")

  const storeName = merchant.store_name || merchant.full_name || "المتجر"
  const customPersonality = merchant.assistant_instructions?.trim()

  const systemInstruction = [
    `أنت المساعد الآلي لمتجر "${storeName}" على منصة تسوق. ترد نيابة عن التاجر على استفسارات الزبائن.`,
    customPersonality ? `أسلوب الرد المطلوب من التاجر: ${customPersonality}` : "أسلوب الرد: ودود ومهني ومختصر.",
    "قائمة منتجات المتجر الحقيقية المتوفرة حاليًا:",
    productLines || "(لا توجد منتجات مسجلة بعد)",
    "",
    "قواعد صارمة يجب الالتزام بها:",
    "- لا تخترع أي منتج أو سعر أو معلومة غير موجودة أعلاه.",
    "- إذا سأل الزبون عن شيء غير موجود بالقائمة، أخبره بأمانة أنه غيرمتوفر حاليًا.",
    "- إذا كان السؤال يحتاج قرار التاجر نفسه (مثل تفاوض على السعر أو شكوى)، اطلب من الزبون الانتظار قليلًا لرد التاجر مباشرة.",
    "- اكتب بالعربية البسيطة المفهومة، بدون أخطاء إملائية، وبإيجاز (لا تطل).",
  ].join("\n")

  const orderedHistory = (history ?? []).slice().reverse()
  const contents = orderedHistory.map((m) => ({
    role: m.sender_id === conv.merchant_id ? "model" : "user",
    parts: [{ text: m.content.slice(0, 1000) }],
  }))
  contents.push({ role: "user", parts: [{ text: customerMessage }] })

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${defaultModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.5, maxOutputTokens: 300 },
        }),
      },
    )

    const result = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      error?: { message?: string }
    }

    if (!response.ok) {
      console.error("Gemini error:", result.error?.message)
      return NextResponse.json({ error: "تعذر توليد الرد" }, { status: 502 })
    }

    const reply = result.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim()
    if (!reply) return NextResponse.json({ error: "لم ينتج ردًا صالحًا" }, { status: 502 })

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: conv.merchant_id,
      content: reply,
      meta: { ai: true },
    })
    if (insertError) throw insertError

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId)

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("assistant-reply failed:", error)
    return NextResponse.json({ error: "تعذر الاتصال بخدمة الذكاء الاصطناعي" }, { status: 502 })
  }
}
