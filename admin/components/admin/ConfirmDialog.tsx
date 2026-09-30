'use client'

import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

export function ConfirmDialog({ open, title = 'تأكيد الإجراء', description, confirmLabel = 'تأكيد', onConfirm, onCancel, children }: { open?: boolean; title?: string; description?: string; confirmLabel?: string; onConfirm?: () => void; onCancel?: () => void; children?: ReactNode }) {
  if (!open) return children ?? null
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"><AlertTriangle className="text-destructive" aria-hidden="true" /><h2 className="mt-4 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{description}</p><div className="mt-6 flex justify-start gap-2"><button className="rounded-md border px-4 py-2 text-sm" onClick={onCancel}>إلغاء</button><button className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground" onClick={onConfirm}>{confirmLabel}</button></div></div></div>
}

export default ConfirmDialog
