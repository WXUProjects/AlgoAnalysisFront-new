import gsapImport from 'gsap'

/** Normalize CJS/ESM default export under tsx/node vs Vite */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gsap: typeof gsapImport =
  typeof (gsapImport as { to?: unknown }).to === 'function'
    ? gsapImport
    : ((gsapImport as unknown as { default: typeof gsapImport }).default)

export const MOTION = {
  duration: {
    /** ≤300ms UI budget */
    fast: 0.12,
    base: 0.2,
    slow: 0.28,
    overlayIn: 0.26,
    overlayOut: 0.18,
    panelIn: 0.28,
    panelOut: 0.2,
    popoverIn: 0.16,
    popoverOut: 0.12,
    dialogIn: 0.2,
    dialogOut: 0.14,
    tooltipIn: 0.14,
    tooltipOut: 0.1,
    pressIn: 0.08,
    pressOut: 0.14,
    hover: 0.15,
    switch: 0.16,
    sidebar: 0.24,
    tab: 0.16,
    title: 0.12,
  },
  ease: {
    out: 'power2.out',
    in: 'power2.in',
    inOut: 'power2.inOut',
    soft: 'power3.out',
    /** release snap — no bounce on dense dashboard chrome */
    pressOut: 'power2.out',
    /** approx cubic-bezier(0.32, 0.72, 0, 1) */
    sheet: 'power3.out',
    /** exits also ease-out so close feels responsive (never ease-in on UI) */
    sheetOut: 'power2.out',
  },
  y: {
    /** Page enter always rises from below (向上推); direction no longer randomizes axis */
    forward: 8,
    back: 8,
    lateral: 8,
  },
  press: {
    scale: 0.97,
    scaleTab: 0.97,
    scaleLg: 0.98,
    scaleSidebar: 0.98,
    dim: 0.96,
  },
  hover: {
    y: -2,
    scale: 1.03,
    chevronX: 2,
    heatScale: 1.12,
    imageScale: 0.98,
    rotate: 0,
  },
  popover: {
    fromScale: 0.96,
    fromY: 4,
  },
  dialog: {
    fromScale: 0.96,
  },
} as const

export type MotionDirection = 'forward' | 'back' | 'lateral'
export type SheetSide = 'top' | 'right' | 'bottom' | 'left'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** True when the device can hover (skip hover motion on touch) */
export function canHover(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/** 路由信息层级：列表浅、详情深，用于 GSAP 进出方向 */
export function routeDepth(pathname: string): number {
  if (pathname === '/') return 0
  // 详情 / 深层
  if (pathname.startsWith('/question-bank/detail/')) return 3
  if (pathname.startsWith('/contest/') && pathname !== '/contest') return 3
  if (pathname.startsWith('/problemset/') && pathname !== '/problemset') return 3
  if (pathname.startsWith('/profile/') && pathname !== '/profile') return 3
  if (/^\/blog\/[^/]+\/[^/]+/.test(pathname) && !pathname.includes('/manage')) {
    return 4 // 博客文章
  }
  if (/^\/blog\/[^/]+/.test(pathname)) return 3 // 个人博客首页
  if (pathname === '/change-profile' || pathname === '/privacy') return 3
  if (pathname.startsWith('/p/')) return 3
  if (pathname.startsWith('/admin/')) return 2
  if (pathname === '/admin') return 1
  if (
    pathname.startsWith('/contest') ||
    pathname.startsWith('/bulletin') ||
    pathname.startsWith('/discover') ||
    pathname.startsWith('/all-activities') ||
    pathname.startsWith('/question-bank') ||
    pathname.startsWith('/problemset') ||
    pathname.startsWith('/blog-plaza') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/social') ||
    pathname.startsWith('/tools') ||
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

/**
 * Enter offset for page shells. Always the same upward-push feel
 * (content rises from below) — left-tab / forward / back no longer pick different axes.
 */
export function enterOffset(_direction: MotionDirection = 'lateral'): {
  y: number
  x: number
} {
  return { y: MOTION.y.lateral, x: 0 }
}

/** Prefer GPU compositor for route enters (smooth ~60fps under load). */
const GPU_ENTER = { force3D: true as const }

export function killTweens(target: gsap.TweenTarget) {
  gsap.killTweensOf(target)
}

function instantSet(el: Element, vars: gsap.TweenVars) {
  gsap.set(el, { ...vars, clearProps: undefined })
}

/** Radix `data-side` → enter offset so menus open toward their trigger */
function popoverEnterOffset(el: Element): { y: number; x: number } {
  const side = el.getAttribute('data-side')
  const d = MOTION.popover.fromY
  switch (side) {
    case 'top':
      return { y: d, x: 0 }
    case 'bottom':
      return { y: -d, x: 0 }
    case 'left':
      return { y: 0, x: d }
    case 'right':
      return { y: 0, x: -d }
    default:
      return { y: d, x: 0 }
  }
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
  // Transform-only enter (GPU); no opacity dual-fade so it stays sharp at 60fps
  gsap.fromTo(
    el,
    { opacity: 1, y, x, ...GPU_ENTER },
    {
      opacity: 1,
      y: 0,
      x: 0,
      duration: options?.duration ?? MOTION.duration.base,
      delay: options?.delay ?? 0,
      ease: MOTION.ease.soft,
      overwrite: true,
      force3D: true,
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
    {
      opacity: 0,
      y: Math.min(Math.abs(y) + 4, 12) * Math.sign(y || 1),
      force3D: true,
    },
    {
      opacity: 1,
      y: 0,
      duration: options?.duration ?? MOTION.duration.base,
      delay: options?.delay ?? 0.03,
      stagger: options?.stagger ?? 0.04,
      ease: MOTION.ease.soft,
      overwrite: true,
      force3D: true,
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
    { opacity: 0 },
    {
      opacity: 1,
      duration: MOTION.duration.title,
      ease: MOTION.ease.out,
      overwrite: true,
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

/** Side sheet panel slide — bottom sheet uses slightly longer settle (iOS-like) */
export function animatePanelIn(el: Element, side: SheetSide = 'right') {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { x: 0, y: 0, xPercent: 0, yPercent: 0, opacity: 1 })
    return
  }
  const isBottom = side === 'bottom'
  gsap.fromTo(
    el,
    { ...panelFromVars(side), opacity: 1 },
    {
      xPercent: 0,
      yPercent: 0,
      x: 0,
      y: 0,
      opacity: 1,
      // bottom: ~0.36s power3.out ≈ Apple sheet response without bounce
      duration: isBottom ? 0.36 : MOTION.duration.panelIn,
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
  const isBottom = side === 'bottom'
  gsap.to(el, {
    ...panelFromVars(side),
    duration: isBottom ? 0.26 : MOTION.duration.panelOut,
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
    ease: MOTION.ease.out,
    overwrite: true,
  })
}

/** Popover / dropdown / select: zoom + fade from trigger side */
export function animatePopoverIn(el: Element) {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { opacity: 1, scale: 1, y: 0, x: 0 })
    return
  }
  const { y, x } = popoverEnterOffset(el)
  gsap.fromTo(
    el,
    {
      opacity: 0,
      scale: MOTION.popover.fromScale,
      y,
      x,
    },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      x: 0,
      duration: MOTION.duration.popoverIn,
      ease: MOTION.ease.out,
      overwrite: true,
    },
  )
}

export function animatePopoverOut(el: Element) {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { opacity: 0, scale: MOTION.popover.fromScale, y: 0, x: 0 })
    return
  }
  gsap.to(el, {
    opacity: 0,
    scale: MOTION.popover.fromScale,
    duration: MOTION.duration.popoverOut,
    ease: MOTION.ease.out,
    overwrite: true,
  })
}

/** Tooltip: opacity only — high frequency, no travel */
export function animateTooltipIn(el: Element) {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { opacity: 1, scale: 1, y: 0, x: 0 })
    return
  }
  gsap.fromTo(
    el,
    { opacity: 0 },
    {
      opacity: 1,
      duration: MOTION.duration.tooltipIn,
      ease: MOTION.ease.out,
      overwrite: true,
    },
  )
}

export function animateTooltipOut(el: Element) {
  killTweens(el)
  if (prefersReducedMotion()) {
    instantSet(el, { opacity: 0 })
    return
  }
  gsap.to(el, {
    opacity: 0,
    duration: MOTION.duration.tooltipOut,
    ease: MOTION.ease.out,
    overwrite: true,
  })
}

/** Press feedback — scale only (no filter:brightness) */
export function animatePressIn(
  el: Element,
  options?: { scale?: number; dim?: boolean },
) {
  if (prefersReducedMotion()) return
  const scale = options?.scale ?? MOTION.press.scale
  killTweens(el)
  gsap.to(el, {
    scale,
    duration: MOTION.duration.pressIn,
    ease: MOTION.ease.out,
    overwrite: true,
  })
}

export function animatePressOut(el: Element) {
  if (prefersReducedMotion()) {
    gsap.set(el, { clearProps: 'transform', scale: 1 })
    return
  }
  killTweens(el)
  gsap.to(el, {
    scale: 1,
    duration: MOTION.duration.pressOut,
    ease: MOTION.ease.pressOut,
    overwrite: true,
    clearProps: 'transform',
  })
}

/** Hover lift (cards / rows) */
export function animateHoverLiftIn(
  el: Element,
  options?: { y?: number },
) {
  if (prefersReducedMotion() || !canHover()) return
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
  if (prefersReducedMotion() || !canHover()) return
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

/** Tab content enter — opacity only (high frequency) */
export function animateTabContent(el: Element) {
  if (prefersReducedMotion()) {
    gsap.set(el, { clearProps: 'all', opacity: 1, y: 0 })
    return
  }
  killTweens(el)
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

/**
 * Tab indicator pill: snap width/height (no layout tween), animate x/y only.
 */
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
  gsap.set(el, {
    width: rect.width,
    height: rect.height,
    opacity: 1,
  })
  gsap.to(el, {
    x: rect.x,
    y: rect.y,
    duration: MOTION.duration.tab,
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
  kind: 'overlay' | 'panel' | 'dialog' | 'popover' | 'tooltip',
): Record<string, string> {
  const outMs =
    kind === 'overlay'
      ? MOTION.duration.overlayOut * 1000
      : kind === 'panel'
        ? MOTION.duration.panelOut * 1000
        : kind === 'dialog'
          ? MOTION.duration.dialogOut * 1000
          : kind === 'tooltip'
            ? MOTION.duration.tooltipOut * 1000
            : MOTION.duration.popoverOut * 1000
  const inMs =
    kind === 'overlay'
      ? MOTION.duration.overlayIn * 1000
      : kind === 'panel'
        ? MOTION.duration.panelIn * 1000
        : kind === 'dialog'
          ? MOTION.duration.dialogIn * 1000
          : kind === 'tooltip'
            ? MOTION.duration.tooltipIn * 1000
            : MOTION.duration.popoverIn * 1000
  return {
    '--gsap-presence-in-ms': `${Math.round(inMs)}ms`,
    '--gsap-presence-out-ms': `${Math.round(outMs)}ms`,
  }
}
