import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ExternalLinkIcon,
  FlagIcon,
  HeartIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteProblemSolution,
  getProblemSolution,
  toggleCommunityLike,
} from '@/api/community'
import { getProblem } from '@/api/problem'
import type { ProblemInfo, ProblemUserSolutionItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { CommunityReportDialog } from '@/components/community-report-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { MarkdownBody } from '@/components/markdown-body'
import { PageShell } from '@/components/page-shell'
import { ProblemComments } from '@/components/problem-community'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocumentMeta } from '@/hooks/use-document-meta'
import { clipMetaText } from '@/lib/document-meta'
import { extractMarkdownOutline } from '@/lib/markdown'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/format'

/** 主布局顶栏 h-14 + 一点间距；scrollspy / 锚点用视口坐标 */
const SCROLL_OFFSET_PX = 3.5 * 16 + 12

function getAppScroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-app-scroll-container]')
}

/**
 * 题解阅读页：走主布局（保留左侧 Tab），替代原弹窗阅读。
 * 桌面 7:3 — 左正文+评论 / 右文章提纲（sticky + scrollspy）；移动端隐藏右侧提纲。
 */
export function ProblemSolutionView() {
  const { id, solutionId } = useParams()
  const navigate = useNavigate()
  const { user, isSiteAdmin, isLogin } = useAuth()
  const [solution, setSolution] = useState<ProblemUserSolutionItem | null>(null)
  const [problem, setProblem] = useState<ProblemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(false)
  const [liking, setLiking] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [activeHeadingId, setActiveHeadingId] = useState('')
  /** 题面 / 题解：标题区下方切换正文 */
  const [contentTab, setContentTab] = useState<'problem' | 'solution'>(
    'solution',
  )

  const problemId = Number(id || 0)
  const sid = Number(solutionId || 0)

  const problemTitle = problem?.title || ''
  const authorName = solution?.name || solution?.username || ''
  const solTitle = solution?.title || '博客'
  useDocumentMeta(
    solution
      ? {
          title: `${solTitle}${authorName ? ` · ${authorName}` : ''} - GoAlgo`,
          description: clipMetaText(
            solution.contentMd ||
              solution.excerpt ||
              (problemTitle
                ? `${authorName || '选手'} 分享的「${problemTitle}」博客`
                : '博客分享'),
          ),
          image: solution.avatar || undefined,
          url: `/question-bank/detail/${problemId || solution.problemId}/solution/${sid}`,
          type: 'article',
          siteName: 'GoAlgo',
        }
      : null,
  )
  const backTo =
    problemId > 0
      ? `/question-bank/detail/${problemId}?tab=solutions`
      : '/question-bank'

  const load = useCallback(async () => {
    if (!sid) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [sRes, pRes] = await Promise.all([
      getProblemSolution(sid),
      problemId ? getProblem(problemId) : Promise.resolve(null),
    ])
    setLoading(false)
    if (!sRes.success || !sRes.data) {
      toast.error(sRes.message || '博客加载失败')
      return
    }
    setSolution(sRes.data)
    if (pRes && pRes.success && pRes.data) {
      setProblem(pRes.data)
    } else {
      setProblem(null)
    }
  }, [sid, problemId])

  useEffect(() => {
    void load()
  }, [load])

  const solutionOutline = useMemo(
    () => extractMarkdownOutline(solution?.contentMd || ''),
    [solution?.contentMd],
  )
  const problemOutline = useMemo(
    () => extractMarkdownOutline(problem?.contentMd || ''),
    [problem?.contentMd],
  )
  const outline =
    contentTab === 'problem' ? problemOutline : solutionOutline

  // 切换题面/题解时重置高亮
  useEffect(() => {
    setActiveHeadingId(outline[0]?.id || '')
  }, [contentTab, outline])

  // scrollspy：随主布局滚动容器高亮当前章节（非 window）
  useEffect(() => {
    if (outline.length === 0) return

    const resolveActive = () => {
      let current = outline[0]?.id || ''
      for (const item of outline) {
        const el = document.getElementById(item.id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= SCROLL_OFFSET_PX) {
          current = item.id
        }
      }
      const scroller = getAppScroller()
      if (scroller) {
        if (
          scroller.scrollTop + scroller.clientHeight >=
          scroller.scrollHeight - 48
        ) {
          current = outline[outline.length - 1]?.id || current
        }
      } else {
        const doc = document.documentElement
        if (
          window.innerHeight + window.scrollY >=
          doc.scrollHeight - 48
        ) {
          current = outline[outline.length - 1]?.id || current
        }
      }
      setActiveHeadingId((prev) => (prev === current ? prev : current))
    }

    resolveActive()
    const scroller = getAppScroller()
    scroller?.addEventListener('scroll', resolveActive, { passive: true })
    window.addEventListener('resize', resolveActive)
    // MD 异步渲染后标题 id 才齐
    const t1 = window.setTimeout(resolveActive, 150)
    const t2 = window.setTimeout(resolveActive, 500)
    return () => {
      scroller?.removeEventListener('scroll', resolveActive)
      window.removeEventListener('resize', resolveActive)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [outline, contentTab, solution?.contentMd, problem?.contentMd])

  async function removeSolution() {
    if (!solution) return
    setRemoving(true)
    const res = await deleteProblemSolution(solution.id)
    setRemoving(false)
    if (!res.success) {
      toast.error(res.message || '删除失败')
      return
    }
    toast.success('已删除')
    navigate(backTo)
  }

  async function onLike() {
    if (!solution) return
    if (!isLogin) {
      toast.error('请先登录后再点赞')
      return
    }
    setLiking(true)
    const res = await toggleCommunityLike({
      targetType: 'solution',
      targetId: solution.id,
    })
    setLiking(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '操作失败')
      return
    }
    setSolution((prev) =>
      prev
        ? { ...prev, liked: res.data!.liked, likeCount: res.data!.likeCount }
        : prev,
    )
  }

  function scrollToHeading(headingId: string) {
    const el = document.getElementById(headingId)
    if (!el) return
    setActiveHeadingId(headingId)
    const scroller = getAppScroller()
    if (scroller) {
      const scrollerTop = scroller.getBoundingClientRect().top
      const y =
        scroller.scrollTop +
        el.getBoundingClientRect().top -
        scrollerTop -
        12
      scroller.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
      return
    }
    const y =
      window.scrollY + el.getBoundingClientRect().top - SCROLL_OFFSET_PX + 4
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
  }

  if (loading) {
    return (
      <PageShell stagger={false}>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    )
  }

  if (!solution) {
    return (
      <PageShell>
        <Card className="py-4">
          <CardContent className="px-4 text-sm text-muted-foreground">
            博客不存在或已删除。
            <Link to={backTo} className="ml-2 underline underline-offset-2">
              返回题目
            </Link>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const myId = user?.userId ?? 0
  const canEdit = myId === solution.userId || isSiteAdmin
  const pid = problemId || solution.problemId

  return (
    <PageShell stagger={false} className="gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            <Link
              to={backTo}
              className="hover:underline underline-offset-2"
            >
              {problemTitle || `题目 #${pid}`}
            </Link>
            <span className="mx-1.5">·</span>
                博客
          </p>
          <h2 className="mt-1 text-lg font-semibold">{solution.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link
              to={
                solution.username
                  ? `/profile/${solution.username}`
                  : `/profile?id=${solution.userId}`
              }
              className="hover:underline underline-offset-2"
            >
              {solution.name || solution.username || `用户${solution.userId}`}
            </Link>
            <span className="mx-1.5">·</span>
            {formatTime(solution.createdAt)}
          </p>
          <Tabs
            value={contentTab}
            onValueChange={(v) => {
              setContentTab(v as 'problem' | 'solution')
              setActiveHeadingId('')
            }}
            className="mt-2.5"
          >
            <TabsList className="h-7">
              <TabsTrigger value="problem" className="px-2.5 text-xs">
                题面
              </TabsTrigger>
              <TabsTrigger value="solution" className="px-2.5 text-xs">
            博客
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap gap-2">
          {solution.blogSlug &&
            (solution.blogUsername || solution.username) && (
              <Button type="button" size="sm" variant="outline" asChild>
                <Link
                  to={`/blog/${solution.blogUsername || solution.username}/${solution.blogSlug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLinkIcon data-icon="inline-start" />
                  {myId > 0 && myId === solution.userId
                    ? '去我的博客看'
                    : '去他博客看'}
                </Link>
              </Button>
            )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={liking}
            onClick={() => void onLike()}
          >
            <HeartIcon
              className={cn(
                solution.liked && 'fill-current text-destructive',
              )}
              data-icon="inline-start"
            />
            {solution.likeCount && solution.likeCount > 0
              ? solution.likeCount
              : '点赞'}
          </Button>
          {isLogin && myId !== solution.userId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setReportOpen(true)}
            >
              <FlagIcon data-icon="inline-start" />
              举报
            </Button>
          )}
          {canEdit && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(
                    `/question-bank/detail/${pid}/solution/${solution.id}/edit`,
                  )
                }
              >
                <PencilIcon data-icon="inline-start" />
                编辑
              </Button>
              <ConfirmDialog
                title="删除这篇博客？"
                description="删除后无法恢复，相关点赞与评论也会一并消失。"
                confirmLabel="删除"
                destructive
                loading={removing}
                onConfirm={() => void removeSolution()}
              >
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={removing}
                >
                  <Trash2Icon data-icon="inline-start" />
                  {removing ? '删除中…' : '删除'}
                </Button>
              </ConfirmDialog>
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigate(backTo)}
          >
            返回
          </Button>
        </div>
      </div>

      {/* 桌面 7:3：左正文+评论 / 右文章提纲（sticky + scrollspy 高亮） */}
      <div className="grid min-w-0 gap-4 md:grid-cols-[7fr_3fr] md:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <Card className="min-w-0 gap-3 py-5 sm:py-6">
            <CardContent className="min-w-0 px-5 sm:px-6">
              {contentTab === 'problem' ? (
                <MarkdownBody
                  content={problem?.contentMd || ''}
                  mode="auto"
                  emptyText="题面准备中，请稍后刷新；也可返回题目页补充题面"
                />
              ) : (
                <MarkdownBody
                  content={solution.contentMd || ''}
                  mode="markdown"
                  emptyText="暂无博客内容"
                />
              )}
            </CardContent>
          </Card>

          {contentTab === 'solution' && (
            <ProblemComments problemId={pid} solutionId={solution.id} />
          )}
        </div>

        <Card
          className={cn(
            'hidden min-w-0 gap-3 py-4 md:flex',
            /* 贴在主滚动区顶部；超长提纲可内滚 */
            'md:sticky md:top-4 md:max-h-[calc(100svh-6rem)] md:overflow-y-auto',
          )}
        >
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-base">
              {contentTab === 'problem' ? '题面提纲' : '文章内容'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {outline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {contentTab === 'problem'
                  ? '题面里还没有标题'
                  : '正文里还没有标题，写上 # 小标题后会出现在这里'}
              </p>
            ) : (
              <nav
                aria-label={
                  contentTab === 'problem' ? '题面提纲' : '文章提纲'
                }
              >
                <ul className="flex flex-col gap-0.5">
                  {outline.map((item) => {
                    const active = activeHeadingId === item.id
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          data-toc-id={item.id}
                          onClick={() => scrollToHeading(item.id)}
                          className={cn(
                            'w-full rounded-md border-l-2 py-1.5 pr-2 text-left text-sm transition-colors',
                            'hover:bg-muted hover:text-foreground',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            active
                              ? 'border-primary bg-muted font-medium text-foreground'
                              : 'border-transparent text-muted-foreground',
                          )}
                          style={{
                            paddingLeft: `${0.5 + (item.level - 1) * 0.75}rem`,
                          }}
                        >
                          <span className="line-clamp-2">{item.text}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            )}
          </CardContent>
        </Card>
      </div>

      <CommunityReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="solution"
        targetId={solution.id}
        ownerUserId={solution.userId}
        myUserId={myId}
      />
    </PageShell>
  )
}
