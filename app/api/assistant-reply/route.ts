import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function isWithinBotHours(start: string, end: string): boolean {
  const now = new Date()
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  if (startMin <= endMin) return nowMin >= startMin && nowMin <= endMin
  return nowMin >= startMin || nowMin <= endMin // يغطي حالة عبور منتصف الليل
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") ?? ""
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "backend_not_configured" }, { status: 503 })
    }

    const { data: userData } = await supabaseAdmin.auth.getUser(auth.slice(7))
    const caller = userData.user
    if (!caller) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { conversationId, customerMessage, recipientId } = await req.json()
    if (!conversationId || !customerMessage) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 })
    }
    if (String(customerMessage).length > 1000) {
      return NextResponse.json({ error: "الرسالة طويلة جداً" }, { status: 400 })
    }

    const { data: conv } = await supabaseAdmin
      .from("conversations")
      .select("customer_id, merchant_id")
      .eq("id", conversationId)
      .maybeSingle()

    if (!conv) return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 })

    // المتصل نفسه (حسب التوكن) يجب أن يكون طرفاً فعلياً في المحادثة
    if (caller.id !== conv.customer_id && caller.id !== conv.merchant_id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const senderId = caller.id
    if (
      !recipientId ||
      (recipientId !== conv.customer_id && recipientId !== conv.merchant_id) ||
      senderId === recipientId
    ) {
      return NextResponse.json({ error: "أطراف المحادثة غير صحيحة" }, { status: 400 })
    }

    const { data: merchant } = await supabaseAdmin
      .from("profiles")
      .select("store_name, assistant_enabled, assistant_instructions, bot_hours_enabled, bot_hours_start, bot_hours_end")
      .eq("id", recipientId)
      .maybeSingle()

    if (!merchant || !merchant.assistant_enabled) {
      return NextResponse.json({ skipped: "assistant_disabled" })
    }

    if (merchant.bot_hours_enabled && !isWithinBotHours(merchant.bot_hours_start, merchant.bot_hours_end)) {
      return NextResponse.json({ skipped: "outside_hours" })
    }

    const { data: products } = await supabaseAdmin
      .from("products")
      .select("title, price, stock, category")
      .eq("merchant_id", recipientId)
      .gt("stock", 0)
      .limit(50)

    const systemPrompt = `أنت موظف مبيعات حقيقي تعمل لدى متجر "${merchant.store_name || "المتجر"}"، ولست نموذج ذكاء اصطناعي عام.

${merchant.assistant_instructions ? `# قواعد إلزامية من صاحب المتجر (يجب اتباعها حرفيًا مهما كان السؤال):
${merchant.assistant_instructions}
` : "تحدث بأسلوب ودود ومحترف."}

قائمة المنتجات المتوفرة حالياً (اعتمد عليها حصراً، لا تخترع منتجات أو أسعار غير موجودة هنا):
${JSON.stringify(products ?? [])}

قواعد صارمة إضافية:
- أجب فقط بناءً على البيانات أعلاه.
- لو سُئلت عن منتج غير موجود بالقائمة، اعتذر بلباقة وقل إنه غير متوفر حالياً.
- لو الزبون طلب التحدث مع شخص حقيقي، أو كان الطلب معقداً جداً، أو غاضباً، قل بالضبط: "سأحول محادثتك الآن لأحد ممثلي المتجر."
- لا تكتب أكواد برمجية ولا تخرج عن نطاق خدمة هذا المتجر.
- اجعل ردودك مختصرة ومباشرة.`

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json({ error: "ai_key_missing" }, { status: 503 })
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: customerMessage }] }],
        }),
      }
    )

    const geminiData = await geminiRes.json()
    const replyText: string | undefined = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!replyText) {
      console.error("Gemini response error:", JSON.stringify(geminiData))
      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId,
        sender_id: recipientId,
        content: "وصلتنا رسالتك، وسيرد عليك صاحب المتجر بأقرب وقت.",
        meta: { from_bot: true, fallback: true },
      })
      return NextResponse.json({ error: "تعذر توليد رد", fallback: true }, { status: 200 })
    }

    const handover = replyText.includes("سأحول محادثتك الآن لأحد ممثلي المتجر")

    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      sender_id: recipientId,
      content: replyText,
      meta: { from_bot: true },
    })


    return NextResponse.json({ ok: true, handover })
  } catch (err) {
    console.error("assistant-reply error:", err)
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 })
  }
}
