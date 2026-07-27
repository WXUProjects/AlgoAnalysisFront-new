import { useEffect, useRef, type RefObject } from 'react'

export type StickyPinOptions = {
  /** 贴顶时距滚动视口顶部的间距（px） */
  offsetTop?: number
  /** 贴底时距滚动视口底部的间距（px） */
  offsetBottom?: number
  /** 实际滚动容器；默认 AppLayout 的 main */
  scrollSelector?: string
  /** false 时不启用（例如移动端 hidden） */
  enabled?: boolean
}

/**
 * 方向感知的 sticky 侧栏：不建嵌套滚动条。
 *
 * - 侧栏高度 ≤ 视口：始终 `top = offsetTop`（普通 sticky）
 * - 侧栏更高：主列表下滚时 top 随滚动变负直至贴底；上滚时 top 回升直至贴顶
 *
 * 这样整页只有一个滚动轴，左右栏内容靠主滚动自然露出来，避免
 * 「中间滚完了还要进左右栏各自滚」的割裂感。
 */
export function useStickyPin<T extends HTMLElement>(
  options: StickyPinOptions = {},
): RefObject<T | null> {
  const {
    offsetTop = 16,
    offsetBottom = 16,
    scrollSelector = '[data-app-scroll-container]',
    enabled = true,
  } = options

  const ref = useRef<T | null>(null)
  const topRef = useRef(offsetTop)
  const lastScrollRef = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) {
      if (el) el.style.top = ''
      return
    }

    const scroller = document.querySelector<HTMLElement>(scrollSelector)
    if (!scroller) return

    let raf = 0

    const apply = () => {
      // display:none / 未布局时跳过
      if (el.offsetParent === null && el.offsetHeight === 0) return

      const viewH = scroller.clientHeight
      const sideH = el.offsetHeight
      if (viewH <= 0 || sideH <= 0) return

      const maxTop = offsetTop
      // 侧栏比视口高时为负：贴底可见底部内容
      const minTop = Math.min(offsetTop, viewH - sideH - offsetBottom)

      if (sideH + offsetTop + offsetBottom <= viewH) {
        if (topRef.current !== maxTop) {
          topRef.current = maxTop
          el.style.top = `${maxTop}px`
        }
        return
      }

      const scroll = scroller.scrollTop
      const delta = scroll - lastScrollRef.current
      lastScrollRef.current = scroll

      if (delta === 0) {
        // 仅尺寸变化：把当前 top 夹回合法区间
        const clamped = Math.max(minTop, Math.min(maxTop, topRef.current))
        if (clamped !== topRef.current) {
          topRef.current = clamped
          el.style.top = `${clamped}px`
        }
        return
      }

      // 与主滚动等速反向移动 top，触顶/触底后钉住 → 无跳跃的「跟滚再钉住」
      const next = Math.max(minTop, Math.min(maxTop, topRef.current - delta))
      if (next !== topRef.current) {
        topRef.current = next
        el.style.top = `${next}px`
      }
    }

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        apply()
      })
    }

    topRef.current = offsetTop
    lastScrollRef.current = scroller.scrollTop
    el.style.top = `${offsetTop}px`
    apply()

    scroller.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(() => {
      apply()
    })
    ro.observe(el)
    ro.observe(scroller)

    return () => {
      scroller.removeEventListener('scroll', onScroll)
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
      el.style.top = ''
    }
  }, [enabled, offsetBottom, offsetTop, scrollSelector])

  return ref
}
