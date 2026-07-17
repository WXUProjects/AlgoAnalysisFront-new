import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { SearchIcon, UserPlusIcon, UserMinusIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  followUser,
  getSocialRelation,
  listFollowers,
  listFollowing,
  searchUsers,
  unfollowUser,
} from '@/api/social'
import { getProfileByUsername } from '@/api/profile'
import type { SocialUser } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 20

type TabKey = 'following' | 'followers' | 'search'

export function Social() {
  const { username } = useParams<{ username?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isLogin, user } = useAuth()

  const tab = (searchParams.get('tab') as TabKey) || (username ? 'following' : 'search')
  const page = Number(searchParams.get('page') || 1) || 1
  const pageSizeRaw = Number(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE)
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
      ? Math.floor(pageSizeRaw)
      : DEFAULT_PAGE_SIZE
  const qParam = searchParams.get('q') || ''

  const [targetUserId, setTargetUserId] = useState(0)
  const [targetName, setTargetName] = useState('')
  const [list, setList] = useState<SocialUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [qInput, setQInput] = useState(qParam)
  const [relationMap, setRelationMap] = useState<Record<number, boolean>>({})
  const [busyId, setBusyId] = useState(0)

  const isSelf =
    Boolean(isLogin && user && username && user.username === username) ||
    Boolean(isLogin && user && !username)

  useEffect(() => {
    setQInput(qParam)
  }, [qParam])

  // 解析目标用户
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (!username) {
        if (user) {
          setTargetUserId(user.userId)
          setTargetName(user.name || user.username)
        } else {
          setTargetUserId(0)
          setTargetName('')
        }
        return
      }
      const res = await getProfileByUsername(username)
      if (cancelled) return
      if (res.success && res.data) {
        setTargetUserId(res.data.userId)
        setTargetName(res.data.name || res.data.username)
      } else {
        setTargetUserId(0)
        setTargetName('')
        toast.error(res.message || '找不到该用户')
      }
    }
    void resolve()
    return () => {
      cancelled = true
    }
  }, [username, user])

  const load = useCallback(async () => {
    setLoading(true)
    if (tab === 'search') {
      const res = await searchUsers(qParam, page, pageSize)
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '搜索失败，请稍后重试')
        setList([])
        setTotal(0)
        return
      }
      setList(res.data.list)
      setTotal(res.data.total)
      return
    }
    if (!targetUserId) {
      setLoading(false)
      setList([])
      setTotal(0)
      return
    }
    const res =
      tab === 'followers'
        ? await listFollowers(targetUserId, page, pageSize)
        : await listFollowing(targetUserId, page, pageSize)
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '用户列表加载失败，请稍后重试')
      setList([])
      setTotal(0)
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
  }, [tab, page, pageSize, qParam, targetUserId])

  useEffect(() => {
    void load()
  }, [load])

  // 登录后补关系状态
  useEffect(() => {
    if (!isLogin || !list.length) {
      setRelationMap({})
      return
    }
    let cancelled = false
    async function fill() {
      const next: Record<number, boolean> = {}
      await Promise.all(
        list.map(async (u) => {
          if (user && u.userId === user.userId) return
          const r = await getSocialRelation(u.userId)
          if (r.success && r.data) next[u.userId] = r.data.isFollowing
        }),
      )
      if (!cancelled) setRelationMap(next)
    }
    void fill()
    return () => {
      cancelled = true
    }
  }, [list, isLogin, user])

  function setTab(next: TabKey) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('tab', next)
        p.set('page', '1')
        if (next !== 'search') p.delete('q')
        return p
      },
      { replace: true },
    )
  }

  function setPage(p: number) {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        if (p <= 1) n.delete('page')
        else n.set('page', String(p))
        return n
      },
      { replace: true },
    )
  }

  function setPageSize(size: number) {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        if (size === DEFAULT_PAGE_SIZE) n.delete('pageSize')
        else n.set('pageSize', String(size))
        n.delete('page')
        return n
      },
      { replace: true },
    )
  }

  function doSearch() {
    setSearchParams(
      {
        tab: 'search',
        q: qInput.trim(),
        page: '1',
      },
      { replace: true },
    )
  }

  async function toggleFollow(u: SocialUser) {
    if (!isLogin) {
      toast.error('请先登录后再继续')
      return
    }
    if (user && u.userId === user.userId) return
    setBusyId(u.userId)
    const following = relationMap[u.userId]
    const res = following
      ? await unfollowUser(u.userId)
      : await followUser(u.userId)
    setBusyId(0)
    if (!res.success) {
      toast.error(res.message || '操作未完成，请稍后重试')
      return
    }
    setRelationMap((m) => ({ ...m, [u.userId]: !following }))
    toast.success(following ? '已取消关注' : '已关注')
  }

  const title =
    tab === 'search'
      ? '搜索用户'
      : tab === 'followers'
        ? `${targetName || '用户'} 的粉丝`
        : `${targetName || '用户'} 的关注`

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            关注同学，在动态与题库中只看他们的内容
          </p>
        </div>
        {username && (
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to={`/profile/${username}`}>返回资料</Link>
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          {(username || isSelf) && (
            <>
              <TabsTrigger value="following">关注</TabsTrigger>
              <TabsTrigger value="followers">粉丝</TabsTrigger>
            </>
          )}
          <TabsTrigger value="search">搜索</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-sm"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="用户名或昵称"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  doSearch()
                }
              }}
            />
            <Button type="button" onClick={doSearch}>
              <SearchIcon data-icon="inline-start" />
              搜索
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="following" />
        <TabsContent value="followers" />
      </Tabs>

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-sm font-medium">
            {tab === 'search' ? (qParam ? `「${qParam}」的结果` : '全部用户') : '列表'}
          </CardTitle>
          <CardDescription>{total} 人</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          {!loading && !list.length && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              没有找到相关用户
            </p>
          )}
          {!loading &&
            list.map((u) => {
              const display = u.name || u.username
              const following = relationMap[u.userId]
              const selfRow = Boolean(user && u.userId === user.userId)
              return (
                <div
                  key={u.userId}
                  className="flex items-center gap-3 px-4 py-3"
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
                      className={cn(following && 'text-muted-foreground')}
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

      {total > pageSize && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </PageShell>
  )
}
