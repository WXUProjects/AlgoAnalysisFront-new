import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  resolveDirection,
  type MotionDirection,
} from '@/lib/motion'

type MotionContextValue = {
  pathname: string
  previousPath: string | null
  direction: MotionDirection
}

const MotionContext = createContext<MotionContextValue>({
  pathname: '/',
  previousPath: null,
  direction: 'lateral',
})

/**
 * Tracks pathname depth → enter direction for GSAP page shells.
 * View Transitions are not used; route motion is GSAP-only.
 */
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

  const value: MotionContextValue = {
    pathname: store.current.path,
    previousPath: store.current.prev,
    direction: store.current.dir,
  }

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  )
}

export function useMotion() {
  return useContext(MotionContext)
}
