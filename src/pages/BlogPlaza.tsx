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
    <PageShell className="min-w-0 overflow-x-clip">
      <section
        data-stagger-item
        className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-5"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">博客广场</h1>
          <p className="text-sm text-muted-foreground">浏览大家的公开文章</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
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
                  <Button size="sm" asChild>
                    <BlogLink to={writeHref}>
                      <PenLineIcon data-icon="inline-start" />
                      写文章
                    </BlogLink>
                  </Button>
                ) : null}
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setActivateOpen(true)}
              >
                <PenLineIcon data-icon="inline-start" />
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

      {/*
        移动端必须 minmax(0,1fr)：默认 auto 列会被卡片/表单 min-content 撑到 > 视口，
        再被 main overflow-x-hidden 裁掉，表现为「内容全被截断」。
      */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-w-0 flex-col gap-4" data-stagger-item>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={sort}
              onValueChange={(v) =>
                patchParams({
                  sort: v === 'latest' ? null : v,
                  page: null,
                })
              }
              className="min-w-0 w-full sm:w-auto"
            >
              <TabsList className="grid h-9 w-full grid-cols-3 sm:inline-flex sm:w-fit">
                <TabsTrigger value="latest" className="px-2 sm:px-3">
                  最新
                </TabsTrigger>
                <TabsTrigger value="hot" className="px-2 sm:px-3">
                  热门
                </TabsTrigger>
                <TabsTrigger value="recommend" className="px-2 sm:px-3">
                  精选
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <form
              className="flex min-w-0 w-full gap-2 sm:max-w-sm sm:flex-1 sm:justify-end"
              onSubmit={handleSearch}
            >
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="搜索文章…"
                className="min-w-0 flex-1"
              />
              <Button
                type="submit"
                variant="secondary"
                size="icon"
                className="shrink-0"
                aria-label="搜索"
              >
                <SearchIcon />
              </Button>
            </form>
          </div>

          {sort === 'recommend' ? (
            <p className="text-xs text-muted-foreground">
              由具备博客审核权限的管理员挑选的公开文章
            </p>
          ) : null}

          {loading ? (
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
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
                      ? '暂无精选文章'
                      : '暂无公开文章'}
                </EmptyTitle>
                <EmptyDescription>
                  {keyword
                    ? '换个关键词试试，或清空搜索看全部'
                    : sort === 'recommend'
                      ? '管理员挑选后，优质公开文会出现在这里'
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
            <ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {list.map((a) => (
                <PlazaArticleCard key={a.id} article={a} />
              ))}
            </ul>
          )}

          {!loading && total > 0 ? (
            <div className="min-w-0 overflow-x-auto">
              <Pagination
                page={page}
                total={total}
                pageSize={PAGE_SIZE}
                onChange={(p) =>
                  patchParams({ page: p <= 1 ? null : String(p) })
                }
              />
            </div>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-3" data-stagger-item>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">最近更新</h2>
            {authorsLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="size-9 shrink-0 rounded-full" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
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
              <ul className="flex flex-col gap-1">
                {authors.map((a) => (
                  <li key={a.id} className="min-w-0">
                    <BlogLink
                      to={`/blog/${a.username}`}
                      className={cn(
                        'flex min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-2 transition',
                        'hover:bg-muted/80',
                      )}
                    >
                      <Avatar size="sm" className="shrink-0">
                        {a.avatar ? <AvatarImage src={a.avatar} alt="" /> : null}
                        <AvatarFallback>
                          {(a.name || a.username || '?')
                            .slice(0, 1)
                            .toUpperCase()}
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
  const cover = (a.coverUrl || '').trim()

  return (
    <li className="min-w-0">
      {/* 统一左文右小图：有无封面同一行高，避免大图/无图混排错落 */}
      <article className="group flex h-full min-h-[7.25rem] min-w-0 items-stretch overflow-hidden rounded-xl border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <BlogLink
              to={authorHref}
              className="inline-flex min-w-0 max-w-full items-center gap-1.5 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar size="sm" className="size-5 shrink-0">
                {a.author?.avatar ? (
                  <AvatarImage src={a.author.avatar} alt="" />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {authorName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{authorName}</span>
            </BlogLink>
            <span className="opacity-50" aria-hidden>
              ·
            </span>
            <time className="shrink-0 tabular-nums">
              {formatDate(a.publishedAt || a.createdAt)}
            </time>
            {a.recommend ? (
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                精选
              </span>
            ) : null}
          </div>
          <BlogLink to={articleHref} className="flex min-w-0 flex-col gap-1">
            <h2 className="line-clamp-2 break-words text-sm font-semibold leading-snug group-hover:text-primary sm:text-base">
              {a.title}
            </h2>
            {a.summary ? (
              <MarkdownSummary
                content={a.summary}
                className="line-clamp-2 break-words text-xs text-muted-foreground sm:text-sm"
              />
            ) : null}
          </BlogLink>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <EyeIcon className="size-3.5 shrink-0" />
              {a.viewCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <HeartIcon className="size-3.5 shrink-0" />
              {a.likeCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircleIcon className="size-3.5 shrink-0" />
              {a.commentCount ?? 0}
            </span>
          </div>
        </div>
        {cover ? (
          <BlogLink
            to={articleHref}
            className="m-2.5 ml-0 aspect-square w-[4.75rem] shrink-0 self-center overflow-hidden rounded-lg bg-muted sm:w-24"
            aria-hidden
            tabIndex={-1}
          >
            <img
              src={cover}
              alt=""
              className="size-full object-cover transition-transform duration-200 ease-out motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-[1.03]"
              loading="lazy"
            />
          </BlogLink>
        ) : null}
      </article>
    </li>
  )
}
