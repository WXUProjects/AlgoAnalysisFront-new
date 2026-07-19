import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLinkIcon, SearchIcon, XIcon } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatContestTimeRange } from '@/lib/format'
import {
  contestSeedFromItem,
  rememberContestSeed,
} from '@/lib/contest-nav'

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

/** 时间快捷：相对今天 0 点往前 N 天；custom 用 URL 里的 from/to 日期 */
type TimePreset = '' | '7d' | '30d' | '90d' | '365d' | 'custom'

const TIME_PRESETS: { value: TimePreset; label: string }[] = [
  { value: '', label: '不限时间' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: '90d', label: '近 90 天' },
  { value: '365d', label: '近一年' },
  { value: 'custom', label: '自定义' },
]

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/** YYYY-MM-DD → 本地日界 unix 秒 */
function dateInputToUnix(ymd: string, endOfDay: boolean): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined
  const d = new Date(`${ymd}T00:00:00`)
  if (Number.isNaN(d.getTime())) return undefined
  const t = endOfDay ? endOfLocalDay(d) : startOfLocalDay(d)
  return Math.floor(t.getTime() / 1000)
}

function todayDateInput(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysAgoDateInput(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function resolveTimeRange(
  preset: TimePreset,
  fromYmd: string,
  toYmd: string,
): { timeFrom?: number; timeTo?: number } {
  if (preset === 'custom') {
    return {
      timeFrom: fromYmd ? dateInputToUnix(fromYmd, false) : undefined,
      timeTo: toYmd ? dateInputToUnix(toYmd, true) : undefined,
    }
  }
  const daysMap: Record<string, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '365d': 365,
  }
  const days = daysMap[preset]
  if (!days) return {}
  const from = startOfLocalDay(new Date())
  from.setDate(from.getDate() - days)
  return {
    timeFrom: Math.floor(from.getTime() / 1000),
    timeTo: Math.floor(endOfLocalDay(new Date()).getTime() / 1000),
  }
}

function parseTimePreset(raw: string | null): TimePreset {
  if (
    raw === '7d' ||
    raw === '30d' ||
    raw === '90d' ||
    raw === '365d' ||
    raw === 'custom'
  ) {
    return raw
  }
  return ''
}

/** 列表副文案：参赛成绩 or 未参赛时的总题数 */
function contestListMeta(
  item: ContestItem,
  showPersonal: boolean,
): string {
  if (showPersonal) {
    const parts: string[] = []
    if (item.rank > 0) parts.push(`排名 ${item.rank}`)
    if (item.platform === 'LeetCode' && item.acCount > 0) {
      parts.push(`得分 ${item.acCount}`)
    } else if (item.acCount > 0) {
      parts.push(
        item.totalCount > 0
          ? `${item.acCount}/${item.totalCount} 题`
          : `AC ${item.acCount}`,
      )
    }
    return parts.length ? ` · ${parts.join(' · ')}` : ''
  }
  return item.totalCount > 0 ? ` 共 ${item.totalCount} 题` : ''
}

/** 比赛记录列表（嵌入 Contest 页「比赛记录」Tab） */
export function ContestRecords() {
  const { isLogin, user } = useAuth()
  const requestId = useRef(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const idParam = searchParams.get('id')
  const platformParam = searchParams.get('platform') || ''
  const keywordParam = (searchParams.get('keyword') || '').trim()
  const timePreset = parseTimePreset(searchParams.get('time'))
  const fromYmd = searchParams.get('from') || ''
  const toYmd = searchParams.get('to') || ''
  const userMode = Boolean(idParam)
  const targetUserId = userMode ? Number(idParam) : -1

  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<ContestItem[]>([])
  const [titleName, setTitleName] = useState('')
  const [loading, setLoading] = useState(true)
  const [keywordInput, setKeywordInput] = useState(keywordParam)

  const { timeFrom, timeTo } = useMemo(
    () => resolveTimeRange(timePreset, fromYmd, toYmd),
    [timePreset, fromYmd, toYmd],
  )

  useEffect(() => {
    setKeywordInput(keywordParam)
  }, [keywordParam])

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === '') next.delete(k)
            else next.set(k, v)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // 关键词防抖写回 URL
  useEffect(() => {
    if (keywordInput === keywordParam) return
    const t = window.setTimeout(() => {
      patchParams({ keyword: keywordInput.trim() || null, page: '1' })
    }, 320)
    return () => window.clearTimeout(t)
  }, [keywordInput, keywordParam, patchParams])

  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    const res = await listContests({
      userId: targetUserId,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      platform: platformParam || undefined,
      keyword: keywordParam || undefined,
      timeFrom,
      timeTo,
    })
    if (id !== requestId.current) return
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '比赛列表加载失败，请稍后重试')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
  }, [
    page,
    pageSize,
    targetUserId,
    platformParam,
    keywordParam,
    timeFrom,
    timeTo,
  ])

  useEffect(() => {
    void load()
  }, [load])

  // 切换筛选时回到第一页
  const filterKey = `${targetUserId}\0${platformParam}\0${keywordParam}\0${timePreset}\0${fromYmd}\0${toYmd}`
  const prevFilter = useRef(filterKey)
  useEffect(() => {
    if (prevFilter.current !== filterKey) {
      prevFilter.current = filterKey
      setPage(1)
    }
  }, [filterKey, setPage])

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
    patchParams({ id: null, tab: null })
  }

  function showMine() {
    if (!isLogin || !user) return
    patchParams({ id: String(user.userId), tab: null })
  }

  function setPlatform(plat: string) {
    patchParams({ platform: plat || null, page: '1' })
  }

  function setTimePreset(preset: TimePreset) {
    if (preset === 'custom') {
      const from = fromYmd || daysAgoDateInput(30)
      const to = toYmd || todayDateInput()
      patchParams({ time: 'custom', from, to, page: '1' })
      return
    }
    if (!preset) {
      patchParams({ time: null, from: null, to: null, page: '1' })
      return
    }
    patchParams({ time: preset, from: null, to: null, page: '1' })
  }

  function clearFilters() {
    setKeywordInput('')
    patchParams({
      keyword: null,
      platform: null,
      time: null,
      from: null,
      to: null,
      page: '1',
    })
  }

  const hasFilters = Boolean(
    keywordParam || platformParam || timePreset || fromYmd || toYmd,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">
            {userMode ? `${titleName || '用户'} 的比赛` : '全部比赛'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {userMode
              ? '按平台、名称或时间查找参赛记录，可打开站内榜或原站'
              : '组织内出现过的比赛；你打过的会显示自己的排名与过题数'}
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

      <Card className="gap-3 py-4">
        <CardHeader className="px-4 py-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">筛选</CardTitle>
            {hasFilters && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-muted-foreground"
                onClick={clearFilters}
              >
                <XIcon data-icon="inline-start" />
                清空筛选
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="搜索比赛名称或场次编号"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">平台</span>
            <div className="flex flex-wrap gap-1.5">
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
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">比赛时间</span>
            <div className="flex flex-wrap gap-1.5">
              {TIME_PRESETS.map((f) => (
                <Button
                  key={f.value || 'all-time'}
                  type="button"
                  size="sm"
                  variant={timePreset === f.value ? 'default' : 'outline'}
                  onClick={() => setTimePreset(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            {timePreset === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Input
                  type="date"
                  className="w-auto max-w-[11rem]"
                  value={fromYmd}
                  max={toYmd || undefined}
                  onChange={(e) =>
                    patchParams({ from: e.target.value || null, page: '1' })
                  }
                />
                <span className="text-sm text-muted-foreground">至</span>
                <Input
                  type="date"
                  className="w-auto max-w-[11rem]"
                  value={toYmd}
                  min={fromYmd || undefined}
                  onChange={(e) =>
                    patchParams({ to: e.target.value || null, page: '1' })
                  }
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        {!loading && !list.length && (
          <Card className="py-4">
            <CardContent className="px-4 text-sm text-muted-foreground">
              {hasFilters
                ? '没有符合条件的比赛，试试放宽筛选条件'
                : '暂时还没有比赛记录'}
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
                      state={{ contest: contestSeedFromItem(item) }}
                      onClick={() => rememberContestSeed(item)}
                      className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.contestName || item.contestId}
                    </Link>
                  </CardTitle>
                </div>
                <CardDescription>
                  {formatContestTimeRange(
                    item.startTime,
                    item.endTime,
                    item.time,
                  )}
                  {contestListMeta(
                    item,
                    // 全部比赛：仅自己打过才显示排名/过题；「我参加的」等用户维度始终显示成绩
                    userMode ||
                      Boolean(isLogin && user && item.userId === user.userId),
                  )}
                </CardDescription>
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
