import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { FolderOpenIcon } from 'lucide-react'
import { listBlogCategories } from '@/api/blog'
import { Spinner } from '@/components/ui/spinner'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogCategory } from '@shared/api'

/** Public categories page (Chirpy 分类) */
export function BlogCategoriesPublicPage() {
  const { username, theme } = useOutletContext<BlogOutletContext>()
  const [list, setList] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await listBlogCategories(username)
      if (cancelled) return
      setList(res.data || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [username])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (theme.themeId === 'mizuki') {
    return (
      <div>
        <h1 className="mz-page-title">分类</h1>
        {list.length === 0 ? (
          <div className="mz-empty">暂无分类</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((c) => (
              <Link
                key={c.id}
                to={`/blog/${username}?categoryId=${c.id}`}
                className="mz-cat-card"
              >
                <span className="inline-flex items-center gap-2">
                  <FolderOpenIcon className="size-4 opacity-70" />
                  {c.name}
                </span>
                <span>{c.articleCount ?? 0} 篇</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (theme.themeId === 'chirpy') {
    return (
      <div className="px-1 pt-6">
        <h1 className="mb-6 text-2xl font-bold text-[var(--heading-color)]">
          分类
        </h1>
        {list.length === 0 ? (
          <div className="chirpy-empty">暂无分类</div>
        ) : (
          <div className="space-y-3">
            {list.map((c) => (
              <Link
                key={c.id}
                to={`/blog/${username}?categoryId=${c.id}`}
                className="chirpy-cat-card block transition hover:opacity-90"
              >
                <div className="chirpy-cat-header">
                  <FolderOpenIcon className="size-4 opacity-70" />
                  {c.name}
                  <span>{c.articleCount ?? 0} 篇</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">分类</h1>
      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          暂无分类
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                to={`/blog/${username}?categoryId=${c.id}`}
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 hover:border-primary/40"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-muted-foreground">
                  {c.articleCount ?? 0} 篇
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
