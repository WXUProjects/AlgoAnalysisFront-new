import gsapImport from 'gsap'

/** Normalize CJS/ESM default export under tsx/node vs Vite */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gsap: typeof gsapImport =
  typeof (gsapImport as { to?: unknown }).to === 'function'
    ? gsapImport
    : ((gsapImport as unknown as { default: typeof gsapImport }).default)

export const MOTION = {
  duration: {
    fast: 0.18,
    base: 0.32,
    slow: 0.45,
    overlayIn: 0.38,
    overlayOut: 0.26,
    panelIn: 0.42,
    panelOut: 0.28,
    popoverIn: 0.18,
    popoverOut: 0.14,
    dialogIn: 0.22,
    dialogOut: 0.16,
    pressIn: 0.08,
    pressOut: 0.32,
    hover: 0.2,
    switch: 0.2,
    sidebar: 0.3,
  },
  ease: {
    out: 'power2.out',
    in: 'power2.in',
    inOut: 'power2.inOut',
    soft: 'power3.out',
    pressOut: 'back.out(2.4)',
    /** approx cubic-bezier(0.32, 0.72, 0, 1) */
    sheet: 'power3.out',
    sheetOut: 'power2.in',
  },
  y: {
    forward: 16,
    back: -12,
    lateral: 10,
  },
  press: {
    scale: 0.94,
    scaleTab: 0.92,
    scaleLg: 0.96,
    scaleSidebar: 0.98,
    dim: 0.92,
  },
  hover: {
    y: -2,
    scale: 1.05,
    chevronX: 2,
    heatScale: 1.5,
    imageScale: 0.98,
    rotate: 45,
  },
  popover: {
    fromScale: 0.95,
    fromY: 6,
  },
  dialog: {
    fromScale: 0.95,
  },
} as const

export type MotionDirection = 'forward' | 'back' | 'lateral'
export type SheetSide = 'top' | 'right' | 'bottom' | 'left'

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

function instantSet(el: Element, vars: gsap.TweenVars) {
  gsap.set(el, { ...vars, clearProps: undefined })
}

export function animateEnter(
  el: Element,
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
  elements: Element[] | NodeListOf<Element>,
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

export function animateTitle(el: Element) {
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

/** Overlay scrim fade */
export function animateOverlayIn(el: Element) {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { opacity: 1 })
    return
  }
  gsap.fromTo(
    el,
    { opacity: 0 },
    {
      opacity: 1,
      duration: MOTION.duration.overlayIn,
      ease: MOTION.ease.sheet,
      overwrite: true,
    },
  )
}

export function animateOverlayOut(el: Element) {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { opacity: 0 })
    return
  }
  gsap.to(el, {
    opacity: 0,
    duration: MOTION.duration.overlayOut,
    ease: MOTION.ease.sheetOut,
    overwrite: true,
  })
}

function panelFromVars(side: SheetSide): gsap.TweenVars {
  switch (side) {
    case 'left':
      return { xPercent: -100, yPercent: 0, x: 0, y: 0 }
    case 'right':
      return { xPercent: 100, yPercent: 0, x: 0, y: 0 }
    case 'top':
      return { yPercent: -100, xPercent: 0, x: 0, y: 0 }
    case 'bottom':
      return { yPercent: 100, xPercent: 0, x: 0, y: 0 }
  }
}

/** Side sheet panel slide */
export function animatePanelIn(el: Element, side: SheetSide = 'right') {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { x: 0, y: 0, xPercent: 0, yPercent: 0, opacity: 1 })
    return
  }
  gsap.fromTo(
    el,
    { ...panelFromVars(side), opacity: 1 },
    {
      xPercent: 0,
      yPercent: 0,
      x: 0,
      y: 0,
      opacity: 1,
      duration: MOTION.duration.panelIn,
      ease: MOTION.ease.sheet,
      overwrite: true,
    },
  )
}

export function animatePanelOut(el: Element, side: SheetSide = 'right') {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { ...panelFromVars(side), opacity: 1 })
    return
  }
  gsap.to(el, {
    ...panelFromVars(side),
    duration: MOTION.duration.panelOut,
    ease: MOTION.ease.sheetOut,
    overwrite: true,
  })
}

/** Centered dialog: scale + fade (keeps xPercent/yPercent -50 for centering) */
export function animateDialogIn(el: Element) {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, {
      opacity: 1,
      scale: 1,
      xPercent: -50,
      yPercent: -50,
    })
    return
  }
  gsap.fromTo(
    el,
    {
      opacity: 0,
      scale: MOTION.dialog.fromScale,
      xPercent: -50,
      yPercent: -50,
    },
    {
      opacity: 1,
      scale: 1,
      xPercent: -50,
      yPercent: -50,
      duration: MOTION.duration.dialogIn,
      ease: MOTION.ease.soft,
      overwrite: true,
    },
  )
}

export function animateDialogOut(el: Element) {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, {
      opacity: 0,
      scale: MOTION.dialog.fromScale,
      xPercent: -50,
      yPercent: -50,
    })
    return
  }
  gsap.to(el, {
    opacity: 0,
    scale: MOTION.dialog.fromScale,
    xPercent: -50,
    yPercent: -50,
    duration: MOTION.duration.dialogOut,
    ease: MOTION.ease.in,
    overwrite: true,
  })
}

/** Popover / dropdown / select / tooltip: zoom + fade */
export function animatePopoverIn(el: Element) {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { opacity: 1, scale: 1, y: 0 })
    return
  }
  gsap.fromTo(
    el,
    {
      opacity: 0,
      scale: MOTION.popover.fromScale,
      y: MOTION.popover.fromY,
    },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: MOTION.duration.popoverIn,
      ease: MOTION.ease.out,
      overwrite: true,
    },
  )
}

export function animatePopoverOut(el: Element) {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { opacity: 0, scale: MOTION.popover.fromScale, y: 0 })
    return
  }
  gsap.to(el, {
    opacity: 0,
    scale: MOTION.popover.fromScale,
    duration: MOTION.duration.popoverOut,
    ease: MOTION.ease.in,
    overwrite: true,
  })
}

/** Press feedback */
export function animatePressIn(
  el: Element,
  options?: { scale?: number; dim?: boolean },
) {
  if (prefersReducedMotion()) return
  const scale = options?.scale ?? MOTION.press.scale
  const dim = options?.dim ?? true
  killTweens(el)
  gsap.to(el, {
    scale,
    ...(dim ? { filter: `brightness(${MOTION.press.dim})` } : null),
    duration: MOTION.duration.pressIn,
    ease: MOTION.ease.out,
    overwrite: true,
  })
}

export function animatePressOut(el: Element) {
  if (prefersReducedMotion()) {
    gsap.set(el, { clearProps: 'transform,filter', scale: 1 })
    return
  }
  killTweens(el)
  gsap.to(el, {
    scale: 1,
    filter: 'brightness(1)',
    duration: MOTION.duration.pressOut,
    ease: MOTION.ease.pressOut,
    overwrite: true,
    clearProps: 'transform,filter',
  })
}

/** Hover lift (cards / rows) */
export function animateHoverLiftIn(
  el: Element,
  options?: { y?: number },
) {
  if (prefersReducedMotion()) return
  killTweens(el)
  gsap.to(el, {
    y: options?.y ?? MOTION.hover.y,
    duration: MOTION.duration.hover,
    ease: MOTION.ease.out,
    overwrite: 'auto',
  })
}

export function animateHoverLiftOut(el: Element) {
  if (prefersReducedMotion()) {
    gsap.set(el, { clearProps: 'transform', y: 0 })
    return
  }
  killTweens(el)
  gsap.to(el, {
    y: 0,
    duration: MOTION.duration.hover,
    ease: MOTION.ease.out,
    overwrite: 'auto',
    clearProps: 'transform',
  })
}

/** Generic transform hover (scale / x / rotate) */
export function animateHoverTransformIn(
  el: Element,
  vars: { scale?: number; x?: number; y?: number; rotation?: number },
) {
  if (prefersReducedMotion()) return
  killTweens(el)
  gsap.to(el, {
    ...vars,
    duration: MOTION.duration.hover,
    ease: MOTION.ease.out,
    overwrite: 'auto',
  })
}

export function animateHoverTransformOut(el: Element) {
  if (prefersReducedMotion()) {
    gsap.set(el, { clearProps: 'transform', scale: 1, x: 0, y: 0, rotation: 0 })
    return
  }
  killTweens(el)
  gsap.to(el, {
    scale: 1,
    x: 0,
    y: 0,
    rotation: 0,
    duration: MOTION.duration.hover,
    ease: MOTION.ease.out,
    overwrite: 'auto',
    clearProps: 'transform',
  })
}

/** Switch thumb travel */
export function animateSwitchThumb(
  el: Element,
  checked: boolean,
  travelPx: number,
) {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { x: checked ? travelPx : 0 })
    return
  }
  gsap.to(el, {
    x: checked ? travelPx : 0,
    duration: MOTION.duration.switch,
    ease: MOTION.ease.out,
    overwrite: true,
  })
}

/** Tab content enter (shared tokens) */
export function animateTabContent(el: Element) {
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
      duration: MOTION.duration.base - 0.04,
      ease: MOTION.ease.out,
      overwrite: true,
      clearProps: 'transform',
    },
  )
}

/** Tab indicator pill */
export function animateTabPill(
  el: Element,
  rect: { x: number; y: number; width: number; height: number },
  options?: { instant?: boolean },
) {
  killTweens(el)
  if (prefersReducedMotion() || options?.instant) {
    gsap.set(el, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      opacity: 1,
    })
    return
  }
  gsap.to(el, {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    opacity: 1,
    duration: MOTION.duration.base + 0.02,
    ease: MOTION.ease.soft,
    overwrite: true,
  })
}

/**
 * CSS class name that holds Radix Presence open/close long enough for GSAP exit.
 * Visual opacity/transform are owned by GSAP (inline styles win over this hold).
 */
export const GSAP_PRESENCE_CLASS = 'gsap-presence'

/** Set CSS vars so presence-hold duration ≥ GSAP exit */
export function presenceStyleVars(
  kind: 'overlay' | 'panel' | 'dialog' | 'popover',
): Record<string, string> {
  const outMs =
    kind === 'overlay'
      ? MOTION.duration.overlayOut * 1000
      : kind === 'panel'
        ? MOTION.duration.panelOut * 1000
        : kind === 'dialog'
          ? MOTION.duration.dialogOut * 1000
          : MOTION.duration.popoverOut * 1000
  const inMs =
    kind === 'overlay'
      ? MOTION.duration.overlayIn * 1000
      : kind === 'panel'
        ? MOTION.duration.panelIn * 1000
        : kind === 'dialog'
          ? MOTION.duration.dialogIn * 1000
          : MOTION.duration.popoverIn * 1000
  return {
    '--gsap-presence-in-ms': `${Math.round(inMs)}ms`,
    '--gsap-presence-out-ms': `${Math.round(outMs)}ms`,
  }
}
