import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  backfillProblems,
  getProblemProgress,
  resetProblemQueues,
  clearRecentFailedProblems,
  retryFailedProblems,
  toggleAnalyze,
  toggleFetch,
  type ProblemProgressData,
} from '@/api/problem'
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
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cleanProblemTitle, formatPipelineStage, formatTime } from '@/lib/format'
import { num, str } from '@/lib/http'
import { Perm } from '@/lib/permissions'
import { safeLocalStorage } from '@/lib/safe-storage'
import { OpsConcurrencyCard } from '@/components/ops-concurrency-card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Pagination } from '@/components/pagination'

/** 本地隐藏的失败列表题目 ID，不改后端状态 */
const HIDDEN_PERM_KEY = 'goalgo.problem.hiddenFailedPerm'
const HIDDEN_FAILED_KEY = 'goalgo.problem.hiddenRecentFailed'

function readHiddenIds(key: string): Set<number> {
  try {
    const raw = safeLocalStorage.get(key)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(
      arr.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0),
    )
  } catch {
    return new Set()
  }
}

function writeHiddenIds(key: string, ids: Set<number>) {
  safeLocalStorage.set(key, JSON.stringify([...ids]))
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: '待获取题面',
  FETCHING: '获取题面中',
  TAGGING: '待分析',
  COMPLETED: '已完成',
  FAILED: '失败（可重试）',
  FAILED_PERM: '永久失败',
  SKIPPED: '已跳过',
}

const STATUS_HINT: Record<string, string> = {
  PENDING: '全部',
  FETCHING: '全部',
  TAGGING: '近 6 个月',
  COMPLETED: '全部',
  FAILED: '近 6 个月',
  FAILED_PERM: '近 6 个月',
  SKIPPED: '近 6 个月',
}

export function DashboardProblemProgress() {
  const { can } = useAuth()
  const canProblemOps = can(Perm.SiteProblemOps)
  const [data, setData] = useState<ProblemProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [failedPage, setFailedPage] = useState(1)
  const failedPageSize = 20
  const [inProgressPage, setInProgressPage] = useState(1)
  const inProgressPageSize = 30
  const [selectedJobId, setSelectedJobId] = useState(0)
  const processingJobs: Record<string, unknown>[] = (() => {
    const live = data?.activeJobs || []
    const liveIds = new Set(live.map((job) => num(job.problemId ?? job.id)))
    const queued = (data?.inProgress || [])
      .filter((job) => !liveIds.has(num(job.problemId ?? job.id)))
      .map((job) => ({
        ...job,
        stage: str(job.status) === 'FETCHING' ? 'fetch' : 'analyze',
      }))
    return [...live, ...queued]
  })()
  const selectedJob = processingJobs.find((job) => num(job.problemId ?? job.id) === selectedJobId) || null
  const [hiddenPermIds, setHiddenPermIds] = useState<Set<number>>(() =>
    readHiddenIds(HIDDEN_PERM_KEY),
  )
  const [hiddenFailedIds, setHiddenFailedIds] = useState<Set<number>>(() =>
    readHiddenIds(HIDDEN_FAILED_KEY),
  )
  /** 竞态守卫：轮询/手动刷新只采纳最新响应 */
  const requestId = useRef(0)

  const load = useCallback(async (silent = false) => {
    const rid = ++requestId.current
    if (!silent) setLoading(true)
    const res = await getProblemProgress({ page: failedPage, pageSize: failedPageSize, inProgressPage, inProgressPageSize })
    // 轮询与手动刷新并发时只采纳最新响应；卸载后不再 setState
    if (rid !== requestId.current) return
    if (!silent) setLoading(false)
    if (!res.success || !res.data) {
      if (!silent) toast.error(res.message || '进度加载失败，稍后重试')
      return
    }
    setData(res.data)
  }, [failedPage, failedPageSize, inProgressPage, inProgressPageSize])

  useEffect(() => {
    void load()
    const tick = () => {
      if (document.visibilityState === 'hidden') return
      void load(true)
    }
    const t = window.setInterval(tick, 5000)
    const onVis = () => {
      if (document.visibilityState === 'visible') void load(true)
    }
    document.addEventListener('visibilitychange', onVis)
    const rid = requestId
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
      // 使在途请求失效，卸载后不再 setState
      rid.current++
    }
  }, [load])

  async function run(
    label: string,
    fn: () => Promise<{ success: boolean; message: string }>,
  ) {
    setBusy(true)
    const res = await fn()
    setBusy(false)
    if (res.success) {
      toast.success(res.message || `${label}成功`)
      void load(true)
    } else toast.error(res.message || `失败，稍后重试`)
  }

  async function handleToggleAnalyze() {
    const next = !data?.analyzePaused
    await run(next ? '暂停分析' : '恢复分析', () => toggleAnalyze(next))
  }

  async function handleToggleFetch() {
    const next = !data?.fetchPaused
    await run(next ? '暂停抓取题面' : '恢复抓取题面', () => toggleFetch(next))
  }

  function hideRowsFromList(
    rows: Record<string, unknown>[],
    key: string,
    setIds: (s: Set<number>) => void,
    prev: Set<number>,
    okMsg: string,
  ) {
    const next = new Set(prev)
    for (const r of rows) {
      const id = num(r.id ?? r.problemId)
      if (id) next.add(id)
    }
    writeHiddenIds(key, next)
    setIds(next)
    toast.success(okMsg)
  }

  async function handleClearFailedHistory() {
    setBusy(true)
    const res = await clearRecentFailedProblems()
    setBusy(false)
    if (!res.success) {
      toast.error(res.message || '清空失败，稍后重试')
      return
    }
    // 列表本地也清掉，避免刷新前仍闪旧数据
    const next = new Set(hiddenFailedIds)
    for (const r of data?.recentFailed || []) {
      const id = num(r.id ?? r.problemId)
      if (id) next.add(id)
    }
    writeHiddenIds(HIDDEN_FAILED_KEY, next)
    setHiddenFailedIds(next)
    toast.success(res.message || '已停止自动重试')
    void load(true)
  }

  function handleClearPermHistory() {
    hideRowsFromList(
      data?.recentFailedPerm || [],
      HIDDEN_PERM_KEY,
      setHiddenPermIds,
      hiddenPermIds,
      '已从列表隐藏',
    )
  }

  const visibleRecentFailed = useMemo(() => {
    const rows = data?.recentFailed || []
    return rows.filter((r) => {
      const id = num(r.id ?? r.problemId)
      return !id || !hiddenFailedIds.has(id)
    })
  }, [data?.recentFailed, hiddenFailedIds])

  const visibleFailedPerm = useMemo(() => {
    const rows = data?.recentFailedPerm || []
    return rows.filter((r) => {
      const id = num(r.id ?? r.problemId)
      return !id || !hiddenPermIds.has(id)
    })
  }, [data?.recentFailedPerm, hiddenPermIds])

  const queueMap = Object.fromEntries(
    (data?.queues || []).map((q) => [str(q.name), q]),
  )

  return (
      <PageShell>
      {canProblemOps ? <OpsConcurrencyCard canWrite={can(Perm.SiteConfigWrite)} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">题面处理</h3>
          <p className="text-sm text-muted-foreground">
            AI 分析
            {data?.analyzePaused ? '已暂停' : '进行中'} · 抓取题面
            {data?.fetchPaused ? '已暂停' : '进行中'}
          </p>
        </div>
        {canProblemOps && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void load()}
            >
              刷新
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={busy}>
                  {data?.analyzePaused ? '恢复分析' : '暂停分析'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {data?.analyzePaused ? '恢复 AI 分析？' : '暂停 AI 分析？'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {data?.analyzePaused
                      ? '将继续分析待处理的题目。'
                      : '暂停后可随时恢复，待处理的题目不会丢失。'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleToggleAnalyze()}>
                    确认
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={busy}>
                  {data?.fetchPaused ? '恢复抓取题面' : '暂停抓取题面'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {data?.fetchPaused ? '恢复抓取题面？' : '暂停抓取题面？'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {data?.fetchPaused
                      ? '将继续获取待处理的题面。'
                      : '暂停后可随时恢复，待处理的题目不会丢失。'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleToggleFetch()}>
                    确认
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={busy}>
                  补全近期
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>补全近 6 个月的题目？</AlertDialogTitle>
                  <AlertDialogDescription>
                    检查近 6 个月的提交，为缺少题面或分析的题目补上处理。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void run('补全近期', () => backfillProblems(0))}
                  >
                    确认
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={busy}>
                  重新排队
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>重新排队待处理题目？</AlertDialogTitle>
                  <AlertDialogDescription>
                    按当前题目状态重新安排获取题面与 AI 分析。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      void run('重新排队', () => resetProblemQueues())
                    }
                  >
                    确认
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {loading && !data
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))
          : (data?.items || []).map((item) => (
              <Card key={item.status} className="gap-1 py-3">
                <CardHeader className="px-3 py-0">
                  <CardDescription>
                    {STATUS_LABEL[item.status] || '未知状态'}
                    {STATUS_HINT[item.status] ? (
                      <span className="ml-1 text-[10px] opacity-70">
                        ({STATUS_HINT[item.status]})
                      </span>
                    ) : null}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3">
                  <p className="text-xl font-semibold tabular-nums">{item.count}</p>
                </CardContent>
              </Card>
            ))}
        <Card className="gap-1 py-3">
          <CardHeader className="px-3 py-0">
            <CardDescription>总计</CardDescription>
          </CardHeader>
          <CardContent className="px-3">
            <p className="text-xl font-semibold tabular-nums">{data?.total ?? '-'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(['spider', 'problem_fetch', 'problem_analyze'] as const).map((name) => {
          const q = queueMap[name]
          const label = name === 'spider' ? 'OJ 提交同步' : name === 'problem_fetch' ? '抓取题面' : 'AI 分析'
          return (
            <Card key={name} className="gap-1 py-3">
              <CardHeader className="px-3 py-0">
                <CardDescription>{label}</CardDescription>
              </CardHeader>
              <CardContent className="px-3 text-sm">
                <p className="tabular-nums">
                  待处理{' '}
                  <span className="font-semibold">
                    {q ? num(q.messages) : '-'}
                  </span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  同时处理 {q ? num(q.concurrency) : '-'}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={data?.analyzePaused ? 'destructive' : 'secondary'}>
          AI 分析 {data?.analyzePaused ? '已暂停' : '进行中'}
        </Badge>
        <Badge variant={data?.fetchPaused ? 'destructive' : 'secondary'}>
          抓取题面 {data?.fetchPaused ? '已暂停' : '进行中'}
        </Badge>
      </div>

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base">
            正在处理
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              当前 {processingJobs.length} 题
              {data && data.inProgressTotal > inProgressPageSize ? ` · 共 ${data.inProgressTotal} 题，还有 ${Math.max(0, data.inProgressTotal - inProgressPage * inProgressPageSize)} 题` : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <JobTable rows={processingJobs} onAnalyzeClick={(job) => setSelectedJobId(num(job.problemId ?? job.id))} />
          <div className="border-t px-4 py-3">
            <Pagination page={inProgressPage} pageSize={inProgressPageSize} total={data?.inProgressTotal ?? 0} onChange={setInProgressPage} />
          </div>
        </CardContent>
      </Card>

      <Sheet open={Boolean(selectedJob)} onOpenChange={(open) => { if (!open) setSelectedJobId(0) }}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{str(selectedJob?.title, 'AI 分析')}</SheetTitle>
            <SheetDescription>{str(selectedJob?.platform)} · {str(selectedJob?.externalId)} · 分析中</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <div className="text-xs text-muted-foreground">AI 最新输出</div>
            <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm leading-6">
              {str(selectedJob?.latestOutput, '正在等待 AI 输出…')}
            </pre>
          </div>
        </SheetContent>
      </Sheet>

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base">近期失败</CardTitle>
          <CardDescription className="text-xs">
            可再自动重试；也可手动重试或停止自动重试
          </CardDescription>
          {canProblemOps && (
            <CardAction>
              <div className="flex flex-wrap items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || !visibleRecentFailed.length}
                    >
                      重试
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>重试失败的题目？</AlertDialogTitle>
                      <AlertDialogDescription>
                        将重新处理近 6 个月内可重试的失败题目。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          void run('重试失败', () => retryFailedProblems(0))
                        }
                      >
                        确认
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || !visibleRecentFailed.length}
                    >
                         全部纳入永久失败
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                         <AlertDialogTitle>将全部失败题目纳入永久失败？</AlertDialogTitle>
                      <AlertDialogDescription>
                         近 6 个月内的全部失败题目将停止自动重试，并纳入永久失败。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleClearFailedHistory()}
                      >
                        确认停止
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <JobTable rows={visibleRecentFailed} showError />
          <Pagination page={failedPage} pageSize={failedPageSize} total={data?.recentFailedTotal ?? 0} onChange={setFailedPage} />
        </CardContent>
      </Card>

      {visibleFailedPerm.length > 0 && (
        <Card className="gap-0 py-0 overflow-hidden">
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-base">永久失败</CardTitle>
            <CardDescription className="text-xs">
              不再自动重试，可手动再试
            </CardDescription>
            {canProblemOps && (
              <CardAction>
                <div className="flex flex-wrap items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy || !visibleFailedPerm.length}
                      >
                        重试永久失败
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>重试永久失败的题目？</AlertDialogTitle>
                        <AlertDialogDescription>
                          将重新尝试获取这些题目的题面。付费题等无法获取的题目仍会失败。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            void run('重试永久失败', () =>
                              retryFailedProblems(0, true),
                            )
                          }
                        >
                          确认
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" size="sm" variant="outline" disabled={busy}>
                        从列表隐藏
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>从列表隐藏这些记录？</AlertDialogTitle>
                        <AlertDialogDescription>
                          仅本页不再显示，题目状态不变。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearPermHistory}>
                          确认
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <JobTable rows={visibleFailedPerm} showError />
            <Pagination page={failedPage} pageSize={failedPageSize} total={data?.recentFailedPermTotal ?? 0} onChange={setFailedPage} />
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}

function JobTable({
  rows,
  showError = false,
  onAnalyzeClick,
}: {
  rows: Record<string, unknown>[]
  showError?: boolean
  onAnalyzeClick?: (row: Record<string, unknown>) => void
}) {
  if (!rows.length) {
    return <p className="p-4 text-sm text-muted-foreground">暂时没有记录</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>题目</TableHead>
          <TableHead className="hidden sm:table-cell">平台</TableHead>
          <TableHead>阶段</TableHead>
          {showError ? <TableHead className="min-w-40">原因</TableHead> : null}
          <TableHead>时间</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const id = num(r.problemId ?? r.id)
          const title = cleanProblemTitle(
            str(r.title),
            str(r.externalId || id || '-'),
          )
          const stage = formatPipelineStage(str(r.stage || r.status))
          const errorMsg = str(r.errorMsg || r.error_msg || r.message)
          return (
            <TableRow key={`${id || 'unknown'}:${str(r.stage || r.status)}:${str(r.updatedAt || r.startedAt || r.time)}`} onClick={() => str(r.stage) === 'analyze' ? onAnalyzeClick?.(r) : undefined} className={str(r.stage) === 'analyze' ? 'cursor-pointer' : undefined}>
              <TableCell>
                {id ? (
                  <Link
                    to={`/question-bank/detail/${id}`}
                    className="hover:underline"
                  >
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{str(r.platform, '-')}</TableCell>
              <TableCell>
                <Badge variant="outline">{stage}</Badge>
              </TableCell>
              {showError ? (
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  <span className="line-clamp-2 break-all" title={errorMsg || undefined}>
                    {errorMsg || '—'}
                  </span>
                </TableCell>
              ) : null}
              <TableCell className="text-xs text-muted-foreground">
                {formatTime(r.startedAt || r.updatedAt || r.time)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
