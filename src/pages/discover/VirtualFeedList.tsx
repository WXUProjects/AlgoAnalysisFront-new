import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { FeedCard, FeedCardSkeleton } from './FeedCard'
import type { DiscoverStreamItem, PreviewTarget } from './types'

const ESTIMATE_ROW = 148
const OVERSCAN = 6

function getAppScroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-app-scroll-container]')
}

type Props = {
  items: DiscoverStreamItem[]
  hasMore: boolean
  loading: boolean
  initialLoading: boolean
  onLoadMore: () => void
  onPreview: (t: PreviewTarget) => void
  emptySlot?: ReactNode
}

/**
 * Virtualized center stream — only viewport ± overscan rows stay mounted.
 * 挂在主布局滚动容器上，避免内层 max-h + overflow 双滚动。
 */
export function VirtualFeedList({
  items,
  hasMore,
  loading,
  initialLoading,
  onLoadMore,
  onPreview,
  emptySlot,
}: Props) {
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setScrollEl(getAppScroller())
  }, [])

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollEl ?? (typeof window !== 'undefined' ? document.documentElement : null),
    estimateSize: () => ESTIMATE_ROW,
    overscan: OVERSCAN,
    getItemKey: (index) => items[index]?.uid ?? index,
  })

  const virtualItems = virtualizer.getVirtualItems()

  // Infinite load when near end
  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1]
    if (!last) return
    if (last.index >= items.length - 4 && hasMore && !loading) {
      onLoadMore()
    }
  }, [virtualItems, items.length, hasMore, loading, onLoadMore])

  const measureRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) virtualizer.measureElement(node)
    },
    [virtualizer],
  )

  if (initialLoading && !items.length) {
    return (
      <div data-discover-virtual-list="" className="flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <FeedCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!items.length && !loading) {
    return <>{emptySlot}</>
  }

  return (
    <div data-discover-virtual-list="" className="w-full">
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualItems.map((vRow) => {
          const item = items[vRow.index]
          if (!item) return null
          return (
            <div
              key={item.uid}
              data-index={vRow.index}
              ref={measureRef}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${vRow.start}px)` }}
            >
              <FeedCard item={item} onPreview={onPreview} />
            </div>
          )
        })}
      </div>

      <div className="flex justify-center border-t border-border/80 py-3">
        {hasMore ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={loading}
            onClick={onLoadMore}
          >
            {loading ? <Spinner data-icon="inline-start" /> : null}
            加载更多
          </Button>
        ) : items.length > 0 ? (
          <p className="text-xs text-muted-foreground">已经到底了</p>
        ) : null}
      </div>

      {loading && items.length > 0 ? (
        <div>
          <FeedCardSkeleton />
        </div>
      ) : null}
    </div>
  )
}
