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
import type { ProblemUserSolutionItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { CommunityReportDialog } from '@/components/community-report-dialog'
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
import { extractMarkdownOutline } from '@/lib/markdown'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/format'

/**
 * 题解阅读页：走主布局（保留左侧 Tab），替代原弹窗阅读。
 * 桌面 7:3 — 左正文+评论 / 右文章提纲；移动端隐藏右侧提纲。
 */
export function ProblemSolutionView() {
  const { id, solutionId } = useParams()
  const navigate = useNavigate()
  const { user, isSiteAdmin, isLogin } = useAuth()
  const [solution, setSolution] = useState<ProblemUserSolutionItem | null>(null)
  const [problemTitle, setProblemTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(false)
  const [liking, setLiking] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [activeHeadingId, setActiveHeadingId] = useState('')

  const problemId = Number(id || 0)
  const sid = Number(solutionId || 0)
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
      toast.error(sRes.message || '题解加载失败')
      return
    }
    setSolution(sRes.data)
    if (pRes && pRes.success && pRes.data) {
      setProblemTitle(pRes.data.title || '')
    }
  }, [sid, problemId])

  useEffect(() => {
    void load()
  }, [load])

  const outline = useMemo(
    () => extractMarkdownOutline(solution?.contentMd || ''),
    [solution?.contentMd],
  )

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
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
            题解不存在或已删除。
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
            题解
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={removing}
                onClick={() => void removeSolution()}
              >
                <Trash2Icon data-icon="inline-start" />
                {removing ? '删除中…' : '删除'}
              </Button>
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

      {/* 桌面 7:3：左正文+评论 / 右文章提纲；移动端隐藏右侧 */}
      <div className="grid min-w-0 gap-4 md:grid-cols-[7fr_3fr] md:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <Card className="min-w-0 gap-3 py-5 sm:py-6">
            <CardContent className="min-w-0 px-5 sm:px-6">
              <MarkdownBody
                content={solution.contentMd || ''}
                mode="markdown"
                emptyText="暂无题解内容"
              />
            </CardContent>
          </Card>

          <ProblemComments problemId={pid} solutionId={solution.id} />
        </div>

        <Card
          className={cn(
            'hidden min-w-0 gap-3 py-4 md:flex',
            'md:sticky md:top-4 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto',
          )}
        >
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-base">文章内容</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {outline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                正文里还没有标题，写上 # 小标题后会出现在这里
              </p>
            ) : (
              <nav aria-label="文章提纲">
                <ul className="flex flex-col gap-0.5">
                  {outline.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => scrollToHeading(item.id)}
                        className={cn(
                          'w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                          'hover:bg-muted hover:text-foreground',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          activeHeadingId === item.id
                            ? 'bg-muted font-medium text-foreground'
                            : 'text-muted-foreground',
                        )}
                        style={{
                          paddingLeft: `${0.5 + (item.level - 1) * 0.75}rem`,
                        }}
                      >
                        <span className="line-clamp-2">{item.text}</span>
                      </button>
                    </li>
                  ))}
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
