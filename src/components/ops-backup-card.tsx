import { useEffect, useState } from 'react'
import type {
  DisasterBackupState,
  DisasterBackupStatus,
  DisasterBackupTrigger,
  GetDisasterBackupStatusRes,
  RunDisasterBackupRes,
} from '@shared/api'
import { toast } from 'sonner'
import {
  getDisasterBackupStatus,
  runDisasterBackup,
} from '@/api/backup'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { formatTime } from '@/lib/format'
import type { ApiResult } from '@/lib/http'

const RUNNING_REFRESH_MS = 5_000
const IDLE_REFRESH_MS = 60_000

const statusLabels: Record<DisasterBackupState, string> = {
  idle: '待命',
  running: '备份中',
  succeeded: '已完成',
  failed: '失败',
  disabled: '未启用',
}

const triggerLabels: Record<DisasterBackupTrigger, string> = {
  '': '—',
  manual: '手动',
  scheduled: '定时',
}

function formatBytes(value: number): string {
  if (value <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const amount = value / 1024 ** unit
  return `${amount >= 10 || unit === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unit]}`
}

function statusVariant(status: DisasterBackupState) {
  if (status === 'failed') return 'destructive' as const
  if (status === 'running' || status === 'succeeded') return 'default' as const
  return 'secondary' as const
}

interface OpsBackupCardProps {
  getStatus?: () => Promise<ApiResult<GetDisasterBackupStatusRes>>
  runBackup?: () => Promise<ApiResult<RunDisasterBackupRes>>
}

export function OpsBackupCard({
  getStatus = getDisasterBackupStatus,
  runBackup = runDisasterBackup,
}: OpsBackupCardProps) {
  const [status, setStatus] = useState<DisasterBackupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  useEffect(() => {
    let active = true
    async function load() {
      const res = await getStatus()
      if (!active) return
      setLoading(false)
      if (res.success && res.data) {
        setStatus(res.data.status)
      } else {
        toast.error(res.message || '备份状态加载失败，稍后重试')
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [getStatus])

  useEffect(() => {
    if (!status) return
    const delay = status.status === 'running' ? RUNNING_REFRESH_MS : IDLE_REFRESH_MS
    const timer = setInterval(async () => {
      const res = await getStatus()
      if (res.success && res.data) setStatus(res.data.status)
    }, delay)
    return () => clearInterval(timer)
  }, [getStatus, status?.status])

  async function handleRun() {
    setRequesting(true)
    const res = await runBackup()
    setRequesting(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '备份未开始，稍后重试')
      return
    }
    setStatus(res.data.status)
    if (res.data.accepted) {
      toast.success('备份已开始')
    } else {
      toast.error(res.data.status.message || '备份未开始')
    }
  }

  const unavailable = !status?.enabled || status.status === 'disabled'
  const running = status?.status === 'running'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">数据备份</CardTitle>
        <CardDescription>查看最近一次备份并按需立即备份</CardDescription>
        <CardAction>
          {status ? (
            <Badge variant={statusVariant(status.status)}>
              {running ? <Spinner data-icon="inline-start" /> : null}
              {statusLabels[status.status]}
            </Badge>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading && !status ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : status ? (
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <BackupDetail label="备份功能" value={status.enabled ? '已启用' : '未启用'} />
            <BackupDetail label="触发方式" value={triggerLabels[status.trigger]} />
            <BackupDetail label="开始时间" value={formatTime(status.startedAt)} />
            <BackupDetail label="完成时间" value={formatTime(status.finishedAt)} />
            <BackupDetail label="备份大小" value={formatBytes(status.archiveSize)} />
            <BackupDetail label="数据库数量" value={status.databaseCount ? String(status.databaseCount) : '—'} />
            {status.error ? (
              <div className="sm:col-span-2 lg:col-span-4">
                <dt className="text-muted-foreground">错误</dt>
                <dd className="mt-1 text-destructive">{status.error}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">暂时无法获取备份状态</p>
        )}
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          disabled={loading || unavailable || running || requesting}
          onClick={() => void handleRun()}
        >
          {requesting || running ? <Spinner data-icon="inline-start" /> : null}
          {requesting || running ? '备份中…' : '立即备份'}
        </Button>
      </CardFooter>
    </Card>
  )
}

function BackupDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{value}</dd>
    </div>
  )
}
