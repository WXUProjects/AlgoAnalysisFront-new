import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getSubmitInventory,
  purgeSubmitsAndRecrawl,
  type SubmitInventory,
} from '@/api/ops'
import { OpsMonitorSection } from '@/pages/dashboard/OpsMonitor'
import { OpsSpiderMonitor } from '@/pages/dashboard/OpsSpiderMonitor'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { OpsBackupCard } from '@/components/ops-backup-card'
import { OpsConcurrencyCard } from '@/components/ops-concurrency-card'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactNumber, formatTime } from '@/lib/format'
import { Perm } from '@/lib/permissions'

const CONFIRM_TOKEN = 'PURGE_SUBMITS'

function fmtNum(n: number | undefined) {
  if (n === undefined || Number.isNaN(n)) return '—'
  return formatCompactNumber(n)
}

export function DashboardOps() {
  const { can } = useAuth()
  // 任一运维类权限即可进入本页；具体分区再按权限显隐
  const canOps =
    can(Perm.SiteSpiderOps) ||
    can(Perm.SiteBackup) ||
    can(Perm.SiteConfigWrite) ||
    can(Perm.SiteProblemOps)
  const canPurge = can(Perm.SiteSpiderOps)
  const canBackup = can(Perm.SiteBackup)
  const canReadConfig = can(Perm.SiteConfigRead) || can(Perm.SiteConfigWrite)
  const [inv, setInv] = useState<SubmitInventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState('')
  const [purging, setPurging] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getSubmitInventory()
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '提交数据加载失败，稍后重试')
      return
    }
    setInv(res.data)
  }, [])

  useEffect(() => {
    if (canOps) void load()
  }, [canOps, load])

  if (!canOps) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">
          你还没有使用运维工具的权限。有需要的话，找站点管理员开通。
        </p>
      </PageShell>
    )
  }

  async function handlePurge() {
    if (confirm !== CONFIRM_TOKEN) {
      toast.error(`输入确认口令 ${CONFIRM_TOKEN}`)
      return
    }
    setPurging(true)
    const res = await purgeSubmitsAndRecrawl(CONFIRM_TOKEN)
    setPurging(false)
    if (!res.success) {
      toast.error(res.message || '操作没完成，稍后重试')
      return
    }
    const d = res.data
    toast.success(
      res.message ||
        `已清空 ${d?.deletedSubmitLogs ?? 0} 条提交，开始为 ${d?.enqueuedUsers ?? 0} 人重新同步`,
    )
    setConfirm('')
    void load()
  }

  return (
    <PageShell>
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">运维</h3>
        <p className="text-sm text-muted-foreground">
          看提交数据规模，以及需要谨慎操作的数据维护。
        </p>
      </div>

      <div className="grid gap-4">
        <OpsMonitorSection />
        <OpsSpiderMonitor />
        {canReadConfig ? <OpsConcurrencyCard canWrite={can(Perm.SiteConfigWrite)} /> : null}
        {canBackup ? <OpsBackupCard /> : null}

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">提交数据</CardTitle>
              <CardDescription>全站累计提交规模</CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => void load()}
            >
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            {loading && !inv ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Metric
                  label="全部提交"
                  value={inv?.submitLogsTotal}
                  hint="含力扣补全记录"
                />
                <Metric
                  label="计入统计"
                  value={inv?.submitLogsRealTotal}
                  hint="仅真实提交"
                />
                <Metric
                  label="时间范围"
                  value={undefined}
                  hint={
                    inv && inv.oldestTime > 0
                      ? `${formatTime(inv.oldestTime)} → ${formatTime(inv.newestTime)}`
                      : '还没有数据'
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {canPurge && (
        <Card className="border-destructive/40">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">危险操作</CardTitle>
              <Badge variant="destructive">不可撤销</Badge>
            </div>
            <CardDescription className="leading-relaxed">
              彻底删除全站提交、统计、比赛与刷题热力等训练数据，再按已绑定的
              OJ 账号重新同步。用户账号、OJ 绑定、题库与站点配置会保留。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purge-confirm">
                输入确认码{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {CONFIRM_TOKEN}
                </code>
              </Label>
              <Input
                id="purge-confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.trim())}
                placeholder={CONFIRM_TOKEN}
                autoComplete="off"
                disabled={purging}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={purging || confirm !== CONFIRM_TOKEN}
                >
                  {purging ? '执行中…' : '清空训练数据并重新同步'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清空全部训练数据？</AlertDialogTitle>
                  <AlertDialogDescription>
                    将删除提交、统计与比赛记录，再重新同步。题库与做题账号保留。此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void handlePurge()}
                  >
                    确认执行
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
        )}
      </div>
    </PageShell>
  )
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value?: number
  hint?: string
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
        title={value === undefined ? undefined : String(value)}
      >
        {value === undefined ? '—' : fmtNum(value)}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
