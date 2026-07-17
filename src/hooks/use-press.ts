import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { animatePressIn, animatePressOut, MOTION } from '@/lib/motion'

type PressOptions = {
  /** 按下缩放，默认 MOTION.press.scale */
  scale?: number
  /** 保留 API；亮度压暗已移除（性能） */
  dim?: boolean
}

/** 按下去 / 松手弹回的触感反馈（GSAP，仅 scale） */
export function usePress<T extends HTMLElement = HTMLElement>(
  options: PressOptions = {},
) {
  const { scale = MOTION.press.scale } = options
  const ref = useRef<T | null>(null)
  const pressed = useRef(false)

  const pressIn = useCallback(() => {
    const el = ref.current
    if (!el) return
    pressed.current = true
    animatePressIn(el, { scale })
  }, [scale])

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
