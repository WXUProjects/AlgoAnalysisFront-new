import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import gsap from 'gsap'
import { prefersReducedMotion } from '@/lib/motion'

type PressOptions = {
  /** 按下缩放，默认 0.94 */
  scale?: number
  /** 按下时略压暗 */
  dim?: boolean
}

/** 按下去 / 松手弹回的触感反馈 */
export function usePress<T extends HTMLElement = HTMLElement>(
  options: PressOptions = {},
) {
  const { scale = 0.94, dim = true } = options
  const ref = useRef<T | null>(null)
  const pressed = useRef(false)

  const pressIn = useCallback(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    pressed.current = true
    gsap.killTweensOf(el)
    gsap.to(el, {
      scale,
      ...(dim ? { filter: 'brightness(0.92)' } : null),
      duration: 0.08,
      ease: 'power2.out',
      overwrite: true,
    })
  }, [scale, dim])

  const pressOut = useCallback(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) {
      pressed.current = false
      return
    }
    if (!pressed.current) return
    pressed.current = false
    gsap.killTweensOf(el)
    gsap.to(el, {
      scale: 1,
      filter: 'brightness(1)',
      duration: 0.32,
      ease: 'back.out(2.4)',
      overwrite: true,
      clearProps: 'transform,filter',
    })
  }, [])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (e.button !== 0) return
      pressIn()
    },
    [pressIn],
  )

  const onPointerUp = useCallback(() => {
    pressOut()
  }, [pressOut])

  const onPointerLeave = useCallback(() => {
    pressOut()
  }, [pressOut])

  const onPointerCancel = useCallback(() => {
    pressOut()
  }, [pressOut])

  return {
    ref,
    pressHandlers: {
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
    },
  }
}
