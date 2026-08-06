import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getSpiderMonitor,
  togglePlatformSync,
  type SpiderPlatformStat,
} from '@/api/ops'
import { useAuth } from '@/auth/AuthContext'
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactNumber, formatTime } from '@/lib/format'
import { formatSyncAge, spiderPlatformLabel } from '@/lib/spider-health'
import { Perm } from '@/lib/permissions'
import { cn } from '@/lib/utils'

type Tone = 'ok' | 'warn' | 'fail' | 'muted' | 'paused'

const TONE_DOT: Record<Tone, string> = {
  ok: 'bg-green-500',
  warn: 'bg-yellow-500',
  fail: 'bg-red-500',
  muted: 'bg-muted-foreground/30',
  paused: 'bg-amber-500',
}

const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-green-600',
  warn: 'text-yellow-600',
  fail: 'text-red-600',
  muted: 'text-muted-foreground',
  paused: 'text-amber-600',
}

function worstTone(a: Tone, b: Tone): Tone {
  const rank: Record<Tone, number> = { muted: 0, paused: 1, ok: 2, warn: 3, fail: 4 }
  return rank[a] >= rank[b] ? a : b
}

function StatusDot({ tone, title }: { tone: Tone; title?: string }) {
  return (
    <span
      className={cn('inline-block size-2 shrink-0 rounded-full', TONE_DOT[tone])}
      title={title}
    />
  )
}

type ModuleStatus = { tone: Tone; label: string }

function moduleStatuses(p: SpiderPlatformStat): ModuleStatus[] {
  let submit: ModuleStatus
  if (p.paused) {
    submit = { tone: 'muted', label: '暂停同步' }
  } else if (!p.hasSubmitFetcher) {
    submit = { tone: 'muted', label: '不支持' }
  } else if (p.boundUsers <= 0) {
    submit = { tone: 'muted', label: '无绑定' }
  } else if (p.lastFailAt > 0 && p.lastFailAt >= p.lastOkAt) {
    submit = { tone: 'fail', label: '同步异常' }
  } else if (p.lastOkAt > 0) {
    submit = { tone: 'ok', label: '正常' }
  } else {
    submit = { tone: 'warn', label: '尚未同步' }
  }

  const problem: ModuleStatus = !p.hasProblemFetch
    ? { tone: 'muted', label: '不支持' }
    : p.problemCount > 0
      ? { tone: 'ok', label: '正常' }
      : { tone: 'muted', label: '暂无题目' }

  const contest: ModuleStatus = !p.hasContestCalendar
    ? { tone: 'muted', label: '不支持' }
    : p.contestCount > 0
      ? { tone: 'ok', label: '正常' }
      : { tone: 'muted', label: '暂无赛程' }

  let account: ModuleStatus
  if (!p.hasAccount) {
    account = { tone: 'muted', label: '无需账号' }
  } else if (p.accountStatus === 'ok') {
    account = { tone: 'ok', label: '正常' }
  } else if (p.accountStatus === 'fail') {
    account = { tone: 'fail', label: '登录异常' }
  } else {
    account = { tone: 'muted', label: '未验证' }
  }

  return [submit, problem, contest, account]
}

function cardTone(statuses: ModuleStatus[]): Tone {
  return statuses.reduce<Tone>((acc, s) => worstTone(acc, s.tone), 'muted')
}

function SpiderMonitorCard({
  stat,
  onToggle,
  toggling,
}: {
  stat: SpiderPlatformStat
  onToggle?: (enabled: boolean) => void
  toggling: boolean
}) {
  const statuses = moduleStatuses(stat)
  const overall = cardTone(statuses)
  const moduleLabels = ['提交', '题库', '比赛', '账号']
  const paused = stat.paused

  const lastSyncText =
    stat.lastOkAt > 0
      ? `最近同步 ${formatSyncAge(stat.lastOkAt)}`
      : stat.boundUsers > 0
        ? '尚未成功同步'
        : '暂无同步'
  const hasRecentFail = stat.lastFailAt > 0 && stat.lastFailAt >= stat.lastOkAt
  const failText = hasRecentFail ? `最近失败 ${formatTime(stat.lastFailAt)}` : null

  return (
    <div className={cn('rounded-xl border bg-card p-3.5', paused && 'border-amber-500/40')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <StatusDot tone={paused ? 'paused' : overall} />
          <span className="truncate text-sm font-semibold">
            {spiderPlatformLabel(stat.platform)}
          </span>
          {paused && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
              暂停同步
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!paused && (
            <span className={cn('text-xs font-medium', TONE_TEXT[overall])}>
              {overall === 'fail'
                ? '异常'
                : overall === 'warn'
                  ? '待关注'
                  : overall === 'ok'
                    ? '正常'
                    : '未使用'}
            </span>
          )}
          {onToggle ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={toggling}>
                  {paused ? '启用' : '关闭'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {paused
                      ? `恢复 ${spiderPlatformLabel(stat.platform)} 同步？`
                      : `关闭 ${spiderPlatformLabel(stat.platform)} 同步？`}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {paused
                      ? '恢复后该 OJ 将重新开始抓取已绑定用户的提交与比赛数据。'
                      : '已绑定用户与历史数据都会保留，只是不再同步；绑定该 OJ 的用户仍可继续绑定。'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onToggle(paused)}>
                    {paused ? '恢复同步' : '确认关闭'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Mini label="绑定用户" value={formatCompactNumber(stat.boundUsers)} />
        <Mini label="提交记录" value={formatCompactNumber(stat.submitCount)} />
        <Mini label="今日 成功/失败" value={`${formatCompactNumber(stat.todayOk)} / ${formatCompactNumber(stat.todayFail)}`} />
        <Mini label="今日入库" value={formatCompactNumber(stat.todayRows)} />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {statuses.map((s, i) => (
          <div key={moduleLabels[i]} className="flex items-center gap-1.5 text-xs">
            <StatusDot tone={s.tone} />
            <span className="text-muted-foreground">{moduleLabels[i]}</span>
            <span className="ml-auto font-medium tabular-nums">
              {i === 0
                ? s.label
                : i === 1
                  ? formatCompactNumber(stat.problemCount)
                  : i === 2
                    ? formatCompactNumber(stat.contestCount)
                    : s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 space-y-0.5 border-t pt-2 text-[11px] text-muted-foreground">
        <p className="flex items-center justify-between gap-2">
          <span className="truncate" title={lastSyncText}>
            {lastSyncText}
          </span>
          {stat.lastOkAt > 0 ? (
            <span className="shrink-0 tabular-nums" title={formatTime(stat.lastOkAt)}>
              {formatTime(stat.lastOkAt)}
            </span>
          ) : null}
        </p>
        {failText ? (
          <p className="flex items-center gap-1 text-destructive">
            <span className="truncate" title={stat.lastError || failText}>
              {stat.lastError || failText}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate font-semibold tabular-nums" title={value}>
        {value}
      </p>
    </div>
  )
}

function SpiderMonitorSectionInner() {
  const { can } = useAuth()
  const [data, setData] = useState<SpiderPlatformStat[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState(false)
  const canToggle =
    can(Perm.SiteConfigWrite) || can(Perm.SiteSpiderOps)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getSpiderMonitor()
    setLoading(false)
    if (!res.success || !res.data) {
      setError(res.message || '爬虫监控加载失败')
      return
    }
    setData(res.data)
    setError('')
  }, [])

  const handleToggle = useCallback(
    async (stat: SpiderPlatformStat, enabled: boolean) => {
      setToggling(true)
      const res = await togglePlatformSync(stat.platform, enabled)
      setToggling(false)
      if (res.success) {
        toast.success(
          enabled
            ? `${spiderPlatformLabel(stat.platform)} 已恢复同步`
            : `${spiderPlatformLabel(stat.platform)} 已关闭同步`,
        )
        void load()
      } else {
        toast.error(res.message || '操作失败，请稍后重试')
      }
    },
    [load],
  )

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 60_000)
    return () => clearInterval(timer)
  }, [load])

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">爬虫监控</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">爬虫监控</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">爬虫监控</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            各 OJ 的提交 / 题库 / 比赛 / 账号模块状态
            {' · '}每 60 秒自动刷新
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data || []).map((s) => (
            <SpiderMonitorCard
              key={s.platform}
              stat={s}
              onToggle={canToggle ? (enabled) => void handleToggle(s, enabled) : undefined}
              toggling={toggling}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function OpsSpiderMonitor() {
  const { can } = useAuth()
  if (!can(Perm.SiteConfigRead) && !can(Perm.SiteConfigWrite)) {
    return null
  }
  return <SpiderMonitorSectionInner />
}
