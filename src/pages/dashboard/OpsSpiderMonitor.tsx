import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { PlatformUserItem } from '@shared/api'
import {
  getPlatformUsers,
  getSpiderMonitor,
  togglePlatformSync,
  type SpiderPlatformStat,
  type SpiderSyncModule,
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
} from '@/components/ui/alert-dialog'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { formatCompactNumber, formatTime } from '@/lib/format'
import { formatSyncAge, spiderPlatformLabel } from '@/lib/spider-health'
import {
  SPIDER_ERROR_ACK_STORAGE_KEY,
  acknowledgeSpiderError,
  canViewSpiderUsers,
  getSpiderMonitorView,
  isSpiderErrorAcknowledged,
  parseSpiderErrorAcknowledgements,
  spiderToggleFailureMessage,
  type SpiderErrorAcknowledgements,
  type SpiderMonitorTone as Tone,
} from '@/lib/spider-monitor-state'
import { Perm } from '@/lib/permissions'
import { safeLocalStorage } from '@/lib/safe-storage'
import { cn } from '@/lib/utils'

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

function StatusDot({ tone, title }: { tone: Tone; title?: string }) {
  return (
    <span
      className={cn('inline-block size-2 shrink-0 rounded-full', TONE_DOT[tone])}
      title={title}
    />
  )
}

function SpiderMonitorCard({
  stat,
  onToggle,
  togglingSubmit,
  togglingProblem,
  canToggleSubmit,
  canToggleProblem,
  onViewUsers,
  errorAcknowledged,
  onAcknowledgeError,
}: {
  stat: SpiderPlatformStat
  onToggle?: (module: SpiderSyncModule, enabled: boolean, source?: 'official' | 'vjudge') => void
  togglingSubmit: boolean
  togglingProblem: boolean
  canToggleSubmit: boolean
  canToggleProblem: boolean
  onViewUsers?: (platform: string) => void
  errorAcknowledged: boolean
  onAcknowledgeError: () => void
}) {
  const view = getSpiderMonitorView(stat, errorAcknowledged)
  const { statuses, overall, paused } = view
  const moduleLabels = ['提交', '题库', '比赛', '账号']
  const [confirmModule, setConfirmModule] = useState<{ module: SpiderSyncModule; source?: 'official' | 'vjudge' } | null>(null)

  const lastSyncText =
    stat.lastOkAt > 0
      ? `最近同步 ${formatSyncAge(stat.lastOkAt)}`
      : stat.boundUsers > 0
        ? '还未成功同步'
        : '还没有同步'
  const hasRecentFail = stat.lastFailAt > 0 && stat.lastFailAt >= stat.lastOkAt
  const hasAccountFail = stat.hasAccount && stat.accountStatus === 'fail'
  const hasError = hasRecentFail || hasAccountFail
  const activeSyncError = hasRecentFail ? stat.lastError : ''
  const activeAccountError = hasAccountFail ? stat.accountErr : ''
  const activeErrorTime = Math.max(
    hasRecentFail ? stat.lastFailAt : 0,
    hasAccountFail ? stat.accountAt : 0,
  )
  const errorText = activeSyncError || activeAccountError || `最近失败 ${formatTime(activeErrorTime)}`
  const submitAccountReady = !stat.hasAccount || stat.accountStatus === 'ok'

  function handleSwitchChange(module: SpiderSyncModule, v: boolean, source?: 'official' | 'vjudge') {
    if (source) {
      onToggle?.(module, v, source)
      return
    }
    if (v) {
      onToggle?.(module, true)
    } else {
      setConfirmModule({ module, source })
    }
  }

  return (
    <div className={cn('rounded-xl border bg-card p-3.5', paused && 'border-amber-500/40')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <StatusDot tone={overall} />
          <span className="truncate text-sm font-semibold">
            {spiderPlatformLabel(stat.platform)}
          </span>
          {stat.submitPaused && <Badge variant="outline">提交已暂停</Badge>}
          {stat.problemPaused && <Badge variant="outline">题面已暂停</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn('text-xs font-medium', TONE_TEXT[overall])}>
            {view.overallLabel}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border p-2.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span>提交记录</span>
          {canToggleSubmit ? (
            <Switch
              checked={submitAccountReady && !stat.submitPaused}
              disabled={!stat.hasSubmitFetcher || !submitAccountReady || togglingSubmit}
              onCheckedChange={(enabled) => handleSwitchChange('submit', enabled)}
              aria-label={`${spiderPlatformLabel(stat.platform)}提交记录同步`}
            />
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <span>题面</span>
            {canToggleProblem ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">官方</span>
                <Switch checked={stat.officialStatementEnabled} disabled={togglingProblem} onCheckedChange={(enabled) => handleSwitchChange('problem', enabled, 'official')} aria-label={`${spiderPlatformLabel(stat.platform)}官方题面`} />
                {['LuoGu', 'CodeForces', 'AtCoder', 'QOJ'].includes(stat.platform) ? (
                  <>
                    <span className="text-xs text-muted-foreground">VirtualOJ</span>
                    <Switch checked={stat.vjudgeStatementEnabled} disabled={togglingProblem} onCheckedChange={(enabled) => handleSwitchChange('problem', enabled, 'vjudge')} aria-label={`${spiderPlatformLabel(stat.platform)}VirtualOJ题面`} />
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AlertDialog
        open={confirmModule !== null}
        onOpenChange={(open) => !open && setConfirmModule(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              暂停{confirmModule?.module === 'problem' ? '题面获取' : '提交记录同步'}？
            </AlertDialogTitle>
            <AlertDialogDescription>恢复前将不再获取新数据。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmModule) onToggle?.(confirmModule.module, false, confirmModule.source)
                setConfirmModule(null)
              }}
            >
              确认暂停
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Mini
          label="绑定用户"
          value={formatCompactNumber(stat.boundUsers)}
          onClick={
            stat.boundUsers > 0 && onViewUsers
              ? () => onViewUsers(stat.platform)
              : undefined
          }
        />
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
                  ? view.problem.display
                  : i === 2
                    ? formatCompactNumber(stat.contestCount)
                    : s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex flex-col gap-0.5 border-t pt-2 text-[11px] text-muted-foreground">
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
        {hasError && !errorAcknowledged ? (
          <p className="flex items-center gap-1 text-destructive">
            <span className="truncate" title={errorText}>
              {errorText}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="ml-auto"
              onClick={onAcknowledgeError}
            >
              知道了
            </Button>
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Mini({
  label,
  value,
  onClick,
}: {
  label: string
  value: string
  onClick?: () => void
}) {
  const inner = (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate font-semibold tabular-nums" title={value}>
        {value}
      </p>
    </div>
  )
  if (!onClick) return inner
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded text-left transition-opacity hover:opacity-70"
      title={`查看${label}列表`}
    >
      {inner}
    </button>
  )
}

function SpiderMonitorSectionInner() {
  const { can } = useAuth()
  const canViewUsers = canViewSpiderUsers(can)
  const [data, setData] = useState<SpiderPlatformStat[] | null>(null)
  const pendingSourceChanges = useRef(new Map<string, boolean>())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState<Set<string>>(() => new Set())
  const [errorAcknowledgements, setErrorAcknowledgements] = useState<SpiderErrorAcknowledgements>(
    () => parseSpiderErrorAcknowledgements(safeLocalStorage.get(SPIDER_ERROR_ACK_STORAGE_KEY)),
  )
  const canToggleSubmit = can(Perm.SiteSpiderOps)
  const canToggleProblem = can(Perm.SiteProblemOps)

  const [usersOpen, setUsersOpen] = useState(false)
  const [usersPlatform, setUsersPlatform] = useState('')
  const [users, setUsers] = useState<PlatformUserItem[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)

  const openUsers = useCallback(async (platform: string) => {
    setUsersPlatform(platform)
    setUsersOpen(true)
    setUsersLoading(true)
    const res = await getPlatformUsers(platform)
    setUsersLoading(false)
    if (res.success && res.data) {
      setUsers(res.data.list)
      setUsersTotal(res.data.total)
    } else {
      toast.error(res.message || '加载绑定用户失败')
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getSpiderMonitor()
    setLoading(false)
    if (!res.success || !res.data) {
      setError(res.message || '爬虫监控加载失败')
      return
    }
    setData(res.data.map((item) => ({
      ...item,
      officialStatementEnabled: pendingSourceChanges.current.get(`${item.platform}:official`) ?? item.officialStatementEnabled,
      vjudgeStatementEnabled: pendingSourceChanges.current.get(`${item.platform}:vjudge`) ?? item.vjudgeStatementEnabled,
    })))
    setError('')
  }, [])

  const handleToggle = useCallback(
    async (stat: SpiderPlatformStat, module: SpiderSyncModule, enabled: boolean, source?: 'official' | 'vjudge') => {
       const toggleKey = `${stat.platform}:${module}:${source || ''}`
       setToggling((current) => new Set(current).add(toggleKey))
       if (module === 'problem' && source) {
         pendingSourceChanges.current.set(`${stat.platform}:${source}`, enabled)
         setData((current) => current?.map((item) => (
           item.platform !== stat.platform
             ? item
             : source === 'official'
               ? { ...item, officialStatementEnabled: enabled }
               : { ...item, vjudgeStatementEnabled: enabled }
         )) || current)
       }
       const platform = spiderPlatformLabel(stat.platform)
      const feature = module === 'submit' ? '提交记录同步' : '题面获取'
      const action = enabled ? '恢复' : '暂停'
      const fallbackMessage = spiderToggleFailureMessage(platform, module, enabled)
      try {
        const res = await togglePlatformSync(stat.platform, enabled, module, source)
        if (res.success) {
          toast.success(source ? `${platform}已${enabled ? '开启' : '关闭'}${source === 'official' ? '官方题面' : 'VirtualOJ题面'}` : `${platform}已${action}${feature}`)
          await load()
          if (module === 'problem' && source) {
            pendingSourceChanges.current.delete(`${stat.platform}:${source}`)
            // Keep the controlled Switch responsive even if the monitor read
            // is briefly served from a stale replica/cache.
            setData((current) => current?.map((item) => (
              item.platform !== stat.platform
                ? item
                : source === 'official'
                  ? { ...item, officialStatementEnabled: enabled }
                  : { ...item, vjudgeStatementEnabled: enabled }
            )) || current)
          }
        } else {
          if (module === 'problem' && source) {
            pendingSourceChanges.current.delete(`${stat.platform}:${source}`)
            setData((current) => current?.map((item) => (
              item.platform !== stat.platform
                ? item
                : source === 'official'
                  ? { ...item, officialStatementEnabled: !enabled }
                  : { ...item, vjudgeStatementEnabled: !enabled }
            )) || current)
          }
          toast.error(res.message || fallbackMessage)
        }
      } catch {
        if (module === 'problem' && source) {
          pendingSourceChanges.current.delete(`${stat.platform}:${source}`)
          setData((current) => current?.map((item) => (
            item.platform !== stat.platform
              ? item
              : source === 'official'
                ? { ...item, officialStatementEnabled: !enabled }
                : { ...item, vjudgeStatementEnabled: !enabled }
          )) || current)
        }
        toast.error(fallbackMessage)
      } finally {
        setToggling((current) => {
          const next = new Set(current)
          next.delete(toggleKey)
          return next
        })
      }
    },
    [load],
  )

  const acknowledgeError = useCallback((stat: SpiderPlatformStat) => {
    setErrorAcknowledgements((current) => {
      const next = acknowledgeSpiderError(current, stat)
      safeLocalStorage.set(SPIDER_ERROR_ACK_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

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
               onToggle={(module, enabled, source) => void handleToggle(s, module, enabled, source)}
               togglingSubmit={toggling.has(`${s.platform}:submit:`)}
               togglingProblem={toggling.has(`${s.platform}:problem:official`) || toggling.has(`${s.platform}:problem:vjudge`)}
              canToggleSubmit={canToggleSubmit}
              canToggleProblem={canToggleProblem}
              onViewUsers={canViewUsers ? (platform) => void openUsers(platform) : undefined}
              errorAcknowledged={isSpiderErrorAcknowledged(s, errorAcknowledgements)}
              onAcknowledgeError={() => acknowledgeError(s)}
            />
          ))}
        </div>
      </CardContent>

      <Dialog open={usersOpen} onOpenChange={setUsersOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {spiderPlatformLabel(usersPlatform)} · 绑定用户（{usersTotal}）
            </DialogTitle>
            <DialogDescription>
              绑定该 OJ 的站内用户与 OJ 账号
            </DialogDescription>
          </DialogHeader>
          {usersLoading ? (
            <div className="flex flex-col gap-2 py-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              暂无绑定用户
            </p>
          ) : (
            <div className="max-h-96 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">用户</th>
                    <th className="px-3 py-2">OJ 账号</th>
                    <th className="px-3 py-2 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.userId} className="border-t">
                      <td className="px-3 py-2 font-medium">
                        {u.name || u.username || `用户${u.userId}`}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {u.ojUsername || '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {u.hasRating && u.rating != null ? u.rating : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function OpsSpiderMonitor() {
  const { can } = useAuth()
  if (
    !can(Perm.SiteConfigRead) &&
    !can(Perm.SiteSpiderOps) &&
    !can(Perm.SiteProblemOps)
  ) {
    return null
  }
  return <SpiderMonitorSectionInner />
}
