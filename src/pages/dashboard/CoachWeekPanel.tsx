import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { listProfiles } from '@/api/profile'
import { getInvite } from '@/api/org'
import {
  downloadTrainingReport,
  getTrainingReportJob,
  startTrainingReport,
  statusLabel,
} from '@/api/training-report'
import type { TrainingReportJob, UserListItem } from '@shared/api'
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
import { daysAgoYmd } from '@/lib/format'
import { cn } from '@/lib/utils'

const MAX_SCAN_PAGES = 5
const PAGE_SIZE = 50
const SHOW_LIMIT = 12
const DROP_DAYS = 7

function defaultReportRange(): { start: string; end: string } {
  // 与 OrgTrainingReportCard：昨天往前 6 天 = 7 日区间
  const end = daysAgoYmd(1)
  const start = daysAgoYmd(7)
  return { start, end }
}

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
  canReport?: boolean
  className?: string
}

/**
 * 教练周工作台：掉队名单（未登录 / 未提交）+ 一键上周训练报告。
 */
export function CoachWeekPanel({
  orgId,
  canInvite = false,
  canReport = true,
  className,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [loginInactive, setLoginInactive] = useState<UserListItem[]>([])
  const [loginTotal, setLoginTotal] = useState(0)
  const [noSubmit, setNoSubmit] = useState<DropRow[]>([])
  const [noSubmitTotal, setNoSubmitTotal] = useState(0)
  const [scannedMembers, setScannedMembers] = useState(0)
  const [memberTotal, setMemberTotal] = useState(0)
  const [inviteBusy, setInviteBusy] = useState(false)

  const [reportStarting, setReportStarting] = useState(false)
  const [reportJob, setReportJob] = useState<TrainingReportJob | null>(null)
  const reportRange = useMemo(() => defaultReportRange(), [])

  const loadDropOff = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const cutoff = Math.floor(Date.now() / 1000) - DROP_DAYS * 86400

    const loginRes = await listProfiles(1, SHOW_LIMIT, 'org', undefined, {
      inactiveDays: DROP_DAYS,
    })
    if (loginRes.success && loginRes.data) {
      setLoginInactive(loginRes.data.list)
      setLoginTotal(loginRes.data.total)
    } else {
      setLoginInactive([])
      setLoginTotal(0)
    }

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

  // 轮询一键报告任务
  useEffect(() => {
    if (!reportJob?.jobId) return
    if (reportJob.status === 'done' || reportJob.status === 'failed' || reportJob.status === 'expired') {
      return
    }
    let cancelled = false
    const tick = async () => {
      const res = await getTrainingReportJob(reportJob.jobId)
      if (cancelled || !res.success || !res.data) return
      setReportJob(res.data)
      if (res.data.status === 'done') {
        toast.success('训练报告已生成，可下载')
      } else if (res.data.status === 'failed') {
        toast.error(res.data.errorDetail || res.data.message || '报告生成失败')
      }
    }
    const id = window.setInterval(() => void tick(), 2500)
    void tick()
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [reportJob?.jobId, reportJob?.status])

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

  async function startLastWeekReport() {
    if (!canReport) return
    setReportStarting(true)
    const res = await startTrainingReport({
      orgId,
      startDate: reportRange.start,
      endDate: reportRange.end,
      useAi: false,
    })
    setReportStarting(false)
    if (!res.success || !res.data?.jobId) {
      toast.error(res.message || '无法开始生成报告')
      return
    }
    toast.success('已开始生成上周训练报告')
    setReportJob({
      jobId: res.data.jobId,
      status: 'pending',
      progress: 0,
      startDate: reportRange.start,
      endDate: reportRange.end,
      useAi: false,
      message: '排队中',
    })
  }

  const truncated = scannedMembers < memberTotal && memberTotal > 0

  return (
    <Card className={cn('shadow-none', className)}>
      <CardHeader className="gap-1 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">本周队况</CardTitle>
            <CardDescription>
              近 {DROP_DAYS} 天未登录 / 未提交的队员，以及一键生成上周训练报告（
              {reportRange.start} ~ {reportRange.end}）。
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
      <CardContent className="grid gap-4 lg:grid-cols-3">
        {/* 未登录 */}
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">久未登录</p>
            <Badge variant="secondary" className="tabular-nums">
              {loading ? '…' : loginTotal}
            </Badge>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            最近 {DROP_DAYS} 天没有登录记录
          </p>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : loginInactive.length === 0 ? (
            <p className="text-xs text-muted-foreground">暂无</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {loginInactive.map((u) => (
                <li key={u.userId}>
                  <Link
                    to={u.username ? `/profile/${u.username}` : `/profile?id=${u.userId}`}
                    className="text-sm hover:underline"
                  >
                    {u.name || u.username}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Button asChild size="sm" variant="link" className="mt-2 h-auto px-0">
            <Link to={`/admin/user?inactiveDays=${DROP_DAYS}`}>在成员列表中查看</Link>
          </Button>
        </div>

        {/* 未提交 */}
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
            <p className="text-xs text-muted-foreground">暂无</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
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
        </div>

        {/* 一键报告 */}
        <div className="flex flex-col rounded-lg border p-3">
          <p className="mb-1 text-sm font-medium">上周训练报告</p>
          <p className="mb-3 text-xs text-muted-foreground">
            汇总活跃排行与未提交名单，生成后 24 小时内可下载。
          </p>
          {canReport ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={reportStarting}
                onClick={() => void startLastWeekReport()}
              >
                {reportStarting ? <Spinner data-icon="inline-start" /> : null}
                一键生成
              </Button>
              {reportJob ? (
                <div className="mt-3 space-y-1.5 text-xs">
                  <p className="text-muted-foreground">
                    状态：{statusLabel(reportJob.status)}
                    {reportJob.progress
                      ? ` · ${Math.round(reportJob.progress)}%`
                      : ''}
                  </p>
                  {reportJob.message ? (
                    <p className="text-muted-foreground">{reportJob.message}</p>
                  ) : null}
                  {reportJob.status === 'done' && reportJob.downloadable !== false ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const r = downloadTrainingReport(reportJob.jobId)
                        if (!r.success) toast.error(r.message)
                      }}
                    >
                      下载报告
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <Button asChild size="sm" variant="link" className="mt-auto h-auto px-0 pt-3">
                <a href="#training-report">更多选项（日期 / 分组 / AI）</a>
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">当前账号没有导出训练报告的权限。</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
