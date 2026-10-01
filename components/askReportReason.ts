const REASONS = ["احتيال أو نصب", "إزعاج أو تحرش", "محتوى مسيء", "محتوى مخالف أو ممنوع", "سبب آخر"];

// نافذة اختيار سبب البلاغ (بدل prompt)، تُرجع السبب أو null عند الإلغاء
export function askReportReason(): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.dir = "rtl";
    overlay.className =
      "fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center";

    const sheet = document.createElement("div");
    sheet.className =
      "max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-paper p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink md:max-w-sm md:rounded-3xl";

    const title = document.createElement("p");
    title.className = "mb-3 text-sm font-semibold";
    title.textContent = "ما سبب الإبلاغ؟";
    sheet.appendChild(title);

    const done = (v: string | null) => {
      overlay.remove();
      resolve(v);
    };

    REASONS.forEach((r) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mb-2 w-full rounded-pill bg-chip py-2.5 text-sm";
      b.textContent = r;
      b.onclick = () => done(r);
      sheet.appendChild(b);
    });

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "mt-1 w-full py-2 text-sm text-muted";
    cancel.textContent = "إلغاء";
    cancel.onclick = () => done(null);
    sheet.appendChild(cancel);

    overlay.onclick = (e) => {
      if (e.target === overlay) done(null);
    };
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  });
}
