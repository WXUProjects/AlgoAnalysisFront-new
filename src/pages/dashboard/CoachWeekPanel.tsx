import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { listProfiles } from '@/api/profile'
import { getInvite } from '@/api/org'
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
import { Spinner } from '@/components/ui/spinner'
import { buildOrgInviteUrl } from '@/lib/org-invite'
import { cn } from '@/lib/utils'

const MAX_SCAN_PAGES = 5
const PAGE_SIZE = 50
const SHOW_LIMIT = 12
const DROP_DAYS = 7

function parseLastSubmitUnix(raw?: string): number {
  const n = Number(String(raw || '').trim())
  return Number.isFinite(n) && n > 0 ? n : 0
}

type DropRow = {
  userId: number
  name: string
  username: string
  lastSubmit: number
}

type Props = {
  orgId: number
  canInvite?: boolean
  className?: string
}

/**
 * 本周队况：近 7 天未提交名单（完整名单见下方训练报告）。
 * 训练报告统一由 OrgTrainingReportCard 负责，避免两处重复入口。
 */
export function CoachWeekPanel({
  orgId,
  canInvite = false,
  className,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [noSubmit, setNoSubmit] = useState<DropRow[]>([])
  const [noSubmitTotal, setNoSubmitTotal] = useState(0)
  const [scannedMembers, setScannedMembers] = useState(0)
  const [memberTotal, setMemberTotal] = useState(0)
  const [inviteBusy, setInviteBusy] = useState(false)

  const loadDropOff = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const cutoff = Math.floor(Date.now() / 1000) - DROP_DAYS * 86400

    const inactive: DropRow[] = []
    let total = 0
    let scanned = 0
    for (let page = 1; page <= MAX_SCAN_PAGES; page++) {
      const res = await listProfiles(page, PAGE_SIZE, 'org')
      if (!res.success || !res.data) break
      total = res.data.total
      const list = res.data.list || []
      scanned += list.length
      for (const u of list) {
        const ts = parseLastSubmitUnix(u.lastSubmit)
        if (ts === 0 || ts < cutoff) {
          inactive.push({
            userId: u.userId,
            name: u.name || u.username,
            username: u.username,
            lastSubmit: ts,
          })
        }
      }
      if (list.length < PAGE_SIZE || scanned >= total) break
    }
    setMemberTotal(total)
    setScannedMembers(scanned)
    setNoSubmitTotal(inactive.length)
    setNoSubmit(inactive.slice(0, SHOW_LIMIT))
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    void loadDropOff()
  }, [loadDropOff])

  async function copyInvite() {
    setInviteBusy(true)
    const res = await getInvite(orgId)
    setInviteBusy(false)
    if (!res.success || !res.inviteCode) {
      toast.error('暂时无法获取邀请链接')
      return
    }
    const url = buildOrgInviteUrl(res.inviteCode)
    try {
      await navigator.clipboard.writeText(url)
      toast.success('邀请链接已复制')
    } catch {
      toast.message('邀请链接', { description: url })
    }
  }

  const truncated = scannedMembers < memberTotal && memberTotal > 0

  return (
    <Card className={cn('shadow-none', className)}>
      <CardHeader className="gap-1 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">本周队况</CardTitle>
            <CardDescription>
              近 {DROP_DAYS} 天没有做题记录的队员。完整名单与排行见下方训练报告。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {canInvite ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={inviteBusy}
                onClick={() => void copyInvite()}
              >
                {inviteBusy ? <Spinner data-icon="inline-start" /> : null}
                复制邀请链接
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={() => void loadDropOff()}>
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">久未提交</p>
            <Badge variant="secondary" className="tabular-nums">
              {loading ? '…' : noSubmitTotal}
              {truncated ? '+' : ''}
            </Badge>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            近 {DROP_DAYS} 天没有做题记录
            {truncated
              ? `（已扫描 ${scannedMembers}/${memberTotal} 人，完整名单见训练报告）`
              : null}
          </p>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : noSubmit.length === 0 ? (
            <p className="text-xs text-muted-foreground">近 {DROP_DAYS} 天大家都有提交，暂无掉队名单</p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {noSubmit.map((u) => (
                <li key={u.userId} className="flex items-center justify-between gap-2">
                  <Link
                    to={u.username ? `/profile/${u.username}` : `/profile?id=${u.userId}`}
                    className="truncate text-sm hover:underline"
                  >
                    {u.name || u.username}
                  </Link>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {u.lastSubmit
                      ? new Date(u.lastSubmit * 1000).toLocaleDateString()
                      : '无记录'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Button asChild size="sm" variant="link" className="mt-2 h-auto px-0">
            <a href="#training-report">去生成训练报告</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
