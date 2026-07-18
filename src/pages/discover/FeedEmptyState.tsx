import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlusIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getRank } from '@/api/statistic'
import { followUser, getSocialRelation } from '@/api/social'
import type { StatisticRankItem } from '@shared/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'

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

type Props = {
  isLogin: boolean
  selfUserId?: number
  /** 关注成功后刷新 Feed */
  onFollowed: () => void
  followingOnly?: boolean
}

/**
 * Cold-start empty: prompt + ~5 recommended creators with one-click follow.
 */
export function FeedEmptyState({
  isLogin,
  selfUserId,
  onFollowed,
  followingOnly,
}: Props) {
  const [creators, setCreators] = useState<StatisticRankItem[]>([])
  const [loading, setLoading] = useState(true)
  const [relationMap, setRelationMap] = useState<Record<number, boolean>>({})
  const [busyId, setBusyId] = useState(0)

  useEffect(() => {
    let cancelled = false
    const range = weekRange()
    setLoading(true)
    void getRank({
      startDate: range.start,
      endDate: range.end,
      scoreType: 'ac',
      page: 1,
      pageSize: 8,
    }).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        setCreators([])
        return
      }
      const list = res.data.list
        .filter((r) => !selfUserId || r.userId !== selfUserId)
        .slice(0, 5)
      setCreators(list)
    })
    return () => {
      cancelled = true
    }
  }, [selfUserId])

  useEffect(() => {
    if (!isLogin || !creators.length) {
      setRelationMap({})
      return
    }
    let cancelled = false
    void Promise.all(
      creators.map(async (c) => {
        const r = await getSocialRelation(c.userId)
        return r.success && r.data
          ? ([c.userId, r.data.isFollowing] as const)
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
  }, [creators, isLogin])

  async function handleFollow(userId: number) {
    if (!isLogin) {
      toast.error('请先登录后再关注')
      return
    }
    if (relationMap[userId]) {
      toast.message('已经关注过了')
      return
    }
    setBusyId(userId)
    const res = await followUser(userId)
    setBusyId(0)
    if (!res.success) {
      toast.error(res.message || '关注失败，请稍后重试')
      return
    }
    setRelationMap((m) => ({ ...m, [userId]: true }))
    toast.success('已关注')
    onFollowed()
  }

  return (
    <div data-discover-feed-empty="" className="flex flex-col gap-6 py-6">
      <Empty className="border-0 py-6 md:py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>暂无动态</EmptyTitle>
          <EmptyDescription>
            {followingOnly
              ? '关注他人后，这里会显示其提交与题解。'
              : '暂无组织动态。可关注活跃用户以获取更新。'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <section className="rounded-xl border bg-card/50 px-4 py-4">
        <h3 className="text-sm font-semibold">推荐关注</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          近 7 日 AC 较多 · 关注后刷新列表
        </p>
        <ul className="mt-3 flex flex-col divide-y">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="ml-auto h-8 w-16" />
              </li>
            ))}
          {!loading &&
            creators.map((c) => {
              const following = relationMap[c.userId]
              return (
                <li
                  key={c.userId}
                  className="flex items-center gap-3 py-3"
                >
                  <Avatar className="size-9">
                    <AvatarImage src="/images/defaultAvatar.png" alt="" />
                    <AvatarFallback>
                      {(c.name || '?').slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/profile?id=${c.userId}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {c.name || `用户${c.userId}`}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      近 7 日 AC {c.score}
                    </p>
                  </div>
                  {isLogin ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={following ? 'outline' : 'default'}
                      disabled={busyId === c.userId || following}
                      onClick={() => void handleFollow(c.userId)}
                    >
                      <UserPlusIcon data-icon="inline-start" />
                      {following ? '已关注' : '关注'}
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link to="/login">登录关注</Link>
                    </Button>
                  )}
                </li>
              )
            })}
          {!loading && !creators.length && (
            <li className="py-4 text-center text-sm text-muted-foreground">
              暂无可推荐用户
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
