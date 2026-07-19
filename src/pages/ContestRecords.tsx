import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { listContests } from '@/api/contest'
import { getProfileById } from '@/api/profile'
import type { ContestItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { Pagination } from '@/components/pagination'
import { useListQueryState } from '@/hooks/use-list-query-state'
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

const DEFAULT_PAGE_SIZE = 10

const PLATFORM_FILTERS: { value: string; label: string }[] = [
  { value: '', label: '全部平台' },
  { value: 'CodeForces', label: 'Codeforces' },
  { value: 'AtCoder', label: 'AtCoder' },
  { value: 'LuoGu', label: '洛谷' },
  { value: 'NowCoder', label: '牛客' },
  { value: 'LeetCode', label: '力扣' },
  { value: 'QOJ', label: 'QOJ' },
]

/** 比赛记录列表（嵌入 Contest 页「比赛记录」Tab） */
export function ContestRecords() {
  const { isLogin, user } = useAuth()
  const requestId = useRef(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const idParam = searchParams.get('id')
  const platformParam = searchParams.get('platform') || ''
  const userMode = Boolean(idParam)
  const targetUserId = userMode ? Number(idParam) : -1

  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<ContestItem[]>([])
  const [titleName, setTitleName] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    const res = await listContests({
      userId: targetUserId,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      platform: platformParam || undefined,
    })
    if (id !== requestId.current) return
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '比赛列表加载失败，请稍后重试')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
  }, [page, pageSize, targetUserId, platformParam])

  useEffect(() => {
    void load()
  }, [load])

  // 切换用户 / 平台筛选时回到第一页
  const prevFilter = useRef(`${targetUserId}\0${platformParam}`)
  useEffect(() => {
    const key = `${targetUserId}\0${platformParam}`
    if (prevFilter.current !== key) {
      prevFilter.current = key
      setPage(1)
    }
  }, [targetUserId, platformParam, setPage])

  useEffect(() => {
    if (!userMode || !targetUserId || targetUserId < 0) {
      setTitleName('')
      return
    }
    void getProfileById(targetUserId).then((res) => {
      if (res.success && res.data) setTitleName(res.data.name || res.data.username)
    })
  }, [userMode, targetUserId])

  function patchParams(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams)
    mutate(next)
    setSearchParams(next, { replace: true })
  }

  function showAll() {
    patchParams((p) => {
      p.delete('id')
      p.delete('tab')
    })
  }

  function showMine() {
    if (!isLogin || !user) return
    patchParams((p) => {
      p.set('id', String(user.userId))
      p.delete('tab')
    })
  }

  function setPlatform(plat: string) {
    patchParams((p) => {
      if (plat) p.set('platform', plat)
      else p.delete('platform')
      p.delete('tab')
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">
            {userMode ? `${titleName || '用户'} 的比赛` : '全部比赛'}
          </h3>
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
              variant={
                userMode && targetUserId === user?.userId ? 'default' : 'outline'
              }
              onClick={showMine}
            >
              我参加的
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PLATFORM_FILTERS.map((f) => (
          <Button
            key={f.value || 'all'}
            type="button"
            size="sm"
            variant={platformParam === f.value ? 'default' : 'outline'}
            onClick={() => setPlatform(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        {!loading && !list.length && (
          <Card className="py-4">
            <CardContent className="px-4 text-sm text-muted-foreground">
              暂无比赛记录
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
        pageSize={pageSize}
        onChange={setPage}
        onPageSizeChange={setPageSize}
        disabled={loading}
      />
    </div>
  )
}
