import { useEffect, useMemo, useState } from 'react'
import { useHoverLift } from '@/hooks/use-hover-motion'
import { Link } from 'react-router-dom'
import {
  BookOpenIcon,
  CalendarDaysIcon,
  ChartLineIcon,
  ExternalLinkIcon,
  SparklesIcon,
  TrophyIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { listBulletins } from '@/api/bulletin'
import { getProblemUserProfile } from '@/api/problem'
import { getHeatmap, getPeriod } from '@/api/statistic'
import type {
  BulletinInfo,
  HeatmapItem,
  PeriodData,
  PeriodItem,
  ProblemUserProfile,
} from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { AlgoProfileChart } from '@/components/charts/algo-profile-chart'
import { HeatmapSimple } from '@/components/heatmap-simple'
import { PageShell } from '@/components/page-shell'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { formatTime, heatmapStartForUser, todayYmd } from '@/lib/format'

const OJ_LINKS = [
  {
    label: '牛客竞赛',
    desc: 'OJ 平台',
    href: 'https://ac.nowcoder.com/',
    icon: '/images/ac.nowcoder.webp',
  },
  {
    label: '牛客 Tracker',
    desc: '每日刷题与进度追踪',
    href: 'https://www.nowcoder.com/problem/tracker#/daily',
    icon: '/images/www.nowcoder.webp',
  },
  {
    label: '洛谷',
    desc: '国内算法学习社区',
    href: 'https://www.luogu.com.cn/',
    icon: 'https://fecdn.luogu.com.cn/columba/static.325908fec383795b.logo-single-color.svg',
  },
  {
    label: 'AtCoder',
    desc: '日本算法竞赛平台',
    href: 'https://atcoder.jp/home',
    icon: 'https://img.atcoder.jp/assets/logo.png',
  },
  {
    label: 'Codeforces',
    desc: '国际算法竞赛平台',
    href: 'https://codeforces.com/',
    icon: 'https://codeforces.com/codeforces.org/s/52348/android-icon-192x192.png',
  },
  {
    label: '力扣',
    desc: '面试算法题库',
    href: 'https://leetcode.cn/',
    icon: 'https://assets.leetcode.cn/aliyun-lc-upload/uploaded_files/2021/03/73c9f099-abbe-4d94-853f-f8abffd459cd/leetcode.png',
  },
]

function trendOf(curr: number, prev: number) {
  if (prev <= 0 && curr <= 0) return { icon: '—', text: '0', up: null as boolean | null }
  if (prev <= 0) return { icon: '↑', text: String(curr), up: true }
  const delta = curr - prev
  if (delta === 0) return { icon: '—', text: '0', up: null }
  const pct = ((delta / prev) * 100).toFixed(0)
  return {
    icon: delta > 0 ? '↑' : '↓',
    text: `${delta > 0 ? '+' : ''}${pct}%`,
    up: delta > 0,
  }
}

function OjLink({
  href,
  label,
  desc,
  icon,
}: {
  href: string
  label: string
  desc: string
  icon: string
}) {
  const { ref, hoverHandlers } = useHoverLift<HTMLAnchorElement>()
  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noreferrer"
      title={desc}
      className="group flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm lg:gap-3 lg:px-3 lg:py-2.5"
      {...hoverHandlers}
    >
      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background p-1 lg:size-11">
        <img
          src={icon}
          alt=""
          className="max-h-full max-w-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-tight">{label}</p>
        {/* PC 竖排有空间展示说明；移动端两列只保留名称 */}
        <p className="mt-0.5 hidden text-xs text-muted-foreground line-clamp-1 lg:block">
          {desc}
        </p>
      </div>
    </a>
  )
}

function StatCard({
  label,
  sub,
  value,
  unit,
  trend,
  loading,
}: {
  label: string
  sub: string
  value: string | number
  unit?: string
  trend?: { icon: string; text: string; up: boolean | null }
  loading?: boolean
}) {
  const { ref, hoverHandlers } = useHoverLift<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm motion-lift hover:bg-muted/30"
      {...hoverHandlers}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
        <TrophyIcon className="size-4 text-muted-foreground/70" />
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-20" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
      )}
      {unit && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{unit}</p>
      )}
      {trend && !loading && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            className={cn(
              'font-medium tabular-nums',
              trend.up === true && 'text-emerald-600 dark:text-emerald-400',
              trend.up === false && 'text-destructive',
              trend.up === null && 'text-muted-foreground',
            )}
          >
            {trend.icon} {trend.text}
          </span>
          <span className="text-muted-foreground">较上期</span>
        </div>
      )}
    </div>
  )
}

export function Home() {
  const { isLogin, isMemberLike, ready, user } = useAuth()
  const [period, setPeriod] = useState<PeriodData | null>(null)
  const [submitHeat, setSubmitHeat] = useState<HeatmapItem[]>([])
  const [acHeat, setAcHeat] = useState<HeatmapItem[]>([])
  const [acHeatLoaded, setAcHeatLoaded] = useState(false)
  const [acHeatLoading, setAcHeatLoading] = useState(false)
  const [heatTab, setHeatTab] = useState<'submit' | 'ac'>('submit')
  const [bulletins, setBulletins] = useState<BulletinInfo[]>([])
  const [algo, setAlgo] = useState<ProblemUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'submit' | 'ac'>('ac')

  useEffect(() => {
    // 等待鉴权就绪，避免登录态闪烁双请求
    if (!ready) return
    let cancelled = false
    async function load() {
      setLoading(true)
      // 登录：个人；未登录：全站公开聚合 userId=-2
      const periodUid = isLogin && user ? user.userId : -2
      const heatUid = isLogin && user ? user.userId : -2
      const end = todayYmd()
      const start = heatmapStartForUser(heatUid, end)
      setAcHeat([])
      setAcHeatLoaded(false)
      setAcHeatLoading(false)
      setHeatTab('submit')
      const tasks: Promise<unknown>[] = [
        getPeriod(periodUid).then((res) => {
          if (!cancelled && res.success) setPeriod(res.data)
          else if (!res.success) toast.error(res.message || '统计加载失败，请稍后重试')
        }),
        getHeatmap({
          startDate: start,
          endDate: end,
          isAc: false,
          userId: heatUid,
        }).then((res) => {
          if (!cancelled && res.success) setSubmitHeat(res.data || [])
        }),
        listBulletins(1, 5).then((res) => {
          if (!cancelled && res.success && res.data) setBulletins(res.data.list)
        }),
      ]
      if (isLogin && user) {
        tasks.push(
          getProblemUserProfile(user.userId).then((res) => {
            if (!cancelled && res.success) setAlgo(res.data)
          }),
        )
      } else {
        setAlgo(null)
      }
      await Promise.all(tasks)
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [ready, isLogin, user])

  // 首屏后空闲预取 AC（勿把 acHeatLoading 放进 deps，否则 setLoading 会 cancel 请求）
  useEffect(() => {
    if (loading || acHeatLoaded) return
    let cancelled = false
    const heatUid = isLogin && user ? user.userId : -2
    const end = todayYmd()
    const t = window.setTimeout(() => {
      setAcHeatLoading(true)
      void getHeatmap({
        startDate: heatmapStartForUser(heatUid, end),
        endDate: end,
        isAc: true,
        userId: heatUid,
      }).then((res) => {
        if (cancelled) return
        if (res.success) setAcHeat(res.data || [])
        else toast.error(res.message || '刷题热力图加载失败，请稍后重试')
        setAcHeatLoaded(true)
        setAcHeatLoading(false)
      })
    }, 80)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [loading, acHeatLoaded, isLogin, user])

  const stats: PeriodItem | null = mode === 'ac' ? period?.ac ?? null : period?.submit ?? null
  const modeLabel = mode === 'ac' ? 'AC' : '提交'
  /** 生涯 AC 次数（不去重）；日汇总落后时用题数兜底 */
  const careerAcTimes = period
    ? Math.max(period.ac.totalRaw ?? period.ac.total, period.ac.total)
    : null
  /** 累计去重题数 */
  const totalProblems = period?.ac.total ?? null

  const yearTrend = useMemo(
    () => (stats ? trendOf(stats.thisYear, stats.lastYear) : undefined),
    [stats],
  )
  const monthTrend = useMemo(
    () => (stats ? trendOf(stats.thisMonth, stats.lastMonth) : undefined),
    [stats],
  )
  const weekTrend = useMemo(
    () => (stats ? trendOf(stats.thisWeek, stats.lastWeek) : undefined),
    [stats],
  )

  function QuickLinks() {
    return (
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <div className="flex items-center gap-2">
            <ExternalLinkIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">快捷入口</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 px-4 lg:grid-cols-1">
          {OJ_LINKS.map((o) => (
            <OjLink key={o.href} href={o.href} label={o.label} desc={o.desc} icon={o.icon} />
          ))}
          {isLogin && isMemberLike && (
            <Link
              to="/change-profile"
              className="col-span-2 flex items-center justify-center rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/40 lg:col-span-1"
            >
              绑定 OJ 账号
            </Link>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <PageShell className="gap-5">
      {/* ① 全宽统计 — 对齐旧版 data-section */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ChartLineIcon className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">
              {isLogin ? '我的' : '全站'}数据统计
            </h2>
          </div>
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'submit' | 'ac')}>
            <TabsList>
              <TabsTrigger value="ac">AC 数据</TabsTrigger>
              <TabsTrigger value="submit">提交数据</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="生涯"
            sub={mode === 'ac' ? '累计 AC 次数' : '累计提交'}
            value={
              mode === 'ac'
                ? (careerAcTimes ?? '-')
                : (stats?.total ?? '-')
            }
            loading={loading}
          />
          <StatCard
            label="总题数"
            sub="累计通过题"
            value={totalProblems ?? '-'}
            loading={loading}
          />
          <StatCard
            label="今日"
            sub={`今日${modeLabel}`}
            value={stats?.today ?? '-'}
            loading={loading}
          />
          <StatCard
            label="本年"
            sub={`本年${modeLabel}`}
            value={stats?.thisYear ?? '-'}
            trend={yearTrend}
            loading={loading}
          />
          <StatCard
            label="本月"
            sub={`本月${modeLabel}`}
            value={stats?.thisMonth ?? '-'}
            trend={monthTrend}
            loading={loading}
          />
          <StatCard
            label="本周"
            sub={`本周${modeLabel}`}
            value={stats?.thisWeek ?? '-'}
            trend={weekTrend}
            loading={loading}
          />
        </div>
      </section>

      {/* ② 主从双栏 — 左：热力图/画像；右：公告/快捷入口 */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="gap-3 py-4">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-4 space-y-0">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">热力图</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4">
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <Tabs
                  value={heatTab}
                  onValueChange={(v) => setHeatTab(v === 'ac' ? 'ac' : 'submit')}
                >
                  <TabsList>
                    <TabsTrigger value="submit">提交热力图</TabsTrigger>
                    <TabsTrigger value="ac">AC 热力图</TabsTrigger>
                  </TabsList>
                  <TabsContent value="submit" className="pt-3">
                    <HeatmapSimple items={submitHeat} />
                  </TabsContent>
                  <TabsContent value="ac" className="pt-3">
                    {acHeatLoading || !acHeatLoaded ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <HeatmapSimple items={acHeat} />
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {isLogin && (
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">算法画像</CardTitle>
                </div>
                <CardDescription>
                  根据你已通过的题目与标签生成
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                {loading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <AlgoProfileChart data={algo} />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右：公告 → 快捷入口 */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="gap-3 py-4">
            <CardHeader className="flex flex-row items-center justify-between px-4 space-y-0">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">公告</CardTitle>
              </div>
              <Link
                to="/bulletin"
                className="text-xs text-muted-foreground hover:underline"
              >
                查看全部
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 px-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))
                : bulletins.map((b) => {
                    const isSite = !b.scope || b.scope === 'site'
                    return (
                    <Link
                      key={b.id}
                      to={`/bulletin?expand=${b.id}`}
                      className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-[background-color,box-shadow] duration-150 ease-out hover:bg-muted/40 hover:shadow-sm"
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        {isSite ? (
                          <Badge className="shrink-0">站点</Badge>
                        ) : (
                          <Badge className="shrink-0" variant="secondary">
                            组织
                          </Badge>
                        )}
                        {b.isPinned && (
                          <Badge className="shrink-0" variant="outline">
                            置顶
                          </Badge>
                        )}
                        <span className="line-clamp-2 leading-snug">{b.title}</span>
                      </span>
                      <span className="shrink-0 pt-0.5 text-[11px] text-muted-foreground">
                        {formatTime(b.createdAt)}
                      </span>
                    </Link>
                    )
                  })}
              {!loading && !bulletins.length && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  暂无公告
                </p>
              )}
            </CardContent>
          </Card>

          <QuickLinks />
        </div>
      </div>
    </PageShell>
  )
}
