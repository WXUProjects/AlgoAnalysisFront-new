import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  EyeIcon,
  HeartIcon,
  MessageCircleIcon,
  NewspaperIcon,
  PenLineIcon,
  SearchIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getBlogActivationStatus,
  listBlogAuthors,
  listBlogPlaza,
} from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { BlogActivateDialog } from '@/components/blog/blog-activate-dialog'
import { BlogLink } from '@/components/blog/blog-link'
import { MarkdownSummary } from '@/components/markdown-summary'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { BlogArticle, BlogPlazaAuthor, BlogPlazaSort } from '@shared/api'

const PAGE_SIZE = 12
const AUTHOR_LIMIT = 12

function formatDate(sec?: number) {
  if (!sec) return ''
  return new Date(sec * 1000).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function normalizeSort(raw: string | null): BlogPlazaSort {
  if (raw === 'hot' || raw === 'recommend') return raw
  return 'latest'
}

/**
 * 主站博客广场：公开文章流 + 最近更新的博主，跳转到个人博客壳。
 */
export function BlogPlaza() {
  const { isLogin, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const sort = normalizeSort(searchParams.get('sort'))
  const keyword = (searchParams.get('q') || '').trim()
  const page = Math.max(1, Number(searchParams.get('page') || 1))

  const [qInput, setQInput] = useState(keyword)
  const [list, setList] = useState<BlogArticle[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [authors, setAuthors] = useState<BlogPlazaAuthor[]>([])
  const [authorsLoading, setAuthorsLoading] = useState(true)
  const [activateOpen, setActivateOpen] = useState(false)
  /** null=检测中；登录后才有意义 */
  const [blogActivated, setBlogActivated] = useState<boolean | null>(null)

  const myUsername = user?.username
  const myBlogHref = myUsername ? `/blog/${myUsername}` : undefined
  const writeHref = myUsername ? `/blog/${myUsername}/manage/new` : undefined
  const loginRedirect = `/login?redirect=${encodeURIComponent('/blog-plaza')}`

  useEffect(() => {
    setQInput(keyword)
  }, [keyword])

  useEffect(() => {
    let cancelled = false
    if (!isLogin) {
      setBlogActivated(null)
      return
    }
    setBlogActivated(null)
    ;(async () => {
      const res = await getBlogActivationStatus()
      if (cancelled) return
      setBlogActivated(Boolean(res.success && res.data?.activated))
    })()
    return () => {
      cancelled = true
    }
  }, [isLogin, user?.userId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await listBlogPlaza({
        page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        sort,
      })
      if (cancelled) return
      if (!res.success || !res.data) {
        setList([])
        setTotal(0)
        toast.error(res.message || '文章加载失败')
      } else {
        setList(res.data.list)
        setTotal(res.data.total)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [page, keyword, sort])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setAuthorsLoading(true)
      const res = await listBlogAuthors({ page: 1, pageSize: AUTHOR_LIMIT })
      if (cancelled) return
      if (res.success && res.data) setAuthors(res.data.list)
      else setAuthors([])
      setAuthorsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function patchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    setSearchParams(next)
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const q = qInput.trim()
    patchParams({ q: q || null, page: null })
  }

  return (
    <PageShell>
      <section
        data-stagger-item
        className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">博客广场</h1>
          <p className="text-sm text-muted-foreground">
            浏览大家的公开文章，点标题进正文，点作者进个人博客
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLogin && myUsername ? (
            blogActivated === null ? (
              <Button size="sm" disabled>
                加载中…
              </Button>
            ) : blogActivated ? (
              <>
                {myBlogHref ? (
                  <Button variant="outline" size="sm" asChild>
                    <BlogLink to={myBlogHref}>我的博客</BlogLink>
                  </Button>
                ) : null}
                {writeHref ? (
                  <Button size="sm" className="gap-1.5" asChild>
                    <BlogLink to={writeHref}>
                      <PenLineIcon className="size-3.5" />
                      写文章
                    </BlogLink>
                  </Button>
                ) : null}
              </>
            ) : (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setActivateOpen(true)}
              >
                <PenLineIcon className="size-3.5" />
                开通博客
              </Button>
            )
          ) : (
            <Button size="sm" asChild>
              <Link to={loginRedirect}>登录后写博客</Link>
            </Button>
          )}
        </div>
      </section>

      <BlogActivateDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        onActivated={() => {
          setBlogActivated(true)
          if (writeHref) window.location.assign(writeHref)
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-4" data-stagger-item>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={sort}
              onValueChange={(v) =>
                patchParams({
                  sort: v === 'latest' ? null : v,
                  page: null,
                })
              }
            >
              <TabsList>
                <TabsTrigger value="latest">最新</TabsTrigger>
                <TabsTrigger value="hot">热门</TabsTrigger>
                <TabsTrigger value="recommend">精选</TabsTrigger>
              </TabsList>
            </Tabs>
            <form className="flex flex-1 gap-2 sm:max-w-sm sm:justify-end" onSubmit={handleSearch}>
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="搜索文章标题或摘要…"
                className="min-w-0"
              />
              <Button type="submit" variant="secondary" size="icon" aria-label="搜索">
                <SearchIcon className="size-4" />
              </Button>
            </form>
          </div>

          {sort === 'recommend' ? (
            <p className="text-xs text-muted-foreground">
              仅显示作者设为「推荐到主站」的公开文章
            </p>
          ) : null}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-xl" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <Empty className="rounded-xl border border-dashed py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <NewspaperIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {keyword
                    ? '没有找到相关文章'
                    : sort === 'recommend'
                      ? '暂无推荐文章'
                      : '暂无公开文章'}
                </EmptyTitle>
                <EmptyDescription>
                  {keyword
                    ? '换个关键词试试，或清空搜索看全部'
                    : isLogin && blogActivated
                      ? '写一篇公开文章，就会出现在这里'
                      : isLogin
                        ? '开通个人博客后，公开文章会出现在这里'
                        : '有人发布公开文章后，会出现在这里'}
                </EmptyDescription>
              </EmptyHeader>
              {isLogin && blogActivated && writeHref ? (
                <Button className="mt-2" asChild>
                  <BlogLink to={writeHref}>去写文章</BlogLink>
                </Button>
              ) : isLogin && blogActivated === false ? (
                <Button className="mt-2" onClick={() => setActivateOpen(true)}>
                  开通博客
                </Button>
              ) : null}
            </Empty>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {list.map((a) => (
                <PlazaArticleCard key={a.id} article={a} />
              ))}
            </ul>
          )}

          {!loading && total > PAGE_SIZE ? (
            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={(p) => patchParams({ page: p <= 1 ? null : String(p) })}
            />
          ) : null}
        </div>

        <aside className="space-y-3" data-stagger-item>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">最近更新</h2>
            {authorsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : authors.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                暂无活跃博主
              </p>
            ) : (
              <ul className="space-y-1">
                {authors.map((a) => (
                  <li key={a.id}>
                    <BlogLink
                      to={`/blog/${a.username}`}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-1.5 py-2 transition',
                        'hover:bg-muted/80',
                      )}
                    >
                      <Avatar size="sm">
                        {a.avatar ? <AvatarImage src={a.avatar} alt="" /> : null}
                        <AvatarFallback>
                          {(a.name || a.username || '?').slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {a.name || a.username}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.articleCount} 篇
                          {a.latestTitle ? ` · ${a.latestTitle}` : ''}
                        </p>
                      </div>
                    </BlogLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            点进个人博客可看完整列表、评论与点赞
          </p>
        </aside>
      </div>
    </PageShell>
  )
}

function PlazaArticleCard({ article: a }: { article: BlogArticle }) {
  const username = a.username || a.author?.username || ''
  const authorName = a.author?.name || a.author?.username || username || '作者'
  const articleHref =
    username && a.slug ? `/blog/${username}/${a.slug}` : username ? `/blog/${username}` : '#'
  const authorHref = username ? `/blog/${username}` : '#'

  return (
    <li>
      <article className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md">
        {a.coverUrl ? (
          <BlogLink
            to={articleHref}
            className="aspect-[16/9] overflow-hidden bg-muted"
          >
            <img
              src={a.coverUrl}
              alt=""
              className="size-full object-cover transition-transform duration-200 ease-out motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-[1.02]"
              loading="lazy"
            />
          </BlogLink>
        ) : null}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BlogLink
              to={authorHref}
              className="inline-flex min-w-0 items-center gap-1.5 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar size="sm" className="size-5">
                {a.author?.avatar ? (
                  <AvatarImage src={a.author.avatar} alt="" />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {authorName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{authorName}</span>
            </BlogLink>
            <span>·</span>
            <time>{formatDate(a.publishedAt || a.createdAt)}</time>
            {a.recommend ? (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                精选
              </span>
            ) : null}
          </div>
          <BlogLink to={articleHref} className="min-w-0 space-y-1">
            <h2 className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-primary">
              {a.title}
            </h2>
            {a.summary ? (
              <div className="line-clamp-2 text-sm text-muted-foreground">
                <MarkdownSummary content={a.summary} />
              </div>
            ) : null}
          </BlogLink>
          <div className="mt-auto flex items-center gap-3 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <EyeIcon className="size-3.5" />
              {a.viewCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <HeartIcon className="size-3.5" />
              {a.likeCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircleIcon className="size-3.5" />
              {a.commentCount ?? 0}
            </span>
          </div>
        </div>
      </article>
    </li>
  )
}
