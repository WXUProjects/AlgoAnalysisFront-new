import { useCallback, useEffect, useState } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/format'

/**
 * 题解阅读页：走主布局（保留左侧 Tab），替代原弹窗阅读。
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

  return (
    <PageShell stagger={false} className="gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            <Link
              to={backTo}
              className="hover:underline underline-offset-2"
            >
              {problemTitle || `题目 #${problemId || solution.problemId}`}
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
                    `/question-bank/detail/${problemId || solution.problemId}/solution/${solution.id}/edit`,
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

      <Card className="min-w-0 gap-3 py-5 sm:py-6">
        <CardContent className="min-w-0 px-5 sm:px-6">
          <MarkdownBody
            content={solution.contentMd || ''}
            mode="markdown"
            emptyText="暂无题解内容"
          />
        </CardContent>
      </Card>

      <ProblemComments
        problemId={problemId || solution.problemId}
        solutionId={solution.id}
      />

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
