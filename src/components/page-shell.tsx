import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useMotion } from '@/motion/MotionContext'
import {
  animateEnter,
  animateStagger,
  prefersReducedMotion,
} from '@/lib/motion'
import { cn } from '@/lib/utils'

export function PageShell({
  children,
  className,
  stagger = true,
}: {
  children: ReactNode
  className?: string
  /** 自动对直接子元素做轻微错落入场 */
  stagger?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { direction, pathname } = useMotion()
  const reduced = prefersReducedMotion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    animateEnter(el, direction)

    if (!stagger) return
    const items = el.querySelectorAll<HTMLElement>(
      ':scope > [data-stagger-item], :scope > section, :scope > [data-slot="card"]',
    )
    if (items.length > 1) {
      animateStagger(items, direction, { delay: 0.06, stagger: 0.05 })
    }
  }, [direction, pathname, stagger])

  return (
    <div
      ref={ref}
      className={cn('flex flex-1 flex-col gap-4 p-4', className)}
      data-page-shell=""
      style={reduced ? undefined : { opacity: 0 }}
    >
      {children}
    </div>
  )
}
