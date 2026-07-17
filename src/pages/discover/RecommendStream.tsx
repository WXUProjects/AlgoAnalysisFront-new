import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { listActivityFeed } from '@/api/community'
import { getRank } from '@/api/statistic'
import { useAuth } from '@/auth/AuthContext'
import { mergeCursorPage } from '@/lib/discover-feed'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { CompassIcon } from 'lucide-react'
import { FeedPreviewSheet } from './FeedPreviewSheet'
import { mapActivityToStreamItem } from './map-items'
import { VirtualFeedList } from './VirtualFeedList'
import type { DiscoverStreamItem, PreviewTarget } from './types'

/**
 * Recommend / Discover surface — high-signal activity (题解/讨论) + rank-backed signal.
 * Decoupled from chronological Feed; no inject into Feed array.
 * 公共域：后端全站聚合；私有域：仅本组织。
 */
export function RecommendStream() {
  const { currentOrg } = useAuth()
  const isPublicOrg =
    !currentOrg || Boolean(currentOrg.isSystem) || currentOrg.slug === 'public'
  const [items, setItems] = useState<DiscoverStreamItem[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [preview, setPreview] = useState<PreviewTarget | null>(null)
  const pageRef = useRef(1)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async (reset = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    if (reset) {
      setInitialLoading(true)
      pageRef.current = 1
    }
    const page = reset ? 1 : pageRef.current
    try {
      // Prefer solutions first page for high-signal; then all activity
      const type = page === 1 ? 'solution' : undefined
      const res = await listActivityFeed({
        page,
        pageSize: 20,
        type,
      })
      if (!res.success || !res.data) {
        if (reset) {
          // Fallback: surface rank as pseudo-cards? keep empty honest
          toast.error(res.message || '推荐内容加载失败')
          setItems([])
          setHasMore(false)
        }
        return
      }
      const mapped = res.data.list.map(mapActivityToStreamItem)
      // Boost: if first page empty solutions, try comments/all once
      let batch = mapped
      if (reset && !batch.length) {
        const all = await listActivityFeed({ page: 1, pageSize: 20 })
        if (all.success && all.data) {
          batch = all.data.list.map(mapActivityToStreamItem)
          pageRef.current = 2
          setHasMore(all.data.list.length >= 20)
        } else {
          setHasMore(false)
        }
      } else {
        pageRef.current = page + 1
        setHasMore(
          res.data.list.length >= 20 || page * 20 < res.data.total,
        )
      }

      setItems((prev) =>
        mergeCursorPage(reset ? [] : prev, batch, (x) => x.uid),
      )
    } finally {
      loadingRef.current = false
      setLoading(false)
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    setItems([])
    void loadMore(true)
  }, [loadMore, currentOrg?.id])

  // Warm rank endpoint so right rail / empty paths share cache-friendly hit
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 6)
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    void getRank({
      startDate: fmt(start),
      endDate: fmt(end),
      scoreType: 'ac',
      page: 1,
      pageSize: 5,
    })
  }, [])

  return (
    <div data-discover-recommend-stream="" className="flex flex-col gap-3">
      <VirtualFeedList
        items={items}
        hasMore={hasMore}
        loading={loading}
        initialLoading={initialLoading}
        onLoadMore={() => void loadMore(false)}
        onPreview={setPreview}
        emptySlot={
          <Empty className="border-0 py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CompassIcon />
              </EmptyMedia>
              <EmptyTitle>还没有可推荐的内容</EmptyTitle>
              <EmptyDescription>
                {isPublicOrg
                  ? '全站有新的题解或讨论后，会出现在这里。也可切换到「动态」看提交时间线。'
                  : '本组织有新的题解或讨论后，会出现在这里。也可切换到「动态」看提交时间线。'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />

      <FeedPreviewSheet
        target={preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      />
    </div>
  )
}
