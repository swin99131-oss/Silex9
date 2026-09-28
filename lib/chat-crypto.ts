import { supabase } from "./supabase";

const enc = new TextEncoder();
const dec = new TextDecoder();
const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const bs = (u: Uint8Array) => u as unknown as BufferSource;

// ---------- أدوات ----------
export const b64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
};
export const unb64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// ---------- تخزين المفتاح السري على الجهاز (IndexedDB) ----------
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("salix-chat", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("keys");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet<T>(key: string): Promise<T | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction("keys").objectStore("keys").get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}
async function idbSet(key: string, value: unknown): Promise<void> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("keys", "readwrite");
    tx.objectStore("keys").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbDel(key: string): Promise<void> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("keys", "readwrite");
    tx.objectStore("keys").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- الهوية (زوج المفاتيح) ----------
type Identity = { priv: CryptoKey; pubJwk: JsonWebKey };

export const pubToString = (j: JsonWebKey) =>
  JSON.stringify({ kty: j.kty, crv: j.crv, x: j.x, y: j.y });

const keyCache = new Map<string, CryptoKey>();

async function getLocalIdentity(uid: string): Promise<Identity | null> {
  try {
    return (await idbGet<Identity>(`id:${uid}`)) ?? null;
  } catch {
    return null;
  }
}

async function generateIdentity(): Promise<Identity> {
  const kp = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  const pubJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  return { priv: kp.privateKey, pubJwk };
}

async function publish(uid: string, id: Identity) {
  const { error } = await supabase
    .from("profiles")
    .update({ public_key: pubToString(id.pubJwk) })
    .eq("id", uid);
  if (error) throw error;
}

export type KeyState = "ready" | "create" | "restore" | "conflict";

// ready: جاهز | create: أول مرة | restore: توجد نسخة احتياطية | conflict: مفتاح هذا الجهاز يختلف عن المنشور
export async function keyState(uid: string): Promise<KeyState> {
  const local = await getLocalIdentity(uid);
  if (local) {
    const { data } = await supabase.from("profiles").select("public_key").eq("id", uid).maybeSingle();
    const mine = pubToString(local.pubJwk);
    if (!data?.public_key) {
      await publish(uid, local);
      return "ready";
    }
    return data.public_key === mine ? "ready" : "conflict";
  }
  const { data } = await supabase.from("key_backups").select("user_id").eq("user_id", uid).maybeSingle();
  return data ? "restore" : "create";
}

// إنشاء مفتاح جديد على هذا الجهاز (ويُنشأ معه نسخة احتياطية إن أُعطي رمز)
export async function createIdentity(uid: string, passphrase?: string) {
  const id = await generateIdentity();
  await idbSet(`id:${uid}`, id);
  keyCache.clear();
  await publish(uid, id);
  if (passphrase) await saveBackup(uid, passphrase);
}

// اعتماد مفتاح هذا الجهاز بدل المنشور
export async function adoptThisDevice(uid: string) {
  const local = await getLocalIdentity(uid);
  if (!local) throw new Error("no local key");
  keyCache.clear();
  await publish(uid, local);
}

// حذف المفتاح من هذا الجهاز (عند رغبة المستخدم بمسح بياناته)
export async function wipeLocalIdentity(uid: string) {
  keyCache.clear();
  await idbDel(`id:${uid}`);
}

// ---------- النسخة الاحتياطية المشفّرة برمز المستخدم ----------
async function fromPassphrase(pass: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", bs(enc.encode(pass)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: bs(salt), iterations: 600_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function saveBackup(uid: string, passphrase: string) {
  const id = await getLocalIdentity(uid);
  if (!id) throw new Error("no local key");
  const privJwk = await crypto.subtle.exportKey("jwk", id.priv);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await fromPassphrase(passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bs(iv) },
    key,
    bs(enc.encode(JSON.stringify(privJwk)))
  );
  const { error } = await supabase.from("key_backups").upsert({
    user_id: uid,
    blob: b64(ct),
    salt: b64(salt),
    iv: b64(iv),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function restoreBackup(uid: string, passphrase: string): Promise<boolean> {
  const { data } = await supabase
    .from("key_backups")
    .select("blob, salt, iv")
    .eq("user_id", uid)
    .maybeSingle();
  if (!data) return false;
  try {
    const key = await fromPassphrase(passphrase, unb64(data.salt));
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bs(unb64(data.iv)) },
      key,
      bs(unb64(data.blob))
    );
    const privJwk = JSON.parse(dec.decode(plain)) as JsonWebKey;
    const priv = await crypto.subtle.importKey("jwk", privJwk, ECDH, true, ["deriveBits"]);
    const pubJwk: JsonWebKey = { kty: privJwk.kty, crv: privJwk.crv, x: privJwk.x, y: privJwk.y };
    const id: Identity = { priv, pubJwk };
    await idbSet(`id:${uid}`, id);
    keyCache.clear();
    await publish(uid, id);
    return true;
  } catch {
    return false;
  }
}

// ---------- تشفير الرسائل ----------
export type FileRef = {
  path: string;
  key: string;
  iv: string;
  mime: string;
  size: number;
  dur?: number;
};

export type Payload =
  | { v: 1; t: "text"; text: string }
  | { v: 1; t: "image"; file: FileRef; text?: string }
  | { v: 1; t: "voice"; file: FileRef };

export type Sealed = { ciphertext: string; iv: string; spub: string; rpub: string };

export type Envelope = {
  sender_id: string;
  ciphertext: string | null;
  iv: string | null;
  spub: string | null;
  rpub: string | null;
};

async function sharedKey(uid: string, convId: string, partnerPub: string): Promise<CryptoKey> {
  const ck = `${uid}|${convId}|${partnerPub}`;
  const hit = keyCache.get(ck);
  if (hit) return hit;
  const me = await getLocalIdentity(uid);
  if (!me) throw new Error("no local key");
  const pub = await crypto.subtle.importKey("jwk", JSON.parse(partnerPub) as JsonWebKey, ECDH, false, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: pub }, me.priv, 256);
  const hk = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: bs(enc.encode(convId)),
      info: bs(enc.encode("salix-chat-v1")),
    },
    hk,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  keyCache.set(ck, key);
  return key;
}

// تشفير رسالة إلى الطرف الآخر (partnerPub = مفتاحه العام المنشور)
export async function seal(uid: string, convId: string, partnerPub: string, payload: Payload): Promise<Sealed> {
  const me = await getLocalIdentity(uid);
  if (!me) throw new Error("no local key");
  const key = await sharedKey(uid, convId, partnerPub);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bs(iv), additionalData: bs(enc.encode(convId)) },
    key,
    bs(enc.encode(JSON.stringify(payload)))
  );
  return { ciphertext: b64(ct), iv: b64(iv), spub: pubToString(me.pubJwk), rpub: partnerPub };
}

// فك التشفير: يعيد null إن تعذّر (مفتاح مفقود أو رسالة قديمة)
export async function open(uid: string, convId: string, m: Envelope): Promise<Payload | null> {
  if (!m.ciphertext || !m.iv || !m.spub || !m.rpub) return null;
  try {
    const partner = m.sender_id === uid ? m.rpub : m.spub;
    const key = await sharedKey(uid, convId, partner);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bs(unb64(m.iv)), additionalData: bs(enc.encode(convId)) },
      key,
      bs(unb64(m.ciphertext))
    );
    return JSON.parse(dec.decode(plain)) as Payload;
  } catch {
    return null;
  }
}

// معاينة نصية للقائمة
export const previewOf = (p: Payload | null): string => {
  if (!p) return "🔒 رسالة مشفّرة";
  if (p.t === "text") return p.text.slice(0, 60);
  if (p.t === "image") return p.text ? `📷 ${p.text.slice(0, 50)}` : "📷 صورة";
  return "🎤 رسالة صوتية";
};

// رمز الأمان: يقارنه الطرفان للتأكد من عدم اعتراض المحادثة
export async function safetyCode(myPub: string, theirPub: string): Promise<string> {
  const [a, b] = [myPub, theirPub].sort();
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bs(enc.encode(`${a}|${b}`))));
  let out = "";
  for (let i = 0; i < 15; i++) {
    out += String(((hash[i * 2] << 8) | hash[i * 2 + 1]) % 100).padStart(2, "0");
  }
  return out.replace(/(\d{5})(?=\d)/g, "$1 ");
}

// ---------- الصور والصوت ----------
export async function uploadEncrypted(convId: string, blob: Blob) {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", bs(raw), "AES-GCM", false, ["encrypt"]);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: bs(iv) }, key, await blob.arrayBuffer());
  const path = `${convId}/${crypto.randomUUID()}`;
  const { error } = await supabase.storage
    .from("chat")
    .upload(path, new Blob([ct], { type: "application/octet-stream" }), {
      contentType: "application/octet-stream",
    });
  if (error) throw error;
  return { path, key: b64(raw), iv: b64(iv) };
}

export async function downloadDecrypted(file: FileRef): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from("chat").download(file.path);
  if (error || !data) return null;
  try {
    const key = await crypto.subtle.importKey("raw", bs(unb64(file.key)), "AES-GCM", false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bs(unb64(file.iv)) }, key, await data.arrayBuffer());
    return new Blob([pt], { type: file.mime });
  } catch {
    return null;
  }
}
