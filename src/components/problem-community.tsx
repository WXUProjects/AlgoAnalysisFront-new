import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BookOpenIcon,
  FlagIcon,
  HeartIcon,
  MessageSquareIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createProblemComment,
  deleteProblemComment,
  deleteProblemSolution,
  listProblemComments,
  listProblemSolutions,
  toggleCommunityLike,
} from '@/api/community'
import type { ProblemCommentItem, ProblemUserSolutionItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { CommunityReportDialog } from '@/components/community-report-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { MarkdownSummary } from '@/components/markdown-summary'
import { MentionTextarea } from '@/components/mention-textarea'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/format'

type SharedProps = {
  problemId: number
  className?: string
}

type CommentsProps = {
  /** 题目 id；题解评论时也可由 solution 反查，建议仍传入便于文案/同步 */
  problemId: number
  /** 传入则挂在该题解下，与题目讨论隔离 */
  solutionId?: number
  className?: string
  /** 卡片标题，默认「讨论」/ 题解下为「评论」 */
  title?: string
}

/** 用户题解侧栏：挂在题面右侧（桌面）或「题解」Tab（移动端） */
export function ProblemSolutionsPanel({ problemId, className }: SharedProps) {
  const { isLogin, user, isSiteAdmin } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [solutions, setSolutions] = useState<ProblemUserSolutionItem[]>([])
  const [sTotal, setSTotal] = useState(0)
  const [sPage, setSPage] = useState(1)
  const [likingId, setLikingId] = useState(0)
  const [reportTarget, setReportTarget] = useState<ProblemUserSolutionItem | null>(
    null,
  )

  const loadSolutions = useCallback(async () => {
    const res = await listProblemSolutions({ problemId, page: sPage, pageSize: 10 })
    if (res.success && res.data) {
      setSolutions(res.data.list)
      setSTotal(res.data.total)
    }
  }, [problemId, sPage])

  useEffect(() => {
    void loadSolutions()
  }, [loadSolutions])

  // 兼容旧深链 ?solutionId= → 独立阅读页
  useEffect(() => {
    const sid = Number(params.get('solutionId') || 0)
    if (!sid) return
    navigate(`/question-bank/detail/${problemId}/solution/${sid}`, {
      replace: true,
    })
  }, [params, problemId, navigate])

  async function removeSolution(id: number) {
    const res = await deleteProblemSolution(id)
    if (!res.success) {
      toast.error(res.message || '删除失败')
      return
    }
    toast.success('已删除')
    void loadSolutions()
  }

  async function onLikeSolution(s: ProblemUserSolutionItem) {
    if (!isLogin) {
      toast.error('请先登录后再点赞')
      return
    }
    setLikingId(s.id)
    const res = await toggleCommunityLike({
      targetType: 'solution',
      targetId: s.id,
    })
    setLikingId(0)
    if (!res.success || !res.data) {
      toast.error(res.message || '操作失败')
      return
    }
    setSolutions((prev) =>
      prev.map((x) =>
        x.id === s.id
          ? { ...x, liked: res.data!.liked, likeCount: res.data!.likeCount }
          : x,
      ),
    )
  }

  const myId = user?.userId ?? 0

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <CardTitle className="text-base">博客</CardTitle>
        </div>
        {isLogin && (
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() =>
              navigate(`/question-bank/detail/${problemId}/solution/new`)
            }
          >
            <BookOpenIcon data-icon="inline-start" />
            写博客
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 py-3">
        {!isLogin && (
          <p className="text-sm text-muted-foreground">
            <Link to="/login" className="underline underline-offset-2">
              登录
            </Link>
            后可发布博客
          </p>
        )}
        <ul className="divide-y rounded-lg border">
          {solutions.map((s) => (
            <li key={s.id} className="flex flex-col gap-1.5 px-3 py-2.5">
              <Link
                to={`/question-bank/detail/${problemId}/solution/${s.id}`}
                className="min-w-0 w-full text-left"
              >
                <p className="line-clamp-2 text-sm font-medium hover:underline">
                  {s.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.name || s.username} · {formatTime(s.createdAt)}
                </p>
                {s.excerpt ? (
                  <MarkdownSummary
                    content={s.excerpt}
                    className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground"
                  />
                ) : null}
              </Link>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2"
                  disabled={likingId === s.id}
                  onClick={() => void onLikeSolution(s)}
                >
                  <HeartIcon
                    className={cn(s.liked && 'fill-current text-destructive')}
                    data-icon="inline-start"
                  />
                  {s.likeCount && s.likeCount > 0 ? s.likeCount : '赞'}
                </Button>
                {isLogin && myId !== s.userId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => setReportTarget(s)}
                  >
                    <FlagIcon data-icon="inline-start" />
                    举报
                  </Button>
                )}
                {(myId === s.userId || isSiteAdmin) && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() =>
                        navigate(
                          `/question-bank/detail/${problemId}/solution/${s.id}/edit`,
                        )
                      }
                    >
                      编辑
                    </Button>
                    <ConfirmDialog
                       title="删除这篇博客？"
                      description="删除后无法恢复，相关点赞与评论也会一并消失。"
                      confirmLabel="删除"
                      destructive
                      onConfirm={() => void removeSolution(s.id)}
                    >
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                      >
                        <Trash2Icon />
                      </Button>
                    </ConfirmDialog>
                  </>
                )}
              </div>
            </li>
          ))}
          {!solutions.length && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              暂无博客
            </li>
          )}
        </ul>
        {sTotal > 10 && (
          <Pagination
            page={sPage}
            total={sTotal}
            pageSize={10}
            onChange={setSPage}
          />
        )}
      </CardContent>

      {reportTarget && (
        <CommunityReportDialog
          open={!!reportTarget}
          onOpenChange={(o) => !o && setReportTarget(null)}
          targetType="solution"
          targetId={reportTarget.id}
          ownerUserId={reportTarget.userId}
          myUserId={myId}
        />
      )}
    </Card>
  )
}

/** 题目讨论 / 题解评论：全站可见，支持层级回复 / 点赞 / 举报 */
export function ProblemComments({
  problemId,
  solutionId,
  className,
  title,
}: CommentsProps) {
  const { isLogin, user, isSiteAdmin, currentOrg } = useAuth()
  const isPublicOrg =
    Boolean(currentOrg?.isSystem) || currentOrg?.slug === 'public'
  const onSolution = Boolean(solutionId && solutionId > 0)
  /** 题解评论不写发现流，也不提供「同步公共域」 */
  const canSyncPublic = !onSolution && !isPublicOrg
  const heading = title ?? (onSolution ? '评论' : '讨论')

  const [comments, setComments] = useState<ProblemCommentItem[]>([])
  const [cTotal, setCTotal] = useState(0)
  const [cPage, setCPage] = useState(1)
  const [cDraft, setCDraft] = useState('')
  const [cSending, setCSending] = useState(false)
  /** 正在回复的评论（null = 顶层） */
  const [replyTo, setReplyTo] = useState<ProblemCommentItem | null>(null)
  const [syncToPublic, setSyncToPublic] = useState(false)
  const [likingId, setLikingId] = useState(0)
  const [reportTarget, setReportTarget] = useState<ProblemCommentItem | null>(
    null,
  )

  // 切换题目/题解时回到第一页
  useEffect(() => {
    setCPage(1)
    setReplyTo(null)
    setCDraft('')
    setSyncToPublic(false)
  }, [problemId, solutionId])

  const loadComments = useCallback(async () => {
    const res = await listProblemComments({
      ...(onSolution
        ? { solutionId: solutionId!, problemId }
        : { problemId }),
      page: cPage,
      pageSize: 10,
    })
    if (res.success && res.data) {
      setComments(res.data.list)
      setCTotal(res.data.total)
    }
  }, [problemId, solutionId, onSolution, cPage])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  async function submitComment() {
    const content = cDraft.trim()
    if (!content) {
      toast.error('请先写点内容')
      return
    }
    const isReply = Boolean(replyTo)
    const didSyncPublic = !isReply && canSyncPublic && syncToPublic
    setCSending(true)
    const res = await createProblemComment({
      problemId,
      ...(onSolution ? { solutionId: solutionId! } : {}),
      content,
      parentId: replyTo?.id || 0,
      syncToPublic: didSyncPublic,
    })
    setCSending(false)
    if (!res.success) {
      toast.error(res.message || '发布失败')
      return
    }
    setCDraft('')
    setReplyTo(null)
    setSyncToPublic(false)
    toast.success(
      isReply
        ? '回复已发布'
        : didSyncPublic
          ? '评论已发布，并同步到公共域'
          : '评论已发布',
    )
    if (!isReply) setCPage(1)
    void loadComments()
  }

  async function removeComment(id: number) {
    const res = await deleteProblemComment(id)
    if (!res.success) {
      toast.error(res.message || '删除失败')
      return
    }
    toast.success('已删除')
    void loadComments()
  }

  function updateLikeInTree(
    list: ProblemCommentItem[],
    id: number,
    liked: boolean,
    likeCount: number,
  ): ProblemCommentItem[] {
    return list.map((c) => {
      if (c.id === id) return { ...c, liked, likeCount }
      if (c.replies?.length) {
        return {
          ...c,
          replies: updateLikeInTree(c.replies, id, liked, likeCount),
        }
      }
      return c
    })
  }

  async function onLikeComment(c: ProblemCommentItem) {
    if (!isLogin) {
      toast.error('请先登录后再点赞')
      return
    }
    setLikingId(c.id)
    const res = await toggleCommunityLike({
      targetType: 'comment',
      targetId: c.id,
    })
    setLikingId(0)
    if (!res.success || !res.data) {
      toast.error(res.message || '操作失败')
      return
    }
    setComments((prev) =>
      updateLikeInTree(prev, c.id, res.data!.liked, res.data!.likeCount),
    )
  }

  const myId = user?.userId ?? 0

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareIcon className="size-4 text-muted-foreground" />
          {heading}
        </CardTitle>
        {canSyncPublic ? (
          <CardDescription>可选再同步到公共域</CardDescription>
        ) : onSolution ? (
          <CardDescription>针对这篇博客的讨论</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4">
        {isLogin ? (
          <div className="flex flex-col gap-2">
            {replyTo && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span>
                  回复{' '}
                  <span className="font-medium text-foreground">
                    {replyTo.name || replyTo.username || `用户${replyTo.userId}`}
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => setReplyTo(null)}
                >
                  取消
                </Button>
              </div>
            )}
            <MentionTextarea
              value={cDraft}
              onChange={setCDraft}
              placeholder={
                replyTo
                  ? `回复 ${replyTo.name || replyTo.username || ''}…`
                  : onSolution
                    ? '写点想法，可用 @用户名 提醒他人…'
                    : '写点想法，可用 @用户名 提醒他人…'
              }
              maxLength={2000}
              rows={3}
            />
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
              {!replyTo && canSyncPublic ? (
                <Field
                  orientation="horizontal"
                  className="mr-auto w-auto max-w-full gap-2"
                >
                  <Switch
                    id={`comment-sync-public${onSolution ? `-s${solutionId}` : ''}`}
                    size="sm"
                    checked={syncToPublic}
                    onCheckedChange={setSyncToPublic}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <FieldLabel
                      htmlFor={`comment-sync-public${onSolution ? `-s${solutionId}` : ''}`}
                      className="cursor-pointer"
                    >
                      同步到公共域
                    </FieldLabel>
                    <FieldDescription>
                      本组织与公共域发现页都能看到
                    </FieldDescription>
                  </div>
                </Field>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                disabled={cSending}
                onClick={() => void submitComment()}
              >
                {cSending
                  ? '发布中…'
                  : replyTo
                    ? '发布回复'
                    : '发布评论'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link to="/login" className="underline underline-offset-2">
              登录
            </Link>
            后可发表评论
          </p>
        )}

        <ul className="flex flex-col gap-0 divide-y rounded-lg border">
          {comments.map((c) => (
            <CommentNode
              key={c.id}
              comment={c}
              depth={0}
              myId={myId}
              isLogin={isLogin}
              isSiteAdmin={isSiteAdmin}
              likingId={likingId}
              onLike={onLikeComment}
              onReply={(item) => {
                if (!isLogin) {
                  toast.error('请先登录后再回复')
                  return
                }
                setReplyTo(item)
              }}
              onReport={setReportTarget}
              onDelete={removeComment}
            />
          ))}
          {!comments.length && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              暂无评论
            </li>
          )}
        </ul>
        {cTotal > 10 && (
          <Pagination
            page={cPage}
            total={cTotal}
            pageSize={10}
            onChange={setCPage}
          />
        )}
      </CardContent>

      {reportTarget && (
        <CommunityReportDialog
          open={!!reportTarget}
          onOpenChange={(o) => !o && setReportTarget(null)}
          targetType="comment"
          targetId={reportTarget.id}
          ownerUserId={reportTarget.userId}
          myUserId={myId}
        />
      )}
    </Card>
  )
}

type CommentNodeProps = {
  comment: ProblemCommentItem
  depth: number
  myId: number
  isLogin: boolean
  isSiteAdmin: boolean
  likingId: number
  onLike: (c: ProblemCommentItem) => void
  onReply: (c: ProblemCommentItem) => void
  onReport: (c: ProblemCommentItem) => void
  onDelete: (id: number) => void
}

function CommentNode({
  comment: c,
  depth,
  myId,
  isLogin,
  isSiteAdmin,
  likingId,
  onLike,
  onReply,
  onReport,
  onDelete,
}: CommentNodeProps) {
  const indent = Math.min(depth, 3) * 12
  const replies = c.replies || []

  return (
    <li className="list-none">
      <div
        className="px-3 py-3 text-sm"
        style={{ paddingLeft: 12 + indent }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={
                c.username
                  ? `/profile/${c.username}`
                  : `/profile?id=${c.userId}`
              }
              className="font-medium hover:underline"
            >
              {c.name || c.username || `用户${c.userId}`}
            </Link>
            {c.replyToUserId ? (
              <span className="ml-1.5 text-xs text-muted-foreground">
                回复{' '}
                <span className="text-foreground/80">
                  {c.replyToName ||
                    c.replyToUsername ||
                    `用户${c.replyToUserId}`}
                </span>
              </span>
            ) : null}
            <span className="ml-2 text-xs text-muted-foreground">
              {formatTime(c.createdAt)}
            </span>
          </div>
          {(myId === c.userId || isSiteAdmin) && (
            <ConfirmDialog
              title="删除这条评论？"
              description="删除后无法恢复。"
              confirmLabel="删除"
              destructive
              onConfirm={() => void onDelete(c.id)}
            >
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
              >
                <Trash2Icon />
              </Button>
            </ConfirmDialog>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
          {c.content}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2"
            disabled={likingId === c.id}
            onClick={() => void onLike(c)}
          >
            <HeartIcon
              className={cn(c.liked && 'fill-current text-destructive')}
              data-icon="inline-start"
            />
            {c.likeCount && c.likeCount > 0 ? c.likeCount : '赞'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => onReply(c)}
          >
            回复
          </Button>
          {isLogin && myId !== c.userId && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => onReport(c)}
            >
              <FlagIcon data-icon="inline-start" />
              举报
            </Button>
          )}
        </div>
      </div>
      {replies.length > 0 && (
        <ul className="border-t border-dashed">
          {replies.map((r) => (
            <CommentNode
              key={r.id}
              comment={r}
              depth={depth + 1}
              myId={myId}
              isLogin={isLogin}
              isSiteAdmin={isSiteAdmin}
              likingId={likingId}
              onLike={onLike}
              onReply={onReply}
              onReport={onReport}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
