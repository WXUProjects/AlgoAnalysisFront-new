import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpenIcon, MessageSquareIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  createProblemComment,
  deleteProblemComment,
  deleteProblemSolution,
  listProblemComments,
  listProblemSolutions,
} from '@/api/community'
import type { ProblemCommentItem, ProblemUserSolutionItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
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

/** 用户题解侧栏：挂在题面右侧（桌面）或「题解」Tab（移动端） */
export function ProblemSolutionsPanel({ problemId, className }: SharedProps) {
  const { isLogin, user, isSiteAdmin } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [solutions, setSolutions] = useState<ProblemUserSolutionItem[]>([])
  const [sTotal, setSTotal] = useState(0)
  const [sPage, setSPage] = useState(1)

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

  const myId = user?.userId ?? 0

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <CardTitle className="text-base">题解</CardTitle>
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
            写题解
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 py-3">
        {!isLogin && (
          <p className="text-sm text-muted-foreground">
            <Link to="/login" className="underline underline-offset-2">
              登录
            </Link>
            后可发布题解
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
                {s.excerpt && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {s.excerpt}
                  </p>
                )}
              </Link>
              {(myId === s.userId || isSiteAdmin) && (
                <div className="flex gap-1">
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
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => void removeSolution(s.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              )}
            </li>
          ))}
          {!solutions.length && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              还没有用户题解
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
    </Card>
  )
}

/** 题目评论区：全站可见，独立于题解侧栏 */
export function ProblemComments({ problemId, className }: SharedProps) {
  const { isLogin, user, isSiteAdmin, currentOrg } = useAuth()
  const isPublicOrg =
    Boolean(currentOrg?.isSystem) || currentOrg?.slug === 'public'

  const [comments, setComments] = useState<ProblemCommentItem[]>([])
  const [cTotal, setCTotal] = useState(0)
  const [cPage, setCPage] = useState(1)
  const [cDraft, setCDraft] = useState('')
  const [cSending, setCSending] = useState(false)
  /** 非公共域：是否同步到公共域发现流 */
  const [syncToPublic, setSyncToPublic] = useState(false)

  const loadComments = useCallback(async () => {
    const res = await listProblemComments({ problemId, page: cPage, pageSize: 10 })
    if (res.success && res.data) {
      setComments(res.data.list)
      setCTotal(res.data.total)
    }
  }, [problemId, cPage])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  async function submitComment() {
    const content = cDraft.trim()
    if (!content) {
      toast.error('请先写点内容')
      return
    }
    const didSyncPublic = !isPublicOrg && syncToPublic
    setCSending(true)
    const res = await createProblemComment({
      problemId,
      content,
      syncToPublic: didSyncPublic,
    })
    setCSending(false)
    if (!res.success) {
      toast.error(res.message || '发布失败')
      return
    }
    setCDraft('')
    setSyncToPublic(false)
    toast.success(
      didSyncPublic ? '评论已发布，并同步到公共域' : '评论已发布',
    )
    setCPage(1)
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

  const myId = user?.userId ?? 0

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareIcon className="size-4 text-muted-foreground" />
          讨论
        </CardTitle>
        {!isPublicOrg ? (
          <CardDescription>可选再同步到公共域</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4">
        {isLogin ? (
          <div className="flex flex-col gap-2">
            <MentionTextarea
              value={cDraft}
              onChange={setCDraft}
              placeholder="写点想法，可用 @用户名 提醒他人…"
              maxLength={2000}
              rows={3}
            />
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
              {!isPublicOrg ? (
                <Field
                  orientation="horizontal"
                  className="mr-auto w-auto max-w-full gap-2"
                >
                  <Switch
                    id="comment-sync-public"
                    size="sm"
                    checked={syncToPublic}
                    onCheckedChange={setSyncToPublic}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <FieldLabel
                      htmlFor="comment-sync-public"
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
                {cSending ? '发布中…' : '发布评论'}
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

        <ul className="divide-y rounded-lg border">
          {comments.map((c) => (
            <li key={c.id} className="px-3 py-3 text-sm">
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
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatTime(c.createdAt)}
                  </span>
                </div>
                {(myId === c.userId || isSiteAdmin) && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    onClick={() => void removeComment(c.id)}
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                {c.content}
              </p>
            </li>
          ))}
          {!comments.length && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              还没有评论，来抢沙发吧
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
    </Card>
  )
}
