import { useEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'

export function PageShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    gsap.fromTo(
      el,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' },
    )
  }, [])

  return (
    <div ref={ref} className={cn('flex flex-1 flex-col gap-4 p-4', className)}>
      {children}
    </div>
  )
}
