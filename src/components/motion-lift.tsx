import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useHoverLift } from '@/hooks/use-hover-motion'

type MotionLiftProps<T extends ElementType = 'div'> = {
  as?: T
  children?: ReactNode
  className?: string
  lift?: boolean
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>

/** Hover lift driven by GSAP (`useHoverLift`). Drop-in for former CSS `.motion-lift`. */
export function MotionLift<T extends ElementType = 'div'>({
  as,
  children,
  className,
  lift = true,
  ...props
}: MotionLiftProps<T>) {
  const Comp = (as ?? 'div') as ElementType
  const { ref, hoverHandlers } = useHoverLift()

  return (
    <Comp
      ref={lift ? ref : undefined}
      className={cn(lift && 'motion-lift', className)}
      {...(lift ? hoverHandlers : null)}
      {...props}
    >
      {children}
    </Comp>
  )
}
