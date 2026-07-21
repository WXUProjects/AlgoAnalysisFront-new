import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  BookOpenIcon,
  ExternalLinkIcon,
  FileTextIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getContestBoard,
  getContestCellSubmits,
  getContestProblems,
} from '@/api/contest'
import { getProblem } from '@/api/problem'
import { listAllGroups } from '@/api/group'
import type {
  ContestBoardCell,
  ContestBoardProblemCol,
  ContestBoardRow,
  ContestCellSubmitItem,
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
import { StatusBadge } from '@/components/status-badge'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { formatContestTimeRange, formatTime } from '@/lib/format'
import {
  mergeContestMeta,
  readContestSeed,
} from '@/lib/contest-nav'
import { getSubmitLink } from '@/lib/link'
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

/** 提交是否赛后补题（无 phase 时：有 relativeSec 视为赛时） */
function isUpsolveSubmit(s: ContestCellSubmitItem): boolean {
  if (s.phase === 'upsolve') return true
  if (s.phase === 'contest') return false
  return s.relativeSec == null
}

function cellSubmitsSummary(
  status: string | undefined,
  list: ContestCellSubmitItem[],
): string {
  if (list.length === 0) {
    if (status === 'UPSOLVE' || status === 'UPSOLVE_TRIED') {
      return '补题记录'
    }
    return '提交记录'
  }
  const upsolveN = list.filter(isUpsolveSubmit).length
  const contestN = list.length - upsolveN
  if (upsolveN > 0 && contestN > 0) {
    return `共 ${list.length} 次（赛时 ${contestN} · 赛后 ${upsolveN}）`
  }
  if (upsolveN > 0) {
    return `赛后补题 · 共 ${list.length} 次`
  }
  return `赛时提交 · 共 ${list.length} 次`
}

/**
 * 比赛详情：顶层 Tab 切换「站内榜 | 比赛题目」。
 * 站内榜为 XCPCIO 风格矩阵；题目区为 A/B/C + 题面/题解。
 */
export function ContestDetails() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  /** 列表/资料页带入的种子，避免标题先闪「比赛 #id」 */
  const [contest, setContest] = useState<Partial<ContestItem> | null>(() =>
    readContestSeed(id, location.state),
  )
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [groupId, setGroupId] = useState<number | undefined>(undefined)
  const [followingOnly, setFollowingOnly] = useState(false)
  const [contestOnly, setContestOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  const [problems, setProblems] = useState<ContestProblemItem[]>([])
  const [ensureStatus, setEnsureStatus] = useState('')
  const [problemsLoading, setProblemsLoading] = useState(true)
  const problemsPollCount = useRef(0)
  const [activeLabel, setActiveLabel] = useState(
    () => searchParams.get('label')?.trim() || '',
  )
  const [problemDetail, setProblemDetail] = useState<ProblemInfo | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  /** 移动端：题面 / 题解 */
  const [mobilePane, setMobilePane] = useState<'problem' | 'solutions'>('problem')
  /** 顶层：站内榜 | 比赛题目；题库深链 ?tab=problems&label=A */
  const [mainTab, setMainTab] = useState<'board' | 'problems'>(() =>
    searchParams.get('tab') === 'problems' ? 'problems' : 'board',
  )

  /** 格子弹窗：某用户某题的提交明细 */
  const [cellDialog, setCellDialog] = useState<{
    userId: number
    userName: string
    label: string
    externalId?: string
    /** AC | UPSOLVE | TRIED */
    status?: string
  } | null>(null)
  const [cellSubmits, setCellSubmits] = useState<ContestCellSubmitItem[]>([])
  const [cellSubmitsLoading, setCellSubmitsLoading] = useState(false)
  const [cellDialogMeta, setCellDialogMeta] = useState<{
    platform: string
    userName: string
    label: string
  } | null>(null)

  useEffect(() => {
    if (!id) {
      navigate(-1)
      return
    }
    // 路由 id 变化或从列表带入 state：立刻用上游数据填标题区
    const seed = readContestSeed(id, location.state)
    if (seed) {
      setContest((prev) =>
        prev && String(prev.id) === String(id)
          ? mergeContestMeta(prev, seed)
          : seed,
      )
    } else {
      setContest((prev) =>
        prev && String(prev.id) === String(id) ? prev : null,
      )
    }
  }, [id, location.state, navigate])

  useEffect(() => {
    if (!cellDialog || !id) {
      setCellSubmits([])
      setCellDialogMeta(null)
      return
    }
    let cancelled = false
    setCellSubmitsLoading(true)
    setCellSubmits([])
    void getContestCellSubmits({
      contestId: id,
      userId: cellDialog.userId,
      label: cellDialog.label,
      externalId: cellDialog.externalId,
    }).then((res) => {
      if (cancelled) return
      setCellSubmitsLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '提交记录加载失败')
        setCellSubmits([])
        setCellDialogMeta({
          platform: contest?.platform || '',
          userName: cellDialog.userName,
          label: cellDialog.label,
        })
        return
      }
      // 赛时提交按时间逆序（新→旧）
      const sorted = [...res.data.list].sort((a, b) => {
        const ta = a.time || 0
        const tb = b.time || 0
        if (tb !== ta) return tb - ta
        const ra = a.relativeSec ?? 0
        const rb = b.relativeSec ?? 0
        return rb - ra
      })
      setCellSubmits(sorted)
      setCellDialogMeta({
        platform: res.data.platform || contest?.platform || '',
        userName: res.data.userName || cellDialog.userName,
        label: res.data.label || cellDialog.label,
      })
    })
    return () => {
      cancelled = true
    }
  }, [cellDialog, id, contest?.platform])

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
        r.cells.some(
          (c) =>
            c.status === 'AC' ||
            c.status === 'UPSOLVE' ||
            c.status === 'TRIED' || c.status === 'UPSOLVE_TRIED',
        ),
      )
    setHasCellDetail(Boolean(detail))
    setTotal(res.data.total)
    if (res.data.contest) {
      setContest((prev) => mergeContestMeta(prev, res.data!.contest))
    }
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
      setContest((prev) => mergeContestMeta(prev, res.data!.contest))
    }
    setActiveLabel((cur) => {
      const fromQuery = searchParams.get('label')?.trim() || ''
      if (fromQuery && res.data!.list.some((p) => p.label === fromQuery)) {
        return fromQuery
      }
      if (cur && res.data!.list.some((p) => p.label === cur)) return cur
      return res.data!.list[0]?.label || ''
    })
  }, [id, searchParams])

  useEffect(() => {
    void loadBoard()
  }, [loadBoard])

  // 榜单只读一次：历史快照，不轮询自动更新（明细由爬虫/同步写入）

  useEffect(() => {
    problemsPollCount.current = 0
    void loadProblems()
  }, [loadProblems])

  const visibleRows = useMemo(
    () =>
      boardRows
        .filter((row) => !contestOnly || row.isContestant !== false)
        .map((row) =>
          !contestOnly
            ? row
            : {
                ...row,
                cells: row.cells.map((cell) =>
                  cell.status === 'UPSOLVE' || cell.status === 'UPSOLVE_TRIED'
                    ? { ...cell, status: 'NONE' }
                    : cell,
              ),
            },
        ),
    [boardRows, contestOnly],
  )
  const pageRows = visibleRows.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [contestOnly, setPage])
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

  // 当前题详情（题面未就绪时短轮询，避免 ensure 后仍显示「准备中」）
  const activeItem = problems.find((p) => p.label === activeLabel) || problems[0]
  useEffect(() => {
    const pid = activeItem?.problemId
    if (!pid) {
      setProblemDetail(null)
      return
    }
    let cancelled = false
    let tries = 0
    const loadDetail = (quiet = false) => {
      if (!quiet) setDetailLoading(true)
      void getProblem(pid).then((res) => {
        if (cancelled) return
        if (!quiet) setDetailLoading(false)
        if (res.success && res.data) setProblemDetail(res.data)
        else if (!quiet) setProblemDetail(null)
      })
    }
    loadDetail(false)
    // 列表 hasContent=false 或详情尚无题面时继续拉
    const needPoll = activeItem?.hasContent === false
    if (!needPoll) {
      return () => {
        cancelled = true
      }
    }
    const t = window.setInterval(() => {
      tries += 1
      if (tries > 20 || cancelled) {
        window.clearInterval(t)
        return
      }
      loadDetail(true)
      // 顺带刷新目录 hasContent
      if (tries % 3 === 0) void loadProblems({ quiet: true })
    }, 3000)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [activeItem?.problemId, activeItem?.hasContent, loadProblems])

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
        <TabsList>
          <TabsTrigger value="board" className="flex-none">
            站内榜
          </TabsTrigger>
          <TabsTrigger value="problems" className="flex-none">
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
            <Button
              type="button"
              size="sm"
              variant={contestOnly ? 'default' : 'outline'}
              onClick={() => setContestOnly((v) => !v)}
            >
              {contestOnly ? '仅赛时 · 开' : '仅赛时'}
            </Button>
          </div>

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-base">站内榜</CardTitle>
              <CardDescription>
                {scoring === 'leetcode'
                  ? hasCellDetail
                    ? '绿色是赛时通过，红色是赛时未过。补题不计入得分与排名，格子显示为 —'
                    : '本场暂无逐题明细，只显示得分'
                  : hasCellDetail
                    ? '绿色是赛时通过，红色是赛时未过。补题不计入 AC/罚时与排名，格子显示为 —'
                    : '本场暂无逐题明细，只显示通过题数'}
                {followingOnly ? ' · 仅看关注' : ''}
              </CardDescription>
              {hasCellDetail ? (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex size-5 items-center justify-center rounded bg-emerald-500/15 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      ✓
                    </span>
                    赛时通过
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex size-5 items-center justify-center rounded bg-rose-500/15 text-[10px] font-semibold text-rose-700 dark:text-rose-400">
                      1
                    </span>
                    尝试未过
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex size-5 items-center justify-center rounded text-[10px] font-semibold text-muted-foreground">
                      —
                    </span>
                    补题（不计排名）
                  </span>
                </div>
              ) : null}
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
                            (c) =>
                              c.status === 'AC' ||
                              c.status === 'UPSOLVE' ||
                              c.status === 'UPSOLVE_TRIED' ||
                              c.status === 'TRIED',
                          )
                        return (
                          <TableRow key={row.userId}>
                            <TableCell className="sticky left-0 z-10 bg-background font-medium tabular-nums">
                              {/* 仅赛后补题：不计入排名 */}
                              {row.isContestant === false
                                ? '—'
                                : row.rankOfficial > 0
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
                                    onClick={
                                      cell &&
                                      (cell.status === 'AC' ||
                                        cell.status === 'UPSOLVE' ||
                                        cell.status === 'UPSOLVE_TRIED' ||
                                        cell.status === 'TRIED')
                                        ? () =>
                                            setCellDialog({
                                              userId: row.userId,
                                              userName:
                                                row.name?.trim() || '未知选手',
                                              label: p.label,
                                              externalId:
                                                cell.externalId ||
                                                p.externalId ||
                                                undefined,
                                              status: cell.status,
                                            })
                                        : undefined
                                    }
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
            total={contestOnly ? visibleRows.length : total}
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
                               博客
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
                               题目尚未入库，暂无博客
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

      <Dialog
        open={!!cellDialog}
        onOpenChange={(open) => {
          if (!open) setCellDialog(null)
        }}
      >
        <DialogContent className="max-h-[min(90vh,40rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-4 py-3 sm:px-5">
            <DialogTitle className="text-base">
              {cellDialogMeta?.userName || cellDialog?.userName || '选手'}
              {cellDialogMeta?.label || cellDialog?.label
                ? ` · 题 ${cellDialogMeta?.label || cellDialog?.label}`
                : ''}
            </DialogTitle>
            <DialogDescription>
              {cellDialog?.status === 'UPSOLVE'
                ? '补题通过（不计入榜单）'
                : cellDialog?.status === 'UPSOLVE_TRIED'
                  ? '补题暂未通过（不计入榜单）'
                  : null}
              {cellDialog?.status === 'UPSOLVE' ||
              cellDialog?.status === 'UPSOLVE_TRIED'
                ? cellSubmits.length > 0
                  ? ` · ${cellSubmitsSummary(cellDialog?.status, cellSubmits)}`
                  : ''
                : cellSubmitsSummary(cellDialog?.status, cellSubmits)}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-0">
            {cellSubmitsLoading ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">时段</TableHead>
                    <TableHead className="min-w-[5.5rem]">时间</TableHead>
                    <TableHead className="min-w-[11rem]">状态</TableHead>
                    <TableHead className="min-w-[4.5rem]">语言</TableHead>
                    <TableHead className="w-20 text-right">代码</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cellSubmits.map((s) => {
                    const platform =
                      s.platform ||
                      cellDialogMeta?.platform ||
                      contest?.platform ||
                      ''
                    const submitUrl = getSubmitLink(
                      platform,
                      s.contest || '',
                      s.submitId,
                    )
                    const post = isUpsolveSubmit(s)
                    return (
                      <TableRow key={s.id || `${s.submitId}-${s.time}`}>
                        <TableCell>
                          <Badge
                            variant={post ? 'secondary' : 'outline'}
                            className={cn(
                              'font-normal',
                              post &&
                                'bg-sky-500/15 text-sky-700 dark:text-sky-400',
                            )}
                          >
                            {post ? '赛后' : '赛时'}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {post
                            ? formatTime(s.time) || '—'
                            : s.relativeSec != null
                              ? formatRelativeSec(s.relativeSec) || '—'
                              : formatTime(s.time) || '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={s.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {s.lang || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {submitUrl ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              asChild
                            >
                              <a
                                href={submitUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="在原站查看代码"
                              >
                                <ExternalLinkIcon data-icon="inline-start" />
                                查看
                              </a>
                            </Button>
                          ) : (
                            <span
                              className="text-xs text-muted-foreground"
                              title={
                                s.submitId
                                  ? '本站没有这份提交的代码链接'
                                  : undefined
                              }
                            >
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {!cellSubmits.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        暂时没有提交记录
                        <p className="mt-1 text-xs">
                          {cellDialog?.status === 'UPSOLVE' ||
                          cellDialog?.status === 'UPSOLVE_TRIED'
                            ? '补题不计入榜单分数；记录可能还没同步到本站'
                            : '可能还没同步到本站，或该题只有榜单汇总'}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

function BoardCellView({
  cell,
  scoring,
  onClick,
}: {
  cell?: ContestBoardCell
  scoring: string
  onClick?: () => void
}) {
  if (!cell || cell.status === 'NONE' || !cell.status) {
    return <span className="text-muted-foreground/40">·</span>
  }
  const clickable = !!onClick
  if (cell.status === 'AC') {
    const timeStr = formatRelativeSec(cell.relativeSec)
    const fail =
      cell.attempts > 0 ? (
        <span className="opacity-80">(-{cell.attempts})</span>
      ) : null
    return (
      <button
        type="button"
        disabled={!clickable}
        onClick={onClick}
        className={cn(
          'mx-auto flex min-h-9 min-w-[2.75rem] flex-col items-center justify-center rounded-md px-1 py-0.5',
          'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
          clickable &&
            'cursor-pointer transition-colors hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !clickable && 'cursor-default',
        )}
        title={
          scoring === 'leetcode' && cell.scoreDelta
            ? `+${cell.scoreDelta}`
            : clickable
              ? '查看赛时提交'
              : undefined
        }
      >
        <span className="font-semibold tabular-nums leading-tight">
          {timeStr || '✓'}
        </span>
        {fail ? (
          <span className="text-[10px] leading-none tabular-nums">{fail}</span>
        ) : null}
      </button>
    )
  }
  // 补题：不计入 AC/罚时/排名，榜上显示 —（仍可点开看明细）
  if (cell.status === 'UPSOLVE' || cell.status === 'UPSOLVE_TRIED') {
    return (
      <button
        type="button"
        disabled={!clickable}
        onClick={onClick}
        className={cn(
          'mx-auto flex min-h-9 min-w-[2.75rem] items-center justify-center rounded-md px-1 py-0.5',
          'text-muted-foreground',
          clickable &&
            'cursor-pointer transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !clickable && 'cursor-default',
        )}
        title={
          cell.status === 'UPSOLVE'
            ? clickable
              ? '补题通过，不计入排名（点开查看）'
              : '补题通过，不计入排名'
            : clickable
              ? '补题未过，不计入排名（点开查看）'
              : '补题未过，不计入排名'
        }
      >
        <span className="font-medium leading-tight">—</span>
      </button>
    )
  }
  // TRIED
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={cn(
        'mx-auto flex min-h-9 min-w-[2.75rem] items-center justify-center rounded-md px-1 py-0.5',
        'bg-rose-500/15 text-rose-700 dark:text-rose-400',
        clickable &&
          'cursor-pointer transition-colors hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !clickable && 'cursor-default',
      )}
      title={clickable ? '查看赛时提交' : undefined}
    >
      <span className="font-semibold tabular-nums">
        {cell.attempts > 0 ? cell.attempts : '–'}
      </span>
    </button>
  )
}
