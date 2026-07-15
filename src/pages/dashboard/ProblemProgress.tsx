import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  backfillProblems,
  getProblemProgress,
  resetAllProblems,
  resetProblemQueues,
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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cleanProblemTitle, formatPipelineStage, formatTime } from '@/lib/format'
import { num, str } from '@/lib/http'

function ActionTip({
  tip,
  children,
}: {
  tip: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-left leading-relaxed">
        {tip}
      </TooltipContent>
    </Tooltip>
  )
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
  const { isAdmin } = useAuth()
  const [data, setData] = useState<ProblemProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const res = await getProblemProgress()
    if (!silent) setLoading(false)
    if (!res.success || !res.data) {
      if (!silent) toast.error(res.message || '加载进度失败')
      return
    }
    setData(res.data)
  }, [])

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
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
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
    } else toast.error(res.message || `${label}失败`)
  }

  async function handleToggleAnalyze() {
    const next = !data?.analyzePaused
    await run(next ? '暂停分析' : '恢复分析', () => toggleAnalyze(next))
  }

  async function handleToggleFetch() {
    const next = !data?.fetchPaused
    await run(next ? '暂停获取' : '恢复获取', () => toggleFetch(next))
  }

  const queueMap = Object.fromEntries(
    (data?.queues || []).map((q) => [str(q.name), q]),
  )

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">题库识别</h3>
          <p className="text-sm text-muted-foreground">
            每 5 秒自动刷新 · AI 分析
            {data?.analyzePaused ? '已暂停' : '进行中'} · 题面获取
            {data?.fetchPaused ? '已暂停' : '进行中'}
            <span className="mx-1">·</span>
            暂停不会丢失待处理任务
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <ActionTip tip="立即刷新当前进度（页面也会每 5 秒自动更新）">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void load()}
              >
                刷新
              </Button>
            </ActionTip>

            <ActionTip
              tip={
                data?.analyzePaused
                  ? '继续处理待分析的题目，已排队任务会接着做'
                  : '暂时停止 AI 分析，已排队的任务会保留，不会清空'
              }
            >
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
                      暂停后只是暂时不再处理新任务，已排队的题目会保留，恢复后继续。
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
            </ActionTip>

            <ActionTip
              tip={
                data?.fetchPaused
                  ? '继续获取待处理的题面，已排队任务会接着做'
                  : '暂时停止获取题面，已排队的任务会保留，不会清空'
              }
            >
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" disabled={busy}>
                    {data?.fetchPaused ? '恢复获取' : '暂停获取'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {data?.fetchPaused ? '恢复题面获取？' : '暂停题面获取？'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      暂停后只是暂时不再获取新题面，已排队的任务会保留，恢复后继续。
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
            </ActionTip>

            <ActionTip tip="检查近 6 个月的提交，把缺题面或缺分析的题目补进处理列表（不会清空现有任务）">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" disabled={busy}>
                    补全近期
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>补全近 6 个月的提交？</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>会检查近 6 个月的提交记录，并自动补上缺失项：</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>尚未关联题目的提交 → 完成关联</li>
                          <li>还没有题面 → 安排获取题面</li>
                          <li>有题面但未分析 → 安排 AI 分析</li>
                          <li>已经分析完成 → 跳过</li>
                        </ul>
                        <p>不会清空当前正在排队的任务，只做补充。</p>
                      </div>
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
            </ActionTip>

            <ActionTip tip="清空当前排队任务后，按题目状态重新排队。不会改动已有 AI 标签">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" disabled={busy}>
                    重新排队
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>重新排队待处理题目？</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>会清空当前排队，再按题目状态重新安排：</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>待获取 / 获取卡住的题目 → 重新获取题面</li>
                          <li>近 6 个月待分析的题目 → 重新 AI 分析</li>
                        </ul>
                        <p>
                          不会扫描提交记录，也不会改动已有 AI 标签。新提交仍会优先处理。
                        </p>
                      </div>
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
            </ActionTip>

            <ActionTip tip="只重试近 6 个月内可恢复的失败题目，永久失败不会重试">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" disabled={busy}>
                    重试失败
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>重试失败的题目？</AlertDialogTitle>
                    <AlertDialogDescription>
                      仅重试近 6 个月内可恢复的失败项。有题面的会重新分析，没有题面的会先获取题面。永久失败不会纳入。
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
            </ActionTip>

            <ActionTip tip="清空全部 AI 难度、标签与解法，保留题面后重新分析。影响范围很大，请谨慎">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                  >
                    {busy ? <Spinner data-icon="inline-start" /> : null}
                    重置 AI
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>重置全部 AI 结果？</AlertDialogTitle>
                    <AlertDialogDescription>
                      将清空题目的难度、标签与推荐解法，并重新分析；题面本身会保留。影响范围很大，请确认后再操作。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        void run('重置 AI', () => resetAllProblems(true))
                      }
                    >
                      确认重置
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </ActionTip>
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
                    {STATUS_LABEL[item.status] || item.status}
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
        {(['problem_fetch', 'problem_analyze'] as const).map((name) => {
          const q = queueMap[name]
          const label = name === 'problem_fetch' ? '题面获取' : 'AI 分析'
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
                  工作进程 {q ? num(q.consumers) : '-'}
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
          题面获取 {data?.fetchPaused ? '已暂停' : '进行中'}
        </Badge>
        <Badge variant="outline">新提交优先处理</Badge>
      </div>

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base">
            正在处理
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              当前 {data?.activeJobs?.length ?? 0} 题（最多同时 12 题）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <JobTable rows={data?.activeJobs || []} />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base">近期失败</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <JobTable rows={data?.recentFailed || []} />
        </CardContent>
      </Card>

      {(data?.recentFailedPerm?.length || 0) > 0 && (
        <Card className="gap-0 py-0 overflow-hidden">
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-base">永久失败</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <JobTable rows={data?.recentFailedPerm || []} />
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}

function JobTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) {
    return <p className="p-4 text-sm text-muted-foreground">暂无</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>题目</TableHead>
          <TableHead>平台</TableHead>
          <TableHead>阶段</TableHead>
          <TableHead>时间</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => {
          const id = num(r.problemId ?? r.id)
          const title = cleanProblemTitle(
            str(r.title),
            str(r.externalId || id || '-'),
          )
          const stage = formatPipelineStage(str(r.stage || r.status))
          return (
            <TableRow key={i}>
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
              <TableCell>{str(r.platform, '-')}</TableCell>
              <TableCell>
                <Badge variant="outline">{stage}</Badge>
              </TableCell>
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
