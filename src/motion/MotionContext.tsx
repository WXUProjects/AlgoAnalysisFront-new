import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  resolveDirection,
  type MotionDirection,
} from '@/lib/motion'
import {
  clearSharedElement,
  setVtActive,
  setVtDirection,
  shouldUseViewTransition,
} from '@/lib/view-transition'

type MotionContextValue = {
  pathname: string
  previousPath: string | null
  direction: MotionDirection
  /** True when this navigation should rely on View Transitions (no GSAP page enter) */
  useViewTransition: boolean
}

const MotionContext = createContext<MotionContextValue>({
  pathname: '/',
  previousPath: null,
  direction: 'lateral',
  useViewTransition: false,
})

export function MotionProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const store = useRef({
    path: pathname,
    prev: null as string | null,
    dir: 'lateral' as MotionDirection,
  })

  if (store.current.path !== pathname) {
    store.current = {
      prev: store.current.path,
      path: pathname,
      dir: resolveDirection(store.current.path, pathname),
    }
  }

  const useVt = shouldUseViewTransition()

  // Sync direction onto <html> during the same commit that VT snapshots the new DOM
  useEffect(() => {
    setVtDirection(store.current.dir)
    setVtActive(useVt)
    // Shared names are only needed for the morph frame; clear after paint settles
    const t = window.setTimeout(() => {
      clearSharedElement()
      setVtActive(false)
    }, 450)
    return () => window.clearTimeout(t)
  }, [pathname, useVt])

  const value: MotionContextValue = {
    pathname: store.current.path,
    previousPath: store.current.prev,
    direction: store.current.dir,
    useViewTransition: useVt,
  }

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  )
}

export function useMotion() {
  return useContext(MotionContext)
}
