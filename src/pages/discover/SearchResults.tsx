import { useEffect, useState } from 'react'
import { UserMinusIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  followUser,
  getSocialRelation,
  searchUsers,
  unfollowUser,
} from '@/api/social'
import type { SocialUser } from '@shared/api'
import { Pagination } from '@/components/pagination'
import {
  UserIdentity,
  resolveDisplayName,
} from '@/components/user-identity'
import { useListQueryState } from '@/hooks/use-list-query-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'

const DEFAULT_PAGE_SIZE = 20

export function DiscoverSearchResults({
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
      toast.error('请先登录后再继续')
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
      toast.error(res.message || '操作未完成，请稍后重试')
      return
    }
    setRelationMap((m) => ({ ...m, [u.userId]: !following }))
    toast.success(following ? '已取消关注' : '已关注')
  }

  return (
    <div data-discover-search-results="" className="flex flex-col gap-4">
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
                <EmptyTitle>没有找到匹配的用户</EmptyTitle>
                <EmptyDescription>
                  换个关键词试试，或返回继续浏览动态与组织
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {!loading &&
            list.map((u) => {
              const display = resolveDisplayName(u)
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
                  <UserIdentity user={u} className="flex-1" />
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
