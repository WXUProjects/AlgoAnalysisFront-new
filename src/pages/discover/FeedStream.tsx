import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getSubmitLogs } from '@/api/submitLog'
import type { SubmitLogItem } from '@shared/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  canLoadFeedStream,
  mergeCursorPage,
  pageHasMore,
} from '@/lib/discover-feed'
import { num } from '@/lib/http'
import { FeedEmptyState } from './FeedEmptyState'
import { SubmitLogRow, SubmitLogRowSkeleton } from './SubmitLogRow'
import type { FeedScope } from './types'

const FEED_LIMIT = 15

type Props = {
  isLogin: boolean
  userId: number
  userMode: boolean
  followingOnly: boolean
  feedScope: FeedScope
  selfUserId?: number
  /**
   * 发现页 Tab 已标「提交动态」时隐藏卡片标题，避免竖排重复；
   * 查看他人动态（无 Tab）时保留标题。
   */
  hideTitle?: boolean
}

/**
 * 提交动态：旧版列表，挂在页面主滚动上；仅手动「加载更多」。
 */
export function FeedStream({
  isLogin,
  userId,
  userMode,
  followingOnly,
  feedScope,
  selfUserId,
  hideTitle = false,
}: Props) {
  const [items, setItems] = useState<SubmitLogItem[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const loadingRef = useRef(false)
  const cursorRef = useRef<number | string>(-1)

  const loadMore = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return

      const gate = canLoadFeedStream({ followingOnly, isLogin })
      if (!gate.allow) {
        toast.error('登录后可查看关注动态')
        setItems([])
        setHasMore(false)
        setLoading(false)
        setInitialLoading(false)
        loadingRef.current = false
        return
      }

      loadingRef.current = true
      setLoading(true)
      if (reset) {
        setInitialLoading(true)
        cursorRef.current = -1
      }

      try {
        const res = await getSubmitLogs({
          userId: userMode ? userId : -1,
          cursor: reset ? -1 : cursorRef.current,
          limit: FEED_LIMIT,
          followingOnly: !userMode && followingOnly,
        })
        if (!res.success) {
          toast.error(res.message || '动态加载失败，请稍后重试')
          if (reset) {
            setItems([])
            setHasMore(false)
          }
          return
        }
        const list = res.data ?? []
        if (list.length) {
          cursorRef.current = num(list[list.length - 1].time, -1)
        }
        const more = pageHasMore(list.length, FEED_LIMIT)
        setItems((prev) => {
          const base = reset ? [] : prev
          return mergeCursorPage(base, list, (x) => `${x.id}-${x.submitId}`)
        })
        setHasMore(reset && list.length === 0 ? false : more)
      } finally {
        loadingRef.current = false
        setLoading(false)
        setInitialLoading(false)
      }
    },
    [followingOnly, isLogin, userId, userMode],
  )

  useEffect(() => {
    setItems([])
    setHasMore(true)
    void loadMore(true)
  }, [loadMore, reloadToken])

  const description = userMode
    ? '该用户的提交动态'
    : followingOnly
      ? '你关注的人在本组织内的动态'
      : feedScope === 'mine'
        ? '我的提交动态'
        : '当前组织内的提交动态'

  return (
    <Card data-discover-feed-stream="" className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-4 py-3">
        {hideTitle ? null : (
          <CardTitle className="flex items-center gap-2 text-base">
            <ActivityIcon className="size-4 text-muted-foreground" />
            提交动态
          </CardTitle>
        )}
        <CardDescription className={hideTitle ? 'text-sm' : undefined}>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y p-0">
        {initialLoading &&
          !items.length &&
          Array.from({ length: 5 }).map((_, i) => (
            <SubmitLogRowSkeleton key={i} />
          ))}
        {!initialLoading && !items.length && !loading ? (
          <FeedEmptyState
            isLogin={isLogin}
            selfUserId={selfUserId}
            followingOnly={followingOnly}
            onFollowed={() => setReloadToken((t) => t + 1)}
          />
        ) : null}
        {items.map((item) => (
          <SubmitLogRow key={`${item.id}-${item.submitId}`} item={item} />
        ))}
      </CardContent>
      {(hasMore || items.length > 0) &&
      !(initialLoading && !items.length) ? (
        <CardFooter className="justify-center border-t py-3">
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadMore(false)}
            >
              {loading ? <Spinner data-icon="inline-start" /> : null}
              加载更多
            </Button>
          ) : items.length > 0 ? (
            <p className="text-sm text-muted-foreground">已经到底了</p>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  )
}
