import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useMotion } from '@/motion/MotionContext'
import { animateEnter, prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

export function PageShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
  /** @deprecated 已移除错落动画以减轻卡顿 */
  stagger?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useMotion()
  const reduced = prefersReducedMotion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    animateEnter(el)
  }, [pathname])

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
