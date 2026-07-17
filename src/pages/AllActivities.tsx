import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActivityIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getProfileById } from '@/api/profile'
import { getSubmitLogs } from '@/api/submitLog'
import type { SubmitLogItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { num } from '@/lib/http'
import {
  SubmitLogRow,
  SubmitLogRowSkeleton,
} from '@/pages/discover/SubmitLogRow'

const FEED_LIMIT = 15

/**
 * 个人/组织提交动态列表（旧版样式）。
 * 资料页「查看所有动态」走这里，不复用发现页三栏布局。
 */
export function AllActivities() {
  const { isLogin, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const idParam = searchParams.get('id')
  const followingOnly = searchParams.get('following') === '1'
  const userId = idParam ? Number(idParam) : -1
  const userMode = userId > 0

  const [items, setItems] = useState<SubmitLogItem[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [titleName, setTitleName] = useState('')
  const loadingRef = useRef(false)
  const cursorRef = useRef<number | string>(-1)

  const feedScope = userMode
    ? 'mine'
    : followingOnly
      ? 'following'
      : 'org'

  const loadMore = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return
      if (followingOnly && !isLogin) {
        toast.error('登录后可查看关注动态')
        return
      }
      loadingRef.current = true
      setLoading(true)
      const nextCursor = reset ? -1 : cursorRef.current
      const res = await getSubmitLogs({
        userId: userMode ? userId : -1,
        cursor: nextCursor,
        limit: FEED_LIMIT,
        followingOnly: !userMode && followingOnly,
      })
      loadingRef.current = false
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '动态加载失败，请稍后重试')
        return
      }
      const list = res.data
      setItems((prev) => (reset ? list : [...prev, ...list]))
      if (list.length === 0) {
        setHasMore(false)
      } else if (list.length >= FEED_LIMIT) {
        setHasMore(true)
      } else {
        setHasMore(false)
      }
      if (list.length) {
        cursorRef.current = num(list[list.length - 1].time, -1)
      }
    },
    [userId, userMode, followingOnly, isLogin],
  )

  useEffect(() => {
    setItems([])
    cursorRef.current = -1
    setHasMore(true)
    void loadMore(true)
  }, [loadMore])

  useEffect(() => {
    if (!userMode) {
      setTitleName('')
      return
    }
    void getProfileById(userId).then((res) => {
      if (res.success && res.data) setTitleName(res.data.name || res.data.username)
    })
  }, [userMode, userId])

  function setFeedScope(scope: string) {
    if (!scope) return
    if (scope === 'org') {
      setSearchParams({})
      return
    }
    if (scope === 'following') {
      setSearchParams({ following: '1' })
      return
    }
    if (scope === 'mine' && user) {
      setSearchParams({ id: String(user.userId) })
    }
  }

  const description = userMode
    ? `${titleName || '用户'} 的提交动态`
    : followingOnly
      ? '你关注的人在本组织内的动态'
      : '当前组织内的提交动态'

  return (
    <PageShell className="gap-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">提交动态</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {userMode ? (
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to={`/profile?id=${userId}`}>返回资料</Link>
          </Button>
        ) : null}
      </section>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ActivityIcon className="size-4 text-muted-foreground" />
            提交动态
          </CardTitle>
          <CardDescription>{description}</CardDescription>
          {!userMode || (user && userId === user.userId) ? (
            <CardAction>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={feedScope}
                onValueChange={setFeedScope}
              >
                <ToggleGroupItem value="org">组织动态</ToggleGroupItem>
                {isLogin ? (
                  <ToggleGroupItem value="following">仅关注</ToggleGroupItem>
                ) : null}
                {isLogin && user ? (
                  <ToggleGroupItem value="mine">我的</ToggleGroupItem>
                ) : null}
              </ToggleGroup>
            </CardAction>
          ) : (
            <CardAction>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSearchParams({})}
              >
                返回组织动态
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {!items.length &&
            loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <SubmitLogRowSkeleton key={i} />
            ))}
          {!items.length && !loading && (
            <Empty className="border-0 py-10 md:py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ActivityIcon />
                </EmptyMedia>
                <EmptyTitle>暂时还没有动态</EmptyTitle>
                <EmptyDescription>
                  {followingOnly
                    ? '关注队友后，这里会显示他们的提交动态'
                    : userMode
                      ? '该用户还没有提交记录'
                      : '组织内有新的提交时会出现在这里'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {items.map((item) => (
            <SubmitLogRow key={`${item.id}-${item.submitId}`} item={item} />
          ))}
        </CardContent>
        {(hasMore || items.length > 0) && (
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
            ) : (
              items.length > 0 && (
                <p className="text-sm text-muted-foreground">已经到底了</p>
              )
            )}
          </CardFooter>
        )}
      </Card>
    </PageShell>
  )
}
