import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  BookOpenIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FolderPlusIcon,
  HeartIcon,
  ListTodoIcon,
  PencilIcon,
  TagsIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  adminUpdateProblem,
  getMyPendingProblemEdit,
  getProblem,
  getProblemFollowingStatus,
  getProblemSubmissions,
  listProblemTags,
  proposeProblemEdit,
  type TagCountItem,
} from '@/api/problem'
import {
  addProblemToSet,
  listMyProblemsets,
  listProblemsetsByProblem,
  removeProblemFromSet,
} from '@/api/problemset'
import type {
  ProblemFollowingStatusItem,
  ProblemInfo,
  ProblemsetInfo,
} from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarkdownBody } from '@/components/markdown-body'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import {
  ProblemComments,
  ProblemSolutionsPanel,
} from '@/components/problem-community'
import { TagInput } from '@/components/tag-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge, formatSubmitStatus } from '@/components/status-badge'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useDocumentMeta } from '@/hooks/use-document-meta'
import { formatTime } from '@/lib/format'
import { getSubmitLink } from '@/lib/link'
import { num, str } from '@/lib/http'
import { cn } from '@/lib/utils'

/** 题目页「关联题单」只展示公有自定义题单，不含收藏/待做 */
function isPublicCustomSet(ps: ProblemsetInfo): boolean {
  if (ps.isSystem) return false
  if (ps.kind === 'favorites' || ps.kind === 'todo') return false
  return ps.kind === 'custom' || !ps.kind
}

const kindHint: Record<string, string> = {
  favorites: '收藏',
  todo: '待做',
  custom: '自建',
}

export function QuestionBankDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isLogin, isSiteAdmin } = useAuth()
  const [problem, setProblem] = useState<ProblemInfo | null>(null)
  /** 移动端：题面 / 题解切换；深链 tab=solutions 时默认题解 */
  const mobilePane =
    searchParams.get('tab') === 'solutions' ? 'solutions' : 'problem'
  const [subs, setSubs] = useState<Record<string, unknown>[]>([])
  const [subsTotal, setSubsTotal] = useState(0)
  const [subsPage, setSubsPage] = useState(1)
  const [subsPageSize, setSubsPageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [hasPending, setHasPending] = useState(false)
  const [followingOnly, setFollowingOnly] = useState(false)
  const [acOnly, setAcOnly] = useState(false)
  const [followStatus, setFollowStatus] = useState<ProblemFollowingStatusItem[]>(
    [],
  )
  const [followStatusLoading, setFollowStatusLoading] = useState(false)
  const [subTab, setSubTab] = useState<'history' | 'following'>('history')

  const [tagsOpen, setTagsOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<TagCountItem[]>([])
  const [noteInput, setNoteInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [relatedSets, setRelatedSets] = useState<ProblemsetInfo[]>([])

  const [addSetOpen, setAddSetOpen] = useState(false)
  const [mySets, setMySets] = useState<ProblemsetInfo[]>([])
  const [mySetsLoading, setMySetsLoading] = useState(false)
  const [togglingSetId, setTogglingSetId] = useState<number | null>(null)
  /** 从题单移除前二次确认 */
  const [removeFromSetTarget, setRemoveFromSetTarget] =
    useState<ProblemsetInfo | null>(null)

  useDocumentMeta(
    problem
      ? {
          title: `${problem.title || `题目 #${problem.id}`} - GoAlgo`,
          description: [problem.platform, problem.difficulty]
            .filter(Boolean)
            .join(' · ') || '题库题目',
          url: `/question-bank/detail/${problem.id}`,
          type: 'article',
          siteName: 'GoAlgo',
        }
      : null,
  )

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [pRes, sRes, setRes] = await Promise.all([
      getProblem(id),
      getProblemSubmissions({
        problemId: id,
        page: subsPage,
        pageSize: subsPageSize,
        followingOnly: followingOnly || undefined,
        status: acOnly ? 'AC' : undefined,
      }),
      listProblemsetsByProblem(id),
    ])
    setLoading(false)
    if (!pRes.success || !pRes.data) {
      toast.error(pRes.message || '题目加载失败，请稍后重试')
      return
    }
    setProblem(pRes.data)
    if (sRes.success && sRes.data) {
      setSubs(sRes.data.list || [])
      setSubsTotal(sRes.data.total || 0)
    }
    // 后端已只返回公有 custom；前端再滤一层，避免收藏/待做误入
    if (setRes.success && setRes.data) {
      setRelatedSets(setRes.data.filter(isPublicCustomSet))
    } else {
      setRelatedSets([])
    }

    if (isLogin && !isSiteAdmin) {
      const pend = await getMyPendingProblemEdit(id)
      setHasPending(Boolean(pend.success && pend.data?.hasPending))
    } else {
      setHasPending(false)
    }
  }, [id, isLogin, isSiteAdmin, followingOnly, acOnly, subsPage, subsPageSize])

  async function loadMySetsForProblem(problemId: number | string) {
    setMySetsLoading(true)
    const res = await listMyProblemsets({ problemId })
    setMySetsLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '题单加载失败，请稍后重试')
      setMySets([])
      return
    }
    setMySets(res.data)
  }

  async function toggleInSet(set: ProblemsetInfo, next: boolean) {
    if (!problem) return
    if (togglingSetId != null) return
    setTogglingSetId(set.id)
    // 乐观更新
    setMySets((prev) =>
      prev.map((s) =>
        s.id === set.id
          ? {
              ...s,
              containsProblem: next,
              itemCount: Math.max(0, (s.itemCount || 0) + (next ? 1 : -1)),
            }
          : s,
      ),
    )
    const res = next
      ? await addProblemToSet({ problemsetId: set.id, problemId: problem.id })
      : await removeProblemFromSet(set.id, problem.id)
    setTogglingSetId(null)
    if (!res.success) {
      // 回滚
      setMySets((prev) =>
        prev.map((s) =>
          s.id === set.id
            ? {
                ...s,
                containsProblem: !next,
                itemCount: Math.max(0, (s.itemCount || 0) + (next ? -1 : 1)),
              }
            : s,
        ),
      )
      toast.error(res.message || (next ? '加入失败，请稍后重试' : '移除失败，请稍后重试'))
      return
    }
    toast.success(
      next
        ? `已加入「${set.title}」`
        : `已从「${set.title}」移除`,
    )
  }

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!id || !isLogin || subTab !== 'following') return
    let cancelled = false
    setFollowStatusLoading(true)
    void getProblemFollowingStatus(id).then((res) => {
      if (cancelled) return
      setFollowStatusLoading(false)
      if (res.success && res.data) setFollowStatus(res.data)
      else {
        setFollowStatus([])
        if (!res.success) toast.error(res.message || '关注进度加载失败，请稍后重试')
      }
    })
    return () => {
      cancelled = true
    }
  }, [id, isLogin, subTab])

  function openTagsEdit() {
    if (!problem) return
    if (!isLogin) {
      toast.error('请先登录后再修改')
      return
    }
    setSelectedTags([...problem.tags])
    setNoteInput('')
    setTagsOpen(true)
    if (!allTags.length) {
      void listProblemTags(200).then((res) => {
        if (res.success && res.data) setAllTags(res.data)
      })
    }
  }

  function openContentEdit() {
    if (!problem) return
    if (!isLogin) {
      toast.error('请先登录后再修改')
      return
    }
    navigate(`/question-bank/detail/${problem.id}/edit-content`)
  }

  async function submitTags() {
    if (!problem) return
    const tags = selectedTags.map((t) => t.trim()).filter(Boolean)
    setSaving(true)
    if (isSiteAdmin) {
      const res = await adminUpdateProblem({
        id: problem.id,
        updateTags: true,
        tags,
      })
      setSaving(false)
      if (!res.success) {
        toast.error(res.message || '保存失败，请稍后重试')
        return
      }
      toast.success(res.message || '标签已更新')
      setTagsOpen(false)
      if (res.data) setProblem(res.data)
      else void load()
      return
    }
    const res = await proposeProblemEdit({
      problemId: problem.id,
      updateTags: true,
      tags,
      note: noteInput.trim() || undefined,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '提交失败，请稍后重试')
      return
    }
    toast.success(res.message || '已提交审核')
    setTagsOpen(false)
    setHasPending(true)
  }

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    )
  }

  if (!problem) {
    return (
      <PageShell>
        <Card className="py-4">
          <CardContent className="px-4 text-sm text-muted-foreground">
            题目不存在
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const contentEmpty = !problem.contentMd?.trim()
  const tagsEmpty = !problem.tags.length

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-lg font-semibold">{problem.title}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{problem.platform}</Badge>
            <Badge variant="outline">{problem.externalId}</Badge>
            {problem.difficulty && (
              <Badge
                className={cn(
                  problem.difficulty === '困难' && 'bg-destructive text-white',
                )}
                variant={problem.difficulty === '困难' ? 'default' : 'outline'}
              >
                {problem.difficulty}
              </Badge>
            )}
            {problem.problemType && (
              <Badge variant="outline">{problem.problemType}</Badge>
            )}
            {problem.userStatus && (
              <StatusBadge status={problem.userStatus} userStatus />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {problem.tags.map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="border-border/70 bg-muted/50 font-normal text-muted-foreground"
              >
                {t}
              </Badge>
            ))}
            {tagsEmpty && (
              <span className="text-xs text-muted-foreground">暂无标签</span>
            )}
            {isLogin && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={openTagsEdit}
              >
                <TagsIcon data-icon="inline-start" />
                {isSiteAdmin ? '改标签' : '建议标签'}
              </Button>
            )}
          </div>
          {hasPending && (
            <p className="text-xs text-muted-foreground">
              你有一条修改申请正在等待站点管理员审核
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {problem.url && (
            <Button type="button" size="sm" variant="outline" asChild>
              <a href={problem.url} target="_blank" rel="noreferrer">
                <ExternalLinkIcon data-icon="inline-start" />
                原题
              </a>
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (window.history.length > 1) navigate(-1)
              else navigate('/question-bank')
            }}
          >
            返回
          </Button>
        </div>
      </div>

      {/* 移动端：题面 / 题解切换；桌面：7:3 并排 */}
      <div className="flex flex-col gap-3">
        <div className="md:hidden">
          <Tabs
            value={mobilePane}
            onValueChange={(v) => {
              const next = new URLSearchParams(searchParams)
              if (v === 'solutions') next.set('tab', 'solutions')
              else {
                next.delete('tab')
                next.delete('solutionId')
              }
              setSearchParams(next, { replace: true })
            }}
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
              'min-w-0 gap-3 py-5 sm:py-6',
              mobilePane !== 'problem' && 'hidden md:flex',
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2 px-5 sm:px-6">
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle className="text-base">题面</CardTitle>
                {contentEmpty && (
                  <CardDescription>
                    题面尚未就绪，登录后可补充内容并提交审核
                  </CardDescription>
                )}
              </div>
              {isLogin && (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <DropdownMenu
                    open={addSetOpen}
                    onOpenChange={(open) => {
                      setAddSetOpen(open)
                      if (open && problem) {
                        void loadMySetsForProblem(problem.id)
                      }
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="sm" variant="outline">
                        <FolderPlusIcon data-icon="inline-start" />
                        添加到题单
                        <ChevronDownIcon data-icon="inline-end" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>选择要加入的题单</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {mySetsLoading ? (
                        <div className="flex items-center justify-center gap-2 px-2 py-4 text-sm text-muted-foreground">
                          <Spinner />
                          加载中…
                        </div>
                      ) : mySets.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          还没有题单。可先去题单页创建。
                        </div>
                      ) : (
                        <DropdownMenuGroup>
                          {mySets.map((ps) => {
                            const checked = Boolean(ps.containsProblem)
                            const busy = togglingSetId === ps.id
                            return (
                              <DropdownMenuCheckboxItem
                                key={ps.id}
                                checked={checked}
                                disabled={busy || togglingSetId != null}
                                onSelect={(e) => e.preventDefault()}
                                onCheckedChange={(v) => {
                                  if (!v && checked) {
                                    setRemoveFromSetTarget(ps)
                                    return
                                  }
                                  void toggleInSet(ps, Boolean(v))
                                }}
                              >
                                <span className="min-w-0 flex-1 truncate">
                                  {ps.title}
                                </span>
                                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                  {kindHint[ps.kind] || kindHint.custom}
                                </span>
                              </DropdownMenuCheckboxItem>
                            )
                          })}
                        </DropdownMenuGroup>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/problemset">管理我的题单</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={openContentEdit}
                  >
                    <PencilIcon data-icon="inline-start" />
                    {isSiteAdmin
                      ? contentEmpty
                        ? '填写题面'
                        : '编辑题面'
                      : contentEmpty
                        ? '补充题面'
                        : '建议修改'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="min-w-0 px-5 sm:px-6">
              <MarkdownBody
                content={problem.contentMd || ''}
                mode="auto"
                emptyText="题面准备中，请稍后刷新；登录后也可自行补充题面"
              />
            </CardContent>
          </Card>

          <ProblemSolutionsPanel
            problemId={problem.id}
            className={cn(
              'md:sticky md:top-4 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto',
              mobilePane !== 'solutions' && 'hidden md:flex',
            )}
          />
        </div>
      </div>

      {problem.solutions.length > 0 && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">AI 参考解法</CardTitle>
            <CardDescription>由 AI 生成，仅供参考（与用户题解栏无关）</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 sm:grid-cols-2">
            {problem.solutions.map((s, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{s.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  时间 {s.timeComplexity || '-'} · 空间 {s.spaceComplexity || '-'}
                </p>
                <p className="mt-2 text-muted-foreground">{s.briefExplanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {relatedSets.length > 0 && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodoIcon className="size-4" />
              收录本题的公开题单
            </CardTitle>
            <CardDescription>
              仅展示公开的自建题单；收藏与待做不会出现在这里
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 px-4">
            {relatedSets.map((ps) => (
              <Link
                key={ps.id}
                to={`/problemset/${ps.id}`}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <span className="font-medium">{ps.title}</span>
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  <HeartIcon className="size-3.5" />
                  {ps.likeCount}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ps.itemCount} 题
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <ProblemComments problemId={problem.id} />

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">提交与关注</CardTitle>
          <div className="flex flex-wrap gap-2">
            {isLogin && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={followingOnly ? 'default' : 'outline'}
                  onClick={() => {
                    setSubsPage(1)
                    setFollowingOnly((v) => !v)
                  }}
                >
                  {followingOnly ? '只看关注 · 开' : '只看关注'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={acOnly ? 'default' : 'outline'}
                  onClick={() => {
                    setSubsPage(1)
                    setAcOnly((v) => !v)
                  }}
                >
                  {acOnly ? '仅通过 · 开' : '仅通过'}
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs
            value={subTab}
            onValueChange={(v) => setSubTab(v as 'history' | 'following')}
            className="gap-0"
          >
            <div className="border-b px-4 py-2">
              <TabsList>
                <TabsTrigger value="history">提交历史</TabsTrigger>
                {isLogin && (
                  <TabsTrigger value="following">关注进度</TabsTrigger>
                )}
              </TabsList>
            </div>
            <TabsContent value="history" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>语言</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.map((s, i) => {
                    const uid = num(s.userId)
                    const name = str(
                      s.userName ||
                        s.name ||
                        s.username ||
                        (uid ? `用户${uid}` : '-'),
                    )
                    const status = str(s.status)
                    const submitUrl = getSubmitLink(
                      str(s.platform || problem.platform),
                      str(s.contest),
                      str(s.submitId),
                    )
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          {uid ? (
                            <Link
                              to={`/profile?id=${uid}`}
                              className="hover:underline"
                            >
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                        </TableCell>
                        <TableCell>{str(s.lang, '-')}</TableCell>
                        <TableCell>
                          {submitUrl ? (
                            <StatusBadge status={status} asChild>
                              <a
                                href={submitUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                                title="查看原站提交"
                              >
                                {formatSubmitStatus(status)}
                              </a>
                            </StatusBadge>
                          ) : (
                            <StatusBadge status={status} />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTime(s.time || s.submittedAt || s.createdAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {!subs.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        暂无提交
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {subsTotal > 0 && (
                <div className="border-t px-3 py-2">
                  <Pagination
                    page={subsPage}
                    total={subsTotal}
                    pageSize={subsPageSize}
                    onChange={setSubsPage}
                    onPageSizeChange={(n) => {
                      setSubsPageSize(n)
                      setSubsPage(1)
                    }}
                  />
                </div>
              )}
            </TabsContent>
            {isLogin && (
              <TabsContent value="following" className="mt-0">
                {followStatusLoading ? (
                  <div className="flex flex-col gap-2 p-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {followStatus.map((u) => {
                        const label =
                          u.status === 'AC'
                            ? '已通过'
                            : u.status === 'TRIED'
                              ? '尝试过'
                              : '未做'
                        const href = u.username
                          ? `/profile/${u.username}`
                          : `/profile?id=${u.userId}`
                        return (
                          <TableRow key={u.userId}>
                            <TableCell>
                              <Link to={href} className="hover:underline">
                                {u.name || u.username || `用户${u.userId}`}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  u.status === 'AC'
                                    ? 'default'
                                    : u.status === 'TRIED'
                                      ? 'secondary'
                                      : 'outline'
                                }
                              >
                                {label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {!followStatus.length && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center text-muted-foreground"
                          >
                            还没有关注的人，或暂时无法加载关注列表
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={tagsOpen} onOpenChange={setTagsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isSiteAdmin ? '修改标签' : '建议修改标签'}</DialogTitle>
            <DialogDescription>
              {isSiteAdmin
                ? '点选已有标签，或输入后回车新建。保存后立即生效；有标签后不再自动分析该题。'
                : '点选已有标签，或输入后回车新建。提交后由站点管理员审核才会更新。'}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-tags">标签</FieldLabel>
              <TagInput
                id="edit-tags"
                value={selectedTags}
                onChange={setSelectedTags}
                suggestions={allTags}
                disabled={saving}
              />
            </Field>
            {!isSiteAdmin && (
              <Field>
                <FieldLabel htmlFor="edit-tags-note">说明（可选）</FieldLabel>
                <Textarea
                  id="edit-tags-note"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="简要说明修改原因"
                  rows={2}
                />
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTagsOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button type="button" onClick={() => void submitTags()} disabled={saving}>
              {saving ? '提交中…' : isSiteAdmin ? '保存' : '提交审核'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeFromSetTarget != null}
        onOpenChange={(o) => {
          if (!o) setRemoveFromSetTarget(null)
        }}
        title="从题单移除？"
        description={
          removeFromSetTarget
            ? `确定从「${removeFromSetTarget.title}」移除此题？`
            : ''
        }
        confirmLabel="移除"
        destructive
        onConfirm={() => {
          if (!removeFromSetTarget) return
          const target = removeFromSetTarget
          setRemoveFromSetTarget(null)
          void toggleInSet(target, false)
        }}
      />
    </PageShell>
  )
}
