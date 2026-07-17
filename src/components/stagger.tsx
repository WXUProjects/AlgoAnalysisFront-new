import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useMotion } from '@/motion/MotionContext'
import { animateStagger } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** 子项依次入场；子节点需可直接作为 DOM 子元素 */
export function Stagger({
  children,
  className,
  ready = true,
  stagger = 0.04,
}: {
  children: ReactNode
  className?: string
  ready?: boolean
  stagger?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { direction, pathname } = useMotion()

  useLayoutEffect(() => {
    if (!ready) return
    const root = ref.current
    if (!root) return
    const items = root.querySelectorAll<HTMLElement>(
      ':scope > [data-stagger-item]',
    )
    if (!items.length) return
    animateStagger(items, direction, { stagger })
  }, [ready, direction, pathname, stagger, children])

  return (
    <div ref={ref} className={cn(className)} data-stagger-root="">
      {children}
    </div>
  )
}

export function StaggerItem({
  children,
  className,
  as: Comp = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'li' | 'section' | 'article'
}) {
  return (
    <Comp data-stagger-item="" className={cn(className)}>
      {children}
    </Comp>
  )
}
