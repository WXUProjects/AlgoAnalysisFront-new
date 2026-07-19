/**
 * View Transition API helpers for SPA navigations.
 * Pure enough to unit-test under node:test + jsdom (same pattern as motion.ts).
 */
import {
  prefersReducedMotion,
  type MotionDirection,
} from '@/lib/motion'

/** Document attribute: navigation direction for CSS ::view-transition-* */
export const VT_DIRECTION_ATTR = 'data-vt-direction'

/** Document attribute: "1" while a VT is expected / in flight for this nav */
export const VT_ACTIVE_ATTR = 'data-vt-active'

/** CSS custom property / class mapping for directions */
export const VT_DIRECTION_CLASS: Record<MotionDirection, string> = {
  forward: 'vt-forward',
  back: 'vt-back',
  lateral: 'vt-lateral',
}

/** Stable chrome names — keep sidebar/header from morphing with page content */
export const VT_CHROME = {
  sidebar: 'app-sidebar',
  header: 'app-header',
  main: 'app-main',
} as const

export type SharedKind =
  | 'contest'
  | 'problem'
  | 'user'
  | 'blog'
  | 'problemset'

/** Active shared-element registry (single active pair per kind at a time is fine) */
const activeShared = new Map<SharedKind, string>()

export function supportsViewTransition(
  doc: Document | null | undefined = typeof document !== 'undefined'
    ? document
    : null,
): boolean {
  if (!doc) return false
  return typeof (doc as Document & { startViewTransition?: unknown })
    .startViewTransition === 'function'
}

/**
 * Whether SPA navigations should request a View Transition.
 * Unsupported browsers and reduced-motion users get an instant update.
 */
export function shouldUseViewTransition(
  doc: Document | null | undefined = typeof document !== 'undefined'
    ? document
    : null,
): boolean {
  if (!supportsViewTransition(doc)) return false
  if (prefersReducedMotion()) return false
  return true
}

export type ViewTransitionLike = {
  finished: Promise<void>
  ready: Promise<void>
  updateCallbackDone: Promise<void>
  skipTransition: () => void
}

/**
 * Run `update` inside `document.startViewTransition` when allowed.
 * Always invokes `update` (sync) when VT is unavailable or reduced-motion.
 * Returns the transition object when VT ran, otherwise null.
 */
export function runViewTransition(
  update: () => void | Promise<void>,
  doc: Document | null | undefined = typeof document !== 'undefined'
    ? document
    : null,
): ViewTransitionLike | null {
  if (!shouldUseViewTransition(doc) || !doc) {
    void update()
    return null
  }
  const start = (
    doc as Document & {
      startViewTransition: (
        cb: () => void | Promise<void>,
      ) => ViewTransitionLike
    }
  ).startViewTransition
  try {
    return start.call(doc, update)
  } catch {
    void update()
    return null
  }
}

/** Map direction → attribute value used by CSS selectors */
export function directionToAttr(direction: MotionDirection): string {
  return direction
}

/** Apply direction (+ optional active flag) on <html> for VT CSS */
export function setVtDirection(
  direction: MotionDirection,
  doc: Document | null | undefined = typeof document !== 'undefined'
    ? document
    : null,
): void {
  if (!doc?.documentElement) return
  doc.documentElement.setAttribute(VT_DIRECTION_ATTR, directionToAttr(direction))
  doc.documentElement.classList.remove(
    VT_DIRECTION_CLASS.forward,
    VT_DIRECTION_CLASS.back,
    VT_DIRECTION_CLASS.lateral,
  )
  doc.documentElement.classList.add(VT_DIRECTION_CLASS[direction])
}

export function setVtActive(
  active: boolean,
  doc: Document | null | undefined = typeof document !== 'undefined'
    ? document
    : null,
): void {
  if (!doc?.documentElement) return
  if (active) doc.documentElement.setAttribute(VT_ACTIVE_ATTR, '1')
  else doc.documentElement.removeAttribute(VT_ACTIVE_ATTR)
}

export function clearVtDirection(
  doc: Document | null | undefined = typeof document !== 'undefined'
    ? document
    : null,
): void {
  if (!doc?.documentElement) return
  doc.documentElement.removeAttribute(VT_DIRECTION_ATTR)
  doc.documentElement.classList.remove(
    VT_DIRECTION_CLASS.forward,
    VT_DIRECTION_CLASS.back,
    VT_DIRECTION_CLASS.lateral,
  )
  setVtActive(false, doc)
}

/** Build a stable unique view-transition-name for a shared hero */
export function sharedElementName(kind: SharedKind, id: string | number): string {
  const safe = String(id)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `vt-${kind}-${safe || 'x'}`
}

/** Remember which entity is the active shared hero (click → navigate) */
export function prepareSharedElement(kind: SharedKind, id: string | number): string {
  const name = sharedElementName(kind, id)
  activeShared.set(kind, name)
  return name
}

export function getActiveSharedName(kind: SharedKind): string | null {
  return activeShared.get(kind) ?? null
}

export function isActiveShared(kind: SharedKind, id: string | number): boolean {
  return activeShared.get(kind) === sharedElementName(kind, id)
}

/** Clear one kind or all shared names after transition finishes */
export function clearSharedElement(kind?: SharedKind): void {
  if (kind) activeShared.delete(kind)
  else activeShared.clear()
}

/**
 * Inline style for an element that should morph with its pair.
 * When `activeOnly` is true, only the prepared id gets a real name (list click).
 * Detail pages pass activeOnly=false so the hero is always named.
 */
export function sharedElementStyle(
  kind: SharedKind,
  id: string | number,
  options?: { activeOnly?: boolean },
): { viewTransitionName: string } | undefined {
  if (!shouldUseViewTransition()) return undefined
  const name = sharedElementName(kind, id)
  if (options?.activeOnly && activeShared.get(kind) !== name) {
    return undefined
  }
  return { viewTransitionName: name }
}

/**
 * Options bag for React Router navigate / Link: enable VT when allowed.
 * Pass `viewTransition: false` to opt out of a single navigation.
 */
export function withViewTransition<T extends { viewTransition?: boolean }>(
  opts?: T,
): T & { viewTransition: boolean } {
  const explicit = opts?.viewTransition
  const enabled =
    explicit === false ? false : explicit === true ? true : shouldUseViewTransition()
  return { ...(opts as T), viewTransition: enabled }
}

/** Wrap a data-router navigate so PUSH/REPLACE default to view transitions */
export function wrapNavigateWithViewTransition<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Nav extends (to: any, opts?: any) => any,
>(navigate: Nav): Nav {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = ((to: any, opts?: any) => {
    if (typeof to === 'number') {
      return navigate(to, opts)
    }
    return navigate(to, withViewTransition(opts))
  }) as Nav
  return wrapped
}
