import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarIcon,
  FlameIcon,
  TrophyIcon,
  UserPlusIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { listContestCalendar } from '@/api/contest-calendar'
import { listHotProblems } from '@/api/problem'
import { getRank } from '@/api/statistic'
import { followUser, getSocialRelation } from '@/api/social'
import type {
  ContestCalendarItem,
  HotProblemItem,
  StatisticRankItem,
} from '@shared/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatRelativeTime } from '@/lib/discover-feed'
import { formatTime } from '@/lib/format'
import { HotAllSheet } from './HotAllSheet'
import { RankAllSheet, type RankPeriod } from './RankAllSheet'

const HOT_PROBLEM_LIMIT = 6
/** 热题统计窗口：近 2 天 */
const HOT_DAYS = 2

/** 全站排行「全部」下界：与爬虫日汇总原点对齐 */
const RANK_ALL_START = '2020-01-01'

const PLATFORM_LABEL: Record<string, string> = {
  NowCoder: '牛客',
  AtCoder: 'AtCoder',
  CodeForces: 'Codeforces',
  LuoGu: '洛谷',
  LeetCode: '力扣',
  QOJ: 'QOJ',
}

function platformLabel(p: string): string {
  return PLATFORM_LABEL[p] || p
}

function fmtYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function rankRange(period: RankPeriod): { start: string; end: string } {
  const end = new Date()
  if (period === 'all') {
    return { start: RANK_ALL_START, end: fmtYmd(end) }
  }
  const start = new Date()
  start.setDate(end.getDate() - 6)
  return { start: fmtYmd(start), end: fmtYmd(end) }
}

type Props = {
  isLogin: boolean
  selfUserId?: number
}

export function RightSidebar({ isLogin, selfUserId }: Props) {
  const [rankPeriod, setRankPeriod] = useState<RankPeriod>('week')
  const [rank, setRank] = useState<StatisticRankItem[]>([])
  const [rankLoading, setRankLoading] = useState(true)
  const [rankAllOpen, setRankAllOpen] = useState(false)
  const [hotProblems, setHotProblems] = useState<HotProblemItem[]>([])
  const [hotLoading, setHotLoading] = useState(true)
  const [hotAllOpen, setHotAllOpen] = useState(false)
  const [contests, setContests] = useState<ContestCalendarItem[]>([])
  const [contestLoading, setContestLoading] = useState(true)
  const [relationMap, setRelationMap] = useState<Record<number, boolean>>({})
  const [busyId, setBusyId] = useState(0)
  const range = useMemo(() => rankRange(rankPeriod), [rankPeriod])

  useEffect(() => {
    let cancelled = false
    setRankLoading(true)
    void getRank({
      startDate: range.start,
      endDate: range.end,
      scoreType: 'ac',
      page: 1,
      pageSize: 8,
    }).then((res) => {
      if (cancelled) return
      setRankLoading(false)
      if (res.success && res.data) setRank(res.data.list.slice(0, 6))
      else setRank([])
    })
    return () => {
      cancelled = true
    }
  }, [range.start, range.end])

  useEffect(() => {
    let cancelled = false
    setHotLoading(true)
    // 近 2 天：提交次数 + 做题人数 + AC 综合热度
    void listHotProblems({
      page: 1,
      pageSize: HOT_PROBLEM_LIMIT,
      days: HOT_DAYS,
    }).then((res) => {
      if (cancelled) return
      setHotLoading(false)
      if (res.success && res.data) {
        setHotProblems(res.data.data.slice(0, HOT_PROBLEM_LIMIT))
      } else {
        setHotProblems([])
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setContestLoading(true)
    void listContestCalendar({ status: 'upcoming', limit: 5 }).then((res) => {
      if (cancelled) return
      setContestLoading(false)
      if (res.success && res.data) setContests(res.data.list.slice(0, 5))
      else setContests([])
    })
    return () => {
      cancelled = true
    }
  }, [])

  const recommend = rank.filter((r) => !selfUserId || r.userId !== selfUserId).slice(0, 5)

  useEffect(() => {
    if (!isLogin || !recommend.length) {
      setRelationMap({})
      return
    }
    let cancelled = false
    void Promise.all(
      recommend.map(async (c) => {
        const r = await getSocialRelation(c.userId)
        return r.success && r.data
          ? ([c.userId, r.data.isFollowing] as const)
          : null
      }),
    ).then((rows) => {
      if (cancelled) return
      const m: Record<number, boolean> = {}
      for (const row of rows) {
        if (row) m[row[0]] = row[1]
      }
      setRelationMap(m)
    })
    return () => {
      cancelled = true
    }
  }, [isLogin, recommend.map((r) => r.userId).join(',')])

  async function handleFollow(userId: number) {
    if (!isLogin) {
      toast.error('请先登录后再关注')
      return
    }
    setBusyId(userId)
    const res = await followUser(userId)
    setBusyId(0)
    if (!res.success) {
      toast.error(res.message || '关注失败，请稍后重试')
      return
    }
    setRelationMap((m) => ({ ...m, [userId]: true }))
    toast.success('已关注')
  }

  return (
    <aside
      data-discover-right-sidebar=""
      className="hidden w-[300px] shrink-0 flex-col gap-3 lg:flex"
    >
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrophyIcon className="size-3.5 text-muted-foreground" />
            全站热门
          </CardTitle>
          <CardDescription className="text-xs">
            {rankPeriod === 'week'
              ? `${range.start} ~ ${range.end}`
              : '按累计 AC 题数'}
          </CardDescription>
          <CardAction>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={rankPeriod}
              onValueChange={(v) => {
                if (v === 'week' || v === 'all') setRankPeriod(v)
              }}
            >
              <ToggleGroupItem value="week" className="px-2 text-xs">
                近 7 日
              </ToggleGroupItem>
              <ToggleGroupItem value="all" className="px-2 text-xs">
                全部
              </ToggleGroupItem>
            </ToggleGroup>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {rankLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2.5">
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          {!rankLoading &&
            rank.map((r) => (
              <div
                key={r.userId}
                className="flex items-center gap-2 px-4 py-2 text-sm"
              >
                <span className="w-5 tabular-nums text-muted-foreground">
                  {r.rank}
                </span>
                <Link
                  to={`/profile?id=${r.userId}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {r.name || `用户${r.userId}`}
                </Link>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {r.score}
                </span>
              </div>
            ))}
          {!rankLoading && !rank.length && (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              暂无排行
            </p>
          )}
          <div className="px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setRankAllOpen(true)}
            >
              查看全部用户
            </Button>
          </div>
        </CardContent>
      </Card>

      <RankAllSheet
        open={rankAllOpen}
        onOpenChange={setRankAllOpen}
        period={rankPeriod}
        range={range}
      />
      <Card data-discover-hot-problems="" className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FlameIcon className="size-3.5 text-muted-foreground" />
            全站热题
          </CardTitle>
          <CardDescription className="text-xs">
            近 {HOT_DAYS} 天综合热度
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {hotLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2 px-4 py-2.5">
                <Skeleton className="mt-0.5 h-3 w-5" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="mb-1 h-3 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          {!hotLoading &&
            hotProblems.map((item, i) => {
              const p = item.problem
              const rel = formatRelativeTime(item.lastSubmittedAt)
              const meta = [
                platformLabel(p.platform),
                p.difficulty || '',
                item.solverCount > 0 ? `${item.solverCount} 人在做` : '',
                rel,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <Link
                  key={p.id}
                  to={`/question-bank/detail/${p.id}`}
                  className="flex items-start gap-2 px-4 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <span className="w-5 shrink-0 pt-0.5 tabular-nums text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-snug">
                      {p.title || p.externalId || `题目 ${p.id}`}
                    </p>
                    {meta ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {meta}
                      </p>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          {!hotLoading && !hotProblems.length && (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              近 {HOT_DAYS} 天还没有热题
            </p>
          )}
          <div className="px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setHotAllOpen(true)}
            >
              查看全部
            </Button>
          </div>
        </CardContent>
      </Card>

      <HotAllSheet open={hotAllOpen} onOpenChange={setHotAllOpen} />

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UserPlusIcon className="size-3.5 text-muted-foreground" />
            推荐关注
          </CardTitle>
          <CardDescription className="text-xs">
            活跃的算法贡献者
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {rankLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2.5">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          {!rankLoading &&
            recommend.map((c) => (
              <div
                key={c.userId}
                className="flex items-center gap-2 px-4 py-2.5"
              >
                <Avatar className="size-8">
                  <AvatarImage src="/images/defaultAvatar.png" alt="" />
                  <AvatarFallback>
                    {(c.name || '?').slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <Link
                  to={`/profile?id=${c.userId}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                >
                  {c.name || `用户${c.userId}`}
                </Link>
                {isLogin && !relationMap[c.userId] ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={busyId === c.userId}
                    onClick={() => void handleFollow(c.userId)}
                  >
                    关注
                  </Button>
                ) : isLogin ? (
                  <span className="text-[10px] text-muted-foreground">已关注</span>
                ) : null}
              </div>
            ))}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarIcon className="size-3.5 text-muted-foreground" />
            近期竞赛
          </CardTitle>
          <CardDescription className="text-xs">活动日历速览</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {contestLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 py-2.5">
                <Skeleton className="mb-1 h-3 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          {!contestLoading &&
            contests.map((c) => (
              <a
                key={c.id}
                href={c.url || undefined}
                target="_blank"
                rel="noreferrer"
                className="block px-4 py-2.5 transition-colors hover:bg-muted/40"
              >
                <p className="line-clamp-2 text-sm font-medium leading-snug">
                  {c.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.platformName || c.platform}
                  {c.startTime ? ` · ${formatTime(c.startTime)}` : ''}
                </p>
              </a>
            ))}
          {!contestLoading && !contests.length && (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              近期暂无赛事
            </p>
          )}
          <div className="px-4 py-2">
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/contest?tab=calendar">打开竞赛日历</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </aside>
  )
}
