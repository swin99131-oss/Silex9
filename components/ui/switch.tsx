"use client"

import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  const isSm = size === "sm"
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      dir="ltr"
      className={cn(
        "peer relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none p-[2px]",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isSm ? "h-[18px] w-[30px]" : "h-[22px] w-[38px]",
        "data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-green-500",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm ring-0 transition-transform",
          isSm ? "size-[14px]" : "size-[18px]",
          "data-[state=unchecked]:translate-x-0",
          isSm ? "data-[state=checked]:translate-x-3" : "data-[state=checked]:translate-x-4"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
