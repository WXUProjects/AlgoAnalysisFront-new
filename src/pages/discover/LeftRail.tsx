import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookmarkIcon,
  CalendarIcon,
  FlameIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react'
import { listContestCalendar } from '@/api/contest-calendar'
import type { ContestCalendarItem, PeriodData } from '@shared/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { FeedScopeBar } from './FeedScopeBar'
import type { FeedScope } from './types'

type Props = {
  feedScope: FeedScope
  onFeedScope: (s: FeedScope) => void
  isLogin: boolean
  /** 个人周期统计（AC / 提交） */
  period?: PeriodData | null
  followingCount?: number | null
  followerCount?: number | null
  /** 提交动态且非「看他人」时展示范围切换（含「我的」） */
  showFeedScope?: boolean
}

function fmtNum(n: number | null | undefined, loading: boolean): string {
  if (loading) return '…'
  if (n == null) return '—'
  return String(n)
}

function weekDelta(thisWeek: number, lastWeek: number): {
  text: string
  up: boolean | null
} | null {
  const d = thisWeek - lastWeek
  if (d === 0) return { text: '与上周持平', up: null }
  if (d > 0) return { text: `比上周 +${d}`, up: true }
  return { text: `比上周 ${d}`, up: false }
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-lg px-2 py-1.5',
        accent ? 'bg-muted/50' : 'bg-muted/30',
      )}
    >
      <p className="text-[11px] leading-none text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums leading-tight">{value}</p>
    </div>
  )
}

/** 左侧：提交范围 + 个人看板 + 近期竞赛（从右栏迁来，平衡高度） */
export function LeftRail({
  feedScope,
  onFeedScope,
  isLogin,
  period,
  followingCount,
  followerCount,
  showFeedScope,
}: Props) {
  const loading = isLogin && period == null
  const ac = period?.ac
  const submit = period?.submit
  const weekAc = ac?.thisWeek
  const delta =
    ac != null ? weekDelta(ac.thisWeek, ac.lastWeek) : null

  const [contests, setContests] = useState<ContestCalendarItem[]>([])
  const [contestLoading, setContestLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setContestLoading(true)
    void listContestCalendar({ status: 'upcoming', limit: 4 }).then((res) => {
      if (cancelled) return
      setContestLoading(false)
      if (res.success && res.data) setContests(res.data.list.slice(0, 4))
      else setContests([])
    })
    return () => {
      cancelled = true
    }
  }, [])

  /** 累计 AC 次数（不去重） */
  const totalAcTimes = ac
    ? String(Math.max(ac.totalRaw ?? ac.total, ac.total))
    : loading
      ? '…'
      : '—'
  /** 累计去重题数 */
  const totalProblems = ac ? String(ac.total) : loading ? '…' : '—'

  return (
    <aside
      data-discover-left-rail=""
      className="hidden w-[200px] shrink-0 flex-col gap-3 xl:w-[220px] lg:flex"
    >
      {showFeedScope ? (
        <Card className="gap-2 py-3 shadow-none">
          <CardHeader className="px-3 pb-0 pt-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              提交范围
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3">
            <FeedScopeBar
              variant="rail"
              feedScope={feedScope}
              onFeedScope={onFeedScope}
              isLogin={isLogin}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-2 py-3 shadow-none">
        <CardHeader className="px-3 pb-0 pt-0">
          <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FlameIcon className="size-3.5 text-orange-500" />
            个人看板
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 px-3">
          {isLogin ? (
            <>
              {/* 本周主指标 + 环比 */}
              <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs text-muted-foreground">本周 AC</p>
                  {delta ? (
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 text-[11px]',
                        delta.up === true && 'text-emerald-600 dark:text-emerald-400',
                        delta.up === false && 'text-destructive',
                        delta.up === null && 'text-muted-foreground',
                      )}
                    >
                      {delta.up === true ? (
                        <TrendingUpIcon className="size-3" />
                      ) : null}
                      {delta.up === false ? (
                        <TrendingDownIcon className="size-3" />
                      ) : null}
                      {delta.text}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">
                  {fmtNum(weekAc, loading)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    题
                  </span>
                </p>
              </div>

              {/* 时段网格 */}
              <div className="grid grid-cols-2 gap-1.5">
                <StatCell label="今日 AC" value={fmtNum(ac?.today, loading)} accent />
                <StatCell label="本月 AC" value={fmtNum(ac?.thisMonth, loading)} />
                <StatCell label="累计 AC" value={totalAcTimes} />
                <StatCell label="总题数" value={totalProblems} />
              </div>

              {/* 提交量 */}
              <div className="grid grid-cols-2 gap-1.5">
                <StatCell
                  label="今日提交"
                  value={fmtNum(submit?.today, loading)}
                />
                <StatCell
                  label="本周提交"
                  value={fmtNum(submit?.thisWeek, loading)}
                />
              </div>

              <Separator />

              <div className="flex flex-col gap-0.5">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="justify-start px-2.5"
                >
                  <Link to="/social?tab=following&page=1">
                    <UsersIcon data-icon="inline-start" />
                    我的关注
                    {followingCount != null ? (
                      <span className="ml-auto tabular-nums text-muted-foreground">
                        {followingCount}
                      </span>
                    ) : null}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="justify-start px-2.5"
                >
                  <Link to="/social?tab=followers&page=1">
                    <UsersIcon data-icon="inline-start" />
                    粉丝
                    {followerCount != null ? (
                      <span className="ml-auto tabular-nums text-muted-foreground">
                        {followerCount}
                      </span>
                    ) : null}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="justify-start px-2.5"
                >
                  <Link to="/question-bank">
                    <BookmarkIcon data-icon="inline-start" />
                    题库收藏夹
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="justify-start px-2.5 text-muted-foreground"
                >
                  <Link to="/profile">查看完整数据 →</Link>
                </Button>
              </div>
            </>
          ) : (
            <p className="px-0.5 text-xs leading-relaxed text-muted-foreground">
              登录后可查看今日 / 本周 AC、提交量与关注入口
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-3 py-2.5">
          <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
            <CalendarIcon className="size-3.5 text-muted-foreground" />
            近期竞赛
          </CardTitle>
          <CardDescription className="text-[11px]">
            活动日历速览
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {contestLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-3 py-2">
                <Skeleton className="mb-1 h-3 w-full" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          {!contestLoading &&
            contests.map((c) => (
              <a
                key={c.id}
                href={c.url || undefined}
                target="_blank"
                rel="noreferrer"
                className="block px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <p className="line-clamp-2 text-xs font-medium leading-snug">
                  {c.name}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {c.platformName || c.platform}
                  {c.startTime ? ` · ${formatTime(c.startTime)}` : ''}
                </p>
              </a>
            ))}
          {!contestLoading && !contests.length && (
            <p className="px-3 py-5 text-center text-[11px] text-muted-foreground">
              近期暂无赛事
            </p>
          )}
          <div className="px-2 py-1.5">
            <Button asChild variant="ghost" size="sm" className="h-7 w-full text-xs">
              <Link to="/contest?tab=calendar">打开竞赛日历</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </aside>
  )
}
