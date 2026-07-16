import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ActivityIcon,
  Building2Icon,
  SearchIcon,
  TrophyIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
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
import { useListQueryState } from '@/hooks/use-list-query-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { StatusBadge, formatSubmitStatus } from '@/components/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatActivityProblemTitle } from '@/lib/activity-title'
import { difficultyBadgeClass } from '@/lib/difficulty'
import { formatTime } from '@/lib/format'
import { getSubmitLink } from '@/lib/link'
import { num } from '@/lib/http'
import { cn } from '@/lib/utils'

const FEED_LIMIT = 50
const DEFAULT_PAGE_SIZE = 20

/** 内容频道；旧 tab=users 映射到 feed */
type TabKey = 'feed' | 'rank' | 'orgs'

function normalizeTab(raw: string | null): TabKey {
  if (raw === 'rank' || raw === 'orgs' || raw === 'feed') return raw
  // 兼容旧「搜用户」Tab
  return 'feed'
}

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
  const tab = normalizeTab(searchParams.get('tab'))
  const idParam = searchParams.get('id')
  const followingOnly = searchParams.get('following') === '1'
  const qParam = (searchParams.get('q') || '').trim()
  const userId = idParam ? Number(idParam) : -1
  const userMode = userId > 0
  const searchMode = Boolean(qParam)

  const [qInput, setQInput] = useState(qParam)

  useEffect(() => {
    setQInput(qParam)
  }, [qParam])

  function setTab(next: TabKey) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('tab', next)
        p.delete('q')
        if (next !== 'feed') {
          p.delete('id')
          p.delete('following')
        }
        return p
      },
      { replace: true },
    )
  }

  function submitSearch(e?: FormEvent) {
    e?.preventDefault()
    const next = qInput.trim()
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next) {
          p.set('q', next)
          p.delete('id')
          p.delete('following')
          p.delete('upage')
        } else {
          p.delete('q')
        }
        return p
      },
      { replace: true },
    )
  }

  function clearSearch() {
    setQInput('')
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('q')
        p.delete('upage')
        p.delete('upageSize')
        return p
      },
      { replace: true },
    )
  }

  return (
    <PageShell className="gap-5">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">发现</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            浏览组织动态与排行，发现团队；搜索用户与更多内容
          </p>
        </div>
        <form
          className="flex w-full max-w-sm items-center gap-2 sm:w-auto"
          onSubmit={submitSearch}
        >
          <div className="relative min-w-0 flex-1 sm:w-56">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 pr-8"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="搜索用户…"
              aria-label="搜索"
            />
            {qInput ? (
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="清空"
                onClick={clearSearch}
              >
                <XIcon className="size-3.5" />
              </button>
            ) : null}
          </div>
          <Button type="submit" variant="outline" size="icon" aria-label="搜索">
            <SearchIcon />
          </Button>
        </form>
      </section>

      {searchMode ? (
        <DiscoverSearchResults
          q={qParam}
          isLogin={isLogin}
          userId={user?.userId}
          onClear={clearSearch}
        />
      ) : (
        <Tabs
          value={userMode ? 'feed' : tab}
          onValueChange={(v) => setTab(normalizeTab(v))}
        >
          {!userMode && (
            <TabsList>
              <TabsTrigger value="feed">
                <ActivityIcon data-icon="inline-start" />
                动态
              </TabsTrigger>
              <TabsTrigger value="rank">
                <TrophyIcon data-icon="inline-start" />
                排行榜
              </TabsTrigger>
              <TabsTrigger value="orgs">
                <Building2Icon data-icon="inline-start" />
                组织
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="feed" className="flex flex-col gap-4">
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
              <TabsContent value="rank" className="flex flex-col gap-4">
                <RankPanel />
              </TabsContent>
              <TabsContent value="orgs" className="flex flex-col gap-4">
                <OrgsPanel
                  isLogin={isLogin}
                  switchOrg={switchOrg}
                  refreshOrgs={refreshOrgs}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      )}
    </PageShell>
  )
}

/** 全局搜索结果区。本轮仅用户；后续可按类型追加博文等区块。 */
function DiscoverSearchResults({
  q,
  isLogin,
  userId,
  onClear,
}: {
  q: string
  isLogin: boolean
  userId?: number
  onClear: () => void
}) {
  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    pageKey: 'upage',
    pageSizeKey: 'upageSize',
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [list, setList] = useState<SocialUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [relationMap, setRelationMap] = useState<Record<number, boolean>>({})
  const [busyId, setBusyId] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void searchUsers(q, page, pageSize).then((res) => {
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
  }, [q, page, pageSize])

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
    <div className="flex flex-col gap-4">
      {/* 用户结果；后续可并列渲染博文等类型区块 */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersIcon className="size-4 text-muted-foreground" />
            用户
          </CardTitle>
          <CardDescription>
            「{q}」· {loading ? '…' : `${total} 人`}
          </CardDescription>
          <CardAction>
            <Button type="button" size="sm" variant="ghost" onClick={onClear}>
              返回发现
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          {!loading && !list.length && (
            <Empty className="border-0 py-10 md:py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersIcon />
                </EmptyMedia>
                <EmptyTitle>没有匹配的用户</EmptyTitle>
                <EmptyDescription>
                  换个关键词试试，或返回继续浏览动态与组织
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {!loading &&
            list.map((u) => {
              const display = u.name || u.username
              const following = relationMap[u.userId]
              const selfRow = Boolean(userId && u.userId === userId)
              return (
                <div
                  key={u.userId}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
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
        {total > pageSize && (
          <CardFooter className="border-t py-3">
            <Pagination
              page={page}
              total={total}
              pageSize={pageSize}
              onChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={loading}
            />
          </CardFooter>
        )}
      </Card>
    </div>
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

  const feedScope = userMode
    ? 'mine'
    : followingOnly
      ? 'following'
      : 'org'

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
      if (list.length === 0) {
        setHasMore(false)
      } else if (list.length >= FEED_LIMIT) {
        setHasMore(true)
      } else {
        setHasMore(reset)
      }
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

  function setFeedScope(scope: string) {
    if (!scope) return
    if (scope === 'org') {
      setSearchParams({ tab: 'feed' })
      return
    }
    if (scope === 'following') {
      setSearchParams({ tab: 'feed', following: '1' })
      return
    }
    if (scope === 'mine' && user) {
      setSearchParams({ tab: 'feed', id: String(user.userId) })
    }
  }

  const description = userMode
    ? `${titleName || '用户'} 的提交动态`
    : followingOnly
      ? '你关注的人在本组织内的动态'
      : '当前组织内的提交动态'

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon className="size-4 text-muted-foreground" />
          提交动态
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {!userMode || (user && userId === user.userId) ? (
          <CardAction>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={feedScope}
              onValueChange={setFeedScope}
            >
              <ToggleGroupItem value="org">组织动态</ToggleGroupItem>
              {isLogin ? (
                <ToggleGroupItem value="following">仅关注</ToggleGroupItem>
              ) : null}
              {isLogin && user ? (
                <ToggleGroupItem value="mine">我的</ToggleGroupItem>
              ) : null}
            </ToggleGroup>
          </CardAction>
        ) : (
          <CardAction>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSearchParams({ tab: 'feed' })}
            >
              返回组织动态
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col divide-y p-0">
        {!items.length &&
          loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton className="mb-2 h-4 w-40" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ))}
        {!items.length && !loading && (
          <Empty className="border-0 py-10 md:py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ActivityIcon />
              </EmptyMedia>
              <EmptyTitle>暂无动态</EmptyTitle>
              <EmptyDescription>
                {followingOnly
                  ? '关注队友后，这里会显示他们的提交'
                  : '组织内有新提交时会出现在这里'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
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
            <div
              key={`${item.id}-${item.submitId}`}
              className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0 flex flex-col gap-1">
                <p className="text-sm">
                  <Link
                    to={`/profile?id=${item.userId}`}
                    className="font-medium hover:underline"
                  >
                    {displayName}
                  </Link>
                  <span className="text-muted-foreground">
                    {' '}
                    · {item.platform} · {item.lang || '-'}
                  </span>
                </p>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
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
                        {formatSubmitStatus(item.status)}
                      </a>
                    </StatusBadge>
                  ) : (
                    <StatusBadge status={item.status} />
                  )}
                </div>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatTime(item.time)}
              </span>
            </div>
          )
        })}
      </CardContent>
      {(hasMore || items.length > 0) && (
        <CardFooter className="justify-center border-t py-3">
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
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
        </CardFooter>
      )}
    </Card>
  )
}

function RankPanel() {
  const [scoreType, setScoreType] = useState<'ac' | 'submit'>('ac')
  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    pageKey: 'rpage',
    pageSizeKey: 'rpageSize',
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [list, setList] = useState<StatisticRankItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [range] = useState(() => weekRange())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getRank({
      startDate: range.start,
      endDate: range.end,
      scoreType,
      page,
      pageSize,
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
  }, [scoreType, page, pageSize, range.start, range.end])

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrophyIcon className="size-4 text-muted-foreground" />
          近 7 日排行
        </CardTitle>
        <CardDescription>
          {range.start} ~ {range.end}
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={scoreType}
            onValueChange={(v) => {
              if (v === 'ac' || v === 'submit') {
                setScoreType(v)
                setPage(1)
              }
            }}
          >
            <ToggleGroupItem value="ac">AC</ToggleGroupItem>
            <ToggleGroupItem value="submit">提交</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
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
                  <TableCell colSpan={3} className="p-0">
                    <Empty className="border-0 py-10 md:py-12">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <TrophyIcon />
                        </EmptyMedia>
                        <EmptyTitle>暂无排行数据</EmptyTitle>
                        <EmptyDescription>
                          近 7 日有提交后会出现在这里
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {total > pageSize && (
        <CardFooter className="border-t py-3">
          <Pagination
            page={page}
            total={total}
            pageSize={pageSize}
            onChange={setPage}
            onPageSizeChange={setPageSize}
            disabled={loading}
          />
        </CardFooter>
      )}
    </Card>
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
  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    pageKey: 'opage',
    pageSizeKey: 'opageSize',
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
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
    const res = await discoverOrgs({ page, pageSize, q })
    setLoading(false)
    if (!res.success) {
      toast.error(res.message || '加载组织失败')
      setList([])
      setTotal(0)
      return
    }
    setList(res.list)
    setTotal(res.total)
  }, [page, pageSize, q])

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

  function runOrgSearch(e?: FormEvent) {
    e?.preventDefault()
    setPage(1)
    setQ(qInput.trim())
  }

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2Icon className="size-4 text-muted-foreground" />
            发现组织
          </CardTitle>
          <CardDescription>
            浏览可加入的团队；加入需团队识别码
          </CardDescription>
          <CardAction>
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={runOrgSearch}
            >
              <Input
                className="w-40 sm:w-48"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="筛选组织名称"
              />
              <Button type="submit" size="sm" variant="outline">
                <SearchIcon data-icon="inline-start" />
                筛选
              </Button>
            </form>
          </CardAction>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            {!loading &&
              list.map((o) => (
                <Card key={o.id} className="gap-3 py-4 shadow-none">
                  <CardHeader className="flex flex-row items-start gap-3 px-4">
                    <Avatar className="size-12">
                      <AvatarImage src={o.brandLogo || undefined} alt="" />
                      <AvatarFallback>
                        <Building2Icon className="size-5 opacity-60" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">
                        {o.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {o.memberCount} 人
                      </CardDescription>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {o.isSystem ? (
                          <Badge variant="secondary">系统组织</Badge>
                        ) : null}
                        {o.isCurrent ? (
                          <Badge variant="default">当前</Badge>
                        ) : null}
                        {o.isMember && !o.isCurrent ? (
                          <Badge variant="outline">已加入</Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter className="px-4">
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
                  </CardFooter>
                </Card>
              ))}
            {!loading && !list.length && (
              <div className="col-span-full">
                <Empty className="border-0 py-10 md:py-12">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Building2Icon />
                    </EmptyMedia>
                    <EmptyTitle>暂无组织</EmptyTitle>
                    <EmptyDescription>
                      {q ? '没有匹配的组织名称' : '暂时没有可展示的组织'}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </div>
        </CardContent>
        {total > pageSize && (
          <CardFooter className="border-t py-3">
            <Pagination
              page={page}
              total={total}
              pageSize={pageSize}
              onChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={loading}
            />
          </CardFooter>
        )}
      </Card>

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
            <Button
              type="button"
              disabled={joining}
              onClick={() => void handleJoin()}
            >
              {joining ? <Spinner data-icon="inline-start" /> : null}
              确认加入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
