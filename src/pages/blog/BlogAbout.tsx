import { Link, useOutletContext } from 'react-router-dom'
import { MarkdownBody } from '@/components/markdown-body'
import type { BlogOutletContext } from '@/layouts/BlogLayout'

export function BlogAboutPage() {
  const { username, author, theme } = useOutletContext<BlogOutletContext>()
  const name = author?.name || username
  const custom = theme.aboutMd.trim()

  if (custom) {
    if (theme.themeId === 'chirpy') {
      return (
        <article className="chirpy-article px-1 pt-6">
          <header>
            <h1>关于</h1>
          </header>
          <div className="chirpy-prose">
            <MarkdownBody content={custom} enableLightbox />
          </div>
        </article>
      )
    }
    if (theme.themeId === 'mizuki') {
      return (
        <article className="mz-article">
          <h1>关于</h1>
          <div className="mz-prose">
            <MarkdownBody content={custom} enableLightbox />
          </div>
        </article>
      )
    }
    return (
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold">关于</h1>
        <MarkdownBody content={custom} enableLightbox />
      </div>
    )
  }

  if (theme.themeId === 'chirpy') {
    return (
      <article className="chirpy-article px-1 pt-6">
        <header>
          <h1>关于</h1>
        </header>
        {/* 作者信息必须在 prose 外：.chirpy-prose img 的 width/height:auto 会盖掉 size-* */}
        <div className="mb-4 flex items-center gap-3">
          {author?.avatar ? (
            <img
              src={author.avatar}
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-full object-cover"
              style={{ boxShadow: 'var(--avatar-border-color) 0 0 0 2px' }}
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-bg)] text-sm font-bold">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold text-[var(--heading-color)]">
              {name}
            </p>
            <p className="text-sm text-[var(--text-muted-color)]">
              @{username}
            </p>
          </div>
        </div>
        <div className="chirpy-prose">
          {theme.subtitle ? <p>{theme.subtitle}</p> : null}
          <p>
            这是 <strong>{name}</strong> 在本站的个人博客。你可以在
            <Link to={`/blog/${username}`}>首页</Link>
            浏览全部文章，或前往
            <Link to="/blog-plaza">博客广场</Link>
            浏览其他作者。
          </p>
        </div>
      </article>
    )
  }

  if (theme.themeId === 'mizuki') {
    return (
      <article className="mz-article">
        <h1>关于</h1>
        {/* 作者信息必须在 prose 外：.mz-prose img 的 width/height:auto 会盖掉 size-* */}
        <div className="mb-4 flex items-center gap-3">
          {author?.avatar ? (
            <img
              src={author.avatar}
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-[0.75rem] object-cover"
              style={{ boxShadow: '0 0 0 2px var(--mz-btn-bg)' }}
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-[var(--mz-btn-bg)] text-sm font-bold text-[var(--mz-primary)]">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold text-[var(--mz-text-90)]">
              {name}
            </p>
            <p className="text-sm text-[var(--mz-text-50)]">@{username}</p>
          </div>
        </div>
        <div className="mz-prose">
          {theme.subtitle ? <p>{theme.subtitle}</p> : null}
          <p>
            这是 <strong>{name}</strong> 在本站的个人博客。你可以在
            <Link to={`/blog/${username}`}>首页</Link>
            浏览全部文章，或前往
            <Link to="/blog-plaza">博客广场</Link>
            浏览其他作者。
          </p>
        </div>
      </article>
    )
  }

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold">关于</h1>
      <div className="flex items-center gap-3">
        {author?.avatar ? (
          <img
            src={author.avatar}
            alt=""
            className="size-12 rounded-full border object-cover"
          />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">@{username}</p>
        </div>
      </div>
      {theme.subtitle ? (
        <p className="text-muted-foreground">{theme.subtitle}</p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        这是 {name} 的个人博客。
        <Link to={`/blog/${username}`} className="text-primary hover:underline">
          返回文章列表
        </Link>
      </p>
    </div>
  )
}
