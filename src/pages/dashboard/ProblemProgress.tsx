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
  PENDING: '待爬取',
  FETCHING: '爬取中',
  TAGGING: '待分析',
  COMPLETED: '已完成',
  FAILED: '失败(可重试)',
  FAILED_PERM: '永久失败',
  SKIPPED: '已跳过',
}

const STATUS_HINT: Record<string, string> = {
  PENDING: '全量',
  FETCHING: '全量',
  TAGGING: '近6月',
  COMPLETED: '全量',
  FAILED: '近6月',
  FAILED_PERM: '近6月',
  SKIPPED: '近6月',
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
    const t = window.setInterval(() => void load(true), 5000)
    return () => window.clearInterval(t)
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
    await run(next ? '暂停爬取' : '恢复爬取', () => toggleFetch(next))
  }

  const queueMap = Object.fromEntries(
    (data?.queues || []).map((q) => [str(q.name), q]),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">题库流水线</h3>
          <p className="text-sm text-muted-foreground">
            5s 自动刷新 · 分析
            {data?.analyzePaused ? '已暂停' : '运行中'} · 爬取
            {data?.fetchPaused ? '已暂停' : '运行中'}
            <span className="mx-1">·</span>
            暂停仅停消费，不清队列
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <ActionTip tip="立即拉取最新进度与队列状态（页面本身每 5s 自动刷新）">
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
                  ? '恢复 AI 分析消费；队列里已有消息会继续处理'
                  : '暂停 AI 分析消费，队列消息全部保留，不会清空'
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
                      暂停只停止消费，分析队列消息全部保留，恢复后继续处理。
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
                  ? '恢复题面爬取消费；队列里已有消息会继续处理'
                  : '暂停题面爬取消费，队列消息全部保留，不会清空'
              }
            >
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" disabled={busy}>
                    {data?.fetchPaused ? '恢复爬取' : '暂停爬取'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {data?.fetchPaused ? '恢复题面爬取？' : '暂停题面爬取？'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      暂停只停止消费，爬取队列消息全部保留，恢复后继续处理。
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

            <ActionTip tip="近 6 月提交补缺入队：无题面→爬取，有题面未分析→分析，已完成丢弃。不清空 MQ，与「重置队列」不同">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" disabled={busy}>
                    回填
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>回填近 6 个月提交？</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>扫描近 6 个月提交并入队（不清空现有 MQ）：</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>未绑定提交 → 绑定题目</li>
                          <li>无题面 → 入爬取队列</li>
                          <li>有题面未分析 → 入分析队列</li>
                          <li>已分析完成 → 丢弃</li>
                        </ul>
                        <p>与「重置队列」不同：回填不 purge，只补缺。</p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void run('回填', () => backfillProblems(0))}
                    >
                      确认
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </ActionTip>

            <ActionTip tip="清空爬取/分析 MQ，再按 DB 待爬取、待分析重灌。不扫提交、不改 AI 标签；增量爬虫仍最高优先级">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" disabled={busy}>
                    重置队列
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>重置爬取/分析 MQ 队列？</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>会清空当前 MQ 消息，再按 DB 状态重灌：</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>待爬取（PENDING/卡住的 FETCHING）→ 爬取队列</li>
                          <li>待分析（TAGGING + 近6月）→ 分析队列</li>
                        </ul>
                        <p>
                          不扫提交、不改 AI 标签。增量爬虫新入队仍最高优先级。
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        void run('重置队列', () => resetProblemQueues())
                      }
                    >
                      确认重置
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </ActionTip>

            <ActionTip tip="仅重入 FAILED（近 6 月），排除永久失败。有题面→分析，无题面→爬取">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" disabled={busy}>
                    重试失败
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>重试可恢复失败？</AlertDialogTitle>
                    <AlertDialogDescription>
                      仅重入 FAILED（近 6 月），排除永久失败黑名单。有题面走分析，无题面走爬取。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        void run('重试', () => retryFailedProblems(0))
                      }
                    >
                      确认
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </ActionTip>

            <ActionTip tip="清空全部 AI 标签（难度/标签/解法），保留题面，近 6 月有题面的重新入分析队。影响面大">
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
                    <AlertDialogTitle>重置全部 AI 标签？</AlertDialogTitle>
                    <AlertDialogDescription>
                      清空难度/标签/解法并重新入队分析，保留题面。影响面大，请谨慎。
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
          const label = name === 'problem_fetch' ? '爬取队列' : '分析队列'
          return (
            <Card key={name} className="gap-1 py-3">
              <CardHeader className="px-3 py-0">
                <CardDescription>{label}</CardDescription>
              </CardHeader>
              <CardContent className="px-3 text-sm">
                <p className="tabular-nums">
                  积压{' '}
                  <span className="font-semibold">
                    {q ? num(q.messages) : '-'}
                  </span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  消费者 {q ? num(q.consumers) : '-'}
                  <span className="mx-2 text-muted-foreground">·</span>
                  并发 {q ? num(q.concurrency) : '-'}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={data?.analyzePaused ? 'destructive' : 'secondary'}>
          分析 {data?.analyzePaused ? '暂停' : '运行'}
        </Badge>
        <Badge variant={data?.fetchPaused ? 'destructive' : 'secondary'}>
          爬取 {data?.fetchPaused ? '暂停' : '运行'}
        </Badge>
        <Badge variant="outline">增量入队最高优先级</Badge>
      </div>

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base">
            进行中
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              实际在跑 {data?.activeJobs?.length ?? 0}（并发≤12）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* activeJobs=进程内真实消费；inProgress 是 DB 排队 TAGGING，会刷一堆 */}
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
    </div>
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
