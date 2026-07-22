import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import {
  ClockIcon,
  EyeIcon,
  HeartIcon,
  LinkIcon,
  LockIcon,
  MessageCircleIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createBlogComment,
  deleteBlogComment,
  getBlogArticle,
  listBlogByUsername,
  listBlogComments,
  reportBlogArticle,
  toggleBlogLike,
  unlockBlogArticle,
} from '@/api/blog'
import {
  createProblemComment,
  listProblemComments,
  toggleCommunityLike,
} from '@/api/community'
import { useAuth } from '@/auth/AuthContext'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { MarkdownBody } from '@/components/markdown-body'
import { MarkdownSummary } from '@/components/markdown-summary'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ArticleToc } from '@/components/blog/article-toc'
import { cn } from '@/lib/utils'
import {
  BLOG_NEW_TAB_PROPS,
  buildArticleOutline,
  ensureOutlineAnchors,
  estimateReadMinutes,
} from '@/lib/blog-nav'
import { useDocumentMeta } from '@/hooks/use-document-meta'
import { clipMetaText } from '@/lib/document-meta'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogArticle as BlogArticleType, BlogComment } from '@shared/api'

const unlockKey = (id: number) => `blog-unlock-${id}`

export function BlogArticlePage() {
  const { username = '', slug = '' } = useParams()
  const {
    isOwner,
    theme,
    author,
    setBreadcrumb,
    setPanelExtra,
    setShowPanel,
    categories,
  } = useOutletContext<BlogOutletContext>()
  const { isLogin, user } = useAuth()
  const navigate = useNavigate()

  const [article, setArticle] = useState<BlogArticleType | null>(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [comments, setComments] = useState<BlogComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [related, setRelated] = useState<BlogArticleType[]>([])
  const [reporting, setReporting] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  const load = async (unlockToken?: string) => {
    setLoading(true)
    const stored =
      unlockToken ||
      (typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(unlockKey(0))
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
            void loadComments(again.data)
            void loadRelated(again.data)
          }
          setBreadcrumb([
            { label: '首页', to: `/blog/${username}` },
            { label: again.data.title },
          ])
          return
        }
      }
    }
    setArticle(res.data)
    setLoading(false)
    if (res.data.canSeeBody) {
      void loadComments(res.data)
      void loadRelated(res.data)
    }
    setBreadcrumb([
      { label: '首页', to: `/blog/${username}` },
      { label: res.data.title },
    ])
  }

  const loadComments = async (a: BlogArticleType | number) => {
    // 题解镜像文：评论与主站题解共享
    if (typeof a === 'object' && a.sourceSolutionId) {
      const res = await listProblemComments({
        solutionId: a.sourceSolutionId,
        problemId: a.sourceProblemId,
        pageSize: 50,
      })
      if (res.success && res.data) {
        setComments(
          res.data.list.map((c) => ({
            id: c.id,
            articleId: typeof a === 'object' ? a.id : 0,
            parentId: c.parentId,
            content: c.content,
            userId: c.userId,
            author: {
              id: c.userId,
              username: c.username || '',
              name: c.name || c.username || '',
              avatar: c.avatar,
            },
            createdAt: c.createdAt,
          })),
        )
      }
      return
    }
    const articleId = typeof a === 'number' ? a : a.id
    const res = await listBlogComments({ articleId, pageSize: 50 })
    if (res.success && res.data) setComments(res.data.list)
  }

  const loadRelated = async (a: BlogArticleType) => {
    const res = await listBlogByUsername({
      username,
      page: 1,
      pageSize: 8,
      categoryId: a.categoryId || undefined,
    })
    if (!res.success || !res.data) {
      setRelated([])
      return
    }
    setRelated(res.data.list.filter((x) => x.id !== a.id).slice(0, 4))
  }

  useEffect(() => {
    void load()
    return () => {
      setPanelExtra(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, slug])

  const authorName =
    article?.author?.name ||
    article?.author?.username ||
    author?.name ||
    author?.username ||
    username
  const articleMetaTitle = article
    ? `${article.title}${authorName ? ` - ${authorName}` : ''}`
    : ''
  const articleMetaDesc = article
    ? clipMetaText(
        article.summary ||
          (article.canSeeBody ? article.content || '' : '') ||
          `${authorName} 的文章`,
      )
    : undefined
  // 博文分享图：优先博主头像；siteName 固定 GoAlgo 品牌
  const articleMetaImage =
    article?.author?.avatar ||
    author?.avatar ||
    article?.coverUrl ||
    undefined
  useDocumentMeta(
    article
      ? {
          title: articleMetaTitle
            ? `${articleMetaTitle} - GoAlgo`
            : 'GoAlgo',
          description: articleMetaDesc,
          image: articleMetaImage,
          url: `/blog/${username}/${slug}`,
          type: 'article',
          siteName: 'GoAlgo',
        }
      : null,
  )

  const toc = useMemo(
    () =>
      article?.canSeeBody
        ? buildArticleOutline(article.content || '', article.title)
        : [],
    [article?.canSeeBody, article?.content, article?.title],
  )

  // Inject anchor ids for bold-fallback / missing heading ids after MD render
  useEffect(() => {
    if (!article?.canSeeBody || toc.length === 0) return
    const apply = () => ensureOutlineAnchors(bodyRef.current, toc)
    apply()
    // MarkdownBody async-highlight may rewrite DOM shortly after
    const t1 = window.setTimeout(apply, 120)
    const t2 = window.setTimeout(apply, 480)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [article?.canSeeBody, article?.content, toc])

  // Right panel TOC for Chirpy / Mizuki (scrollspy lives inside ArticleToc)
  useEffect(() => {
    if (theme.themeId !== 'chirpy' && theme.themeId !== 'mizuki') {
      setPanelExtra(null)
      return
    }
    setShowPanel(true)
    if (toc.length === 0) {
      setPanelExtra(null)
      return
    }
    setPanelExtra(
      <ArticleToc
        toc={toc}
        getBody={() => bodyRef.current}
        variant={theme.themeId === 'mizuki' ? 'mizuki' : 'chirpy'}
      />,
    )
    return () => setPanelExtra(null)
  }, [toc, theme.themeId, setPanelExtra, setShowPanel])

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
    void loadComments(res.data)
    void loadRelated(res.data)
  }

  async function handleLike() {
    if (!article) return
    if (!isLogin) {
      navigate(
        `/login?redirect=${encodeURIComponent(`/blog/${username}/${slug}`)}`,
      )
      return
    }
    // 题解镜像：点赞走主站题解，计数双向同步
    if (article.sourceSolutionId) {
      const res = await toggleCommunityLike({
        targetType: 'solution',
        targetId: article.sourceSolutionId,
      })
      if (!res.success || !res.data) {
        toast.error(res.message || '操作失败')
        return
      }
      setArticle({
        ...article,
        liked: res.data.liked,
        likeCount: res.data.likeCount,
      })
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
    if (article.sourceSolutionId) {
      const res = await createProblemComment({
        problemId: article.sourceProblemId || 0,
        solutionId: article.sourceSolutionId,
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
      void loadComments(article)
      return
    }
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
    void loadComments(article)
  }

  async function handleDeleteComment(id: number) {
    // 题解评论删除走社区 API（此处仅博客自有评论）
    if (article?.sourceSolutionId) {
      toast.message('请到主站博客页管理博客评论')
      return
    }
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

  async function handleReport() {
    if (!article) return
    if (!isLogin) {
      navigate(
        `/login?redirect=${encodeURIComponent(`/blog/${username}/${slug}`)}`,
      )
      return
    }
    const reason = window.prompt('请简述举报原因（将通知站点管理员）')
    if (reason == null) return
    if (!reason.trim()) {
      toast.error('请填写举报原因')
      return
    }
    setReporting(true)
    const res = await reportBlogArticle({
      articleId: article.id,
      reason: reason.trim(),
    })
    setReporting(false)
    if (!res.success) {
      toast.error(res.message || '提交失败')
      return
    }
    toast.success(res.message || '已收到举报')
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('链接已复制')
    } catch {
      toast.error('复制失败，请手动复制地址栏')
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

  const catName = categories.find((c) => c.id === article.categoryId)?.name
  const isChirpy = theme.themeId === 'chirpy'
  const isMizuki = theme.themeId === 'mizuki'
  const published = new Date(
    (article.publishedAt || article.createdAt) * 1000,
  ).toLocaleString('zh-CN')
  const readMin = estimateReadMinutes(article.content)
  const editHref = `/blog/${username}/manage/edit/${article.id}`

  const unlockBlock =
    article.requiresPassword && !article.canSeeBody ? (
      <div
        className={
          isChirpy
            ? 'mt-6 rounded-[10px] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]'
            : isMizuki
              ? 'mz-section-card'
              : 'rounded-xl border bg-card p-6 shadow-sm'
        }
      >
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
    ) : null

  const mobileToc =
    isChirpy && article.canSeeBody && toc.length > 0 ? (
      <details className="chirpy-toc-mobile mb-6 rounded-[10px] border border-[var(--main-border-color)] bg-[var(--card-bg)] p-3 xl:hidden">
        <summary className="cursor-pointer select-none font-semibold text-[var(--label-color)]">
          文章内容
        </summary>
        <ul className="chirpy-toc-list mt-2">
          {toc.map((item) => (
            <li
              key={item.id}
              className="chirpy-toc-item"
              style={{
                paddingLeft: `${Math.max(0, item.level - 1) * 0.7}rem`,
              }}
            >
              <a
                href={item.id === 'article-top' ? '#' : `#${item.id}`}
                className="chirpy-toc-link"
                onClick={(e) => {
                  e.preventDefault()
                  if (item.id === 'article-top') {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                    return
                  }
                  ensureOutlineAnchors(bodyRef.current, toc)
                  document
                    .getElementById(item.id)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </details>
    ) : null

  const bodyBlock =
    !article.requiresPassword || article.canSeeBody ? (
      isChirpy ? (
        <div ref={bodyRef} className="chirpy-prose content" id="article-body">
          {mobileToc}
          <MarkdownBody
            content={article.content || ''}
            mode="markdown"
            emptyText="（空文章）"
            className="prose-blog"
          />
        </div>
      ) : isMizuki ? (
        <div ref={bodyRef} className="mz-prose" id="article-body">
          <MarkdownBody
            content={article.content || ''}
            mode="markdown"
            emptyText="（空文章）"
            className="prose-blog"
          />
        </div>
      ) : (
        <div ref={bodyRef} className="rounded-xl border bg-card p-6 shadow-sm">
          <MarkdownBody
            content={article.content || ''}
            mode="markdown"
            emptyText="（空文章）"
            className="prose-blog text-[15px] leading-relaxed"
          />
        </div>
      )
    ) : null

  /** 文末显式点赞：不埋在标题 meta 里，读完再点更自然 */
  const likeBlock = article.canSeeBody ? (
    <div
      className={
        isChirpy
          ? 'mt-12 flex flex-col items-center gap-2 border-b border-[var(--main-border-color)] pb-8'
          : isMizuki
            ? 'mt-10 flex flex-col items-center gap-2 border-t border-dashed border-[var(--mz-line)] pt-6'
            : 'flex flex-col items-center gap-2 border-t pt-6'
      }
    >
      <Button
        type="button"
        size="lg"
        variant={article.liked ? 'default' : 'outline'}
        onClick={() => void handleLike()}
        className="min-w-40"
        aria-pressed={article.liked}
      >
        <HeartIcon
          data-icon="inline-start"
          className={cn(article.liked && 'fill-current')}
        />
        {article.liked ? '已点赞' : '点赞'}
        {(article.likeCount ?? 0) > 0 ? ` · ${article.likeCount}` : ''}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {(article.likeCount ?? 0) > 0
          ? `已有 ${article.likeCount} 人为这篇文章点赞`
          : '觉得写得好？给作者点个赞吧'}
      </p>
    </div>
  ) : null

  const shareBlock = article.canSeeBody ? (
    <div
      className={
        isChirpy
          ? 'post-tail-wrapper mt-6 flex flex-wrap items-center justify-between gap-3 pb-6'
          : isMizuki
            ? 'mt-6 flex flex-wrap items-center justify-between gap-3'
            : 'flex flex-wrap items-center justify-between gap-3'
      }
    >
      <div className="text-sm text-muted-foreground">
        {catName ? <span>分类：{catName}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleCopyLink()}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--link-color,var(--primary))] hover:underline"
        >
          <LinkIcon className="size-3.5" />
          复制链接
        </button>
        {!isOwner ? (
          <button
            type="button"
            disabled={reporting}
            onClick={() => void handleReport()}
            className="text-sm text-muted-foreground hover:text-destructive hover:underline"
          >
            {reporting ? '提交中…' : '举报'}
          </button>
        ) : null}
      </div>
    </div>
  ) : null

  const relatedBlock =
    article.canSeeBody && related.length > 0 ? (
      <section
        id="related-posts"
        className={
          isChirpy
            ? 'mt-10 space-y-3'
            : isMizuki
              ? 'mz-section-card space-y-3'
              : 'mt-6 space-y-3 rounded-xl border bg-card p-5'
        }
      >
        <h3
          className={
            isChirpy
              ? 'text-[1.1rem] font-semibold text-[var(--label-color)]'
              : isMizuki
                ? 'text-base font-semibold text-[var(--mz-text-90)]'
                : 'text-base font-semibold'
          }
        >
          相关文章
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {related.map((a) => (
            <li key={a.id}>
              <Link
                to={`/blog/${username}/${a.slug}`}
                className={
                  isChirpy
                    ? 'block rounded-[10px] bg-[var(--card-bg)] p-3 shadow-[var(--card-shadow)] transition hover:bg-[var(--card-hover-bg)]'
                    : isMizuki
                      ? 'block rounded-[var(--mz-radius-sm)] bg-[var(--mz-btn-bg)] p-3 transition hover:bg-[var(--mz-btn-bg-hover)]'
                      : 'block rounded-lg border p-3 hover:border-primary/40'
                }
              >
                <h4 className="line-clamp-2 font-medium">{a.title}</h4>
                {a.summary ? (
                  <MarkdownSummary
                    content={a.summary}
                    className="mt-1 line-clamp-2 text-sm text-muted-foreground"
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ) : null

  const commentsBlock = article.canSeeBody ? (
    <section
      className={
        isChirpy
          ? 'mt-10 flex flex-col gap-4 rounded-[10px] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]'
          : isMizuki
            ? 'mz-section-card mt-0 flex flex-col gap-4'
            : 'flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm'
      }
    >
      <h2 className="text-lg font-semibold">
        评论
        {(article.commentCount ?? 0) > 0 ? (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {article.commentCount}
          </span>
        ) : null}
      </h2>
      <form onSubmit={handleComment} className="flex flex-col gap-2">
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
          comments.map((c) => {
            const displayName =
              c.author?.name || c.author?.username || '用户'
            const profileTo = c.author?.username
              ? `/profile/${c.author.username}`
              : c.userId
                ? `/profile?id=${c.userId}`
                : undefined
            return (
              <li key={c.id} className="flex gap-3 py-3">
                <Avatar size="sm" className="size-8 shrink-0">
                  <AvatarImage
                    src={c.author?.avatar || '/images/defaultAvatar.png'}
                    alt=""
                  />
                  <AvatarFallback>
                    {displayName.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {profileTo ? (
                      <Link
                        to={profileTo}
                        className="font-medium hover:underline"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <span className="font-medium">{displayName}</span>
                    )}
                    <time className="text-xs text-muted-foreground">
                      {new Date(c.createdAt * 1000).toLocaleString('zh-CN')}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                    {c.content}
                  </p>
                </div>
                {(user?.userId === c.userId || isOwner) && (
                  <ConfirmDialog
                    title="删除这条评论？"
                    description="删除后无法恢复。"
                    confirmLabel="删除"
                    destructive
                    onConfirm={() => void handleDeleteComment(c.id)}
                  >
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground"
                      aria-label="删除评论"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </ConfirmDialog>
                )}
              </li>
            )
          })
        )}
      </ul>
    </section>
  ) : null

  if (isChirpy) {
    return (
      <article className="chirpy-article px-1 pt-4">
        {article.coverUrl ? (
          <div
            className="mb-6 overflow-hidden rounded-[10px]"
          >
            <img
              src={article.coverUrl}
              alt=""
              className="aspect-[21/9] w-full object-cover"
            />
          </div>
        ) : null}
        <header>
          <h1>
            {article.title}
          </h1>
          {/* 摘要字段保留，正文页不渲染；只在列表卡片展示 */}
          <div className="post-meta flex flex-wrap items-center gap-y-1">
            <span>
              <Link to={`/blog/${username}`}>@{username}</Link>
            </span>
            <span>
              <time>{published}</time>
            </span>
            {catName ? <span>{catName}</span> : null}
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-3.5" />
              约 {readMin} 分钟
            </span>
            <span className="inline-flex items-center gap-1">
              <EyeIcon className="size-3.5" />
              {article.viewCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <HeartIcon className="size-3.5" />
              {article.likeCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircleIcon className="size-3.5" />
              {article.commentCount ?? 0}
            </span>
            {isOwner && (
              <span>
                <a href={editHref} {...BLOG_NEW_TAB_PROPS}>
                  编辑
                </a>
              </span>
            )}
          </div>
        </header>
        {unlockBlock}
        {bodyBlock}
        {likeBlock}
        {shareBlock}
        {relatedBlock}
        {commentsBlock}
      </article>
    )
  }

  if (isMizuki) {
    return (
      <div className="space-y-4">
        <article className="mz-article">
          {article.coverUrl ? (
            <div
              className="mb-6 overflow-hidden rounded-[var(--mz-radius-sm)]"
            >
              <img
                src={article.coverUrl}
                alt=""
                className="aspect-[21/9] w-full object-cover"
              />
            </div>
          ) : null}
          <header>
            <h1>
              {article.title}
            </h1>
            <div className="mz-article-meta">
              <span>
                <Link to={`/blog/${username}`}>@{username}</Link>
              </span>
              <span>
                <time>{published}</time>
              </span>
              {catName ? <span>{catName}</span> : null}
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="size-3.5" />
                约 {readMin} 分钟
              </span>
              <span className="inline-flex items-center gap-1">
                <EyeIcon className="size-3.5" />
                {article.viewCount ?? 0}
              </span>
              <span className="inline-flex items-center gap-1">
                <HeartIcon className="size-3.5" />
                {article.likeCount ?? 0}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircleIcon className="size-3.5" />
                {article.commentCount ?? 0}
              </span>
              {isOwner && (
                <span>
                  <a href={editHref} {...BLOG_NEW_TAB_PROPS}>
                    编辑
                  </a>
                </span>
              )}
            </div>
          </header>
          {unlockBlock}
          {bodyBlock}
          {likeBlock}
          {shareBlock}
        </article>
        {relatedBlock}
        {commentsBlock}
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      {article.coverUrl ? (
        <div
          className="overflow-hidden rounded-xl border"
        >
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
          <time>{published}</time>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" />约 {readMin} 分钟
          </span>
          {isOwner && (
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <a href={editHref} {...BLOG_NEW_TAB_PROPS}>
                编辑
              </a>
            </Button>
          )}
        </div>
        <h1
          className="text-3xl font-bold tracking-tight"
        >
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <EyeIcon className="size-4" />
            {article.viewCount ?? 0} 阅读
          </span>
          <span className="inline-flex items-center gap-1">
            <HeartIcon className="size-4" />
            {article.likeCount ?? 0} 赞
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircleIcon className="size-4" />
            {article.commentCount ?? 0} 评论
          </span>
        </div>
      </header>

      {unlockBlock}
      {bodyBlock}
      {likeBlock}
      {shareBlock}
      {relatedBlock}
      {commentsBlock}
    </article>
  )
}
