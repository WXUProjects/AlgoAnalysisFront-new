import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { listBlogByUsername } from '@/api/blog'
import { Spinner } from '@/components/ui/spinner'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogArticle } from '@shared/api'

type YearGroup = { year: number; items: { article: BlogArticle; month: number; day: number }[] }

export function BlogArchivesPage() {
  const { username, theme } = useOutletContext<BlogOutletContext>()
  const [list, setList] = useState<BlogArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      // pull enough for archives view
      const res = await listBlogByUsername({
        username,
        page: 1,
        pageSize: 100,
      })
      if (cancelled) return
      setList(res.data?.list || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [username])

  const groups = useMemo(() => {
    const map = new Map<number, YearGroup['items']>()
    for (const a of list) {
      const ts = (a.publishedAt || a.createdAt) * 1000
      const d = new Date(ts)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const day = d.getDate()
      if (!map.has(year)) map.set(year, [])
      map.get(year)!.push({ article: a, month, day })
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, items]) => ({ year, items }))
  }, [list])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (theme.themeId === 'mizuki') {
    return (
      <div className="mz-article" id="archives">
        <h1 className="mz-page-title">归档</h1>
        {groups.length === 0 ? (
          <div className="mz-empty">暂无文章</div>
        ) : (
          groups.map((g) => (
            <div key={g.year}>
              <div className="mz-archive-year">{g.year}</div>
              <ul className="mz-archive-list">
                {g.items.map(({ article: a, month, day }) => (
                  <li key={a.id}>
                    <span className="date">
                      {String(month).padStart(2, '0')}/
                      {String(day).padStart(2, '0')}
                    </span>
                    <Link to={`/blog/${username}/${a.slug}`}>{a.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    )
  }

  if (theme.themeId === 'chirpy') {
    return (
      <div className="chirpy-archives" id="archives">
        <h1 className="mb-4 text-2xl font-bold text-[var(--heading-color)]">
          归档
        </h1>
        {groups.length === 0 ? (
          <div className="chirpy-empty">暂无文章</div>
        ) : (
          groups.map((g) => (
            <div key={g.year}>
              <div className="year">{g.year}</div>
              <ul>
                {g.items.map(({ article: a, month, day }) => (
                  <li key={a.id}>
                    <span className="date">
                      {String(month).padStart(2, '0')}/
                      {String(day).padStart(2, '0')}
                    </span>
                    <Link to={`/blog/${username}/${a.slug}`}>{a.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">归档</h1>
      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          暂无文章
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.year} className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 font-semibold">{g.year}</h2>
            <ul className="space-y-1 text-sm">
              {g.items.map(({ article: a, month, day }) => (
                <li key={a.id} className="flex gap-3">
                  <span className="w-12 shrink-0 text-muted-foreground">
                    {String(month).padStart(2, '0')}/
                    {String(day).padStart(2, '0')}
                  </span>
                  <Link
                    to={`/blog/${username}/${a.slug}`}
                    className="hover:text-primary"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
