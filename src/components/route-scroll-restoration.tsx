import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import {
  createScrollPositionStore,
  createRouteScrollKey,
  getScrollAction,
  type ScrollPosition,
  type ScrollPositionStore,
} from '@/lib/route-scroll-restoration'

const defaultStore = createScrollPositionStore()
const MAX_RESTORE_FRAMES = 60
const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
])

function getScroller() {
  return document.querySelector<HTMLElement>('[data-app-scroll-container]')
}

function readPosition(scroller: HTMLElement | null): ScrollPosition {
  return {
    container: scroller?.scrollTop ?? 0,
    window: window.scrollY,
  }
}

function applyPosition(scroller: HTMLElement | null, position: ScrollPosition) {
  if (scroller) scroller.scrollTop = position.container
  window.scrollTo(0, position.window)
}

interface RouteScrollRestorationProps {
  store?: ScrollPositionStore
}

export function RouteScrollRestoration({
  store = defaultStore,
}: RouteScrollRestorationProps) {
  const location = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  useLayoutEffect(() => {
    const scroller = getScroller()
    const key = location.key
    const routeKey = createRouteScrollKey(location.pathname, location.search)
    let suppressSave = true
    const savePosition = () => {
      if (suppressSave) return
      store.set(key, readPosition(scroller))
      store.set(routeKey, readPosition(scroller))
    }

    scroller?.addEventListener('scroll', savePosition, { passive: true })
    window.addEventListener('scroll', savePosition, { passive: true })
    const savedPosition = store.get(key) ?? store.get(routeKey)
    const target = getScrollAction(navigationType, savedPosition) === 'restore'
      ? savedPosition!
      : { container: 0, window: 0 }
    let frame = 0
    let attempts = 0
    let restoring = true
    let waitingForContent = false

    const stopRestoring = () => {
      if (!restoring) return
      restoring = false
      suppressSave = false
      window.cancelAnimationFrame(frame)
    }
    const saveBeforeNavigation = () => {
      savePosition()
      stopRestoring()
    }
    const stopRestoringFromKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) stopRestoring()
    }

    scroller?.addEventListener('wheel', stopRestoring, { passive: true })
    scroller?.addEventListener('touchstart', stopRestoring, { passive: true })
    scroller?.addEventListener('pointerdown', saveBeforeNavigation, { passive: true })
    window.addEventListener('wheel', stopRestoring, { passive: true })
    window.addEventListener('touchstart', stopRestoring, { passive: true })
    window.addEventListener('pointerdown', saveBeforeNavigation, { passive: true })
    window.addEventListener('keydown', stopRestoringFromKey)

    const restore = () => {
      if (!restoring) return
      waitingForContent = false
      applyPosition(scroller, target)
      attempts += 1

      const current = readPosition(scroller)
      const restored =
        current.container === target.container && current.window === target.window
      if (!restored && attempts < MAX_RESTORE_FRAMES) {
        frame = window.requestAnimationFrame(restore)
      } else if (!restored) {
        waitingForContent = true
      } else {
        frame = window.requestAnimationFrame(() => {
          restoring = false
          suppressSave = false
        })
      }
    }

    const retryRestore = () => {
      if (!restoring || !waitingForContent) return
      waitingForContent = false
      attempts = 0
      frame = window.requestAnimationFrame(restore)
    }

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(retryRestore)
    if (scroller) {
      resizeObserver?.observe(scroller)
      resizeObserver?.observe(scroller.firstElementChild ?? scroller)
    }
    const mutationObserver = typeof MutationObserver === 'undefined' || !scroller
      ? null
      : new MutationObserver(retryRestore)
    if (mutationObserver && scroller) {
      mutationObserver.observe(scroller, { childList: true, subtree: true })
    }

    frame = window.requestAnimationFrame(restore)

    return () => {
      window.cancelAnimationFrame(frame)
      scroller?.removeEventListener('scroll', savePosition)
      window.removeEventListener('scroll', savePosition)
      scroller?.removeEventListener('wheel', stopRestoring)
      scroller?.removeEventListener('touchstart', stopRestoring)
      scroller?.removeEventListener('pointerdown', saveBeforeNavigation)
      window.removeEventListener('wheel', stopRestoring)
      window.removeEventListener('touchstart', stopRestoring)
      window.removeEventListener('pointerdown', saveBeforeNavigation)
      window.removeEventListener('keydown', stopRestoringFromKey)
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
    }
  }, [location.key, navigationType, store])

  return null
}
