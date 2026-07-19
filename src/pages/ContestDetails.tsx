import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BookOpenIcon,
  ExternalLinkIcon,
  FileTextIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { getContestBoard, getContestProblems } from '@/api/contest'
import { getProblem } from '@/api/problem'
import { listAllGroups } from '@/api/group'
import type {
  ContestBoardCell,
  ContestBoardProblemCol,
  ContestBoardRow,
  ContestItem,
  ContestProblemItem,
  GroupInfo,
  ProblemInfo,
} from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { MarkdownBody } from '@/components/markdown-body'
import { ProblemSolutionsPanel } from '@/components/problem-community'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useListQueryState } from '@/hooks/use-list-query-state'
import { formatContestTimeRange } from '@/lib/format'
import { cn } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 20

/** 相对开赛秒 → 1:23 / 1:02:03 */
function formatRelativeSec(sec?: number): string {
  if (sec == null || sec < 0 || !Number.isFinite(sec)) return ''
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  }
  return `${m}:${String(r).padStart(2, '0')}`
}

function formatPenalty(sec: number): string {
  if (!sec || sec < 0) return '0'
  return formatRelativeSec(sec) || '0'
}

/**
 * 比赛详情：顶层 Tab 切换「站内榜 | 比赛题目」。
 * 站内榜为 XCPCIO 风格矩阵；题目区为 A/B/C + 题面/题解。
 */
export function ContestDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLogin } = useAuth()
  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [total, setTotal] = useState(0)
  const [boardRows, setBoardRows] = useState<ContestBoardRow[]>([])
  const [boardProblems, setBoardProblems] = useState<ContestBoardProblemCol[]>(
    [],
  )
  const [scoring, setScoring] = useState('icpc')
  /** 有逐题明细才画格子；否则只显示 AC 题数 */
  const [hasCellDetail, setHasCellDetail] = useState(false)
  const [contest, setContest] = useState<Partial<ContestItem> | null>(null)
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [groupId, setGroupId] = useState<number | undefined>(undefined)
  const [followingOnly, setFollowingOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  const [problems, setProblems] = useState<ContestProblemItem[]>([])
  const [ensureStatus, setEnsureStatus] = useState('')
  const [problemsLoading, setProblemsLoading] = useState(true)
  const problemsPollCount = useRef(0)
  const [activeLabel, setActiveLabel] = useState('')
  const [problemDetail, setProblemDetail] = useState<ProblemInfo | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  /** 移动端：题面 / 题解 */
  const [mobilePane, setMobilePane] = useState<'problem' | 'solutions'>('problem')
  /** 顶层：站内榜 | 比赛题目 */
  const [mainTab, setMainTab] = useState<'board' | 'problems'>('board')

  useEffect(() => {
    if (!id) {
      navigate(-1)
      return
    }
  }, [id, navigate])

  useEffect(() => {
    if (!isLogin) return
    void listAllGroups().then((res) => {
      if (res.success && res.data) setGroups(res.data.list)
    })
  }, [isLogin])

  const loadBoard = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getContestBoard({
      contestId: id,
      groupId,
      followingOnly: followingOnly || undefined,
    })
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '榜单加载失败，请稍后重试')
      return
    }
    setBoardRows(res.data.rows)
    setBoardProblems(res.data.problems)
    setScoring(res.data.scoring || 'icpc')
    const detail =
      res.data.hasCellDetail ??
      res.data.rows.some((r) =>
        r.cells.some((c) => c.status === 'AC' || c.status === 'TRIED'),
      )
    setHasCellDetail(Boolean(detail))
    setTotal(res.data.total)
    if (res.data.contest) setContest(res.data.contest)
  }, [id, groupId, followingOnly])

  const loadProblems = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!id) return
    if (!opts?.quiet) setProblemsLoading(true)
    const res = await getContestProblems(id)
    if (!opts?.quiet) setProblemsLoading(false)
    if (!res.success || !res.data) {
      // 题目失败不阻断榜单
      return
    }
    setProblems(res.data.list)
    setEnsureStatus(res.data.ensureStatus || '')
    if (res.data.contest) {
      setContest((prev) => prev ?? res.data!.contest)
    }
    setActiveLabel((cur) => {
      if (cur && res.data!.list.some((p) => p.label === cur)) return cur
      return res.data!.list[0]?.label || ''
    })
  }, [id])

  useEffect(() => {
    void loadBoard()
  }, [loadBoard])

  // 榜单只读一次：历史快照，不轮询自动更新（明细由爬虫/同步写入）

  useEffect(() => {
    problemsPollCount.current = 0
    void loadProblems()
  }, [loadProblems])

  const pageRows = boardRows.slice((page - 1) * pageSize, page * pageSize)
  const colProblems = !hasCellDetail
    ? []
    : boardProblems.length > 0
      ? boardProblems
      : // 无目录时从格子推导列
        Array.from(
          new Map(
            boardRows
              .flatMap((r) => r.cells)
              .filter((c) => c.label)
              .map((c) => [
                c.label,
                {
                  label: c.label,
                  externalId: c.externalId || '',
                  title: c.label,
                },
              ]),
          ).values(),
        )

  // 仅 ensure 真正 running 且尚无目录时短轮询；failed/done/有题立刻停；最多 12 次
  useEffect(() => {
    if (problems.length > 0) return
    if (ensureStatus === 'done' || ensureStatus === 'failed') return
    if (ensureStatus !== 'running') return
    if (problemsLoading) return
    if (problemsPollCount.current >= 12) return
    const t = window.setInterval(() => {
      if (problemsPollCount.current >= 12) {
        window.clearInterval(t)
        return
      }
      problemsPollCount.current += 1
      void loadProblems({ quiet: true })
    }, 2500)
    return () => window.clearInterval(t)
  }, [ensureStatus, problems.length, problemsLoading, loadProblems])

  // 当前题详情
  const activeItem = problems.find((p) => p.label === activeLabel) || problems[0]
  useEffect(() => {
    const pid = activeItem?.problemId
    if (!pid) {
      setProblemDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    void getProblem(pid).then((res) => {
      if (cancelled) return
      setDetailLoading(false)
      if (res.success && res.data) setProblemDetail(res.data)
      else setProblemDetail(null)
    })
    return () => {
      cancelled = true
    }
  }, [activeItem?.problemId])

  const filterKey = `${id ?? ''}\0${groupId ?? ''}\0${followingOnly ? 1 : 0}`
  const prevFilterKey = useRef(filterKey)
  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey
      setPage(1)
    }
  }, [filterKey, setPage])

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {contest?.platform && (
              <Badge variant="secondary">{contest.platform}</Badge>
            )}
            <h2 className="text-lg font-semibold">
              {contest?.contestName || `比赛 #${id}`}
            </h2>
          </div>
          {(contest?.startTime ||
            contest?.endTime ||
            contest?.time) && (
            <p className="text-sm text-muted-foreground">
              {formatContestTimeRange(
                contest.startTime,
                contest.endTime,
                contest.time,
              )}
              {problems.length > 0 ? ` · ${problems.length} 题` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {contest?.contestUrl && (
            <Button type="button" size="sm" variant="outline" asChild>
              <a href={contest.contestUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon data-icon="inline-start" />
                打开 OJ
              </a>
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to="/contest?tab=records">返回列表</Link>
          </Button>
        </div>
      </div>

      <Tabs
        value={mainTab}
        onValueChange={(v) => setMainTab(v as 'board' | 'problems')}
        className="flex flex-col gap-3"
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="board" className="flex-1 sm:flex-none">
            站内榜
          </TabsTrigger>
          <TabsTrigger value="problems" className="flex-1 sm:flex-none">
            比赛题目
            {problems.length > 0 ? (
              <span className="text-muted-foreground tabular-nums">
                ({problems.length})
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-0 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {groups.length > 0 && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={groupId === undefined ? 'default' : 'outline'}
                  onClick={() => setGroupId(undefined)}
                >
                  全部分组
                </Button>
                {groups.map((g) => (
                  <Button
                    key={g.id}
                    type="button"
                    size="sm"
                    variant={groupId === g.id ? 'default' : 'outline'}
                    onClick={() => setGroupId(g.id)}
                  >
                    {g.name}
                  </Button>
                ))}
              </>
            )}
            {isLogin && (
              <Button
                type="button"
                size="sm"
                variant={followingOnly ? 'default' : 'outline'}
                onClick={() => setFollowingOnly((v) => !v)}
              >
                {followingOnly ? '只看关注 · 开' : '只看关注'}
              </Button>
            )}
          </div>

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-base">站内榜</CardTitle>
              <CardDescription>
                {scoring === 'leetcode'
                  ? hasCellDetail
                    ? '按得分排序；绿色为通过用时，红色为失败次数'
                    : '本场暂无逐题明细，只显示得分'
                  : hasCellDetail
                    ? '绿色为通过用时，红色为尝试次数'
                    : '本场暂无逐题明细，只显示通过题数'}
                {followingOnly ? ' · 仅看关注' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col gap-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-max text-xs sm:text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 z-10 w-12 bg-background">
                          #
                        </TableHead>
                        <TableHead className="sticky left-12 z-10 min-w-[8rem] bg-background">
                          选手
                        </TableHead>
                        <TableHead className="w-14 text-center">
                          {scoring === 'leetcode' ? '得分' : 'AC'}
                        </TableHead>
                        {hasCellDetail && scoring === 'icpc' && (
                          <TableHead className="w-16 text-center">
                            罚时
                          </TableHead>
                        )}
                        {colProblems.map((p) => (
                          <TableHead
                            key={p.label}
                            className="w-14 px-1 text-center font-semibold"
                            title={p.title || p.label}
                          >
                            {p.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.map((row) => {
                        const rowDetail =
                          row.hasDetail !== false &&
                          row.cells.some(
                            (c) => c.status === 'AC' || c.status === 'TRIED',
                          )
                        return (
                          <TableRow key={row.userId}>
                            <TableCell className="sticky left-0 z-10 bg-background font-medium tabular-nums">
                              {row.rankOfficial > 0
                                ? row.rankOfficial
                                : row.rankLocal}
                            </TableCell>
                            <TableCell className="sticky left-12 z-10 bg-background">
                              <Link
                                to={`/profile?id=${row.userId}`}
                                className="inline-flex items-center gap-2 hover:underline"
                              >
                                <Avatar className="size-7">
                                  <AvatarImage src={row.avatar || undefined} />
                                  <AvatarFallback>
                                    {(row.name || '?').slice(0, 1)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="max-w-[10rem] truncate">
                                  {row.name?.trim() || '未知选手'}
                                </span>
                              </Link>
                            </TableCell>
                            <TableCell className="text-center font-medium tabular-nums">
                              {scoring === 'leetcode'
                                ? row.score || row.acCount
                                : row.solved || row.acCount}
                            </TableCell>
                            {hasCellDetail && scoring === 'icpc' && (
                              <TableCell className="text-center tabular-nums text-muted-foreground">
                                {rowDetail
                                  ? formatPenalty(row.penaltySec)
                                  : '—'}
                              </TableCell>
                            )}
                            {colProblems.map((p) => {
                              if (!rowDetail) {
                                return (
                                  <TableCell
                                    key={p.label}
                                    className="p-1 text-center text-muted-foreground/50"
                                  >
                                    —
                                  </TableCell>
                                )
                              }
                              const cell =
                                row.cells.find((c) => c.label === p.label) ||
                                row.cells.find(
                                  (c) =>
                                    p.externalId &&
                                    c.externalId === p.externalId,
                                )
                              return (
                                <TableCell
                                  key={p.label}
                                  className="p-1 text-center"
                                >
                                  <BoardCellView
                                    cell={cell}
                                    scoring={scoring}
                                  />
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        )
                      })}
                      {!pageRows.length && (
                        <TableRow>
                          <TableCell
                            colSpan={
                              3 +
                              (hasCellDetail && scoring === 'icpc' ? 1 : 0) +
                              colProblems.length
                            }
                            className="text-center text-muted-foreground"
                          >
                            暂无榜单
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Pagination
            page={page}
            total={total}
            pageSize={pageSize}
            onChange={setPage}
            onPageSizeChange={setPageSize}
            disabled={loading}
          />
        </TabsContent>

        <TabsContent value="problems" className="mt-0">
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-base">比赛题目</CardTitle>
              {ensureStatus === 'running' ? (
                <CardDescription>正在拉取题目…</CardDescription>
              ) : ensureStatus === 'failed' ? (
                <CardDescription>未能拉到题目列表</CardDescription>
              ) : problems.length > 0 ? (
                <CardDescription>{problems.length} 题</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-4">
              {problemsLoading && !problems.length ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-9 w-full max-w-md" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : !problems.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {ensureStatus === 'running'
                    ? '题目准备中，请稍候…'
                    : '暂无题目目录'}
                </p>
              ) : (
                <Tabs
                  value={activeLabel || problems[0]?.label}
                  onValueChange={(v) => {
                    setActiveLabel(v)
                    setMobilePane('problem')
                  }}
                >
                  <TabsList className="h-auto flex-wrap justify-start gap-1">
                    {problems.map((p) => (
                      <TabsTrigger
                        key={p.label}
                        value={p.label}
                        className="min-w-9"
                      >
                        {p.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {problems.map((p) => (
                    <TabsContent
                      key={p.label}
                      value={p.label}
                      className="mt-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">
                          {p.label}.{' '}
                          {problemDetail?.title || p.title || p.externalId}
                        </h3>
                        {p.difficulty ? (
                          <Badge variant="outline">{p.difficulty}</Badge>
                        ) : null}
                        {p.problemId > 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <Link to={`/question-bank/detail/${p.problemId}`}>
                              题库页
                            </Link>
                          </Button>
                        ) : null}
                        {p.url ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLinkIcon data-icon="inline-start" />
                              原题
                            </a>
                          </Button>
                        ) : null}
                      </div>

                      <div className="mb-2 md:hidden">
                        <Tabs
                          value={mobilePane}
                          onValueChange={(v) =>
                            setMobilePane(v as 'problem' | 'solutions')
                          }
                        >
                          <TabsList className="w-full">
                            <TabsTrigger value="problem" className="flex-1">
                              <FileTextIcon />
                              题面
                            </TabsTrigger>
                            <TabsTrigger value="solutions" className="flex-1">
                              <BookOpenIcon />
                              题解
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      <div className="grid min-w-0 gap-4 md:grid-cols-[7fr_3fr] md:items-start">
                        <Card
                          className={cn(
                            'min-w-0 gap-3 py-4',
                            mobilePane !== 'problem' && 'hidden md:flex',
                          )}
                        >
                          <CardHeader className="px-4 py-0">
                            <CardTitle className="text-base">题面</CardTitle>
                          </CardHeader>
                          <CardContent className="min-w-0 px-4">
                            {detailLoading ? (
                              <Skeleton className="h-48 w-full" />
                            ) : (
                              <MarkdownBody
                                content={problemDetail?.contentMd || ''}
                                mode="auto"
                                emptyText="题面准备中，请稍后刷新"
                              />
                            )}
                          </CardContent>
                        </Card>

                        {p.problemId > 0 ? (
                          <ProblemSolutionsPanel
                            problemId={p.problemId}
                            className={cn(
                              'md:sticky md:top-4 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto',
                              mobilePane !== 'solutions' && 'hidden md:flex',
                            )}
                          />
                        ) : (
                          <Card
                            className={cn(
                              'gap-2 py-4',
                              mobilePane !== 'solutions' && 'hidden md:flex',
                            )}
                          >
                            <CardContent className="px-4 text-sm text-muted-foreground">
                              题目尚未入库，暂无题解
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}

function BoardCellView({
  cell,
  scoring,
}: {
  cell?: ContestBoardCell
  scoring: string
}) {
  if (!cell || cell.status === 'NONE' || !cell.status) {
    return <span className="text-muted-foreground/40">·</span>
  }
  if (cell.status === 'AC') {
    const timeStr = formatRelativeSec(cell.relativeSec)
    const fail =
      cell.attempts > 0 ? (
        <span className="opacity-80">(-{cell.attempts})</span>
      ) : null
    return (
      <div
        className={cn(
          'mx-auto flex min-h-9 min-w-[2.75rem] flex-col items-center justify-center rounded-md px-1 py-0.5',
          'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        )}
        title={
          scoring === 'leetcode' && cell.scoreDelta
            ? `+${cell.scoreDelta}`
            : undefined
        }
      >
        <span className="font-semibold tabular-nums leading-tight">
          {timeStr || '✓'}
        </span>
        {fail ? (
          <span className="text-[10px] leading-none tabular-nums">{fail}</span>
        ) : null}
      </div>
    )
  }
  // TRIED
  return (
    <div
      className={cn(
        'mx-auto flex min-h-9 min-w-[2.75rem] items-center justify-center rounded-md px-1 py-0.5',
        'bg-rose-500/15 text-rose-700 dark:text-rose-400',
      )}
    >
      <span className="font-semibold tabular-nums">
        {cell.attempts > 0 ? cell.attempts : '–'}
      </span>
    </div>
  )
}
