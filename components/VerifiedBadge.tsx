import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({
  show,
  size = 14,
  className = "",
}: {
  show?: string | boolean | null;
  size?: number;
  className?: string;
}) {
  if (!show) return null;
  return <BadgeCheck size={size} aria-label="حساب موثّق" className={`inline-block shrink-0 text-sky-500 ${className}`} />;
}
