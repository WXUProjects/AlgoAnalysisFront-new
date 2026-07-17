import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type Ref,
  type RefCallback,
} from 'react'

type PresenceHandlers = {
  onOpen: (el: Element) => void
  onClose: (el: Element) => void
}

/**
 * Drive GSAP enter/exit from Radix `data-state` ("open" | "closed").
 * Pair with `GSAP_PRESENCE_CLASS` so Radix Presence waits for exit duration.
 */
export function useGsapPresence<T extends HTMLElement = HTMLElement>(
  handlers: PresenceHandlers,
): { ref: RefCallback<T> } {
  const [node, setNode] = useState<T | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const prevState = useRef<string | null>(null)

  const ref = useCallback<RefCallback<T>>((el) => {
    setNode(el)
  }, [])

  useLayoutEffect(() => {
    if (!node) return
    prevState.current = null

    const apply = (state: string | null) => {
      if (!state || state === prevState.current) return
      const was = prevState.current
      prevState.current = state
      if (state === 'open') {
        handlersRef.current.onOpen(node)
      } else if (state === 'closed' && was === 'open') {
        handlersRef.current.onClose(node)
      }
    }

    const initial = node.getAttribute('data-state')
    if (initial === 'open') {
      apply('open')
    } else {
      prevState.current = initial
    }

    const mo = new MutationObserver(() => {
      apply(node.getAttribute('data-state'))
    })
    mo.observe(node, { attributes: true, attributeFilter: ['data-state'] })
    return () => mo.disconnect()
  }, [node])

  return { ref }
}

/** Merge a callback ref with an optional external ref */
export function composeRefs<T>(
  ...refs: Array<Ref<T> | undefined | null>
): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') {
        ref(node)
      } else {
        ;(ref as MutableRefObject<T | null>).current = node
      }
    }
  }
}
