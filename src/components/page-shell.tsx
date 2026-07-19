import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useMotion } from '@/motion/MotionContext'
import {
  animateStagger,
  prefersReducedMotion,
} from '@/lib/motion'
import { cn } from '@/lib/utils'

export function PageShell({
  children,
  className,
  /** 默认关闭：路由高频，全量子元素错落会拖慢仪表盘切换 */
  stagger = false,
}: {
  children: ReactNode
  className?: string
  /** 对直接子元素做轻微错落入场（可选，低频页可开） */
  stagger?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { direction, pathname } = useMotion()
  const reduced = prefersReducedMotion()

  // Full-page enter is owned by GsapPageTransition at layout level.
  useLayoutEffect(() => {
    if (!stagger || reduced) return
    const el = ref.current
    if (!el) return
    const items = el.querySelectorAll<HTMLElement>(
      ':scope > [data-stagger-item], :scope > section, :scope > [data-slot="card"]',
    )
    if (items.length > 1) {
      animateStagger(items, direction, { delay: 0.03, stagger: 0.035 })
    }
  }, [direction, pathname, stagger, reduced])

  return (
    <div
      ref={ref}
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6',
        className,
      )}
      data-page-shell=""
    >
      {children}
    </div>
  )
}
