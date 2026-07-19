import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useMotion } from '@/motion/MotionContext'
import { animateEnter, prefersReducedMotion } from '@/lib/motion'

/**
 * Layout-level page enter: GSAP upward push on pathname change.
 * Replaces View Transition API (snapshot dual-layer was laggy).
 * First paint is instant; subsequent route changes animate.
 */
export function GsapPageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const skipFirst = useRef(true)
  const { pathname, direction } = useMotion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    if (skipFirst.current) {
      skipFirst.current = false
      return
    }

    if (prefersReducedMotion()) {
      el.style.transform = ''
      el.style.opacity = ''
      return
    }

    // Transform-only enter (GPU) — 180ms keeps route changes snappy at ~60fps
    animateEnter(el, direction, { duration: 0.18 })
  }, [pathname, direction])

  return (
    <div
      ref={ref}
      className="min-w-0 flex-1 will-change-transform"
      data-page-transition=""
    >
      {children}
    </div>
  )
}
