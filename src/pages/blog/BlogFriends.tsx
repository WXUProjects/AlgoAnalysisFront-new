import { Navigate, useOutletContext } from 'react-router-dom'
import { MarkdownBody } from '@/components/markdown-body'
import type { BlogOutletContext } from '@/layouts/BlogLayout'

export function BlogFriendsPage() {
  const { username, theme } = useOutletContext<BlogOutletContext>()
  const md = theme.friendsMd.trim()

  if (!md) {
    return <Navigate to={`/blog/${username}`} replace />
  }

  if (theme.themeId === 'chirpy') {
    return (
      <article className="chirpy-article px-1 pt-6">
        <header>
          <h1>友链</h1>
        </header>
        <div className="chirpy-prose">
          <MarkdownBody content={md} enableLightbox />
        </div>
      </article>
    )
  }

  if (theme.themeId === 'mizuki') {
    return (
      <article className="mz-article">
        <h1>友链</h1>
        <div className="mz-prose">
          <MarkdownBody content={md} enableLightbox />
        </div>
      </article>
    )
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold">友链</h1>
      <MarkdownBody content={md} enableLightbox />
    </div>
  )
}
