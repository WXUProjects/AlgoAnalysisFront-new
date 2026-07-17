import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlameIcon, TrophyIcon } from 'lucide-react'
import { listHotProblems } from '@/api/problem'
import { getRank } from '@/api/statistic'
import type { HotProblemItem, StatisticRankItem } from '@shared/api'
import { Badge } from '@/components/ui/badge'
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

export function RightSidebar() {
  const [rankPeriod, setRankPeriod] = useState<RankPeriod>('week')
  const [rank, setRank] = useState<StatisticRankItem[]>([])
  const [rankLoading, setRankLoading] = useState(true)
  const [rankAllOpen, setRankAllOpen] = useState(false)
  const [hotProblems, setHotProblems] = useState<HotProblemItem[]>([])
  const [hotLoading, setHotLoading] = useState(true)
  const [hotAllOpen, setHotAllOpen] = useState(false)
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
                    <p
                      className="truncate text-sm font-medium leading-snug"
                      title={p.title || p.externalId || `题目 ${p.id}`}
                    >
                      {p.title || p.externalId || `题目 ${p.id}`}
                    </p>
                    {meta ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {meta}
                      </p>
                    ) : null}
                    {p.tags?.length ? (
                      <div className="mt-1 flex min-w-0 flex-nowrap gap-1 overflow-hidden">
                        {p.tags.slice(0, 3).map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="h-5 max-w-[6.5rem] shrink-0 truncate px-1.5 text-[10px] font-normal text-muted-foreground"
                          >
                            {t}
                          </Badge>
                        ))}
                        {p.tags.length > 3 ? (
                          <span className="shrink-0 text-[10px] leading-5 text-muted-foreground">
                            +{p.tags.length - 3}
                          </span>
                        ) : null}
                      </div>
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
    </aside>
  )
}
