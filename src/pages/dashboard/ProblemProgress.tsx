import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Copy,
  Eye,
  ExternalLink,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  SquareStack,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  backfillProblems,
  clearRecentFailedProblems,
  getProblemProgress,
  resetProblemQueues,
  retryFailedProblems,
  toggleAnalyze,
  toggleFetch,
  type ProblemProgressData,
} from "@/api/problem";
import { useAuth } from "@/auth/AuthContext";
import { PageShell } from "@/components/page-shell";
import { OpsConcurrencyCard } from "@/components/ops-concurrency-card";
import { Pagination } from "@/components/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  cleanProblemTitle,
  formatPipelineStage,
  formatTime,
} from "@/lib/format";
import { num, str } from "@/lib/http";
import { Perm } from "@/lib/permissions";
import { safeLocalStorage } from "@/lib/safe-storage";
import {
  paginateProblemJobs,
  PROBLEM_JOBS_PAGE_SIZE,
  queuedProblemJobs,
} from "@/lib/problem-queue-jobs";

const PROBLEM_ALERT_ACK_KEY = "goalgo.problem.progress.alertAck";

type AlertAcknowledgement = { failed: number; permanent: number };

function readAlertAcknowledgement(): AlertAcknowledgement {
  try {
    const raw = safeLocalStorage.get(PROBLEM_ALERT_ACK_KEY);
    if (!raw) return { failed: 0, permanent: 0 };
    const parsed = JSON.parse(raw) as Partial<AlertAcknowledgement>;
    return {
      failed:
        Number.isFinite(parsed.failed) && Number(parsed.failed) >= 0
          ? Number(parsed.failed)
          : 0,
      permanent:
        Number.isFinite(parsed.permanent) && Number(parsed.permanent) >= 0
          ? Number(parsed.permanent)
          : 0,
    };
  } catch {
    return { failed: 0, permanent: 0 };
  }
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待获取题面",
  FETCHING: "获取题面中",
  TAGGING: "等待 AI 分析",
  COMPLETED: "已完成",
  FAILED: "失败",
  FAILED_PERM: "永久失败",
  SKIPPED: "已跳过",
};
const STATUS_ICON: Record<string, typeof CircleDot> = {
  PENDING: Clock3,
  FETCHING: Activity,
  TAGGING: Zap,
  COMPLETED: CheckCircle2,
  FAILED: AlertTriangle,
  FAILED_PERM: XCircle,
  SKIPPED: CircleDot,
};

function queueInfo(name: string) {
  if (name === "spider") return { label: "提交记录同步", icon: RefreshCw };
  if (name === "problem_fetch") return { label: "题面获取", icon: SquareStack };
  return { label: "AI 分析", icon: Zap };
}

export function DashboardProblemProgress() {
  const { can } = useAuth();
  const canOps = can(Perm.SiteProblemOps);
  const [data, setData] = useState<ProblemProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failedPage, setFailedPage] = useState(1);
  const [workerPage, setWorkerPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [alertAcknowledgement, setAlertAcknowledgement] =
    useState<AlertAcknowledgement>(readAlertAcknowledgement);
  const requestId = useRef(0);
  const failedPageSize = 20;

  const load = useCallback(
    async (silent = false) => {
      const rid = ++requestId.current;
      if (!silent) setLoading(true);
      const res = await getProblemProgress({
        page: failedPage,
        pageSize: failedPageSize,
      });
      if (rid !== requestId.current) return;
      setLoading(false);
      if (!res.success || !res.data) {
        if (!silent) toast.error(res.message || "处理进度加载失败");
        return;
      }
      setData(res.data);
    },
    [failedPage],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 5000);
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnVisible);
      requestId.current++;
    };
  }, [load]);

  async function run(
    label: string,
    action: () => Promise<{ success: boolean; message: string }>,
  ) {
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (!res.success) {
      toast.error(res.message || `${label}失败`);
      return;
    }
    if (label === "停止自动重试") {
      setData((current) =>
        current
          ? { ...current, recentFailed: [], recentFailedTotal: 0 }
          : current,
      );
      setFailedPage(1);
    }
    toast.success(res.message || `${label}成功`);
    void load(true);
  }

  const statusMap = useMemo(
    () => new Map((data?.items || []).map((item) => [item.status, item.count])),
    [data?.items],
  );
  const queueMap = useMemo(
    () =>
      new Map((data?.queues || []).map((queue) => [str(queue.name), queue])),
    [data?.queues],
  );
  const failedCount = statusMap.get("FAILED") || 0;
  // Acknowledging is a local view preference, never a backend state change.
  const acknowledgedFailed = Math.min(alertAcknowledgement.failed, failedCount);
  const unacknowledgedFailed = Math.max(0, failedCount - acknowledgedFailed);
  const attentionCount = unacknowledgedFailed;
  const finished = statusMap.get("COMPLETED") || 0;
  const total = data?.total || 0;
  const completion = total ? Math.round((finished / total) * 100) : 0;

  function acknowledgeAlerts() {
    const next = { failed: failedCount, permanent: 0 };
    safeLocalStorage.set(PROBLEM_ALERT_ACK_KEY, JSON.stringify(next));
    setAlertAcknowledgement(next);
  }
  // Stage records are only treated as waiting when the corresponding queue
  // confirms that work is actually pending.
  const liveJobs = useMemo(() => {
    return data?.activeJobs || [];
  }, [data?.activeJobs]);
  const queuedJobs = useMemo(
    () =>
      queuedProblemJobs(data?.inProgress || [], liveJobs, {
        fetch: queueMap.has("problem_fetch")
          ? num(queueMap.get("problem_fetch")?.messages)
          : undefined,
        analyze: queueMap.has("problem_analyze")
          ? num(queueMap.get("problem_analyze")?.messages)
          : undefined,
      }),
    [data?.inProgress, liveJobs, queueMap],
  );
  const workerJobs = useMemo(
    () => liveJobs.concat(queuedJobs),
    [liveJobs, queuedJobs],
  );
  const visibleWorkerJobs = useMemo(
    () => paginateProblemJobs(workerJobs, workerPage),
    [workerJobs, workerPage],
  );
  const conversations = data?.conversations || [];
  const runningByStage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of data?.activeJobs || [])
      counts.set(str(job.stage), (counts.get(str(job.stage)) || 0) + 1);
    return counts;
  }, [data?.activeJobs]);

  useEffect(() => {
    if (!selectedJob) return;
    const selectedId = num(selectedJob.problemId ?? selectedJob.id);
    const next = liveJobs
      .concat(conversations)
      .find((job) => num(job.problemId ?? job.id) === selectedId);
    if (next) setSelectedJob(next);
  }, [conversations, liveJobs, selectedJob]);

  useEffect(() => {
    const lastPage = Math.max(
      1,
      Math.ceil(workerJobs.length / PROBLEM_JOBS_PAGE_SIZE),
    );
    if (workerPage > lastPage) setWorkerPage(lastPage);
  }, [workerJobs.length, workerPage]);

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                题库处理中心
              </h1>
              <Badge variant={attentionCount ? "destructive" : "secondary"}>
                {attentionCount ? `${attentionCount} 项需关注` : "运行正常"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              实时查看题面获取、AI 分析和失败任务，必要时快速介入。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-muted-foreground">
              <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
              每 5 秒自动刷新
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || loading}
              onClick={() => void load()}
            >
              <RefreshCw data-icon="inline-start" />
              刷新
            </Button>
          </div>
        </header>

        {attentionCount > 0 ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>有任务需要处理</AlertTitle>
            <AlertDescription>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>新增 {unacknowledgedFailed} 项可重试失败。</span>
                <Button variant="outline" size="sm" onClick={acknowledgeAlerts}>
                  知道了
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="全部题目"
            value={total}
            detail={`${completion}% 已完成`}
            icon={SquareStack}
            progress={completion}
            loading={loading && !data}
          />
          <MetricCard
            label="待处理"
            value={
              (statusMap.get("PENDING") || 0) + (statusMap.get("TAGGING") || 0)
            }
            detail={`获取题面 ${statusMap.get("PENDING") || 0} · 等待 AI ${statusMap.get("TAGGING") || 0}`}
            icon={Clock3}
            loading={loading && !data}
          />
          <MetricCard
            label="正在执行"
            value={liveJobs.length}
            detail="当前 worker 正在处理"
            icon={Activity}
            loading={loading && !data}
          />
          <MetricCard
            label="需要关注"
            value={attentionCount}
            detail="可重试失败"
            icon={attentionCount ? AlertTriangle : CheckCircle2}
            tone={attentionCount ? "danger" : "success"}
            loading={loading && !data}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Activity className="size-5" />
                </div>
                <div>
                  <CardTitle>运行状态</CardTitle>
                  <CardDescription>
                    三类任务的队列压力和处理开关
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <Badge
                  variant={
                    data?.fetchPaused || data?.analyzePaused
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {data?.fetchPaused || data?.analyzePaused
                    ? "部分暂停"
                    : "全部运行中"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {(["spider", "problem_fetch", "problem_analyze"] as const).map(
                (name) => {
                  const queue = queueMap.get(name);
                  const meta = queueInfo(name);
                  const Icon = meta.icon;
                  const paused =
                    name === "problem_fetch"
                      ? data?.fetchPaused
                      : name === "problem_analyze"
                        ? data?.analyzePaused
                        : false;
                  return (
                    <div
                      key={name}
                      className="rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="size-4 text-muted-foreground" />
                          {meta.label}
                        </span>
                        <span
                          className={`size-2 rounded-full ${paused ? "bg-destructive" : "bg-emerald-500"}`}
                        />
                      </div>
                      <div className="mt-4 flex items-baseline gap-1">
                        <strong className="text-2xl tabular-nums">
                          {queue
                            ? num(queue.messages) +
                              (runningByStage.get(
                                name === "problem_analyze"
                                  ? "analyze"
                                  : name === "problem_fetch"
                                    ? "fetch"
                                    : "spider",
                              ) || 0)
                            : "-"}
                        </strong>
                        <span className="text-xs text-muted-foreground">
                          待处理（含执行中）
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        排队 {queue ? num(queue.messages) : "-"} · 并行{" "}
                        {queue ? num(queue.concurrency) : "-"} 项 ·{" "}
                        {paused ? "已暂停" : "运行中"}
                      </div>
                    </div>
                  );
                },
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>快捷操作</CardTitle>
              <CardDescription>影响范围较大的操作会二次确认</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <ActionButton
                disabled={!canOps || busy}
                onClick={() =>
                  void run(
                    data?.fetchPaused ? "恢复题面获取" : "暂停题面获取",
                    () => toggleFetch(!data?.fetchPaused),
                  )
                }
                icon={data?.fetchPaused ? Play : Pause}
              >
                {data?.fetchPaused ? "恢复题面获取" : "暂停题面获取"}
              </ActionButton>
              <ActionButton
                disabled={!canOps || busy}
                onClick={() =>
                  void run(
                    data?.analyzePaused ? "恢复 AI 分析" : "暂停 AI 分析",
                    () => toggleAnalyze(!data?.analyzePaused),
                  )
                }
                icon={data?.analyzePaused ? Play : Pause}
              >
                {data?.analyzePaused ? "恢复 AI 分析" : "暂停 AI 分析"}
              </ActionButton>
              <div className="grid grid-cols-2 gap-2">
                <ConfirmAction
                  title="补全近期题目？"
                  description="检查近 6 个月的提交，为缺少题面或分析的题目安排处理。"
                  disabled={!canOps || busy}
                  onConfirm={() =>
                    void run("补全近期", () => backfillProblems(0))
                  }
                >
                  补全近期
                </ConfirmAction>
                <ConfirmAction
                  title="重新安排任务？"
                  description="根据当前题目状态重新安排题面获取和 AI 分析。"
                  disabled={!canOps || busy}
                  onConfirm={() => void run("重新排队", resetProblemQueues)}
                >
                  重新排队
                </ConfirmAction>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div>
              <CardTitle className="flex items-center gap-2">
                处理任务 <Badge variant="outline">{workerJobs.length}</Badge>
              </CardTitle>
              <CardDescription>
                当前正在执行或待处理的题面获取、AI 分析任务
              </CardDescription>
            </div>
            <CardAction>
              {conversations.some(
                (job) =>
                  str(job.state) === "running" && str(job.stage) === "analyze",
              ) ? (
                <Badge variant="secondary">
                  <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  有实时任务
                </Badge>
              ) : (
                <Badge variant="outline">当前无实时输出</Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <JobTable
              rows={visibleWorkerJobs}
              onAnalyzeClick={setSelectedJob}
              empty="当前没有执行中或待处理的任务"
            />
            <Pagination
              page={workerPage}
              pageSize={PROBLEM_JOBS_PAGE_SIZE}
              total={workerJobs.length}
              onChange={setWorkerPage}
            />
          </CardContent>
        </Card>

        <section>
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <div>
                <CardTitle className="flex items-center gap-2">
                  失败记录{" "}
                  <Badge variant="outline">
                    {data?.recentFailedTotal || 0}
                  </Badge>
                </CardTitle>
                <CardDescription>近 6 个月内可自动重试的题目</CardDescription>
              </div>
              <CardAction>
                <div className="flex gap-2">
                  <ConfirmAction
                    title="重试失败题目？"
                    description="将重新处理近 6 个月内可重试的失败题目。"
                    disabled={!canOps || busy || !data?.recentFailed.length}
                    onConfirm={() =>
                      void run("重试失败", () => retryFailedProblems(0))
                    }
                  >
                    重试全部
                  </ConfirmAction>
                  <ConfirmAction
                    title="停止自动重试？"
                    description="失败题目将停止自动重试，并记录为永久失败。"
                    disabled={!canOps || busy || !data?.recentFailed.length}
                    onConfirm={() =>
                      void run("停止自动重试", clearRecentFailedProblems)
                    }
                  >
                    停止重试
                  </ConfirmAction>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="max-h-[420px] overflow-auto p-0">
              <JobTable
                rows={data?.recentFailed || []}
                showError
                empty="暂无可重试的失败记录"
              />
              <Pagination
                page={failedPage}
                pageSize={failedPageSize}
                total={data?.recentFailedTotal || 0}
                onChange={setFailedPage}
              />
            </CardContent>
          </Card>
        </section>

        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div>
              <CardTitle className="flex items-center gap-2">
                最近成功{" "}
                <Badge variant="outline">
                  {Math.min(100, data?.recentCompleted.length || 0)}
                </Badge>
              </CardTitle>
              <CardDescription>最近完成的题目，最多保留 100 条</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="max-h-[360px] overflow-auto p-0">
            <JobTable rows={data?.recentCompleted || []} empty="暂无成功记录" />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div>
              <CardTitle className="flex items-center gap-2">
                AI 任务记录{" "}
                <Badge variant="outline">
                  {Math.min(100, conversations.length)}
                </Badge>
              </CardTitle>
              <CardDescription>
                运行中的任务和最近 1 小时内结束的任务
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="max-h-[360px] overflow-auto p-0">
            <ConversationTable rows={conversations} onSelect={setSelectedJob} />
          </CardContent>
        </Card>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>处理概况</CardTitle>
              <CardDescription>题库状态分布</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {(data?.items || [])
                .filter((item) => item.status !== "COMPLETED")
                .map((item) => {
                  const Icon = STATUS_ICON[item.status] || CircleDot;
                  const percent = total
                    ? Math.round((item.count / total) * 100)
                    : 0;
                  return (
                    <div key={item.status} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          {STATUS_LABEL[item.status] || item.status}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {item.count}{" "}
                          <span className="text-xs">({percent}%)</span>
                        </span>
                      </div>
                      <Progress value={percent} />
                    </div>
                  );
                })}
              {!data?.items.length && <Skeleton className="h-24 w-full" />}
              <Separator />
              <Link
                to="/question-bank"
                className="flex items-center justify-between text-sm font-medium hover:underline"
              >
                打开题库 <ChevronRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </section>

        {canOps ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="size-4" />
              运行并发
            </div>
            <OpsConcurrencyCard canWrite={can(Perm.SiteConfigWrite)} />
          </div>
        ) : null}
      </div>

      <Sheet
        open={Boolean(selectedJob)}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null);
        }}
      >
        {selectedJob ? (
          <div className="sr-only" aria-live="polite">
            {selectedJob.state === "finished"
              ? "任务已结束"
              : selectedJob.reasoningOutput || selectedJob.latestOutput
                ? "正在接收 AI 响应"
                : "等待 AI 输出"}
          </div>
        ) : null}
        <SheetContent className="flex w-full flex-col sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="pr-8 leading-snug">
              {str(selectedJob?.title, "任务诊断")}
            </SheetTitle>
            <SheetDescription>
              {str(selectedJob?.platform)} · {str(selectedJob?.externalId)} ·{" "}
              {str(selectedJob?.stage) === "analyze"
                ? selectedJob?.state === "finished" ? "AI 分析已结束" : "AI 分析中"
                : str(selectedJob?.status) === "TAGGING"
                  ? "等待 AI 分析"
                  : "题面获取中"}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <InfoItem
                label="当前状态"
                value={
                  selectedJob?.state === "finished"
                    ? "已结束"
                    : str(selectedJob?.stage) === "analyze"
                    ? "正在执行"
                    : str(selectedJob?.status) === "TAGGING"
                      ? "等待分析"
                      : formatPipelineStage(str(selectedJob?.status))
                }
              />
              <InfoItem
                label="最近更新"
                value={formatTime(
                  selectedJob?.endedAt || selectedJob?.startedAt,
                )}
              />
              <InfoItem
                label="失败次数"
                value={
                  selectedJob?.fetchAttempts !== undefined
                    ? String(selectedJob.fetchAttempts)
                    : "-"
                }
              />
              <InfoItem
                label="输出状态"
                value={selectedJob?.latestOutput ? "已有结果" : selectedJob?.reasoningOutput ? "正在思考" : selectedJob?.state === "finished" ? "无输出" : "等待输出"}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {selectedJob?.reasoningOutput || selectedJob?.latestOutput ? (
                  <>
                    <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    实时响应
                  </>
                ) : selectedJob?.state === "finished" ? (
                  <>
                    <AlertTriangle className="size-3.5 text-amber-500" />
                    任务已结束，但没有返回文本
                  </>
                ) : (
                  <>
                    <Clock3 className="size-3.5 text-muted-foreground" />
                    等待 AI 返回
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void load(true);
                  }}
                >
                  <RefreshCw data-icon="inline-start" />
                  刷新
                </Button>
                {num(selectedJob?.id ?? selectedJob?.problemId) ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to={`/question-bank/detail/${num(selectedJob?.id ?? selectedJob?.problemId)}`}
                    >
                      <ExternalLink data-icon="inline-start" />
                      题目详情
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="flex flex-col gap-4 pb-1">
                <TaskTextCard
                  title="思考过程"
                  value={str(selectedJob?.reasoningOutput)}
                  empty={selectedJob?.state === "finished" ? "当前模型未返回思考过程。" : "等待模型返回思考过程。"}
                  copyLabel="思考过程"
                />
                <TaskTextCard
                  title="最终输出"
                  value={str(selectedJob?.latestOutput)}
                  empty={selectedJob?.state === "finished" ? "任务已结束，没有可读取的最终输出。" : "等待模型返回最终输出。"}
                  copyLabel="最终输出"
                />
                <TaskTextCard
                  title="完整 Prompt"
                  value={str(selectedJob?.prompt)}
                  empty="任务尚未进入 AI 执行阶段。"
                  copyLabel="Prompt"
                />
              </div>
            </div>
            {selectedJob?.errorMsg ? (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>最近一次处理信息</AlertTitle>
                <AlertDescription className="break-words">
                  {str(selectedJob.errorMsg)}
                </AlertDescription>
              </Alert>
            ) : null}
            <p className="text-xs text-muted-foreground">
              任务的原始思考过程、最终输出和完整 Prompt 会在结束后保留 1 小时。
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}

function TaskTextCard({
  title,
  value,
  empty,
  copyLabel,
}: {
  title: string;
  value: string;
  empty: string;
  copyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {value ? (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(value);
                toast.success(`${copyLabel}已复制`);
              }}
            >
              <Copy data-icon="inline-start" />
              复制
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-foreground/90">
          {value || empty}
        </pre>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  progress,
  tone,
  loading,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Activity;
  progress?: number;
  tone?: "danger" | "success";
  loading: boolean;
}) {
  return (
    <Card
      className={
        tone === "danger"
          ? "border-destructive/40"
          : tone === "success"
            ? "border-emerald-500/30"
            : undefined
      }
    >
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center justify-between">
          <span>{label}</span>
          <Icon className="size-4" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <>
            <div className="text-3xl font-semibold tabular-nums tracking-tight">
              {value.toLocaleString()}
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {detail}
            </p>
            {progress !== undefined ? (
              <Progress value={progress} className="mt-3" />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function ActionButton({
  children,
  icon: Icon,
  onClick,
  disabled,
}: {
  children: ReactNode;
  icon: typeof Play;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      className="justify-start"
      disabled={disabled}
      onClick={onClick}
    >
      <Icon data-icon="inline-start" />
      {children}
    </Button>
  );
}

function ConfirmAction({
  children,
  title,
  description,
  onConfirm,
  disabled,
}: {
  children: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function JobTable({
  rows,
  showError = false,
  onAnalyzeClick,
  empty,
}: {
  rows: Record<string, unknown>[];
  showError?: boolean;
  onAnalyzeClick?: (row: Record<string, unknown>) => void;
  empty: string;
}) {
  if (!rows.length)
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-muted-foreground">
        <CheckCircle2 className="size-6" />
        {empty}
      </div>
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>题目</TableHead>
          <TableHead className="hidden sm:table-cell">平台</TableHead>
          <TableHead>阶段</TableHead>
          {showError ? (
            <TableHead className="min-w-40">失败原因</TableHead>
          ) : null}
          <TableHead>更新时间</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const id = num(row.problemId ?? row.id);
          const title = cleanProblemTitle(
            str(row.title),
            str(row.externalId || id || "-"),
          );
          const stage = str(row.queueLabel) || formatPipelineStage(str(row.stage || row.status));
          const error = str(row.errorMsg || row.error_msg || row.message);
          const clickable = !row.queued && (
            str(row.stage) === "analyze" || str(row.status) === "TAGGING"
          );
          return (
            <TableRow
              key={`${id}:${str(row.stage || row.status)}:${str(row.updatedAt || row.startedAt || row.time)}:${index}`}
              className={clickable ? "cursor-pointer" : undefined}
              onClick={() => clickable && onAnalyzeClick?.(row)}
            >
              <TableCell className="max-w-[240px] font-medium">
                {id ? (
                  <Link
                    to={`/question-bank/detail/${id}`}
                    className="truncate hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {title}
                  </Link>
                ) : (
                  <span className="truncate">{title}</span>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground">
                {str(row.platform, "-")}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    str(row.status) === "FAILED" ? "destructive" : "outline"
                  }
                >
                  {stage}
                </Badge>
              </TableCell>
              {showError ? (
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  <span
                    className="line-clamp-2 break-all"
                    title={error || undefined}
                  >
                    {error || "—"}
                  </span>
                </TableCell>
              ) : null}
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatTime(row.startedAt || row.updatedAt || row.time)}
              </TableCell>
              <TableCell>
                {clickable ? (
                  <Eye className="size-4 text-muted-foreground" />
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ConversationTable({
  rows,
  onSelect,
}: {
  rows: Record<string, unknown>[];
  onSelect: (row: Record<string, unknown>) => void;
}) {
  if (!rows.length)
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-muted-foreground">
        <Clock3 className="size-6" />
        暂无 AI 任务记录
      </div>
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>题目</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>结束时间</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const id = num(row.problemId ?? row.id);
          const running = str(row.state) === "running";
          return (
            <TableRow
              key={`${id}:${str(row.stage)}:${index}`}
              className="cursor-pointer"
              onClick={() => onSelect(row)}
            >
              <TableCell className="max-w-[280px] font-medium">
                <span className="truncate">
                  {cleanProblemTitle(
                    str(row.title),
                    str(row.externalId || id || "-"),
                  )}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={running ? "secondary" : "outline"}>
                  {running ? "运行中" : "已结束"}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {running ? "—" : formatTime(row.endedAt)}
              </TableCell>
              <TableCell>
                <Eye className="size-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
