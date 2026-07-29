import { Suspense, type ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'

export function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <Spinner className="size-6" />
    </div>
  )
}

export function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}
