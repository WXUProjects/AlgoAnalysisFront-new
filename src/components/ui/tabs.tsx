"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"
import gsap from "gsap"

import { cn } from "@/lib/utils"
import { prefersReducedMotion } from "@/lib/motion"
import { usePress } from "@/hooks/use-press"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const pillRef = React.useRef<HTMLSpanElement>(null)
  const first = React.useRef(true)

  const movePill = React.useCallback(() => {
    const list = listRef.current
    const pill = pillRef.current
    if (!list || !pill || variant === "line") return

    const active = list.querySelector<HTMLElement>(
      '[data-slot="tabs-trigger"][data-state="active"]',
    )
    if (!active) {
      gsap.set(pill, { opacity: 0 })
      return
    }

    const listRect = list.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    const x = activeRect.left - listRect.left
    const y = activeRect.top - listRect.top
    const w = activeRect.width
    const h = activeRect.height

    if (prefersReducedMotion() || first.current) {
      gsap.set(pill, { x, y, width: w, height: h, opacity: 1 })
      first.current = false
      return
    }

    gsap.to(pill, {
      x,
      y,
      width: w,
      height: h,
      opacity: 1,
      duration: 0.34,
      ease: "power3.out",
      overwrite: true,
    })
  }, [variant])

  React.useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const run = () => requestAnimationFrame(movePill)
    run()

    const mo = new MutationObserver(run)
    mo.observe(list, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-state", "class"],
    })

    const ro = new ResizeObserver(run)
    ro.observe(list)

    return () => {
      mo.disconnect()
      ro.disconnect()
    }
  }, [movePill, children])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {variant !== "line" ? (
        <span
          ref={pillRef}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 z-0 rounded-md bg-background shadow-sm ring-1 ring-border/40 dark:bg-input/40 dark:ring-input"
          style={{ opacity: 0, willChange: "transform,width,height" }}
        />
      ) : null}
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { ref, pressHandlers } = usePress<HTMLButtonElement>({ scale: 0.92 })

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-[calc(100%-1px)] flex-1 origin-center touch-manipulation select-none items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors duration-150 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-foreground",
        "group-data-[variant=line]/tabs-list:bg-transparent",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity after:duration-200 group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      onPointerDown={(e) => {
        pressHandlers.onPointerDown(e)
        onPointerDown?.(e)
      }}
      onPointerUp={(e) => {
        pressHandlers.onPointerUp()
        onPointerUp?.(e)
      }}
      onPointerLeave={(e) => {
        pressHandlers.onPointerLeave()
        onPointerLeave?.(e)
      }}
      onPointerCancel={(e) => {
        pressHandlers.onPointerCancel()
        onPointerCancel?.(e)
      }}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
