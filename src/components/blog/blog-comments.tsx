import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeartIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  createBlogComment,
  deleteBlogComment,
  listBlogComments,
  toggleBlogCommentLike,
} from '@/api/blog'
import {
  createProblemComment,
  deleteProblemComment,
  listProblemComments,
  toggleCommunityLike,
} from '@/api/community'
import { useAuth } from '@/auth/AuthContext'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { BlogComment } from '@shared/api'

type Props = {
  articleId: number
  /** 题解镜像：评论与主站题解共享 */
  sourceSolutionId?: number
  sourceProblemId?: number
  isOwner?: boolean
  /** 登录跳转回当前页 */
  loginRedirect?: string
  className?: string
  /** 评论总数变化时回调（增删） */
  onCountDelta?: (delta: number) => void
}

function countTree(list: BlogComment[]): number {
  let n = 0
  for (const c of list) {
    n += 1 + countTree(c.replies || [])
  }
  return n
}

function updateLikeInTree(
  list: BlogComment[],
  id: number,
  liked: boolean,
  likeCount: number,
): BlogComment[] {
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

function removeFromTree(list: BlogComment[], id: number): BlogComment[] {
  return list
    .filter((c) => c.id !== id)
    .map((c) =>
      c.replies?.length
        ? { ...c, replies: removeFromTree(c.replies, id) }
        : c,
    )
}

function countSubtree(c: BlogComment): number {
  return 1 + countTree(c.replies || [])
}

function findInTree(list: BlogComment[], id: number): BlogComment | null {
  for (const c of list) {
    if (c.id === id) return c
    const nested = findInTree(c.replies || [], id)
    if (nested) return nested
  }
  return null
}

/**
 * 博客文章评论区：头像 + 层级回复 + 点赞。
 * 题解镜像文复用主站题解评论 API（互动双向同步）。
 */
export function BlogComments({
  articleId,
  sourceSolutionId,
  sourceProblemId,
  isOwner,
  loginRedirect,
  className,
  onCountDelta,
}: Props) {
  const { isLogin, user } = useAuth()
  const navigate = useNavigate()
  const mirror = Boolean(sourceSolutionId && sourceSolutionId > 0)

  const [comments, setComments] = useState<BlogComment[]>([])
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [replyTo, setReplyTo] = useState<BlogComment | null>(null)
  const [likingId, setLikingId] = useState(0)

  const requireLogin = useCallback(() => {
    if (loginRedirect) {
      navigate(`/login?redirect=${encodeURIComponent(loginRedirect)}`)
    } else {
      navigate('/login')
    }
  }, [loginRedirect, navigate])

  const load = useCallback(async () => {
    if (mirror && sourceSolutionId) {
      const res = await listProblemComments({
        solutionId: sourceSolutionId,
        problemId: sourceProblemId,
        pageSize: 50,
      })
      if (!res.success || !res.data) return
      setComments(
        res.data.list.map((c) => mapProblemComment(c, articleId)),
      )
      return
    }
    const res = await listBlogComments({ articleId, pageSize: 50 })
    if (res.success && res.data) setComments(res.data.list)
  }, [articleId, mirror, sourceSolutionId, sourceProblemId])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isLogin) {
      requireLogin()
      return
    }
    const content = draft.trim()
    if (!content) {
      toast.error('请写点内容再发送')
      return
    }
    setPosting(true)
    if (mirror && sourceSolutionId) {
      const res = await createProblemComment({
        problemId: sourceProblemId || 0,
        solutionId: sourceSolutionId,
        content,
        parentId: replyTo?.id || 0,
      })
      setPosting(false)
      if (!res.success) {
        toast.error(res.message || '发送失败')
        return
      }
      setDraft('')
      setReplyTo(null)
      toast.success(replyTo ? '回复已发送' : '已发送')
      onCountDelta?.(1)
      void load()
      return
    }
    const res = await createBlogComment({
      articleId,
      content,
      parentId: replyTo?.id || undefined,
    })
    setPosting(false)
    if (!res.success) {
      toast.error(res.message || '发送失败')
      return
    }
    setDraft('')
    setReplyTo(null)
    toast.success(replyTo ? '回复已发送' : '已发送')
    onCountDelta?.(1)
    void load()
  }

  async function onLike(c: BlogComment) {
    if (!isLogin) {
      requireLogin()
      return
    }
    setLikingId(c.id)
    if (mirror) {
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
      return
    }
    const res = await toggleBlogCommentLike(c.id)
    setLikingId(0)
    if (!res.success || !res.data) {
      toast.error(res.message || '操作失败')
      return
    }
    setComments((prev) =>
      updateLikeInTree(prev, c.id, res.data!.liked, res.data!.likeCount),
    )
  }

  async function onDelete(id: number) {
    const target = findInTree(comments, id)
    const subtree = target ? countSubtree(target) : 1
    if (mirror) {
      const res = await deleteProblemComment(id)
      if (!res.success) {
        toast.error(res.message || '删除失败')
        return
      }
      toast.success('已删除')
      onCountDelta?.(-subtree)
      void load()
      return
    }
    const res = await deleteBlogComment(id)
    if (!res.success) {
      toast.error(res.message || '删除失败')
      return
    }
    toast.success('已删除')
    setComments((prev) => removeFromTree(prev, id))
    onCountDelta?.(-subtree)
  }

  const myId = user?.userId ?? 0
  const totalShown = countTree(comments)

  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <h2 className="text-lg font-semibold">
        评论
        {totalShown > 0 ? (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {totalShown}
          </span>
        ) : null}
      </h2>

      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2">
        {replyTo ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span>
              回复{' '}
              <span className="font-medium text-foreground">
                {replyTo.author?.name ||
                  replyTo.author?.username ||
                  `用户${replyTo.userId}`}
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
        ) : null}
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            !isLogin
              ? '登录后即可评论'
              : replyTo
                ? `回复 ${replyTo.author?.name || replyTo.author?.username || ''}…`
                : '写下你的想法…'
          }
          rows={3}
          disabled={!isLogin}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!isLogin || posting} size="sm">
            {posting
              ? '发送中…'
              : replyTo
                ? '发送回复'
                : '发送评论'}
          </Button>
        </div>
      </form>

      <ul className="divide-y">
        {comments.length === 0 ? (
          <li className="py-6 text-center text-sm text-muted-foreground">
            还没有评论，来抢沙发吧
          </li>
        ) : (
          comments.map((c) => (
            <BlogCommentNode
              key={c.id}
              comment={c}
              depth={0}
              myId={myId}
              isOwner={Boolean(isOwner)}
              likingId={likingId}
              onLike={onLike}
              onReply={(item) => {
                if (!isLogin) {
                  requireLogin()
                  return
                }
                setReplyTo(item)
              }}
              onDelete={onDelete}
            />
          ))
        )}
      </ul>
    </section>
  )
}

type NodeProps = {
  comment: BlogComment
  depth: number
  myId: number
  isOwner: boolean
  likingId: number
  onLike: (c: BlogComment) => void
  onReply: (c: BlogComment) => void
  onDelete: (id: number) => void
}

function BlogCommentNode({
  comment: c,
  depth,
  myId,
  isOwner,
  likingId,
  onLike,
  onReply,
  onDelete,
}: NodeProps) {
  const displayName = c.author?.name || c.author?.username || '用户'
  const profileTo = c.author?.username
    ? `/profile/${c.author.username}`
    : c.userId
      ? `/profile?id=${c.userId}`
      : undefined
  const replies = c.replies || []
  const canDelete = myId === c.userId || isOwner
  const indent = Math.min(depth, 3) * 12

  return (
    <li className="list-none">
      <div
        className="flex gap-3 py-3"
        style={{ paddingLeft: depth > 0 ? indent : 0 }}
      >
        <Avatar size="sm" className="size-8 shrink-0">
          <AvatarImage
            src={c.author?.avatar || '/images/defaultAvatar.png'}
            alt=""
          />
          <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {profileTo ? (
              <Link to={profileTo} className="font-medium hover:underline">
                {displayName}
              </Link>
            ) : (
              <span className="font-medium">{displayName}</span>
            )}
            {c.replyToUserId ? (
              <span className="text-xs text-muted-foreground">
                回复{' '}
                <span className="text-foreground/80">
                  {c.replyToName ||
                    c.replyToUsername ||
                    `用户${c.replyToUserId}`}
                </span>
              </span>
            ) : null}
            <time className="text-xs text-muted-foreground">
              {new Date(c.createdAt * 1000).toLocaleString('zh-CN')}
            </time>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">
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
            {canDelete ? (
              <ConfirmDialog
                title="删除这条评论？"
                description="删除后无法恢复，其下回复也会一并删除。"
                confirmLabel="删除"
                destructive
                onConfirm={() => void onDelete(c.id)}
              >
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-muted-foreground"
                >
                  <Trash2Icon data-icon="inline-start" />
                  删除
                </Button>
              </ConfirmDialog>
            ) : null}
          </div>
        </div>
      </div>
      {replies.length > 0 ? (
        <ul className="border-l border-dashed border-border/60">
          {replies.map((r) => (
            <BlogCommentNode
              key={r.id}
              comment={r}
              depth={depth + 1}
              myId={myId}
              isOwner={isOwner}
              likingId={likingId}
              onLike={onLike}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

/** 题解评论 → 博客评论树结构 */
function mapProblemComment(
  c: {
    id: number
    parentId?: number
    content: string
    userId: number
    username?: string
    name?: string
    avatar?: string
    createdAt: number
    likeCount?: number
    liked?: boolean
    replyToUserId?: number
    replyToUsername?: string
    replyToName?: string
    replies?: unknown[]
  },
  articleId: number,
): BlogComment {
  return {
    id: c.id,
    articleId,
    parentId: c.parentId || undefined,
    content: c.content,
    userId: c.userId,
    author: {
      id: c.userId,
      username: c.username || '',
      name: c.name || c.username || '',
      avatar: c.avatar,
    },
    createdAt: c.createdAt,
    likeCount: c.likeCount ?? 0,
    liked: Boolean(c.liked),
    replyToUserId: c.replyToUserId,
    replyToUsername: c.replyToUsername,
    replyToName: c.replyToName,
    replies: (c.replies || []).map((r) =>
      mapProblemComment(
        r as Parameters<typeof mapProblemComment>[0],
        articleId,
      ),
    ),
  }
}
