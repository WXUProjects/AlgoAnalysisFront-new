import gsap from 'gsap'

export const MOTION = {
  duration: {
    fast: 0.18,
    base: 0.32,
    slow: 0.45,
  },
  ease: {
    out: 'power2.out',
    inOut: 'power2.inOut',
    soft: 'power3.out',
  },
  y: {
    forward: 16,
    back: -12,
    lateral: 10,
  },
} as const

export type MotionDirection = 'forward' | 'back' | 'lateral'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 路由信息层级：列表浅、详情深，用于进出方向 */
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
    pathname.startsWith('/discover') ||
    pathname.startsWith('/all-activities') ||
    pathname.startsWith('/question-bank') ||
    pathname.startsWith('/profile') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password'
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

export function enterOffset(direction: MotionDirection): { y: number; x: number } {
  switch (direction) {
    case 'forward':
      return { y: MOTION.y.forward, x: 0 }
    case 'back':
      return { y: MOTION.y.back, x: 0 }
    default:
      return { y: MOTION.y.lateral, x: 0 }
  }
}

export function killTweens(target: gsap.TweenTarget) {
  gsap.killTweensOf(target)
}

export function animateEnter(
  el: HTMLElement,
  direction: MotionDirection = 'lateral',
  options?: { duration?: number; delay?: number },
) {
  if (prefersReducedMotion()) {
    gsap.set(el, { clearProps: 'all', opacity: 1, x: 0, y: 0 })
    return
  }
  const { y, x } = enterOffset(direction)
  killTweens(el)
  gsap.fromTo(
    el,
    { opacity: 0, y, x },
    {
      opacity: 1,
      y: 0,
      x: 0,
      duration: options?.duration ?? MOTION.duration.base,
      delay: options?.delay ?? 0,
      ease: MOTION.ease.soft,
      overwrite: true,
      clearProps: 'transform',
    },
  )
}

export function animateStagger(
  elements: HTMLElement[] | NodeListOf<Element>,
  direction: MotionDirection = 'lateral',
  options?: { duration?: number; stagger?: number; delay?: number },
) {
  const list = Array.from(elements)
  if (!list.length) return
  if (prefersReducedMotion()) {
    gsap.set(list, { clearProps: 'all', opacity: 1, y: 0, x: 0 })
    return
  }
  const { y } = enterOffset(direction)
  killTweens(list)
  gsap.fromTo(
    list,
    { opacity: 0, y: Math.min(y + 6, 20) },
    {
      opacity: 1,
      y: 0,
      duration: options?.duration ?? MOTION.duration.base,
      delay: options?.delay ?? 0.05,
      stagger: options?.stagger ?? 0.05,
      ease: MOTION.ease.soft,
      overwrite: true,
      clearProps: 'transform',
    },
  )
}

export function animateTitle(el: HTMLElement) {
  if (prefersReducedMotion()) {
    gsap.set(el, { clearProps: 'all', opacity: 1, y: 0 })
    return
  }
  killTweens(el)
  gsap.fromTo(
    el,
    { opacity: 0, y: 8 },
    {
      opacity: 1,
      y: 0,
      duration: MOTION.duration.fast,
      ease: MOTION.ease.out,
      overwrite: true,
      clearProps: 'transform',
    },
  )
}
