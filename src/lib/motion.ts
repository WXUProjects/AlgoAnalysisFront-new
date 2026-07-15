import gsap from 'gsap'

export const MOTION = {
  duration: {
    fast: 0.12,
    base: 0.18,
  },
  ease: {
    out: 'power2.out',
  },
} as const

export type MotionDirection = 'forward' | 'back' | 'lateral'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 路由信息层级：列表浅、详情深 */
export function routeDepth(pathname: string): number {
  if (pathname === '/') return 0
  if (pathname.startsWith('/question-bank/detail/')) return 3
  if (pathname.startsWith('/contest/') && pathname !== '/contest') return 3
  if (pathname === '/change-profile') return 3
  if (pathname.startsWith('/admin/')) return 2
  if (pathname === '/admin') return 1
  if (
    pathname.startsWith('/contest') ||
    pathname.startsWith('/bulletin') ||
    pathname.startsWith('/all-activities') ||
    pathname.startsWith('/question-bank') ||
    pathname.startsWith('/profile') ||
    pathname === '/login' ||
    pathname === '/register'
  ) {
    return 2
  }
  return 1
}

export function resolveDirection(
  from: string | null,
  to: string,
): MotionDirection {
  if (!from || from === to) return 'lateral'
  const dFrom = routeDepth(from)
  const dTo = routeDepth(to)
  if (dTo > dFrom) return 'forward'
  if (dTo < dFrom) return 'back'
  return 'lateral'
}

/** 仅透明度入场，避免 transform 造成滚动层合成开销 */
export function animateEnter(el: HTMLElement) {
  if (prefersReducedMotion()) {
    el.style.opacity = '1'
    return
  }
  gsap.killTweensOf(el)
  gsap.fromTo(
    el,
    { opacity: 0 },
    {
      opacity: 1,
      duration: MOTION.duration.base,
      ease: MOTION.ease.out,
      overwrite: true,
    },
  )
}

export function animateTitle(el: HTMLElement) {
  if (prefersReducedMotion()) {
    el.style.opacity = '1'
    return
  }
  gsap.killTweensOf(el)
  gsap.fromTo(
    el,
    { opacity: 0 },
    {
      opacity: 1,
      duration: MOTION.duration.fast,
      ease: MOTION.ease.out,
      overwrite: true,
    },
  )
}
