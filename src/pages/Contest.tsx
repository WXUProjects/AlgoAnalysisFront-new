import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { listContests } from '@/api/contest'
import { getProfileById } from '@/api/profile'
import type { ContestItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'

const PAGE_SIZE = 10

export function Contest() {
  const { isLogin, user } = useAuth()
  const requestId = useRef(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const idParam = searchParams.get('id')
  const userMode = Boolean(idParam)
  const targetUserId = userMode ? Number(idParam) : -1

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<ContestItem[]>([])
  const [titleName, setTitleName] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    const res = await listContests({
      userId: targetUserId,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
    if (id !== requestId.current) return
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '加载比赛失败')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
  }, [page, targetUserId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [targetUserId])

  useEffect(() => {
    if (!userMode || !targetUserId || targetUserId < 0) {
      setTitleName('')
      return
    }
    void getProfileById(targetUserId).then((res) => {
      if (res.success && res.data) setTitleName(res.data.name || res.data.username)
    })
  }, [userMode, targetUserId])

  function showAll() {
    setSearchParams({})
  }

  function showMine() {
    if (!isLogin || !user) return
    setSearchParams({ id: String(user.userId) })
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            {userMode ? `${titleName || '用户'} 的比赛` : '全部比赛'}
          </h2>
          <p className="text-sm text-muted-foreground">
            查看比赛记录，可跳转原站或站内详情
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={!userMode ? 'default' : 'outline'}
            onClick={showAll}
          >
            全部比赛
          </Button>
          {isLogin && (
            <Button
              type="button"
              size="sm"
              variant={userMode && targetUserId === user?.userId ? 'default' : 'outline'}
              onClick={showMine}
            >
              我参加的
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        {!loading && !list.length && (
          <Card className="py-4">
            <CardContent className="px-4 text-sm text-muted-foreground">
              暂无比赛
            </CardContent>
          </Card>
        )}
        {list.map((item) => (
          <Card
            key={item.id}
            className="gap-2 py-3 transition-shadow duration-200 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 space-y-0">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{item.platform || '-'}</Badge>
                  <CardTitle className="truncate text-base">
                    <Link
                      to={`/contest/${item.id}`}
                      className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.contestName || item.contestId}
                    </Link>
                  </CardTitle>
                </div>
                <CardDescription>{formatTime(item.time)}</CardDescription>
              </div>
              {item.contestUrl && (
                <div className="flex shrink-0 gap-2">
                  <Button type="button" size="sm" variant="outline" asChild>
                    <a href={item.contestUrl} target="_blank" rel="noreferrer">
                      <ExternalLinkIcon data-icon="inline-start" />
                      OJ
                    </a>
                  </Button>
                </div>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        disabled={loading}
      />
    </PageShell>
  )
}
