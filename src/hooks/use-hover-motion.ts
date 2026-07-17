import { useCallback, useRef } from 'react'
import {
  animateHoverLiftIn,
  animateHoverLiftOut,
  animateHoverTransformIn,
  animateHoverTransformOut,
  canHover,
  MOTION,
} from '@/lib/motion'

/** Card / row hover lift via GSAP (fine pointer only) */
export function useHoverLift<T extends Element = HTMLElement>(
  options?: { y?: number },
) {
  const ref = useRef<T | null>(null)
  const y = options?.y ?? MOTION.hover.y

  const onPointerEnter = useCallback(() => {
    if (!canHover()) return
    const el = ref.current
    if (el) animateHoverLiftIn(el, { y })
  }, [y])

  const onPointerLeave = useCallback(() => {
    const el = ref.current
    if (el) animateHoverLiftOut(el)
  }, [])

  return {
    ref,
    hoverHandlers: {
      onPointerEnter,
      onPointerLeave,
    },
  }
}

/** Generic hover transform (scale / x / rotation) — fine pointer only */
export function useHoverTransform<T extends Element = HTMLElement>(
  vars: { scale?: number; x?: number; y?: number; rotation?: number },
) {
  const ref = useRef<T | null>(null)

  const onPointerEnter = useCallback(() => {
    if (!canHover()) return
    const el = ref.current
    if (el) animateHoverTransformIn(el, vars)
  }, [vars.scale, vars.x, vars.y, vars.rotation])

  const onPointerLeave = useCallback(() => {
    const el = ref.current
    if (el) animateHoverTransformOut(el)
  }, [])

  return {
    ref,
    hoverHandlers: {
      onPointerEnter,
      onPointerLeave,
    },
  }
}
