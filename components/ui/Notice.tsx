import { CheckCircle2, XCircle, Info } from "lucide-react";
import type { ReactNode } from "react";

const styles = {
  error: { box: "border-red-200 bg-red-50 text-red-700", Icon: XCircle },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  info: { box: "border-line bg-chip text-ink", Icon: Info },
} as const;

export function Notice({
  type = "error",
  children,
  className = "",
}: {
  type?: keyof typeof styles;
  children: ReactNode;
  className?: string;
}) {
  const { box, Icon } = styles[type];
  return (
    <div role={type === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm ${box} ${className}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
