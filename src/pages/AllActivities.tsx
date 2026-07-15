import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getProfileById } from '@/api/profile'
import { getSubmitLogs } from '@/api/submitLog'
import type { SubmitLogItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { formatActivityProblemTitle } from '@/lib/activity-title'
import { formatTime } from '@/lib/format'
import { getSubmitLink } from '@/lib/link'
import { num } from '@/lib/http'

const LIMIT = 50

export function AllActivities() {
  const { isLogin, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const idParam = searchParams.get('id')
  const userId = idParam ? Number(idParam) : -1
  const userMode = userId > 0

  const [items, setItems] = useState<SubmitLogItem[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [titleName, setTitleName] = useState('')

  const loadingRef = useRef(false)
  const cursorRef = useRef<number | string>(-1)

  const loadMore = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      const nextCursor = reset ? -1 : cursorRef.current
      const res = await getSubmitLogs({
        userId,
        cursor: nextCursor,
        limit: LIMIT,
      })
      loadingRef.current = false
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '加载动态失败')
        return
      }
      const list = res.data
      setItems((prev) => (reset ? list : [...prev, ...list]))
      setHasMore(list.length >= LIMIT)
      if (list.length) {
        const last = list[list.length - 1]
        cursorRef.current = num(last.time, -1)
      }
    },
    [userId],
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
    // 优先用本页已加载条目的 userName
    setTitleName('')
    void getProfileById(userId).then((res) => {
      if (res.success && res.data) setTitleName(res.data.name || res.data.username)
    })
  }, [userMode, userId])

  // 单用户模式下，列表返回后用首条 userName 补标题（少一次等待）
  useEffect(() => {
    if (!userMode || titleName || !items.length) return
    const n = items.find((i) => i.userId === userId)?.userName
    if (n) setTitleName(n)
  }, [userMode, userId, items, titleName])

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            {userMode ? `${titleName || '用户'} 的动态` : '全站动态'}
          </h2>
          <p className="text-sm text-muted-foreground">
            全站或个人的提交动态
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={!userMode ? 'default' : 'outline'}
            onClick={() => setSearchParams({})}
          >
            大家的
          </Button>
          {isLogin && user && (
            <Button
              type="button"
              size="sm"
              variant={userMode && userId === user.userId ? 'default' : 'outline'}
              onClick={() => setSearchParams({ id: String(user.userId) })}
            >
              我的
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {!items.length && loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        {!items.length && !loading && (
          <Card className="py-4">
            <CardContent className="px-4 text-sm text-muted-foreground">
              暂无动态
            </CardContent>
          </Card>
        )}
        {items.map((item) => {
          const submitUrl = getSubmitLink(item.platform, item.contest, item.submitId)
          const title = formatActivityProblemTitle(
            item.problem,
            item.problemTitle,
            item.contest,
          )
          const displayName = item.userName || `用户${item.userId}`
          return (
            <Card key={`${item.id}-${item.submitId}`} className="gap-1 py-3">
              <CardHeader className="gap-1 px-4">
                <CardTitle className="text-sm font-medium">
                  <Link
                    to={`/profile?id=${item.userId}`}
                    className="hover:underline"
                  >
                    {displayName}
                  </Link>
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    · {item.platform} · {item.lang || '-'}
                  </span>
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {item.problemId ? (
                    <Link
                      to={`/question-bank/detail/${item.problemId}`}
                      className="text-foreground hover:underline"
                    >
                      {title}
                    </Link>
                  ) : (
                    <span>{title}</span>
                  )}
                  {submitUrl ? (
                    <StatusBadge status={item.status} asChild>
                      <a
                        href={submitUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {item.status}
                      </a>
                    </StatusBadge>
                  ) : (
                    <StatusBadge status={item.status} />
                  )}
                  <span>{formatTime(item.time)}</span>
                </CardDescription>
                {!!item.problemTags?.length && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.problemTags.slice(0, 6).map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="h-5 border-border/70 bg-muted/50 px-1.5 text-[10px] font-normal text-muted-foreground"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-center">
        {hasMore ? (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void loadMore(false)}
          >
            {loading ? <Spinner data-icon="inline-start" /> : null}
            加载更多
          </Button>
        ) : (
          items.length > 0 && (
            <p className="text-sm text-muted-foreground">没有更多了</p>
          )
        )}
      </div>
    </PageShell>
  )
}
