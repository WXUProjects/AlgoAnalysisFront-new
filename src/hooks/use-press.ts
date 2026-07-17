import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { animatePressIn, animatePressOut, MOTION } from '@/lib/motion'

type PressOptions = {
  /** 按下缩放，默认 MOTION.press.scale */
  scale?: number
  /** 按下时略压暗 */
  dim?: boolean
}

/** 按下去 / 松手弹回的触感反馈（GSAP） */
export function usePress<T extends HTMLElement = HTMLElement>(
  options: PressOptions = {},
) {
  const { scale = MOTION.press.scale, dim = true } = options
  const ref = useRef<T | null>(null)
  const pressed = useRef(false)

  const pressIn = useCallback(() => {
    const el = ref.current
    if (!el) return
    pressed.current = true
    animatePressIn(el, { scale, dim })
  }, [scale, dim])

  const pressOut = useCallback(() => {
    const el = ref.current
    if (!el) {
      pressed.current = false
      return
    }
    if (!pressed.current) return
    pressed.current = false
    animatePressOut(el)
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
