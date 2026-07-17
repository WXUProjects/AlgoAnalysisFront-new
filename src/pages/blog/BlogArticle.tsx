import { useEffect, useState } from 'react'
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import {
  EyeIcon,
  HeartIcon,
  LockIcon,
  MessageCircleIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createBlogComment,
  deleteBlogComment,
  getBlogArticle,
  listBlogComments,
  toggleBlogLike,
  unlockBlogArticle,
} from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { MarkdownBody } from '@/components/markdown-body'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogArticle as BlogArticleType, BlogComment } from '@shared/api'

const unlockKey = (id: number) => `blog-unlock-${id}`

export function BlogArticlePage() {
  const { username = '', slug = '' } = useParams()
  const { isOwner } = useOutletContext<BlogOutletContext>()
  const { isLogin, user } = useAuth()
  const navigate = useNavigate()

  const [article, setArticle] = useState<BlogArticleType | null>(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [comments, setComments] = useState<BlogComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)

  const load = async (unlockToken?: string) => {
    setLoading(true)
    const stored =
      unlockToken ||
      (typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(unlockKey(0)) // placeholder, fixed after first load
        : null)
    void stored
    const tokenFromStore =
      typeof sessionStorage !== 'undefined' && article?.id
        ? sessionStorage.getItem(unlockKey(article.id)) || undefined
        : undefined
    const res = await getBlogArticle({
      username,
      slug,
      unlockToken: unlockToken || tokenFromStore,
    })
    if (!res.success || !res.data) {
      setArticle(null)
      setLoading(false)
      return
    }
    // re-fetch unlock from id-specific key if first pass had no id
    if (res.data.requiresPassword && !res.data.canSeeBody) {
      const t =
        typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem(unlockKey(res.data.id))
          : null
      if (t && !unlockToken) {
        const again = await getBlogArticle({
          username,
          slug,
          unlockToken: t,
        })
        if (again.success && again.data) {
          setArticle(again.data)
          setLoading(false)
          if (again.data.canSeeBody) {
            void loadComments(again.data.id)
          }
          return
        }
      }
    }
    setArticle(res.data)
    setLoading(false)
    if (res.data.canSeeBody) {
      void loadComments(res.data.id)
    }
  }

  const loadComments = async (articleId: number) => {
    const res = await listBlogComments({ articleId, pageSize: 50 })
    if (res.success && res.data) setComments(res.data.list)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, slug])

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (!article || !password) {
      toast.error('请输入访问密码')
      return
    }
    setUnlocking(true)
    const res = await unlockBlogArticle(article.id, password)
    setUnlocking(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '密码不正确')
      return
    }
    if (res.data.unlockToken) {
      sessionStorage.setItem(unlockKey(article.id), res.data.unlockToken)
    }
    setArticle(res.data)
    toast.success('已解锁')
    void loadComments(res.data.id)
  }

  async function handleLike() {
    if (!article) return
    if (!isLogin) {
      navigate(
        `/login?redirect=${encodeURIComponent(`/blog/${username}/${slug}`)}`,
      )
      return
    }
    const res = await toggleBlogLike(article.id)
    if (!res.success || !res.data) {
      toast.error(res.message || '操作失败')
      return
    }
    setArticle({
      ...article,
      liked: res.data.liked,
      likeCount: res.data.likeCount,
    })
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!article) return
    if (!isLogin) {
      navigate(
        `/login?redirect=${encodeURIComponent(`/blog/${username}/${slug}`)}`,
      )
      return
    }
    if (!commentText.trim()) {
      toast.error('请写点内容再发送')
      return
    }
    setPosting(true)
    const res = await createBlogComment({
      articleId: article.id,
      content: commentText.trim(),
    })
    setPosting(false)
    if (!res.success) {
      toast.error(res.message || '发送失败')
      return
    }
    setCommentText('')
    toast.success('已发送')
    setArticle({
      ...article,
      commentCount: (article.commentCount || 0) + 1,
    })
    void loadComments(article.id)
  }

  async function handleDeleteComment(id: number) {
    const res = await deleteBlogComment(id)
    if (!res.success) {
      toast.error(res.message || '删除失败')
      return
    }
    setComments((prev) => prev.filter((c) => c.id !== id))
    if (article) {
      setArticle({
        ...article,
        commentCount: Math.max(0, (article.commentCount || 1) - 1),
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
        <p className="mb-4">文章不存在或无权查看</p>
        <Button variant="outline" asChild>
          <Link to={`/blog/${username}`}>返回列表</Link>
        </Button>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      {article.coverUrl ? (
        <div className="overflow-hidden rounded-xl border">
          <img
            src={article.coverUrl}
            alt=""
            className="aspect-[21/9] w-full object-cover"
          />
        </div>
      ) : null}

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/blog/${username}`} className="hover:text-foreground">
            @{username}
          </Link>
          <span>·</span>
          <time>
            {new Date(
              (article.publishedAt || article.createdAt) * 1000,
            ).toLocaleString('zh-CN')}
          </time>
          {isOwner && (
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to={`/blog/${username}/manage/edit/${article.id}`}>
                编辑
              </Link>
            </Button>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
        {article.summary ? (
          <p className="text-muted-foreground">{article.summary}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <EyeIcon className="size-4" />
            {article.viewCount ?? 0} 阅读
          </span>
          <button
            type="button"
            onClick={() => void handleLike()}
            className={`inline-flex items-center gap-1 transition hover:text-foreground ${
              article.liked ? 'text-primary' : ''
            }`}
          >
            <HeartIcon
              className={`size-4 ${article.liked ? 'fill-current' : ''}`}
            />
            {article.likeCount ?? 0} 赞
          </button>
          <span className="inline-flex items-center gap-1">
            <MessageCircleIcon className="size-4" />
            {article.commentCount ?? 0} 评论
          </span>
        </div>
      </header>

      {article.requiresPassword && !article.canSeeBody ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2 font-medium">
            <LockIcon className="size-4 text-primary" />
            这篇文章需要密码
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            输入作者设置的访问密码后即可阅读全文
          </p>
          <form onSubmit={handleUnlock} className="flex flex-wrap gap-2">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="访问密码"
              className="max-w-xs"
              autoComplete="off"
            />
            <Button type="submit" disabled={unlocking}>
              {unlocking ? '验证中…' : '解锁'}
            </Button>
          </form>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <MarkdownBody
            content={article.content || ''}
            mode="markdown"
            emptyText="（空文章）"
            className="prose-blog text-[15px] leading-relaxed"
          />
        </div>
      )}

      {article.canSeeBody && (
        <section className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">评论</h2>
          <form onSubmit={handleComment} className="space-y-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={isLogin ? '写下你的想法…' : '登录后即可评论'}
              rows={3}
              disabled={!isLogin}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!isLogin || posting} size="sm">
                {posting ? '发送中…' : '发送评论'}
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
                <li key={c.id} className="flex gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {c.author?.name || c.author?.username || '用户'}
                      </span>
                      <time className="text-xs text-muted-foreground">
                        {new Date(c.createdAt * 1000).toLocaleString('zh-CN')}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {c.content}
                    </p>
                  </div>
                  {(user?.userId === c.userId || isOwner) && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground"
                      onClick={() => void handleDeleteComment(c.id)}
                      aria-label="删除评论"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>
      )}
    </article>
  )
}
