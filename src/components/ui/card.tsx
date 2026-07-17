import * as React from "react"

import { cn } from "@/lib/utils"
import { useHoverLift } from "@/hooks/use-hover-motion"

function Card({
  className,
  lift,
  onPointerEnter,
  onPointerLeave,
  ...props
}: React.ComponentProps<"div"> & {
  /** GSAP hover lift; also auto-enabled when className includes `motion-lift` */
  lift?: boolean
}) {
  const enableLift = lift ?? !!className?.includes("motion-lift")
  const { ref, hoverHandlers } = useHoverLift<HTMLDivElement>()

  return (
    <div
      ref={enableLift ? ref : undefined}
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm transition-[box-shadow,border-color] duration-200 ease-out",
        enableLift && "motion-lift",
        className,
      )}
      onPointerEnter={(e) => {
        if (enableLift) hoverHandlers.onPointerEnter()
        onPointerEnter?.(e)
      }}
      onPointerLeave={(e) => {
        if (enableLift) hoverHandlers.onPointerLeave()
        onPointerLeave?.(e)
      }}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // 不在 border-b 时强行 pb-6：该选择器特异性高于 py-* / pb-*，
        // 会盖掉侧栏等紧凑头的 padding（py-3 写了也仍是 1.5rem）。
        // 需要分隔线时由调用方写 border-b + 明确的 py/pb。
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // 同 Header：勿用 [.border-t]:pt-6 压过调用方的 py-* / pt-*
        "flex items-center px-6",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
