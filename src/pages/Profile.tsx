import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ExternalLinkIcon, UserPlusIcon, UserMinusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { listBlogByUsername } from '@/api/blog'
import { getProfileById, getProfileByUsername } from '@/api/profile'
import {
  followUser,
  getSocialCounts,
  getSocialIdentity,
  getSocialRelation,
  unfollowUser,
} from '@/api/social'
import { getHeatmap } from '@/api/statistic'
import { getSubmitLogs } from '@/api/submitLog'
import {
  listUserRecentComments,
  listUserRecentSolutions,
} from '@/api/community'
import { listContests } from '@/api/contest'
import { getProblemUserProfile } from '@/api/problem'
import type {
  ContestItem,
  HeatmapItem,
  ProblemUserProfile,
  SocialUser,
  UserProfile,
  UserRecentCommentItem,
  UserRecentSolutionItem,
} from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { AlgoProfileChart } from '@/components/charts/algo-profile-chart'
import { HeatmapSimple } from '@/components/heatmap-simple'
import { PageShell } from '@/components/page-shell'
import {
  UserIdentity,
  resolveDisplayName,
} from '@/components/user-identity'
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
import { useDocumentMeta } from '@/hooks/use-document-meta'
import { formatActivityProblemTitle } from '@/lib/activity-title'
import { difficultyBadgeClass } from '@/lib/difficulty'
import { formatTime, heatmapStartYmd, todayYmd } from '@/lib/format'
import { getPlatformHomeLink, getSubmitLink, OJ_PLATFORMS } from '@/lib/link'
import { cn } from '@/lib/utils'

export function Profile() {
  const { user, isLogin, logout } = useAuth()
  const { username: routeUsername } = useParams<{ username?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // 兼容旧 ?id=；优先 /profile/:username
  const queryId = searchParams.get('id')

  const [profile, setProfile] = useState<UserProfile | null>(null)
  /** 域感知主展示名 + 共属组织徽章 */
  const [identity, setIdentity] = useState<SocialUser | null>(null)
  const [targetId, setTargetId] = useState(0)
  const [submitHeat, setSubmitHeat] = useState<HeatmapItem[]>([])
  const [acHeat, setAcHeat] = useState<HeatmapItem[]>([])
  const [acHeatLoaded, setAcHeatLoaded] = useState(false)
  const [acHeatLoading, setAcHeatLoading] = useState(false)
  const [heatTab, setHeatTab] = useState<'submit' | 'ac'>('submit')
  const [activities, setActivities] = useState<
    import('@shared/api').SubmitLogItem[]
  >([]) // 最近动态
  const [recentComments, setRecentComments] = useState<UserRecentCommentItem[]>(
    [],
  )
  const [recentSolutions, setRecentSolutions] = useState<
    UserRecentSolutionItem[]
  >([])
  const [contests, setContests] = useState<ContestItem[]>([])
  const [algo, setAlgo] = useState<ProblemUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [followingCount, setFollowingCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [denied, setDenied] = useState(false)
  /** 对方是否已开通个人博客（用于是否展示「访问博客」） */
  const [blogActivated, setBlogActivated] = useState(false)

  const isSelf = Boolean(
    isLogin &&
      user &&
      ((targetId > 0 && targetId === user.userId) ||
        (routeUsername && routeUsername === user.username) ||
        (!routeUsername && !queryId)),
  )

  const profileDisplayName =
    identity?.name ||
    profile?.name ||
    profile?.username ||
    routeUsername ||
    '个人资料'
  useDocumentMeta(
    profile
      ? {
          title: `${profileDisplayName} - GoAlgo`,
          description: `${profileDisplayName} 的个人资料 · GoAlgo`,
          image: profile.avatar || undefined,
          url: profile.username
            ? `/profile/${profile.username}`
            : `/profile?id=${profile.userId}`,
          type: 'profile',
          siteName: 'GoAlgo',
        }
      : null,
  )

  const spiderMap = useMemo(() => {
    const m = new Map<
      string,
      { username: string; rating?: number; hasRating?: boolean }
    >()
    profile?.spiders.forEach((s) =>
      m.set(s.platform, {
        username: s.username,
        rating: s.rating,
        hasRating: s.hasRating,
      }),
    )
    return m
  }, [profile])

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true)
    setDenied(false)
    setIdentity(null)
    setBlogActivated(false)
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
      const msg = pRes.message || '资料加载失败，请稍后重试'
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
      hSubmit,
      acts,
      cont,
      algoRes,
      countsRes,
      relRes,
      rcRes,
      rsRes,
      idRes,
      blogRes,
    ] = await Promise.all([
      getHeatmap({
        startDate: heatmapStartYmd(end),
        endDate: end,
        isAc: false,
        userId: uid,
      }),
      getSubmitLogs({ userId: uid, cursor: -1, limit: 10 }),
      listContests({ userId: uid, limit: 5, offset: 0 }),
      getProblemUserProfile(uid),
      getSocialCounts(uid),
      isLogin ? getSocialRelation(uid) : Promise.resolve(null),
      listUserRecentComments({ userId: uid, limit: 8 }),
      listUserRecentSolutions({ userId: uid, limit: 8 }),
      getSocialIdentity(uid),
      pf.username
        ? listBlogByUsername({ username: pf.username, page: 1, pageSize: 1 })
        : Promise.resolve(null),
    ])
    if (signal?.cancelled) return
    setLoading(false)

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
    if (rcRes.success) setRecentComments(rcRes.data || [])
    if (rsRes.success) setRecentSolutions(rsRes.data || [])
    if (idRes.success && idRes.data) {
      setIdentity(idRes.data)
      // 主展示名以 identity 为准（当前域 / 公共域）
      setProfile((prev) =>
        prev
          ? { ...prev, name: idRes.data!.name || prev.name }
          : prev,
      )
    }
    setBlogActivated(Boolean(blogRes?.success && blogRes.data?.activated))
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
        const end = todayYmd()
        const res = await getHeatmap({
          startDate: heatmapStartYmd(end),
          endDate: end,
          isAc: true,
          userId: targetId,
        })
        if (cancelled) return
        if (res.success) setAcHeat(res.data || [])
        else toast.error(res.message || '刷题热力图加载失败，请稍后重试')
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
              : '找不到该用户'}
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const identityView: SocialUser = identity || {
    userId: profile.userId,
    username: profile.username,
    name: profile.name,
    avatar: profile.avatar,
  }
  const displayName = resolveDisplayName(identityView)
  const avatarSrc = profile.avatar || '/images/defaultAvatar.png'

  async function handleToggleFollow() {
    if (!isLogin || !profile || isSelf) return
    setFollowBusy(true)
    const res = isFollowing
      ? await unfollowUser(profile.userId)
      : await followUser(profile.userId)
    setFollowBusy(false)
    if (!res.success) {
      toast.error(res.message || '操作未完成，请稍后重试')
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
                <UserIdentity
                  user={identityView}
                  linkToProfile={false}
                  size="lg"
                  nameClassName="font-semibold tracking-tight"
                  className="lg:items-center"
                />
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm lg:justify-center">
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
                <p
                  className="mt-1.5 text-[11px] text-muted-foreground tabular-nums sm:text-xs"
                  title="系统最近一次从各平台拉取提交与比赛记录的时间"
                >
                  上次同步：
                  {profile.lastSyncAt
                    ? formatTime(profile.lastSyncAt)
                    : '尚未同步'}
                </p>
                {isSelf && (
                  <div className="mt-2 flex flex-wrap gap-1.5 lg:hidden">
                    <Button type="button" size="sm" className="h-7 px-2 text-xs" asChild>
                      <Link to="/change-profile">编辑资料</Link>
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

          {/* OJ 绑定：紧凑列表，Rating 数字始终可见 */}
          <Card className="gap-0 overflow-hidden py-0">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
              <p className="text-sm font-medium">OJ 绑定</p>
              {isSelf ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-xs"
                  asChild
                >
                  <Link to="/change-profile">管理</Link>
                </Button>
              ) : null}
            </div>
            <CardContent className="flex flex-col divide-y px-0 py-0">
              {OJ_PLATFORMS.map((p) => {
                const bind = spiderMap.get(p.value)
                if (!bind) {
                  if (!isSelf) return null
                  return (
                    <div
                      key={p.value}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm"
                    >
                      <span className="text-muted-foreground">{p.label}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        asChild
                      >
                        <Link to={`/change-profile?oj=${p.value}`}>绑定</Link>
                      </Button>
                    </div>
                  )
                }
                return (
                  <div
                    key={p.value}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 font-medium">{p.label}</span>
                      {bind.hasRating ? (
                        <Badge
                          variant="secondary"
                          className="h-5 font-mono tabular-nums"
                          title={`${p.label} Rating`}
                        >
                          {bind.rating}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          暂无 Rating
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 gap-1 px-1.5 text-xs"
                      asChild
                    >
                      <a
                        href={getPlatformHomeLink(p.value, bind.username)}
                        target="_blank"
                        rel="noreferrer"
                        title={bind.username}
                      >
                        主页
                        <ExternalLinkIcon className="size-3 opacity-70" />
                      </a>
                    </Button>
                  </div>
                )
              })}
              {!isSelf &&
              OJ_PLATFORMS.every((p) => !spiderMap.get(p.value)) ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  暂无绑定
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {blogActivated && profile.username ? (
              <Button type="button" variant="outline" asChild>
                <Link
                  to={`/blog/${profile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  访问博客
                </Link>
              </Button>
            ) : null}
            {isSelf ? (
              <div className="hidden flex-col gap-2 lg:flex">
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
            ) : (
              isLogin && (
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
              )
            )}
          </div>
        </aside>

        {/* 右栏：热力 / 动态 / 画像 / 比赛 */}
        <div className="flex min-w-0 flex-col gap-4">
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
              <CardTitle className="text-base">近期评论与题解</CardTitle>
              <CardDescription>在题目下发表的讨论内容</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-4">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  评论
                </p>
                {recentComments.length ? (
                  <ul className="divide-y rounded-lg border">
                    {recentComments.map((c) => (
                      <li key={c.id} className="px-3 py-2 text-sm">
                        <Link
                          to={`/question-bank/detail/${c.problemId}?tab=comments`}
                          className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                        >
                          {c.problemTitle || `题目 #${c.problemId}`}
                        </Link>
                        <p className="mt-0.5 line-clamp-2 text-muted-foreground">
                          {c.content}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatTime(c.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无评论</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  题解
                </p>
                {recentSolutions.length ? (
                  <ul className="divide-y rounded-lg border">
                    {recentSolutions.map((s) => (
                      <li key={s.id} className="px-3 py-2 text-sm">
                        <Link
                          to={`/question-bank/detail/${s.problemId}/solution/${s.id}`}
                          className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                        >
                          {s.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {s.problemTitle || `题目 #${s.problemId}`} ·{' '}
                          {formatTime(s.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无题解</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-base">算法画像</CardTitle>
              <CardDescription>
                根据你已通过的题目与标签生成
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
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-[background-color,box-shadow] duration-150 ease-out hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
