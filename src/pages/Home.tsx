import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  BookOpenIcon,
  CalendarDaysIcon,
  ChartLineIcon,
  ExternalLinkIcon,
  SparklesIcon,
  TrophyIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { getRecentSummary } from '@/api/agent'
import { listBulletins } from '@/api/bulletin'
import { getProblemUserProfile } from '@/api/problem'
import { getHeatmap, getPeriod } from '@/api/statistic'
import type {
  AgentSummaryData,
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
import { formatTime, todayYmd } from '@/lib/format'
import { OJ_PLATFORMS } from '@/lib/link'

const OJ_LINKS = [
  {
    label: '牛客竞赛',
    desc: '专业的编程算法训练平台',
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
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm motion-lift hover:bg-muted/30">
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
  const { isLogin, isCoach, isMemberLike, ready, user, orgs } = useAuth()
  const [period, setPeriod] = useState<PeriodData | null>(null)
  const [submitHeat, setSubmitHeat] = useState<HeatmapItem[]>([])
  const [acHeat, setAcHeat] = useState<HeatmapItem[]>([])
  const [bulletins, setBulletins] = useState<BulletinInfo[]>([])
  const [summary, setSummary] = useState<AgentSummaryData | null>(null)
  const [algo, setAlgo] = useState<ProblemUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'submit' | 'ac'>('ac')

  // 所在组织任一开启 AI 总结才展示；未登录保留入口提示
  const showAiSummary =
    !isLogin || orgs.some((o) => o.enableAiSummary !== false)

  useEffect(() => {
    // 等待鉴权就绪，避免登录态闪烁双请求
    if (!ready) return
    // 纯教练不加载首页数据
    if (isCoach) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const uid = isLogin && user ? user.userId : -1
      const end = todayYmd()
      const tasks: Promise<unknown>[] = [
        getPeriod(uid).then((res) => {
          if (!cancelled && res.success) setPeriod(res.data)
          else if (!res.success) toast.error(res.message || '统计加载失败')
        }),
        getHeatmap({
          startDate: '20230101',
          endDate: end,
          isAc: false,
          ...(uid > 0 ? { userId: uid } : {}),
        }).then((res) => {
          if (!cancelled && res.success) setSubmitHeat(res.data || [])
        }),
        getHeatmap({
          startDate: '20230101',
          endDate: end,
          isAc: true,
          ...(uid > 0 ? { userId: uid } : {}),
        }).then((res) => {
          if (!cancelled && res.success) setAcHeat(res.data || [])
        }),
        listBulletins(1, 5).then((res) => {
          if (!cancelled && res.success && res.data) setBulletins(res.data.list)
        }),
      ]
      if (isLogin && user) {
        if (showAiSummary) {
          tasks.push(
            getRecentSummary(user.userId).then((res) => {
              if (!cancelled && res.success) setSummary(res.data)
            }),
          )
        } else {
          setSummary(null)
        }
        tasks.push(
          getProblemUserProfile(user.userId).then((res) => {
            if (!cancelled && res.success) setAlgo(res.data)
          }),
        )
      } else {
        setSummary(null)
        setAlgo(null)
      }
      await Promise.all(tasks)
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [ready, isLogin, isCoach, user, showAiSummary])

  const stats: PeriodItem | null = mode === 'ac' ? period?.ac ?? null : period?.submit ?? null
  const modeLabel = mode === 'ac' ? 'AC' : '提交'
  const acRate =
    period && period.submit.total > 0
      ? ((period.ac.total / period.submit.total) * 100).toFixed(2)
      : '-'

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

  // 纯教练：首页是队员视图，直接进管理端
  if (ready && isCoach) {
    return <Navigate to="/admin" replace />
  }

  function QuickLinks() {
    return (
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <div className="flex items-center gap-2">
            <ExternalLinkIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">快捷入口</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-4 sm:grid-cols-2">
          {OJ_LINKS.map((o) => (
            <a
              key={o.href}
              href={o.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm"
            >
              <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background p-1">
                <img
                  src={o.icon}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{o.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {o.desc}
                </p>
              </div>
            </a>
          ))}
          {isLogin && isMemberLike && (
            <Link
              to="/change-profile"
              className="flex items-center justify-center rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/40"
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
              {isLogin ? '' : '全站'}数据统计
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
            sub={`累计${modeLabel}`}
            value={stats?.total ?? '-'}
            loading={loading}
          />
          <StatCard
            label="AC 率"
            sub="通过 / 提交"
            value={acRate === '-' ? '-' : `${acRate}%`}
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

      {/* ② 主从双栏 — 对齐旧版 dashboard-grid 2fr | 1fr；移动端快捷入口沉底 */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        {/* 左：热力图 → 算法画像（桌面端快捷入口在左栏底部） */}
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
                <Tabs defaultValue="submit">
                  <TabsList>
                    <TabsTrigger value="submit">提交热力图</TabsTrigger>
                    <TabsTrigger value="ac">AC 热力图</TabsTrigger>
                  </TabsList>
                  <TabsContent value="submit" className="pt-3">
                    <HeatmapSimple items={submitHeat} />
                  </TabsContent>
                  <TabsContent value="ac" className="pt-3">
                    <HeatmapSimple items={acHeat} />
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
                  根据已通过题目与 AI 标签生成
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

          <div className="hidden xl:block">
            <QuickLinks />
          </div>
        </div>

        {/* 右：公告 → AI 总结 */}
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
                : bulletins.map((b) => (
                    <Link
                      key={b.id}
                      to={`/bulletin?expand=${b.id}`}
                      className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-sm"
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        {b.isPinned && (
                          <Badge className="shrink-0" variant="secondary">
                            置顶
                          </Badge>
                        )}
                        <span className="line-clamp-2 leading-snug">{b.title}</span>
                      </span>
                      <span className="shrink-0 pt-0.5 text-[11px] text-muted-foreground">
                        {formatTime(b.createdAt)}
                      </span>
                    </Link>
                  ))}
              {!loading && !bulletins.length && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  暂无公告
                </p>
              )}
            </CardContent>
          </Card>

          {showAiSummary && (
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">AI 总结</CardTitle>
                </div>
                <CardDescription>
                  {isLogin
                    ? summary?.updateTime
                      ? `更新于 ${formatTime(summary.updateTime)}`
                      : '基于近期训练数据'
                    : '登录后查看个人 AI 总结'}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                {!isLogin ? (
                  <p className="text-sm text-muted-foreground">
                    <Link
                      to="/login"
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      登录
                    </Link>
                    后可查看 AI 总结与算法画像。支持绑定：
                    {OJ_PLATFORMS.map((p) => p.label).join(' / ')}
                  </p>
                ) : loading ? (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <>
                    <ul className="flex flex-col gap-2 text-sm">
                      {(summary?.msg || []).map((m, i) => (
                        <li
                          key={i}
                          className="rounded-md border bg-muted/20 px-3 py-2 leading-relaxed"
                        >
                          {m}
                        </li>
                      ))}
                      {!summary?.msg?.length && (
                        <li className="text-muted-foreground">暂无总结</li>
                      )}
                    </ul>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      内容由 AI 生成，请仔细甄别。
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="xl:hidden">
          <QuickLinks />
        </div>
      </div>
    </PageShell>
  )
}
