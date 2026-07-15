import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 保留 API，不再做 JS 动画（避免列表卡顿） */
export function Stagger({
  children,
  className,
}: {
  children: ReactNode
  className?: string
  ready?: boolean
  stagger?: number
}) {
  return (
    <div className={cn(className)} data-stagger-root="">
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
