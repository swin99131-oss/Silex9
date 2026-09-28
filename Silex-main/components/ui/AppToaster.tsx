"use client";

import { Toaster } from "sonner";
import { CheckCircle2, XCircle, Info, TriangleAlert } from "lucide-react";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      dir="rtl"
      icons={{
        success: <CheckCircle2 size={18} className="text-emerald-600" />,
        error: <XCircle size={18} className="text-red-600" />,
        info: <Info size={18} className="text-ink" />,
        warning: <TriangleAlert size={18} className="text-amber-600" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm font-medium text-ink shadow-float",
          title: "text-sm font-semibold",
          description: "text-xs text-muted",
          actionButton: "rounded-pill bg-ink px-3 py-1 text-xs text-white",
          cancelButton: "rounded-pill bg-chip px-3 py-1 text-xs text-ink",
        },
      }}
    />
  );
}
