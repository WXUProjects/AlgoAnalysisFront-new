import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookOpenIcon, ExternalLinkIcon, FileTextIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getContestProblems, getContestRanking } from '@/api/contest'
import { getProblem } from '@/api/problem'
import { listAllGroups } from '@/api/group'
import type {
  ContestItem,
  ContestProblemItem,
  ContestRankingItem,
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
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 20

/**
 * 比赛详情：站内榜 + 题目 A/B/C Tab（题面 + 右侧题解，复用题库组件）。
 * 题目目录由后端按比赛主动发现；题面强制爬取（每场 ensure 一次）。
 */
export function ContestDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLogin } = useAuth()
  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<ContestRankingItem[]>([])
  const [contest, setContest] = useState<Partial<ContestItem> | null>(null)
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [groupId, setGroupId] = useState<number | undefined>(undefined)
  const [followingOnly, setFollowingOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  const [problems, setProblems] = useState<ContestProblemItem[]>([])
  const [ensureStatus, setEnsureStatus] = useState('')
  const [problemsLoading, setProblemsLoading] = useState(true)
  const [activeLabel, setActiveLabel] = useState('')
  const [problemDetail, setProblemDetail] = useState<ProblemInfo | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  /** 移动端：题面 / 题解 */
  const [mobilePane, setMobilePane] = useState<'problem' | 'solutions'>('problem')

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

  const loadRanking = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getContestRanking({
      contestId: id,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      groupId,
      followingOnly: followingOnly || undefined,
    })
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '榜单加载失败，请稍后重试')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
    if (res.data.contest) setContest(res.data.contest)
  }, [id, page, pageSize, groupId, followingOnly])

  const loadProblems = useCallback(async () => {
    if (!id) return
    setProblemsLoading(true)
    const res = await getContestProblems(id)
    setProblemsLoading(false)
    if (!res.success || !res.data) {
      // 题目失败不阻断榜单
      return
    }
    setProblems(res.data.list)
    setEnsureStatus(res.data.ensureStatus)
    if (res.data.contest) {
      setContest((prev) => prev ?? res.data!.contest)
    }
    setActiveLabel((cur) => {
      if (cur && res.data!.list.some((p) => p.label === cur)) return cur
      return res.data!.list[0]?.label || ''
    })
  }, [id])

  useEffect(() => {
    void loadRanking()
  }, [loadRanking])

  useEffect(() => {
    void loadProblems()
  }, [loadProblems])

  // ensure 进行中 / 首屏尚无目录时短轮询
  useEffect(() => {
    const shouldPoll =
      ensureStatus === 'running' ||
      (ensureStatus !== 'done' &&
        ensureStatus !== 'failed' &&
        problems.length === 0 &&
        !problemsLoading)
    if (!shouldPoll) return
    const t = window.setInterval(() => {
      void loadProblems()
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
          {contest?.time && (
            <p className="text-sm text-muted-foreground">
              {formatTime(contest.time)}
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

      {/* 题目 A B C D Tab */}
      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base">比赛题目</CardTitle>
          <CardDescription>
            {ensureStatus === 'running'
              ? '正在从 OJ 拉取题目并准备题面…'
              : ensureStatus === 'failed'
                ? '未能从 OJ 拉到题目列表（可能已结束或需登录）'
                : '题面由系统主动爬取；AI 分析仅在有具备权限的用户提交后触发'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-4">
          {problemsLoading && !problems.length ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full max-w-md" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !problems.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
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
                  <TabsTrigger key={p.label} value={p.label} className="min-w-9">
                    {p.label}
                    {p.hasContent ? null : (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        ·
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {problems.map((p) => (
                <TabsContent key={p.label} value={p.label} className="mt-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">
                      {p.label}. {problemDetail?.title || p.title || p.externalId}
                    </h3>
                    {p.difficulty ? (
                      <Badge variant="outline">{p.difficulty}</Badge>
                    ) : null}
                    {p.problemId > 0 ? (
                      <Button type="button" size="sm" variant="ghost" asChild>
                        <Link to={`/question-bank/detail/${p.problemId}`}>
                          题库页
                        </Link>
                      </Button>
                    ) : null}
                    {p.url ? (
                      <Button type="button" size="sm" variant="ghost" asChild>
                        <a href={p.url} target="_blank" rel="noreferrer">
                          <ExternalLinkIcon data-icon="inline-start" />
                          原题
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  <div className="md:hidden mb-2">
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
                            emptyText="题面准备中。系统会主动爬取；若 OJ 不可访问则可能长期为空"
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

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base">站内榜</CardTitle>
          <CardDescription>
            当前组织内排名
            {followingOnly ? ' · 仅显示你关注的成员' : ''}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>选手</TableHead>
                  <TableHead className="text-right">AC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={`${row.userId}-${row.rank}`}>
                    <TableCell className="font-medium">{row.rank}</TableCell>
                    <TableCell>
                      <Link
                        to={`/profile?id=${row.userId}`}
                        className={cn(
                          'inline-flex items-center gap-2 hover:underline',
                        )}
                      >
                        <Avatar className="size-7">
                          <AvatarImage src={row.avatar || undefined} />
                          <AvatarFallback>
                            {(row.name || '?').slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        {row.name || `用户${row.userId}`}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.acCount || row.score}
                    </TableCell>
                  </TableRow>
                ))}
                {!list.length && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      暂无榜单
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
    </PageShell>
  )
}
