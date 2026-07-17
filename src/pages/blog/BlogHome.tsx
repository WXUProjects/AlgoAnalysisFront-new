import { useEffect, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import {
  CalendarIcon,
  ChevronRightIcon,
  EyeIcon,
  FolderOpenIcon,
  HeartIcon,
  MessageCircleIcon,
} from 'lucide-react'
import { listBlogByUsername, listBlogCategories } from '@/api/blog'
import { MarkdownSummary } from '@/components/markdown-summary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogArticle, BlogCategory } from '@shared/api'

function formatDate(sec?: number) {
  if (!sec) return ''
  const d = new Date(sec * 1000)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateSlash(sec?: number) {
  if (!sec) return ''
  const d = new Date(sec * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

export function BlogHome() {
  const { username, author, theme, categories: shellCats } =
    useOutletContext<BlogOutletContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = Number(searchParams.get('categoryId') || 0) || undefined
  const keyword = (searchParams.get('q') || '').trim()
  const page = Math.max(1, Number(searchParams.get('page') || 1))

  const [list, setList] = useState<BlogArticle[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<BlogCategory[]>(shellCats || [])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState(keyword)

  useEffect(() => {
    setQ(keyword)
  }, [keyword])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [art, cats] = await Promise.all([
        listBlogByUsername({
          username,
          page,
          pageSize:
            theme.themeId === 'chirpy'
              ? 10
              : theme.themeId === 'mizuki'
                ? 8
                : 12,
          categoryId,
          keyword: keyword || undefined,
        }),
        listBlogCategories(username),
      ])
      if (cancelled) return
      if (art.success && art.data) {
        setList(art.data.list)
        setTotal(art.data.total)
      } else {
        setList([])
        setTotal(0)
      }
      setCategories(cats.data || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [username, page, categoryId, keyword, theme.themeId])

  const pageSize =
    theme.themeId === 'chirpy' ? 10 : theme.themeId === 'mizuki' ? 8 : 12
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const catName = (id?: number | null) =>
    categories.find((c) => c.id === id)?.name

  if (theme.themeId === 'chirpy') {
    const activeCat = categoryId
      ? categories.find((c) => c.id === categoryId)?.name
      : undefined
    return (
      <div>
        {(keyword || activeCat) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 px-1 text-sm text-[var(--text-muted-color)]">
            {keyword ? <span>搜索：{keyword}</span> : null}
            {activeCat ? <span>分类：{activeCat}</span> : null}
            <button
              type="button"
              className="chirpy-post-tag"
              onClick={() => setSearchParams({})}
            >
              清除筛选
            </button>
          </div>
        )}
        {loading ? (
          <div className="chirpy-empty">
            <Spinner className="mx-auto size-6" />
          </div>
        ) : list.length === 0 ? (
          <div className="chirpy-empty">还没有公开文章</div>
        ) : (
          <div id="post-list" className="chirpy-post-list">
            {list.map((a) => (
              <Link
                key={a.id}
                to={`/blog/${username}/${a.slug}`}
                className="chirpy-card"
              >
                <div className="chirpy-card-body">
                  {/* 卡片标题用 h2：列表页不要文章头级 h1 */}
                  <h2 className="chirpy-card-title">{a.title}</h2>
                  {a.summary ? (
                    <div className="chirpy-card-text">
                      <MarkdownSummary content={a.summary} />
                    </div>
                  ) : null}
                  <div className="chirpy-post-meta">
                    <div className="meta-left">
                      <CalendarIcon className="inline" />
                      <time>
                        {formatDateSlash(a.publishedAt || a.createdAt)}
                      </time>
                      {catName(a.categoryId) ? (
                        <>
                          <FolderOpenIcon className="meta-sep inline" />
                          <span className="categories">
                            {catName(a.categoryId)}
                          </span>
                        </>
                      ) : null}
                      {a.requiresPassword ? (
                        <span className="meta-sep text-xs opacity-70">密码</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="chirpy-pagination">
            <button
              type="button"
              className="chirpy-page-btn"
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(page - 1))
                setSearchParams(next)
              }}
            >
              上一页
            </button>
            <span className="chirpy-page-btn is-active">{page}</span>
            <span className="self-center text-sm text-[var(--text-muted-color)]">
              / {pages}
            </span>
            <button
              type="button"
              className="chirpy-page-btn"
              disabled={page >= pages}
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(page + 1))
                setSearchParams(next)
              }}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    )
  }

  // ---------- mizuki ----------
  if (theme.themeId === 'mizuki') {
    const activeCat = categoryId
      ? categories.find((c) => c.id === categoryId)?.name
      : undefined
    return (
      <div>
        {(keyword || activeCat) && (
          <div className="mz-filter-bar">
            {keyword ? (
              <span className="text-sm text-[var(--mz-text-50)]">
                搜索：{keyword}
              </span>
            ) : null}
            {activeCat ? (
              <span className="text-sm text-[var(--mz-text-50)]">
                分类：{activeCat}
              </span>
            ) : null}
            <button
              type="button"
              className="mz-tag"
              onClick={() => setSearchParams({})}
            >
              清除筛选
            </button>
          </div>
        )}
        {loading ? (
          <div className="mz-empty">
            <Spinner className="mx-auto size-6" />
          </div>
        ) : list.length === 0 ? (
          <div className="mz-empty">还没有公开文章</div>
        ) : (
          <div className="mz-post-list">
            {list.map((a) => (
              <Link
                key={a.id}
                to={`/blog/${username}/${a.slug}`}
                className={cn('mz-post-card', a.coverUrl && 'has-cover')}
              >
                <div className="mz-post-body">
                  <h2 className="mz-post-title">{a.title}</h2>
                  <div className="mz-post-meta">
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon />
                      <time>
                        {formatDateSlash(a.publishedAt || a.createdAt)}
                      </time>
                    </span>
                    {catName(a.categoryId) ? (
                      <span className="inline-flex items-center gap-1">
                        <FolderOpenIcon />
                        {catName(a.categoryId)}
                      </span>
                    ) : null}
                    {a.requiresPassword ? (
                      <span className="text-xs opacity-70">密码</span>
                    ) : null}
                  </div>
                  {a.summary ? (
                    <div className="mz-post-excerpt">
                      <MarkdownSummary content={a.summary} />
                    </div>
                  ) : null}
                  {!a.coverUrl ? (
                    <span className="mz-post-enter" aria-hidden>
                      <ChevronRightIcon className="size-7" />
                    </span>
                  ) : null}
                </div>
                {a.coverUrl ? (
                  <span className="mz-post-cover">
                    <img src={a.coverUrl} alt="" loading="lazy" />
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
        {pages > 1 && (
          <div className="mz-pagination">
            <button
              type="button"
              className="mz-page-btn"
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(page - 1))
                setSearchParams(next)
              }}
            >
              上一页
            </button>
            <span className="mz-page-btn is-active">{page}</span>
            <span className="text-sm text-[var(--mz-text-50)]">/ {pages}</span>
            <button
              type="button"
              className="mz-page-btn"
              disabled={page >= pages}
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(page + 1))
                setSearchParams(next)
              }}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    )
  }

  // ---------- simple (简约) ----------
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          {author?.avatar ? (
            <img
              src={author.avatar}
              alt=""
              className="size-16 rounded-full border object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {(author?.name || username).slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {author?.name || username}
            </h1>
            <p className="text-sm text-muted-foreground">@{username}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              共 {total} 篇文章
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const next = new URLSearchParams(searchParams)
            if (q.trim()) next.set('q', q.trim())
            else next.delete('q')
            next.delete('page')
            setSearchParams(next)
          }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索文章标题…"
            className="max-w-sm"
          />
          <Button type="submit" variant="secondary">
            搜索
          </Button>
        </form>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <CatChip
              active={!categoryId}
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.delete('categoryId')
                next.delete('page')
                setSearchParams(next)
              }}
            >
              全部
            </CatChip>
            {categories.map((c) => (
              <CatChip
                key={c.id}
                active={categoryId === c.id}
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.set('categoryId', String(c.id))
                  next.delete('page')
                  setSearchParams(next)
                }}
              >
                {c.name}
              </CatChip>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          还没有公开文章
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((a) => (
            <li key={a.id}>
              <Link
                to={`/blog/${username}/${a.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                {a.coverUrl ? (
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={a.coverUrl}
                      alt=""
                      className="size-full object-cover transition-transform duration-200 ease-out motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <time>{formatDate(a.publishedAt || a.createdAt)}</time>
                    {a.requiresPassword && (
                      <span className="rounded bg-muted px-1.5 py-0.5">密码</span>
                    )}
                  </div>
                  <h2 className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-primary">
                    {a.title}
                  </h2>
                  {a.summary ? (
                    <div className="line-clamp-2 flex-1 text-sm text-muted-foreground">
                      <MarkdownSummary content={a.summary} />
                    </div>
                  ) : null}
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
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.set('page', String(page - 1))
              setSearchParams(next)
            }}
          >
            上一页
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.set('page', String(page + 1))
              setSearchParams(next)
            }}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-xs transition',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}
