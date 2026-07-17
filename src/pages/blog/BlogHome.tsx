import { useEffect, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { EyeIcon, HeartIcon, MessageCircleIcon } from 'lucide-react'
import { listBlogByUsername, listBlogCategories } from '@/api/blog'
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

export function BlogHome() {
  const { username, author } = useOutletContext<BlogOutletContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = Number(searchParams.get('categoryId') || 0) || undefined
  const keyword = (searchParams.get('q') || '').trim()
  const page = Math.max(1, Number(searchParams.get('page') || 1))

  const [list, setList] = useState<BlogArticle[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState(keyword)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [art, cats] = await Promise.all([
        listBlogByUsername({
          username,
          page,
          pageSize: 12,
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
  }, [username, page, categoryId, keyword])

  const pageSize = 12
  const pages = Math.max(1, Math.ceil(total / pageSize))

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
                      className="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
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
                    <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
                      {a.summary}
                    </p>
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
