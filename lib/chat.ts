import { supabase } from "./supabase";


export type InboxItem = {

conversation_id: string;

partner_id: string;

partner_name: string;

partner_username: string | null;

partner_avatar: string | null;

partner_role: string;

last_message: string | null;

last_at: string | null;

unread: number;

pinned: boolean;

};


export type ChatMessage = {

id: string;

conversation_id: string;

sender_id: string;

content: string;

media_url?: string | null;

media_type?: "image" | "audio" | "video" | "file" | "call" | null;
  call_status?: "completed" | "missed" | "declined" | null;
  call_duration?: number | null;

reply_to_id?: string | null;

meta?: any;

is_pinned?: boolean;

created_at: string;

read_at?: string | null;

};


export async function getInbox(userId: string): Promise<InboxItem[]> {

const { data: convs } = await supabase

.from("conversations")

.select(

`

id,

last_message_at,

customer_id,

merchant_id,

customer_cleared_at,

merchant_cleared_at,

customer_pinned,

merchant_pinned,

customer:profiles!customer_id(id, full_name, username, avatar_url, role, store_name),

merchant:profiles!merchant_id(id, full_name, username, avatar_url, role, store_name)

`

)

.or(`customer_id.eq.${userId},merchant_id.eq.${userId}`)

.order("last_message_at", { ascending: false, nullsFirst: false });


if (!convs) return [];


const items: InboxItem[] = [];

for (const c of convs as any[]) {

const isCustomer = c.customer_id === userId;

const partner = isCustomer ? c.merchant : c.customer;

if (!partner) continue;


const clearedAt = isCustomer ? c.customer_cleared_at : c.merchant_cleared_at;

const pinned = isCustomer ? c.customer_pinned : c.merchant_pinned;


let lastQuery = supabase

.from("messages")

.select("content, created_at")

.eq("conversation_id", c.id)

.order("created_at", { ascending: false })

.limit(1);

if (clearedAt) lastQuery = lastQuery.gt("created_at", clearedAt);

const { data: lastMsg } = await lastQuery.maybeSingle();


if (clearedAt && !lastMsg) continue;


let unreadQuery = supabase

.from("messages")

.select("*", { count: "exact", head: true })

.eq("conversation_id", c.id)

.neq("sender_id", userId)

.is("read_at", null);

if (clearedAt) unreadQuery = unreadQuery.gt("created_at", clearedAt);

const { count: unread } = await unreadQuery;


items.push({

conversation_id: c.id,

partner_id: partner.id,

partner_name: partner.store_name || partner.full_name || partner.username || "مستخدم",

partner_username: partner.username,

partner_avatar: partner.avatar_url,

partner_role: partner.role || "customer",

last_message: lastMsg?.content ?? null,

last_at: lastMsg?.created_at ?? c.last_message_at,

unread: unread ?? 0,

pinned,

});

}


return items.sort((a, b) => Number(b.pinned) - Number(a.pinned));

}


export async function getMessages(convId: string, userId?: string): Promise<ChatMessage[]> {

let query = supabase

.from("messages")

.select("*")

.eq("conversation_id", convId)

.order("created_at", { ascending: true });


if (userId) {

const { data: conv } = await supabase

.from("conversations")

.select("customer_id, customer_cleared_at, merchant_cleared_at")

.eq("id", convId)

.maybeSingle();

if (conv) {

const clearedAt = conv.customer_id === userId ? conv.customer_cleared_at : conv.merchant_cleared_at;

if (clearedAt) query = query.gt("created_at", clearedAt);

}

}


const { data } = await query;

return (data || []) as ChatMessage[];

}


export async function sendMessage(

userId: string,

convId: string,

content: string,

mediaUrl?: string,

mediaType?: "image" | "audio" | "video",

replyToId?: string,

meta?: Record<string, unknown>

) {

if (content.length > 1000) {

throw new Error("الحد الأقصى للرسالة هو 1000 حرف فقط.");

}


const { data, error } = await supabase

.from("messages")

.insert({

conversation_id: convId,

sender_id: userId,

content: content.trim(),

media_url: mediaUrl || null,

media_type: mediaType || null,

reply_to_id: replyToId || null,

meta: meta || null,

})

.select()

.single();


if (error) {

if (error.code === "42501" || error.message?.includes("row-level security")) {

throw new Error("لا يمكنك إرسال رسالة، يبدو أن أحد الطرفين قام بالحظر.");

}

throw error;

}


await supabase

.from("conversations")

.update({ last_message_at: new Date().toISOString() })

.eq("id", convId);


void maybeTriggerAssistant(convId, userId, content.trim());


return data as ChatMessage;

}


export async function deleteMessage(msgId: string, userId: string) {

await supabase.from("messages").delete().eq("id", msgId).eq("sender_id", userId);

}


export async function togglePinMessage(msgId: string, currentPinStatus: boolean) {

await supabase.from("messages").update({ is_pinned: !currentPinStatus }).eq("id", msgId);

}


export async function markAsRead(convId: string, userId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", convId)
    .neq("sender_id", userId)
    .is("read_at", null);
  if (error) console.error("markAsRead failed:", error.message);
}


export function subscribeToMessages(
  convId: string,
  onNewMessage: (msg: ChatMessage) => void,
  onUpdateMessage?: (msg: ChatMessage) => void
) {
  return supabase
    .channel(`chat:${convId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
      (payload) => onNewMessage(payload.new as ChatMessage)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
      (payload) => onUpdateMessage?.(payload.new as ChatMessage)
    )
    .subscribe();
}


export async function createConversation(customerId: string, merchantId: string): Promise<string> {

const { data: existing } = await supabase

.from("conversations")

.select("id")

.or(

`and(customer_id.eq.${customerId},merchant_id.eq.${merchantId}),and(customer_id.eq.${merchantId},merchant_id.eq.${customerId})`

)

.maybeSingle();


if (existing) return existing.id;


const { data, error } = await supabase

.from("conversations")

.insert({ customer_id: customerId, merchant_id: merchantId })

.select("id")

.single();


if (error) throw error;

return data.id;

}


export async function clearConversation(convId: string, userId: string) {

const { data: conv } = await supabase

.from("conversations")

.select("customer_id, merchant_id")

.eq("id", convId)

.maybeSingle();


if (!conv) return;


const field = conv.customer_id === userId ? "customer_cleared_at" : "merchant_cleared_at";

await supabase

.from("conversations")

.update({ [field]: new Date().toISOString() })

.eq("id", convId);

}


export async function togglePinConversation(convId: string, userId: string, pinned: boolean) {

const { data: conv } = await supabase

.from("conversations")

.select("customer_id, merchant_id")

.eq("id", convId)

.maybeSingle();


if (!conv) return;


const field = conv.customer_id === userId ? "customer_pinned" : "merchant_pinned";

await supabase

.from("conversations")

.update({ [field]: pinned })

.eq("id", convId);

}


export async function maybeTriggerAssistant(conversationId: string, senderId: string, content: string, meta?: unknown) {
  try {
    const { data: conv } = await supabase
      .from("conversations")
      .select("customer_id, merchant_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) return;
    if (senderId !== conv.customer_id && senderId !== conv.merchant_id) return;
    if (meta && (meta as any).from_bot) return;

    const recipientId = senderId === conv.customer_id ? conv.merchant_id : conv.customer_id;

    fetch("/api/assistant-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, customerMessage: content, senderId, recipientId }),
    }).catch(() => {});
  } catch {}
}


export async function resumeAssistant(conversationId: string) {

await supabase.from("conversations").update({ ai_muted: false }).eq("id", conversationId);

}


