import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { listJoinRequests, reviewJoinRequest } from '@/api/org'
import { PageShell } from '@/components/page-shell'
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
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'
import { Perm } from '@/lib/permissions'
import { num, str } from '@/lib/http'

export type OrgJoinRequestItem = {
  id: number
  userId: number
  username: string
  name: string
  orgDisplayName?: string
  status?: string
  createdAt?: number
  avatar?: string
}

function normalizeJoinRequest(raw: unknown): OrgJoinRequestItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = num(r.id)
  if (!id) return null
  return {
    id,
    userId: num(r.userId),
    username: str(r.username),
    name: str(r.name) || str(r.orgDisplayName) || str(r.username),
    orgDisplayName: str(r.orgDisplayName) || undefined,
    status: str(r.status) || undefined,
    createdAt: num(r.createdAt) || undefined,
    avatar: str(r.avatar) || undefined,
  }
}

/** 组织加入审批：/admin/user?tab=join */
export function DashboardOrgJoinReview() {
  const { currentOrg, user, can } = useAuth()
  const orgId = currentOrg?.id || user?.orgId || 0
  const canReview = can(Perm.OrgJoinReview)

  const [list, setList] = useState<OrgJoinRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!orgId || !canReview) {
      setList([])
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await listJoinRequests(orgId)
    setLoading(false)
    if (!res.success) {
      toast.error(res.message || '加载失败')
      setList([])
      return
    }
    const items = (res.list || [])
      .map(normalizeJoinRequest)
      .filter((x): x is OrgJoinRequestItem => x != null)
    setList(items)
  }, [orgId, canReview])

  useEffect(() => {
    void load()
  }, [load])

  async function onReview(id: number, approve: boolean) {
    setBusyId(id)
    const res = await reviewJoinRequest(id, approve)
    setBusyId(null)
    if (!res.success) {
      toast.error(res.message || (approve ? '通过失败' : '拒绝失败'))
      return
    }
    toast.success(approve ? '已通过' : '已拒绝')
    setList((prev) => prev.filter((x) => x.id !== id))
  }

  if (!canReview) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">
          需要「审批加入申请」权限才能访问这里。
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell className="gap-3">
      <div>
        <h3 className="font-semibold">加入审批</h3>
        <p className="text-sm text-muted-foreground">
          审核通过邀请码或公开入口提交的加入申请。通过后对方成为本组织成员。
        </p>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="space-y-1 border-b px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">待审批</CardTitle>
            {list.length > 0 ? (
              <Badge variant="destructive">{list.length}</Badge>
            ) : null}
          </div>
          <CardDescription>
            {currentOrg?.name
              ? `当前组织：${currentOrg.name}`
              : '当前组织待审申请'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : list.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              暂无待审批申请
            </p>
          ) : (
            <ul className="divide-y">
              {list.map((r) => {
                const display =
                  r.orgDisplayName || r.name || r.username || `用户 #${r.userId}`
                const initial = display.slice(0, 1).toUpperCase()
                const busy = busyId === r.id
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-9">
                        {r.avatar ? <AvatarImage src={r.avatar} alt="" /> : null}
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {r.userId ? (
                            <Link
                              to={
                                r.username
                                  ? `/profile/${r.username}`
                                  : `/profile?id=${r.userId}`
                              }
                              className="hover:underline"
                            >
                              {display}
                            </Link>
                          ) : (
                            display
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.username ? `@${r.username}` : null}
                          {r.username && r.createdAt ? ' · ' : null}
                          {r.createdAt ? formatTime(r.createdAt) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void onReview(r.id, true)}
                      >
                        通过
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void onReview(r.id, false)}
                      >
                        拒绝
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
