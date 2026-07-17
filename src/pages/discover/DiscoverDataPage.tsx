import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookmarkIcon,
  ChartLineIcon,
  CalendarDaysIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { getProblemUserProfile } from '@/api/problem'
import { getSocialCounts } from '@/api/social'
import { getHeatmap, getPeriod } from '@/api/statistic'
import type {
  HeatmapItem,
  PeriodData,
  PeriodItem,
  ProblemUserProfile,
} from '@shared/api'
import { AlgoProfileChart } from '@/components/charts/algo-profile-chart'
import { HeatmapSimple } from '@/components/heatmap-simple'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { todayYmd } from '@/lib/format'

type Props = {
  isLogin: boolean
  userId?: number
}

function trendOf(curr: number, prev: number): {
  text: string
  up: boolean | null
} {
  const d = curr - prev
  if (d === 0) return { text: '与上期持平', up: null }
  if (prev <= 0) {
    return { text: d > 0 ? `+${d}` : `${d}`, up: d > 0 }
  }
  const pct = ((d / prev) * 100).toFixed(0)
  return {
    text: d > 0 ? `+${pct}%` : `${pct}%`,
    up: d > 0,
  }
}

function StatTile({
  label,
  value,
  hint,
  trend,
  loading,
  accent,
}: {
  label: string
  value: string
  hint?: string
  trend?: { text: string; up: boolean | null }
  loading?: boolean
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl border p-3',
        accent ? 'bg-muted/40' : 'bg-card',
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="text-2xl font-semibold tabular-nums tracking-tight leading-none">
          {value}
        </p>
      )}
      {hint && !loading ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
      {trend && !loading ? (
        <p
          className={cn(
            'inline-flex items-center gap-0.5 text-[11px]',
            trend.up === true && 'text-emerald-600 dark:text-emerald-400',
            trend.up === false && 'text-rose-600 dark:text-rose-400',
            trend.up === null && 'text-muted-foreground',
          )}
        >
          {trend.up === true ? <TrendingUpIcon className="size-3" /> : null}
          {trend.up === false ? <TrendingDownIcon className="size-3" /> : null}
          {trend.text}
        </p>
      ) : null}
    </div>
  )
}

/**
 * 发现 · 数据：完整个人/全站统计页（非薄看板）。
 * 含 AC/提交切换、多时段指标、热力图、能力画像与社交入口。
 */
export function DiscoverDataPage({ isLogin, userId }: Props) {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodData | null>(null)
  const [mode, setMode] = useState<'ac' | 'submit'>('ac')
  const [submitHeat, setSubmitHeat] = useState<HeatmapItem[]>([])
  const [acHeat, setAcHeat] = useState<HeatmapItem[]>([])
  const [heatTab, setHeatTab] = useState<'submit' | 'ac'>('submit')
  const [acHeatLoaded, setAcHeatLoaded] = useState(false)
  const [acHeatLoading, setAcHeatLoading] = useState(false)
  const [algo, setAlgo] = useState<ProblemUserProfile | null>(null)
  const [followingCount, setFollowingCount] = useState<number | null>(null)
  const [followerCount, setFollowerCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setAcHeat([])
      setAcHeatLoaded(false)
      setHeatTab('submit')
      const uid = isLogin && userId ? userId : -1
      const end = todayYmd()
      const tasks: Promise<unknown>[] = [
        getPeriod(uid).then((res) => {
          if (cancelled) return
          if (res.success && res.data) setPeriod(res.data)
          else {
            setPeriod(null)
            if (!res.success) {
              toast.error(res.message || '统计加载失败，请稍后重试')
            }
          }
        }),
        getHeatmap({
          startDate: '20230101',
          endDate: end,
          isAc: false,
          ...(uid > 0 ? { userId: uid } : {}),
        }).then((res) => {
          if (!cancelled && res.success) setSubmitHeat(res.data || [])
        }),
      ]
      if (isLogin && userId) {
        tasks.push(
          getProblemUserProfile(userId).then((res) => {
            if (!cancelled && res.success) setAlgo(res.data)
            else if (!cancelled) setAlgo(null)
          }),
          getSocialCounts(userId).then((res) => {
            if (cancelled) return
            if (res.success && res.data) {
              setFollowingCount(res.data.followingCount)
              setFollowerCount(res.data.followerCount)
            } else {
              setFollowingCount(0)
              setFollowerCount(0)
            }
          }),
        )
      } else {
        setAlgo(null)
        setFollowingCount(null)
        setFollowerCount(null)
      }
      await Promise.all(tasks)
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isLogin, userId])

  useEffect(() => {
    if (heatTab !== 'ac' || acHeatLoaded) return
    let cancelled = false
    async function loadAc() {
      setAcHeatLoading(true)
      try {
        const uid = isLogin && userId ? userId : -1
        const res = await getHeatmap({
          startDate: '20230101',
          endDate: todayYmd(),
          isAc: true,
          ...(uid > 0 ? { userId: uid } : {}),
        })
        if (cancelled) return
        if (res.success) setAcHeat(res.data || [])
        else toast.error(res.message || 'AC 热力图加载失败')
        setAcHeatLoaded(true)
      } finally {
        if (!cancelled) setAcHeatLoading(false)
      }
    }
    void loadAc()
    return () => {
      cancelled = true
    }
  }, [heatTab, acHeatLoaded, isLogin, userId])

  const stats: PeriodItem | null =
    mode === 'ac' ? (period?.ac ?? null) : (period?.submit ?? null)
  const modeLabel = mode === 'ac' ? 'AC' : '提交'

  const careerValue = useMemo(() => {
    if (!period) return '—'
    if (mode === 'submit') return String(period.submit.total)
    // 生涯只展示 AC 次数；去重题数见「总题数」
    const problems = period.ac.total
    return String(Math.max(period.ac.totalRaw ?? problems, problems))
  }, [period, mode])

  const totalProblems = period != null ? String(period.ac.total) : '—'

  const weekTrend = stats
    ? trendOf(stats.thisWeek, stats.lastWeek)
    : undefined
  const monthTrend = stats
    ? trendOf(stats.thisMonth, stats.lastMonth)
    : undefined
  const yearTrend = stats
    ? trendOf(stats.thisYear, stats.lastYear)
    : undefined

  return (
    <div data-discover-data-page="" className="mx-auto flex w-full max-w-lg flex-col gap-4">
      {!isLogin ? (
        <Card className="gap-0 py-0 shadow-none">
          <CardContent className="flex flex-col gap-3 px-4 py-5">
            <p className="text-sm text-muted-foreground">
              登录后可查看你的 AC、提交、热力图与能力画像；未登录时展示全站汇总。
            </p>
            <Button asChild size="sm" className="w-fit">
              <Link to="/login">去登录</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ChartLineIcon className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {isLogin ? '我的刷题数据' : '全站数据'}
            </h3>
          </div>
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v === 'submit' ? 'submit' : 'ac')}
          >
            <TabsList>
              <TabsTrigger value="ac">AC</TabsTrigger>
              <TabsTrigger value="submit">提交</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <StatTile
            label="生涯"
            value={careerValue}
            hint={mode === 'ac' ? '累计 AC 次数' : '累计提交'}
            loading={loading}
            accent
          />
          <StatTile
            label="总题数"
            value={totalProblems}
            hint="累计通过题"
            loading={loading}
          />
          <StatTile
            label="今日"
            value={loading ? '…' : String(stats?.today ?? '—')}
            hint={`今日${modeLabel}`}
            loading={loading}
          />
          <StatTile
            label="本周"
            value={loading ? '…' : String(stats?.thisWeek ?? '—')}
            hint={`本周${modeLabel}`}
            trend={weekTrend}
            loading={loading}
            accent
          />
          <StatTile
            label="本月"
            value={loading ? '…' : String(stats?.thisMonth ?? '—')}
            hint={`本月${modeLabel}`}
            trend={monthTrend}
            loading={loading}
          />
          <StatTile
            label="本年"
            value={loading ? '…' : String(stats?.thisYear ?? '—')}
            hint={`本年${modeLabel}`}
            trend={yearTrend}
            loading={loading}
          />
        </div>
      </section>

      {isLogin ? (
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <UsersIcon className="size-3.5 text-muted-foreground" />
              社交
            </CardTitle>
            <CardDescription className="text-xs">关注与粉丝</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 p-3">
            <Button asChild variant="outline" className="h-auto flex-col gap-0.5 py-3">
              <Link to="/social?tab=following&page=1">
                <span className="text-lg font-semibold tabular-nums">
                  {followingCount != null ? followingCount : '—'}
                </span>
                <span className="text-xs text-muted-foreground">关注</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-0.5 py-3">
              <Link to="/social?tab=followers&page=1">
                <span className="text-lg font-semibold tabular-nums">
                  {followerCount != null ? followerCount : '—'}
                </span>
                <span className="text-xs text-muted-foreground">粉丝</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarDaysIcon className="size-3.5 text-muted-foreground" />
              热力图
            </CardTitle>
            <Tabs
              value={heatTab}
              onValueChange={(v) => setHeatTab(v === 'ac' ? 'ac' : 'submit')}
            >
              <TabsList>
                <TabsTrigger value="submit">提交</TabsTrigger>
                <TabsTrigger value="ac">AC</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardDescription className="text-xs">
            从 2023 年起的每日活跃
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 py-3">
          {loading ? (
            <Skeleton className="h-28 w-full" />
          ) : heatTab === 'submit' ? (
            <HeatmapSimple items={submitHeat} />
          ) : acHeatLoading || !acHeatLoaded ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <HeatmapSimple items={acHeat} />
          )}
        </CardContent>
      </Card>

      {isLogin && algo ? (
        <div className="min-w-0">
          <AlgoProfileChart data={algo} />
        </div>
      ) : null}

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-sm">快捷入口</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 p-2">
          <Button asChild variant="ghost" size="sm" className="justify-start">
            <Link to="/profile">
              <UserIcon data-icon="inline-start" />
              个人主页
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="justify-start">
            <Link to="/question-bank">
              <BookmarkIcon data-icon="inline-start" />
              题库收藏夹
            </Link>
          </Button>
          {isLogin ? (
            <Button asChild variant="ghost" size="sm" className="justify-start">
              <Link to="/change-profile">绑定 OJ 账号</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
