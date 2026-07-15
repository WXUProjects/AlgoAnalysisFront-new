import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ExternalLinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { listProfiles, getProfileById } from '@/api/profile'
import { updateSpider } from '@/api/spider'
import { getHeatmap, getPeriod } from '@/api/statistic'
import { getSubmitLogs } from '@/api/submitLog'
import { listContests } from '@/api/contest'
import { getProblemUserProfile } from '@/api/problem'
import type {
  ContestItem,
  HeatmapItem,
  PeriodData,
  PeriodItem,
  ProblemUserProfile,
  SubmitLogItem,
  UserProfile,
} from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { AlgoProfileChart } from '@/components/charts/algo-profile-chart'
import { HeatmapSimple } from '@/components/heatmap-simple'
import { PageShell } from '@/components/page-shell'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { formatActivityProblemTitle } from '@/lib/activity-title'
import { formatTime, todayYmd } from '@/lib/format'
import { getPlatformHomeLink, getSubmitLink, OJ_PLATFORMS } from '@/lib/link'
import { cn } from '@/lib/utils'

type StatRow = {
  title: string
  value: number
  ave: number
  grow?: number
}

function buildRows(
  user: PeriodItem | undefined,
  global: PeriodItem | undefined,
  userCount: number,
  kind: 'ac' | 'submit',
  acRate: number,
  globalAcRate: number,
): StatRow[] {
  const u = user
  const g = global
  const n = Math.max(userCount, 1)
  const ave = (v: number | undefined) => (v ?? 0) / n
  const prefix = kind === 'ac' ? 'AC' : '提交'
  return [
    {
      title: `今日${prefix}`,
      value: u?.today ?? 0,
      ave: ave(g?.today),
    },
    {
      title: `本周${prefix}`,
      value: u?.thisWeek ?? 0,
      ave: ave(g?.thisWeek),
      grow: (u?.thisWeek ?? 0) - (u?.lastWeek ?? 0),
    },
    {
      title: `本月${prefix}`,
      value: u?.thisMonth ?? 0,
      ave: ave(g?.thisMonth),
      grow: (u?.thisMonth ?? 0) - (u?.lastMonth ?? 0),
    },
    {
      title: `今年${prefix}`,
      value: u?.thisYear ?? 0,
      ave: ave(g?.thisYear),
      grow: (u?.thisYear ?? 0) - (u?.lastYear ?? 0),
    },
    {
      title: `总${prefix}`,
      value: u?.total ?? 0,
      ave: ave(g?.total),
    },
    {
      title: 'AC率',
      value: acRate,
      ave: globalAcRate,
    },
  ]
}

function StatBarRow({ row }: { row: StatRow }) {
  const denom = row.value + row.ave
  const pct = denom > 0 ? Math.min(100, (row.value / denom) * 100) : 0
  const avePct = denom > 0 ? Math.min(100, (row.ave / denom) * 100) : 0
  const isRate = row.title === 'AC率'
  const display = isRate ? `${row.value.toFixed(2)}%` : String(row.value)
  const aveDisplay = isRate ? `${row.ave.toFixed(2)}%` : row.ave.toFixed(2)

  const growClass = cn(
    'text-xs font-medium',
    row.grow !== undefined && row.grow > 0 && 'text-destructive',
    row.grow !== undefined && row.grow < 0 && 'text-emerald-600 dark:text-emerald-400',
    row.grow === 0 && 'text-muted-foreground',
  )
  const growText =
    row.grow === undefined ? null : row.grow > 0 ? `+${row.grow}` : String(row.grow)

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center justify-between gap-2 sm:w-20 sm:shrink-0 sm:block">
        <div className="text-sm text-muted-foreground">{row.title}</div>
        <div className="flex items-center gap-1.5 tabular-nums sm:hidden">
          <span className="text-sm font-semibold">{display}</span>
          {growText !== null && <span className={growClass}>{growText}</span>}
        </div>
      </div>
      <div className="relative h-2.5 w-full min-w-0 flex-1 rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-sky-500/80 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
        {row.ave > 0 && (
          <div
            className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 bg-destructive"
            style={{ left: `calc(${avePct}% - 1px)` }}
            title={`全站人均 ${aveDisplay}`}
          />
        )}
      </div>
      <div className="hidden w-28 shrink-0 items-center justify-end gap-1.5 tabular-nums sm:flex">
        <span className="text-sm font-semibold">{display}</span>
        {growText !== null && <span className={growClass}>{growText}</span>}
      </div>
    </div>
  )
}

export function Profile() {
  const { user, isLogin, logout } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryId = searchParams.get('id')
  const targetId = queryId ? Number(queryId) : user?.userId || 0
  const isSelf = Boolean(isLogin && user && targetId === user.userId)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [period, setPeriod] = useState<PeriodData | null>(null)
  const [globalPeriod, setGlobalPeriod] = useState<PeriodData | null>(null)
  const [userCount, setUserCount] = useState(1)
  const [submitHeat, setSubmitHeat] = useState<HeatmapItem[]>([])
  const [acHeat, setAcHeat] = useState<HeatmapItem[]>([])
  const [activities, setActivities] = useState<SubmitLogItem[]>([])
  const [contests, setContests] = useState<ContestItem[]>([])
  const [algo, setAlgo] = useState<ProblemUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [mode, setMode] = useState<'submit' | 'ac'>('ac')

  const spiderMap = useMemo(() => {
    const m = new Map<string, string>()
    profile?.spiders.forEach((s) => m.set(s.platform, s.username))
    return m
  }, [profile])

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    if (!targetId) return
    setLoading(true)
    const end = todayYmd()
    const [
      pRes,
      periodRes,
      globalRes,
      listRes,
      hSubmit,
      hAc,
      acts,
      cont,
      algoRes,
    ] = await Promise.all([
      getProfileById(targetId),
      getPeriod(targetId),
      getPeriod(-1),
      listProfiles(1, 1),
      getHeatmap({
        startDate: '20230101',
        endDate: end,
        isAc: false,
        userId: targetId,
      }),
      getHeatmap({
        startDate: '20230101',
        endDate: end,
        isAc: true,
        userId: targetId,
      }),
      getSubmitLogs({ userId: targetId, cursor: -1, limit: 10 }),
      listContests({ userId: targetId, limit: 5, offset: 0 }),
      getProblemUserProfile(targetId),
    ])
    if (signal?.cancelled) return
    setLoading(false)

    if (!pRes.success || !pRes.data) {
      toast.error(pRes.message || '加载资料失败')
      setProfile(null)
      return
    }
    setProfile(pRes.data)
    if (periodRes.success) setPeriod(periodRes.data)
    if (globalRes.success) setGlobalPeriod(globalRes.data)
    if (listRes.success && listRes.data) {
      setUserCount(Math.max(listRes.data.total, 1))
    }
    if (hSubmit.success) setSubmitHeat(hSubmit.data || [])
    if (hAc.success) setAcHeat(hAc.data || [])
    if (acts.success) setActivities(acts.data || [])
    if (cont.success) setContests(cont.data?.list || [])
    if (algoRes.success) setAlgo(algoRes.data)
  }, [targetId])

  useEffect(() => {
    const signal = { cancelled: false }
    void load(signal)
    return () => {
      signal.cancelled = true
    }
  }, [load])

  async function handleUpdateOj() {
    if (!targetId) return
    setUpdating(true)
    const res = await updateSpider(targetId)
    setUpdating(false)
    if (res.success) {
      toast.success(res.message || '已开始同步 OJ 数据')
    } else {
      toast.error(res.message || '更新失败')
    }
  }

  function handleLogout() {
    logout()
    toast.success('已退出登录')
    navigate('/login', { replace: true })
  }

  const acRate =
    period && period.submit.total > 0
      ? (period.ac.total / period.submit.total) * 100
      : 0
  const globalAcRate =
    globalPeriod && globalPeriod.submit.total > 0
      ? (globalPeriod.ac.total / globalPeriod.submit.total) * 100
      : 0

  const statRows = useMemo(() => {
    if (mode === 'ac') {
      return buildRows(
        period?.ac,
        globalPeriod?.ac,
        userCount,
        'ac',
        acRate,
        globalAcRate,
      )
    }
    return buildRows(
      period?.submit,
      globalPeriod?.submit,
      userCount,
      'submit',
      acRate,
      globalAcRate,
    )
  }, [mode, period, globalPeriod, userCount, acRate, globalAcRate])

  if (loading) {
    return (
      <PageShell>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:grid lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] lg:gap-10">
          <Skeleton className="h-28 w-full lg:h-80" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </PageShell>
    )
  }

  if (!profile) {
    return (
      <PageShell>
        <Card className="py-4">
          <CardContent className="px-4 text-sm text-muted-foreground">
            用户不存在
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const displayName = profile.name || profile.username
  const avatarSrc = profile.avatar || '/images/defaultAvatar.png'

  return (
    <PageShell className="gap-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:grid lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] lg:items-start lg:gap-10">
        {/* 身份区：移动端横排紧凑，桌面端左栏竖排 */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:gap-4">
          <Card className="gap-0 py-3 lg:gap-4 lg:py-5">
            <CardContent className="flex flex-row items-center gap-3 px-3 lg:flex-col lg:items-center lg:gap-3 lg:px-4">
              <Avatar className="size-14 shrink-0 border-2 border-background shadow-md sm:size-16 lg:size-36 lg:border-4">
                <AvatarImage src={avatarSrc} alt="" />
                <AvatarFallback className="text-lg lg:text-2xl">
                  {displayName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 lg:text-center">
                <h2 className="truncate text-base font-semibold tracking-tight sm:text-lg lg:text-xl">
                  {displayName}
                </h2>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">
                  @{profile.username}
                </p>
                {isSelf && (
                  <div className="mt-2 flex flex-wrap gap-1.5 lg:hidden">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={updating}
                        >
                          {updating ? (
                            <Spinner data-icon="inline-start" />
                          ) : null}
                          更新 OJ
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>更新 OJ 数据？</AlertDialogTitle>
                          <AlertDialogDescription>
                            将从各平台同步最新的提交与比赛记录，可能需要一些时间。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleUpdateOj()}
                          >
                            确认更新
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button type="button" size="sm" className="h-7 px-2 text-xs" asChild>
                      <Link to="/change-profile">编辑</Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                        >
                          退出
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认退出？</AlertDialogTitle>
                          <AlertDialogDescription>
                            退出后需要重新登录才能访问个人相关功能。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={handleLogout}>
                            退出
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 移动端：OJ 芯片；桌面：列表 */}
          <Card className="gap-0 overflow-hidden py-0">
            <div className="border-b px-3 py-2 lg:px-4 lg:py-2.5">
              <p className="text-sm font-medium">OJ 绑定</p>
            </div>
            <CardContent className="flex flex-wrap gap-1.5 px-3 py-2.5 lg:hidden">
              {OJ_PLATFORMS.map((p) => {
                const uname = spiderMap.get(p.value)
                if (!uname) {
                  return isSelf ? (
                    <Button
                      key={p.value}
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      asChild
                    >
                      <Link to={`/change-profile?oj=${p.value}`}>
                        绑 {p.label}
                      </Link>
                    </Button>
                  ) : (
                    <Badge key={p.value} variant="outline" className="text-xs">
                      {p.label} 未绑
                    </Badge>
                  )
                }
                return (
                  <Button
                    key={p.value}
                    size="sm"
                    variant="secondary"
                    className="h-7 gap-1 px-2 text-xs"
                    asChild
                  >
                    <a
                      href={getPlatformHomeLink(p.value, uname)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {p.label}
                      <ExternalLinkIcon className="size-3 opacity-70" />
                    </a>
                  </Button>
                )
              })}
            </CardContent>
            <CardContent className="hidden flex-col divide-y px-0 py-0 lg:flex">
              {OJ_PLATFORMS.map((p) => {
                const uname = spiderMap.get(p.value)
                return (
                  <div
                    key={p.value}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm"
                  >
                    <span className="text-muted-foreground">{p.label}</span>
                    {!uname ? (
                      isSelf ? (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/change-profile?oj=${p.value}`}>
                            去绑定
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          未绑定
                        </span>
                      )
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1"
                        asChild
                      >
                        <a
                          href={getPlatformHomeLink(p.value, uname)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          主页
                          <ExternalLinkIcon className="size-3 opacity-70" />
                        </a>
                      </Button>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {isSelf && (
            <div className="hidden flex-col gap-2 lg:flex">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" disabled={updating}>
                    {updating ? <Spinner data-icon="inline-start" /> : null}
                    更新 OJ 数据
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>更新 OJ 数据？</AlertDialogTitle>
                    <AlertDialogDescription>
                      将从各平台同步最新的提交与比赛记录，可能需要一些时间。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleUpdateOj()}>
                      确认更新
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="button" asChild>
                <Link to="/change-profile">编辑个人资料</Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost">
                    退出登录
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认退出？</AlertDialogTitle>
                    <AlertDialogDescription>
                      退出后需要重新登录才能访问个人相关功能。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>
                      退出
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </aside>

        {/* 右栏：数据 / 热力 / 动态 / 画像 / 比赛 */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="gap-3 py-4">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-4 space-y-0">
              <CardTitle className="text-base">数据</CardTitle>
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as 'submit' | 'ac')}
              >
                <TabsList>
                  <TabsTrigger value="ac">AC</TabsTrigger>
                  <TabsTrigger value="submit">提交</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-4">
              {statRows.map((row) => (
                <StatBarRow key={row.title} row={row} />
              ))}
              <p className="text-[11px] text-muted-foreground">
                蓝条为本人 · 红线为全站人均（{userCount} 人）
              </p>
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-base">热力图</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
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
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="flex flex-row items-center justify-between px-4 space-y-0">
              <CardTitle className="text-base">近期动态</CardTitle>
              <Button type="button" size="sm" variant="ghost" asChild>
                <Link to={`/all-activities?id=${targetId}`}>查看所有动态</Link>
              </Button>
            </CardHeader>
            <CardContent className="px-4 py-2">
              {activities.length ? (
                <ul className="relative flex flex-col border-l border-sky-500/40 pl-3">
                  {activities.map((a) => {
                    const url = getSubmitLink(a.platform, a.contest, a.submitId)
                    const title = formatActivityProblemTitle(
                      a.problem,
                      a.problemTitle,
                      a.contest,
                    )
                    return (
                      <li
                        key={`${a.id}-${a.submitId}`}
                        className="relative py-1.5 text-[13px] leading-snug"
                      >
                        <span className="absolute -left-[0.95rem] top-2.5 size-2 rounded-full border-2 border-sky-500 bg-background" />
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="min-w-0">
                              在{' '}
                              <span className="font-medium">{a.platform}</span>{' '}
                              使用{' '}
                              <span className="font-medium">
                                {a.lang || '-'}
                              </span>{' '}
                              解决了{' '}
                              {a.problemId ? (
                                <Link
                                  to={`/question-bank/detail/${a.problemId}`}
                                  className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                                >
                                  {title}
                                </Link>
                              ) : (
                                <span className="font-medium">{title}</span>
                              )}
                              ：
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ml-1 inline-flex align-middle"
                                >
                                  <StatusBadge status={a.status} />
                                </a>
                              ) : (
                                <span className="ml-1 inline-flex align-middle">
                                  <StatusBadge status={a.status} />
                                </span>
                              )}
                            </p>
                            {!!a.problemTags?.length && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {a.problemTags.slice(0, 5).map((t) => (
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
                          </div>
                          <span className="shrink-0 pt-0.5 text-[11px] text-muted-foreground tabular-nums">
                            {formatTime(a.time)}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">暂无动态</p>
              )}
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-base">算法画像</CardTitle>
              <CardDescription>
                根据已通过题目与 AI 标签生成
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <AlgoProfileChart data={algo} />
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="flex flex-row items-center justify-between px-4 space-y-0">
              <CardTitle className="text-base">最近参加的比赛</CardTitle>
              <Button type="button" size="sm" variant="ghost" asChild>
                <Link to={`/contest?id=${targetId}`}>查看所有比赛</Link>
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 px-4">
              {contests.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-sm"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{c.platform}</Badge>
                      <span className="truncate font-medium">
                        {c.contestName || c.contestId}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(c.time)}
                      {c.rank ? ` · 排名 ${c.rank}` : ''}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {c.contestUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={c.contestUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          比赛主页
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" asChild>
                      <Link to={`/contest/${c.id}`}>站内详情</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {!contests.length && (
                <p className="text-sm text-muted-foreground">暂无比赛</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
