import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Building2Icon,
  SearchIcon,
  UserMinusIcon,
  UserPlusIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { getProfileById } from '@/api/profile'
import { getSubmitLogs } from '@/api/submitLog'
import { getRank } from '@/api/statistic'
import {
  followUser,
  getSocialRelation,
  searchUsers,
  unfollowUser,
} from '@/api/social'
import { discoverOrgs, joinOrg } from '@/api/org'
import type {
  OrgDiscoverItem,
  SocialUser,
  StatisticRankItem,
  SubmitLogItem,
} from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { StatusBadge } from '@/components/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatActivityProblemTitle } from '@/lib/activity-title'
import { difficultyBadgeClass } from '@/lib/difficulty'
import { formatTime } from '@/lib/format'
import { getSubmitLink } from '@/lib/link'
import { num } from '@/lib/http'
import { cn } from '@/lib/utils'

const FEED_LIMIT = 50
const PAGE_SIZE = 20

type TabKey = 'feed' | 'rank' | 'users' | 'orgs'

function weekRange(): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 6)
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return { start: fmt(start), end: fmt(end) }
}

export function Discover() {
  const { isLogin, user, switchOrg, refreshOrgs } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as TabKey) || 'feed'
  const idParam = searchParams.get('id')
  const followingOnly = searchParams.get('following') === '1'
  const userId = idParam ? Number(idParam) : -1
  const userMode = userId > 0

  function setTab(next: TabKey) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('tab', next)
        // 切到非动态时清个人/关注筛选
        if (next !== 'feed') {
          p.delete('id')
          p.delete('following')
        }
        return p
      },
      { replace: true },
    )
  }

  return (
    <PageShell>
      <div>
        <h2 className="text-lg font-semibold">发现</h2>
        <p className="text-sm text-muted-foreground">
          域内动态、排行榜、搜索用户与发现组织
        </p>
      </div>

      <Tabs value={userMode ? 'feed' : tab} onValueChange={(v) => setTab(v as TabKey)}>
        {!userMode && (
          <TabsList>
            <TabsTrigger value="feed">动态</TabsTrigger>
            <TabsTrigger value="rank">排行榜</TabsTrigger>
            <TabsTrigger value="users">搜用户</TabsTrigger>
            <TabsTrigger value="orgs">组织</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="feed" className="flex flex-col gap-3">
          <FeedPanel
            isLogin={isLogin}
            user={user}
            userId={userId}
            userMode={userMode}
            followingOnly={followingOnly}
            setSearchParams={setSearchParams}
          />
        </TabsContent>
        {!userMode && (
          <>
            <TabsContent value="rank" className="flex flex-col gap-3">
              <RankPanel />
            </TabsContent>
            <TabsContent value="users" className="flex flex-col gap-3">
              <UsersPanel isLogin={isLogin} userId={user?.userId} />
            </TabsContent>
            <TabsContent value="orgs" className="flex flex-col gap-3">
              <OrgsPanel
                isLogin={isLogin}
                switchOrg={switchOrg}
                refreshOrgs={refreshOrgs}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </PageShell>
  )
}

function FeedPanel({
  isLogin,
  user,
  userId,
  userMode,
  followingOnly,
  setSearchParams,
}: {
  isLogin: boolean
  user: { userId: number } | null
  userId: number
  userMode: boolean
  followingOnly: boolean
  setSearchParams: ReturnType<typeof useSearchParams>[1]
}) {
  const [items, setItems] = useState<SubmitLogItem[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [titleName, setTitleName] = useState('')
  const loadingRef = useRef(false)
  const cursorRef = useRef<number | string>(-1)

  const loadMore = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return
      if (followingOnly && !isLogin) {
        toast.error('登录后可查看关注动态')
        return
      }
      loadingRef.current = true
      setLoading(true)
      const nextCursor = reset ? -1 : cursorRef.current
      const res = await getSubmitLogs({
        userId: userMode ? userId : -1,
        cursor: nextCursor,
        limit: FEED_LIMIT,
        followingOnly: !userMode && followingOnly,
      })
      loadingRef.current = false
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '加载动态失败')
        return
      }
      const list = res.data
      setItems((prev) => (reset ? list : [...prev, ...list]))
      setHasMore(list.length >= FEED_LIMIT)
      if (list.length) {
        cursorRef.current = num(list[list.length - 1].time, -1)
      }
    },
    [userId, userMode, followingOnly, isLogin],
  )

  useEffect(() => {
    setItems([])
    cursorRef.current = -1
    setHasMore(true)
    void loadMore(true)
  }, [loadMore])

  useEffect(() => {
    if (!userMode) {
      setTitleName('')
      return
    }
    void getProfileById(userId).then((res) => {
      if (res.success && res.data) setTitleName(res.data.name || res.data.username)
    })
  }, [userMode, userId])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {userMode
            ? `${titleName || '用户'} 的提交动态`
            : followingOnly
              ? '你关注的人在本组织内的动态'
              : '当前组织内的提交动态'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={!userMode && !followingOnly ? 'default' : 'outline'}
            onClick={() => setSearchParams({ tab: 'feed' })}
          >
            组织动态
          </Button>
          {isLogin && (
            <Button
              type="button"
              size="sm"
              variant={!userMode && followingOnly ? 'default' : 'outline'}
              onClick={() => setSearchParams({ tab: 'feed', following: '1' })}
            >
              仅关注
            </Button>
          )}
          {isLogin && user && (
            <Button
              type="button"
              size="sm"
              variant={userMode && userId === user.userId ? 'default' : 'outline'}
              onClick={() =>
                setSearchParams({ tab: 'feed', id: String(user.userId) })
              }
            >
              我的
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {!items.length &&
          loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        {!items.length && !loading && (
          <Card className="py-4">
            <CardContent className="px-4 text-sm text-muted-foreground">
              暂无动态
            </CardContent>
          </Card>
        )}
        {items.map((item) => {
          const submitUrl = getSubmitLink(
            item.platform,
            item.contest,
            item.submitId,
          )
          const title = formatActivityProblemTitle(
            item.problem,
            item.problemTitle,
            item.contest,
          )
          const displayName = item.userName || `用户${item.userId}`
          return (
            <Card
              key={`${item.id}-${item.submitId}`}
              className="gap-1 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader className="gap-1 px-4">
                <CardTitle className="text-sm font-medium">
                  <Link
                    to={`/profile?id=${item.userId}`}
                    className="hover:underline"
                  >
                    {displayName}
                  </Link>
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    · {item.platform} · {item.lang || '-'}
                  </span>
                </CardTitle>
                <CardDescription className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    {item.problemId ? (
                      <Link
                        to={`/question-bank/detail/${item.problemId}`}
                        className="text-foreground hover:underline"
                      >
                        {title}
                      </Link>
                    ) : (
                      <span>{title}</span>
                    )}
                    {item.problemDifficulty ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-5 px-1.5 text-[10px] font-normal',
                          difficultyBadgeClass(item.problemDifficulty),
                        )}
                      >
                        {item.problemDifficulty}
                      </Badge>
                    ) : null}
                    {submitUrl ? (
                      <StatusBadge status={item.status} asChild>
                        <a
                          href={submitUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {item.status}
                        </a>
                      </StatusBadge>
                    ) : (
                      <StatusBadge status={item.status} />
                    )}
                  </span>
                  <span className="tabular-nums text-muted-foreground sm:ml-auto">
                    {formatTime(item.time)}
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>
      <div className="flex justify-center">
        {hasMore ? (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void loadMore(false)}
          >
            {loading ? <Spinner data-icon="inline-start" /> : null}
            加载更多
          </Button>
        ) : (
          items.length > 0 && (
            <p className="text-sm text-muted-foreground">没有更多了</p>
          )
        )}
      </div>
    </>
  )
}

function RankPanel() {
  const [scoreType, setScoreType] = useState<'ac' | 'submit'>('ac')
  const [page, setPage] = useState(1)
  const [list, setList] = useState<StatisticRankItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  // 固定打开时的近 7 日区间，避免每次 render 新对象触发重请求
  const [range] = useState(() => weekRange())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getRank({
      startDate: range.start,
      endDate: range.end,
      scoreType,
      page,
      pageSize: PAGE_SIZE,
    }).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '加载排行失败')
        setList([])
        setTotal(0)
        return
      }
      setList(res.data.list)
      setTotal(res.data.total)
    })
    return () => {
      cancelled = true
    }
  }, [scoreType, page, range.start, range.end])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          近 7 日（{range.start} ~ {range.end}）
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={scoreType === 'ac' ? 'default' : 'outline'}
            onClick={() => {
              setScoreType('ac')
              setPage(1)
            }}
          >
            AC
          </Button>
          <Button
            type="button"
            size="sm"
            variant={scoreType === 'submit' ? 'default' : 'outline'}
            onClick={() => {
              setScoreType('submit')
              setPage(1)
            }}
          >
            提交
          </Button>
        </div>
      </div>
      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead className="text-right">
                    {scoreType === 'ac' ? 'AC' : '提交'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell className="font-medium">{r.rank}</TableCell>
                    <TableCell>
                      <Link
                        to={`/profile?id=${r.userId}`}
                        className="hover:underline"
                      >
                        {r.name || `用户${r.userId}`}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.score}
                    </TableCell>
                  </TableRow>
                ))}
                {!list.length && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {total > PAGE_SIZE && (
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          disabled={loading}
        />
      )}
    </>
  )
}

function UsersPanel({
  isLogin,
  userId,
}: {
  isLogin: boolean
  userId?: number
}) {
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [list, setList] = useState<SocialUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [relationMap, setRelationMap] = useState<Record<number, boolean>>({})
  const [busyId, setBusyId] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void searchUsers(q, page, PAGE_SIZE).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        setList([])
        setTotal(0)
        return
      }
      setList(res.data.list)
      setTotal(res.data.total)
    })
    return () => {
      cancelled = true
    }
  }, [q, page])

  useEffect(() => {
    if (!isLogin || !list.length) {
      setRelationMap({})
      return
    }
    let cancelled = false
    void Promise.all(
      list.map(async (u) => {
        if (userId && u.userId === userId) return null
        const r = await getSocialRelation(u.userId)
        return r.success && r.data
          ? ([u.userId, r.data.isFollowing] as const)
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
  }, [list, isLogin, userId])

  async function toggleFollow(u: SocialUser) {
    if (!isLogin) {
      toast.error('请先登录')
      return
    }
    if (userId && u.userId === userId) return
    setBusyId(u.userId)
    const following = relationMap[u.userId]
    const res = following
      ? await unfollowUser(u.userId)
      : await followUser(u.userId)
    setBusyId(0)
    if (!res.success) {
      toast.error(res.message || '操作失败')
      return
    }
    setRelationMap((m) => ({ ...m, [u.userId]: !following }))
    toast.success(following ? '已取消关注' : '已关注')
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-sm"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="用户名或昵称"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              setPage(1)
              setQ(qInput.trim())
            }
          }}
        />
        <Button
          type="button"
          onClick={() => {
            setPage(1)
            setQ(qInput.trim())
          }}
        >
          <SearchIcon data-icon="inline-start" />
          搜索
        </Button>
      </div>
      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="flex flex-col divide-y p-0">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          {!loading && !list.length && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {q ? '没有匹配的用户' : '输入关键词搜索用户'}
            </p>
          )}
          {!loading &&
            list.map((u) => {
              const display = u.name || u.username
              const following = relationMap[u.userId]
              const selfRow = Boolean(userId && u.userId === userId)
              return (
                <div key={u.userId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="size-10">
                    <AvatarImage
                      src={u.avatar || '/images/defaultAvatar.png'}
                      alt=""
                    />
                    <AvatarFallback>{display.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/profile/${u.username}`}
                      className="truncate font-medium hover:underline"
                    >
                      {display}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      @{u.username}
                    </p>
                  </div>
                  {isLogin && !selfRow && (
                    <Button
                      type="button"
                      size="sm"
                      variant={following ? 'outline' : 'default'}
                      disabled={busyId === u.userId}
                      onClick={() => void toggleFollow(u)}
                    >
                      {following ? (
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
                  )}
                </div>
              )
            })}
        </CardContent>
      </Card>
      {total > PAGE_SIZE && (
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          disabled={loading}
        />
      )}
    </>
  )
}

function OrgsPanel({
  isLogin,
  switchOrg,
  refreshOrgs,
}: {
  isLogin: boolean
  switchOrg: (orgId: number) => Promise<{ success: boolean; message: string }>
  refreshOrgs: () => Promise<void>
}) {
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [list, setList] = useState<OrgDiscoverItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [joinTarget, setJoinTarget] = useState<OrgDiscoverItem | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [joining, setJoining] = useState(false)
  const [switching, setSwitching] = useState(0)

  const reload = useCallback(async () => {
    setLoading(true)
    const res = await discoverOrgs({ page, pageSize: PAGE_SIZE, q })
    setLoading(false)
    if (!res.success) {
      toast.error(res.message || '加载组织失败')
      setList([])
      setTotal(0)
      return
    }
    setList(res.list)
    setTotal(res.total)
  }, [page, q])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleSwitch(org: OrgDiscoverItem) {
    setSwitching(org.id)
    const res = await switchOrg(org.id)
    setSwitching(0)
    if (!res.success) {
      toast.error(res.message || '切换失败')
      return
    }
    toast.success(`已切换到「${org.name}」`)
    await refreshOrgs()
    void reload()
  }

  async function handleJoin() {
    if (!joinTarget) return
    if (!inviteCode.trim()) {
      toast.error('请输入团队识别码')
      return
    }
    if (!displayName.trim()) {
      toast.error('请填写组织内名称')
      return
    }
    setJoining(true)
    const res = await joinOrg(inviteCode.trim(), displayName.trim())
    setJoining(false)
    if (!res.success) {
      toast.error(res.message || '加入失败')
      return
    }
    toast.success(res.message || '已提交')
    setJoinTarget(null)
    setInviteCode('')
    setDisplayName('')
    await refreshOrgs()
    void reload()
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-sm"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="搜索组织名称"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              setPage(1)
              setQ(qInput.trim())
            }
          }}
        />
        <Button
          type="button"
          onClick={() => {
            setPage(1)
            setQ(qInput.trim())
          }}
        >
          <SearchIcon data-icon="inline-start" />
          搜索
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        {!loading &&
          list.map((o) => (
            <Card key={o.id} className="gap-3 py-4">
              <CardHeader className="flex flex-row items-center gap-3 px-4">
                <Avatar className="size-12">
                  <AvatarImage src={o.brandLogo || undefined} alt="" />
                  <AvatarFallback>
                    <Building2Icon className="size-5 opacity-60" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base">{o.name}</CardTitle>
                  <CardDescription>
                    {o.memberCount} 人
                    {o.isSystem ? ' · 系统组织' : ''}
                    {o.isCurrent ? ' · 当前' : ''}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-4">
                {!isLogin ? (
                  <p className="text-xs text-muted-foreground">
                    登录后可加入或切换组织
                  </p>
                ) : o.isMember ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={o.isCurrent ? 'secondary' : 'default'}
                    disabled={o.isCurrent || switching === o.id}
                    onClick={() => void handleSwitch(o)}
                  >
                    {switching === o.id ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    {o.isCurrent ? '当前组织' : '切换到此组织'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setJoinTarget(o)
                      setInviteCode('')
                      setDisplayName('')
                    }}
                  >
                    加入
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        {!loading && !list.length && (
          <p className="col-span-full text-center text-sm text-muted-foreground">
            暂无组织
          </p>
        )}
      </div>
      {total > PAGE_SIZE && (
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          disabled={loading}
        />
      )}

      <Dialog
        open={Boolean(joinTarget)}
        onOpenChange={(open) => {
          if (!open) setJoinTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>加入「{joinTarget?.name}」</DialogTitle>
            <DialogDescription>
              请输入该组织的团队识别码，并填写你在组织内的名称。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="join-code">团队识别码</Label>
              <Input
                id="join-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="识别码"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="join-name">组织内名称</Label>
              <Input
                id="join-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="在组织内显示的名字"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setJoinTarget(null)}
            >
              取消
            </Button>
            <Button type="button" disabled={joining} onClick={() => void handleJoin()}>
              {joining ? <Spinner data-icon="inline-start" /> : null}
              确认加入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

