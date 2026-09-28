import React from "react";

export function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <div className={`font-bold text-xl tracking-tight text-ink ${className}`}>
      ساليكس
    </div>
  );
}
