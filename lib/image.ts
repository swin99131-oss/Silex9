import { supabase } from "@/lib/supabase";

// تصغير الصورة قبل الرفع لتسريع الموقع على الجوال
export async function compressImage(file: File, max = 1080, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("compress failed"))), "image/jpeg", quality)
  );
}

// قصّ مربع من المنتصف بحجم ثابت للصورة الشخصية
async function squareImage(file: File, size = 512, quality = 0.85): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height);
  const sx = (bmp.width - s) / 2;
  const sy = (bmp.height - s) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.getContext("2d")!.drawImage(bmp, sx, sy, s, s, 0, 0, size, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("avatar failed"))), "image/jpeg", quality)
  );
}

export async function uploadCover(file: File, uid: string): Promise<string> {
  const blob = await compressImage(file);
  const path = `${uid}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("covers")
    .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
}

export async function uploadAvatar(file: File, uid: string): Promise<string> {
  const blob = await squareImage(file);
  const path = `${uid}/avatar-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("covers")
    .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
}

// حذف ملف قديم من التخزين انطلاقاً من رابطه العام (لا يفعل شيئاً لروابط خارجية)
export async function removeStoredFile(url: string | null | undefined) {
  if (!url) return;
  const i = url.indexOf("/covers/");
  if (i === -1) return;
  await supabase.storage.from("covers").remove([url.slice(i + "/covers/".length)]);
}
