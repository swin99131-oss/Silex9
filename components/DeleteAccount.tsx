"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BUCKETS = ["avatars", "profiles", "covers", "chat", "posts", "stories", "product-images"];
const CONFIRM_WORD = "حذف";

// حذف ملفات المستخدم من التخزين (أفضل جهد: المجلد الرئيسي باسم المستخدم)
async function removeMyFiles(uid: string) {
  for (const bucket of BUCKETS) {
    try {
      for (let i = 0; i < 20; i++) {
        const { data, error } = await supabase.storage.from(bucket).list(uid, { limit: 100 });
        if (error || !data || data.length === 0) break;
        const paths = data.filter((f) => f.id).map((f) => `${uid}/${f.name}`);
        if (paths.length === 0) break;
        const { error: rmErr } = await supabase.storage.from(bucket).remove(paths);
        if (rmErr) break;
      }
    } catch {
      /* نكمل بقية الحاويات */
    }
  }
}

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("no user");

      const { data: blocked, error: chkErr } = await supabase.rpc("account_deletion_blocked");
      if (chkErr) throw chkErr;
      if (blocked) {
        toast.error("لا يمكن حذف الحساب لوجود سجلات دفع مرتبطة به، تواصل مع الدعم");
        return;
      }

      await removeMyFiles(uid);

      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;

      try {
        localStorage.removeItem("silex:cart");
      } catch {}
      await supabase.auth.signOut();
      toast.success("تم حذف حسابك");
      router.replace("/onboarding");
    } catch (e) {
      console.error(e);
      toast.error("تعذّر حذف الحساب، حاول مجدداً");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setText("");
          setOpen(true);
        }}
        className="mx-auto flex items-center gap-1.5 py-2 text-xs text-red-600"
      >
        <Trash2 size={13} />
        حذف الحساب
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-right">
            <DialogTitle>حذف الحساب نهائياً</DialogTitle>
            <DialogDescription>
              سيتم حذف حسابك وكل منشوراتك وقصصك ومحادثاتك، وللتجار أيضاً المنتجات والطلبات ودفتر الديون والإعلانات. لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <p className="text-xs text-muted">للتأكيد اكتب كلمة: {CONFIRM_WORD}</p>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={CONFIRM_WORD}
              className="w-full rounded-2xl bg-chip px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-ink/20"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="rounded-pill border border-line px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={busy || text.trim() !== CONFIRM_WORD}
              onClick={run}
              className="rounded-pill bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "جارٍ الحذف..." : "حذف حسابي"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
