import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getSubmitInventory,
  purgeSubmitsAndRecrawl,
  type SubmitInventory,
} from '@/api/ops'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
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

const CONFIRM_TOKEN = 'PURGE_SUBMITS'

function fmtNum(n: number | undefined) {
  if (n === undefined || Number.isNaN(n)) return '—'
  return formatCompactNumber(n)
}

export function DashboardOps() {
  const { isAdmin } = useAuth()
  const [inv, setInv] = useState<SubmitInventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState('')
  const [purging, setPurging] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getSubmitInventory()
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '提交数据加载失败，请稍后重试')
      return
    }
    setInv(res.data)
  }, [])

  useEffect(() => {
    if (isAdmin) void load()
  }, [isAdmin, load])

  if (!isAdmin) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">仅站点管理员可使用运维工具。</p>
      </PageShell>
    )
  }

  async function handlePurge() {
    if (confirm !== CONFIRM_TOKEN) {
      toast.error(`请输入确认口令 ${CONFIRM_TOKEN}`)
      return
    }
    setPurging(true)
    const res = await purgeSubmitsAndRecrawl(CONFIRM_TOKEN)
    setPurging(false)
    if (!res.success) {
      toast.error(res.message || '操作未完成，请稍后重试')
      return
    }
    const d = res.data
    toast.success(
      res.message ||
        `已清空：明细 ${d?.deletedSubmitLogs ?? 0} · 已重新排队 ${d?.enqueuedUsers ?? 0} 人`,
    )
    setConfirm('')
    void load()
  }

  return (
    <PageShell>
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">运维</h3>
        <p className="text-sm text-muted-foreground">
          监测真实入库提交量，以及危险的数据维护操作（仅站点管理员）。
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">提交数据</CardTitle>
              <CardDescription>
                直接统计数据库行数，不是今日增量
              </CardDescription>
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
                  label="提交明细总行数"
                  value={inv?.submitLogsTotal}
                  hint="提交明细（含力扣合成记录）"
                />
                <Metric
                  label="计入提交统计"
                  value={inv?.submitLogsRealTotal}
                  hint="不含力扣占位记录"
                />
                <Metric
                  label="明细时间范围"
                  value={undefined}
                  hint={
                    inv && inv.oldestTime > 0
                      ? `${formatTime(inv.oldestTime)} → ${formatTime(inv.newestTime)}`
                      : '暂无明细'
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">危险操作</CardTitle>
              <Badge variant="destructive">不可撤销</Badge>
            </div>
            <CardDescription className="leading-relaxed">
              <strong className="text-foreground">彻底删除</strong>
              全部训练相关数据：提交明细、统计、日汇总、刷题热力、比赛记录、提醒日志，并清空相关缓存。随后按已绑定
              OJ 账号重新全量同步。
              <br />
              <strong className="text-foreground">
                保留：用户账号、OJ 绑定、题库、公告/紧急通知、比赛日历与订阅、站点配置。
              </strong>
              同步期间数字会先归零再回升。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purge-confirm">
                确认口令（请输入{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {CONFIRM_TOKEN}
                </code>
                ）
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
                  {purging ? '执行中…' : '清空全部提交并全量重爬'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清空全部训练数据？</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      将彻底删除提交、统计、比赛记录等（题库与 OJ 绑定保留），并在后台重新全量同步。此操作无法撤销。
                    </span>
                    <span className="block text-muted-foreground">
                      请确认已做好备份，且当前不在使用高峰期。
                    </span>
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
