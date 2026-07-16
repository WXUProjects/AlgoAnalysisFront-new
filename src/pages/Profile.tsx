import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ExternalLinkIcon, UserPlusIcon, UserMinusIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  listProfiles,
  getProfileById,
  getProfileByUsername,
} from '@/api/profile'
import {
  followUser,
  getSocialCounts,
  getSocialRelation,
  unfollowUser,
} from '@/api/social'
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
import { formatActivityProblemTitle } from '@/lib/activity-title'
import { difficultyBadgeClass } from '@/lib/difficulty'
import { formatTime, todayYmd } from '@/lib/format'
import { getPlatformHomeLink, getSubmitLink, OJ_PLATFORMS } from '@/lib/link'
import { cn } from '@/lib/utils'

type StatRow = {
  title: string
  value: number
  ave: number
  grow?: number
  /** 覆盖主数值展示（如生涯 AC 的「次数 / 题数」） */
  display?: string
}

function buildRows(
  user: PeriodItem | undefined,
  global: PeriodItem | undefined,
  userCount: number,
  kind: 'ac' | 'submit',
  acRate: number,
  globalAcRate: number,
  problemCount: number,
  problemCountAve: number,
): StatRow[] {
  const u = user
  const g = global
  const n = Math.max(userCount, 1)
  const ave = (v: number | undefined) => (v ?? 0) / n
  const prefix = kind === 'ac' ? 'AC' : '提交'
  const acRaw = u?.totalRaw ?? problemCount
  const acRawAve = g?.totalRaw != null ? ave(g.totalRaw) : problemCountAve
  return [
    {
      title: kind === 'ac' ? '生涯 AC' : `总${prefix}`,
      value: kind === 'ac' ? acRaw : (u?.total ?? 0),
      ave: kind === 'ac' ? acRawAve : ave(g?.total),
      display: kind === 'ac' ? `${acRaw} / ${problemCount}` : undefined,
    },
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
      title: 'AC 率',
      value: acRate,
      ave: globalAcRate,
    },
  ]
}

function StatBarRow({ row }: { row: StatRow }) {
  // 用 max 定标：本人与人均同一把尺子，比「求和」更直观
  const scale = Math.max(row.value, row.ave, 0)
  const pct = scale > 0 ? Math.min(100, (row.value / scale) * 100) : 0
  const avePct = scale > 0 ? Math.min(100, (row.ave / scale) * 100) : 0
  const isRate = row.title === 'AC 率'
  const display = row.display
    ? row.display
    : isRate
      ? `${row.value.toFixed(2)}%`
      : String(Math.round(row.value * 100) / 100)
  const aveDisplay = isRate
    ? `${row.ave.toFixed(2)}%`
    : String(Math.round(row.ave * 100) / 100)

  const growClass = cn(
    'text-xs font-medium tabular-nums',
    row.grow !== undefined && row.grow > 0 && 'text-destructive',
    row.grow !== undefined && row.grow < 0 && 'text-emerald-600 dark:text-emerald-400',
    row.grow === 0 && 'text-muted-foreground',
  )
  const growText =
    row.grow === undefined ? null : row.grow > 0 ? `+${row.grow}` : String(row.grow)

  // 移动端竖排：标题+数值 → 固定高度进度条 → 人均文案
  // 桌面横排：标题 | 条 | 数值。进度条父级用固定 px 高度 + absolute 填充，避免移动端 h-full 塌缩。
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-baseline justify-between gap-2 sm:w-[4.5rem] sm:shrink-0 sm:flex-col sm:justify-center sm:gap-0">
        <div className="truncate text-sm text-muted-foreground">{row.title}</div>
        <div className="flex shrink-0 items-center gap-1.5 tabular-nums sm:hidden">
          <span className="text-base font-semibold leading-none">{display}</span>
          {growText !== null && <span className={growClass}>{growText}</span>}
        </div>
      </div>

      <div className="min-w-0 w-full flex-1">
        <div
          className="relative w-full"
          style={{ height: 12 }}
          role="progressbar"
          aria-label={row.title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div className="absolute inset-0 rounded-full bg-muted" />
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full bg-sky-500 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
          {row.ave > 0 && (
            <div
              className="pointer-events-none absolute top-[-3px] bottom-[-3px] z-10 w-0.5 -translate-x-1/2 rounded-full bg-destructive"
              style={{ left: `${avePct}%` }}
              title={`全站人均 ${aveDisplay}`}
            />
          )}
        </div>
        <p className="mt-1 text-[11px] leading-none text-muted-foreground sm:hidden">
          人均 {aveDisplay}
        </p>
      </div>

      <div className="hidden w-[5.5rem] shrink-0 items-center justify-end gap-1.5 tabular-nums sm:flex">
        <span className="text-sm font-semibold">{display}</span>
        {growText !== null && <span className={growClass}>{growText}</span>}
      </div>
    </div>
  )
}

export function Profile() {
  const { user, isLogin, logout } = useAuth()
  const { username: routeUsername } = useParams<{ username?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // 兼容旧 ?id=；优先 /profile/:username
  const queryId = searchParams.get('id')

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [targetId, setTargetId] = useState(0)
  const [period, setPeriod] = useState<PeriodData | null>(null)
  const [globalPeriod, setGlobalPeriod] = useState<PeriodData | null>(null)
  const [userCount, setUserCount] = useState(1)
  const [submitHeat, setSubmitHeat] = useState<HeatmapItem[]>([])
  const [acHeat, setAcHeat] = useState<HeatmapItem[]>([])
  const [acHeatLoaded, setAcHeatLoaded] = useState(false)
  const [acHeatLoading, setAcHeatLoading] = useState(false)
  const [heatTab, setHeatTab] = useState<'submit' | 'ac'>('submit')
  const [activities, setActivities] = useState<
    import('@shared/api').SubmitLogItem[]
  >([]) // 最近动态
  const [contests, setContests] = useState<ContestItem[]>([])
  const [algo, setAlgo] = useState<ProblemUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'submit' | 'ac'>('ac')
  const [followingCount, setFollowingCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [denied, setDenied] = useState(false)

  const isSelf = Boolean(
    isLogin &&
      user &&
      ((targetId > 0 && targetId === user.userId) ||
        (routeUsername && routeUsername === user.username) ||
        (!routeUsername && !queryId)),
  )

  const spiderMap = useMemo(() => {
    const m = new Map<string, string>()
    profile?.spiders.forEach((s) => m.set(s.platform, s.username))
    return m
  }, [profile])

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true)
    setDenied(false)
    setAcHeat([])
    setAcHeatLoaded(false)
    setHeatTab('submit')

    // 解析目标用户
    let pRes: Awaited<ReturnType<typeof getProfileById>>
    if (routeUsername) {
      pRes = await getProfileByUsername(routeUsername)
    } else if (queryId) {
      pRes = await getProfileById(Number(queryId))
    } else if (user?.userId) {
      pRes = await getProfileById(user.userId)
    } else {
      setLoading(false)
      setProfile(null)
      return
    }
    if (signal?.cancelled) return

    if (!pRes.success || !pRes.data) {
      setLoading(false)
      setProfile(null)
      const msg = pRes.message || '加载资料失败'
      if (msg.includes('隐私') || msg.includes('禁止') || msg.includes('未开放')) {
        setDenied(true)
      } else {
        toast.error(msg)
      }
      return
    }

    const pf = pRes.data
    // 无 username 路由时重定向到 /profile/:username
    if (!routeUsername && pf.username) {
      navigate(`/profile/${pf.username}`, { replace: true })
      return
    }

    setProfile(pf)
    setTargetId(pf.userId)
    const uid = pf.userId
    const end = todayYmd()
    const [
      periodRes,
      globalRes,
      listRes,
      hSubmit,
      acts,
      cont,
      algoRes,
      countsRes,
      relRes,
    ] = await Promise.all([
      getPeriod(uid),
      getPeriod(-1),
      listProfiles(1, 1),
      getHeatmap({
        startDate: '20230101',
        endDate: end,
        isAc: false,
        userId: uid,
      }),
      getSubmitLogs({ userId: uid, cursor: -1, limit: 10 }),
      listContests({ userId: uid, limit: 5, offset: 0 }),
      getProblemUserProfile(uid),
      getSocialCounts(uid),
      isLogin ? getSocialRelation(uid) : Promise.resolve(null),
    ])
    if (signal?.cancelled) return
    setLoading(false)

    if (periodRes.success) setPeriod(periodRes.data)
    if (globalRes.success) setGlobalPeriod(globalRes.data)
    if (listRes.success && listRes.data) {
      setUserCount(Math.max(listRes.data.total, 1))
    }
    if (hSubmit.success) setSubmitHeat(hSubmit.data || [])
    if (acts.success) setActivities(acts.data || [])
    if (cont.success) setContests(cont.data?.list || [])
    if (algoRes.success) setAlgo(algoRes.data)
    if (countsRes.success && countsRes.data) {
      setFollowingCount(countsRes.data.followingCount)
      setFollowerCount(countsRes.data.followerCount)
    }
    if (relRes && relRes.success && relRes.data) {
      setIsFollowing(relRes.data.isFollowing)
    }
  }, [routeUsername, queryId, user?.userId, isLogin, navigate])

  useEffect(() => {
    const signal = { cancelled: false }
    void load(signal)
    return () => {
      signal.cancelled = true
    }
  }, [load])

  useEffect(() => {
    // 勿把 acHeatLoading 放进 deps：setLoading 会触发 cleanup 把请求标 cancelled，导致永远卡在 Skeleton
    if (!targetId || heatTab !== 'ac' || acHeatLoaded) return
    let cancelled = false
    async function loadAc() {
      setAcHeatLoading(true)
      try {
        const res = await getHeatmap({
          startDate: '20230101',
          endDate: todayYmd(),
          isAc: true,
          userId: targetId,
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
  }, [targetId, heatTab, acHeatLoaded])

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
    const n = Math.max(userCount, 1)
    const problemCount = period?.ac.total ?? 0
    const problemCountAve = (globalPeriod?.ac.total ?? 0) / n
    if (mode === 'ac') {
      return buildRows(
        period?.ac,
        globalPeriod?.ac,
        userCount,
        'ac',
        acRate,
        globalAcRate,
        problemCount,
        problemCountAve,
      )
    }
    return buildRows(
      period?.submit,
      globalPeriod?.submit,
      userCount,
      'submit',
      acRate,
      globalAcRate,
      problemCount,
      problemCountAve,
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
            {denied
              ? '该用户未开放公共域个人资料'
              : '用户不存在'}
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const displayName = profile.name || profile.username
  const avatarSrc = profile.avatar || '/images/defaultAvatar.png'

  async function handleToggleFollow() {
    if (!isLogin || !profile || isSelf) return
    setFollowBusy(true)
    const res = isFollowing
      ? await unfollowUser(profile.userId)
      : await followUser(profile.userId)
    setFollowBusy(false)
    if (!res.success) {
      toast.error(res.message || '操作失败')
      return
    }
    setIsFollowing(!isFollowing)
    setFollowerCount((c) => Math.max(0, c + (isFollowing ? -1 : 1)))
    toast.success(isFollowing ? '已取消关注' : '已关注')
  }

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
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                  <Link
                    to={`/social/${profile.username}?tab=following`}
                    className="hover:underline"
                  >
                    <span className="font-semibold tabular-nums">
                      {followingCount}
                    </span>{' '}
                    <span className="text-muted-foreground">关注</span>
                  </Link>
                  <Link
                    to={`/social/${profile.username}?tab=followers`}
                    className="hover:underline"
                  >
                    <span className="font-semibold tabular-nums">
                      {followerCount}
                    </span>{' '}
                    <span className="text-muted-foreground">粉丝</span>
                  </Link>
                </div>
                {isSelf && (
                  <div className="mt-2 flex flex-wrap gap-1.5 lg:hidden">
                    <Button type="button" size="sm" className="h-7 px-2 text-xs" asChild>
                      <Link to="/change-profile">编辑</Link>
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
                      <Link to="/privacy">隐私</Link>
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
                      <Link to="/social?tab=search">找人</Link>
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
                        绑定{p.label}
                      </Link>
                    </Button>
                  ) : (
                    <Badge key={p.value} variant="outline" className="text-xs">
                      {p.label} 未绑定
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

          {isSelf ? (
            <div className="hidden flex-col gap-2 lg:flex">
              <Button type="button" asChild>
                <Link to="/change-profile">编辑个人资料</Link>
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/privacy">隐私设置</Link>
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/social?tab=search">搜索用户</Link>
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
          ) : (
            isLogin && (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant={isFollowing ? 'outline' : 'default'}
                  disabled={followBusy}
                  onClick={() => void handleToggleFollow()}
                >
                  {isFollowing ? (
                    <>
                      <UserMinusIcon data-icon="inline-start" />
                      已关注
                    </>
                  ) : (
                    <>
                      <UserPlusIcon data-icon="inline-start" />
                      关注
                    </>
                  )}
                </Button>
              </div>
            )
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
            <CardContent className="flex flex-col gap-3.5 px-4 sm:gap-3">
              {statRows.map((row) => (
                <StatBarRow key={row.title} row={row} />
              ))}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                蓝条为本人 · 红线为全站人均（{userCount} 人）
                <span className="sm:hidden"> · 下方数字为人均参考</span>
              </p>
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-base">热力图</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
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
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="flex flex-row items-center justify-between px-4 space-y-0">
              <CardTitle className="text-base">近期动态</CardTitle>
              <Button type="button" size="sm" variant="ghost" asChild>
                <Link to={`/discover?tab=feed&id=${targetId}`}>查看所有动态</Link>
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
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
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
                              {a.problemDifficulty ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'ml-1.5 inline-flex h-5 align-middle px-1.5 text-[10px] font-normal',
                                    difficultyBadgeClass(a.problemDifficulty),
                                  )}
                                >
                                  {a.problemDifficulty}
                                </Badge>
                              ) : null}
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
                          <span className="text-[11px] text-muted-foreground tabular-nums sm:shrink-0 sm:pt-0.5">
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
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/contest/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/contest/${c.id}`)
                    }
                  }}
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  {c.contestUrl && (
                    <div
                      className="flex shrink-0 gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={c.contestUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          比赛主页
                        </a>
                      </Button>
                    </div>
                  )}
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
