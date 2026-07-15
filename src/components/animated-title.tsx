import { useEffect, useRef } from 'react'
import { animateTitle } from '@/lib/motion'
import { cn } from '@/lib/utils'

export function AnimatedTitle({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    animateTitle(el)
  }, [children])

  return (
    <h1 ref={ref} className={cn(className)}>
      {children}
    </h1>
  )
}
