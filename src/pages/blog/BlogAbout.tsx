import { Link, useOutletContext } from 'react-router-dom'
import type { BlogOutletContext } from '@/layouts/BlogLayout'

export function BlogAboutPage() {
  const { username, author, theme } = useOutletContext<BlogOutletContext>()
  const name = author?.name || username

  if (theme.themeId === 'chirpy') {
    return (
      <article className="chirpy-article px-1 pt-6">
        <header>
          <h1>关于</h1>
        </header>
        <div className="chirpy-prose">
          <div className="mb-6 flex items-center gap-4">
            {author?.avatar ? (
              <img
                src={author.avatar}
                alt=""
                className="size-20 rounded-full"
                style={{ boxShadow: 'var(--avatar-border-color) 0 0 0 2px' }}
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full bg-[var(--sidebar-bg)] text-2xl font-bold">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xl font-semibold text-[var(--heading-color)]">
                {name}
              </p>
              <p className="text-[var(--text-muted-color)]">@{username}</p>
            </div>
          </div>
          {theme.subtitle ? <p>{theme.subtitle}</p> : null}
          <p>
            这是 <strong>{name}</strong> 在本站的个人博客。你可以在
            <Link to={`/blog/${username}`}>首页</Link>
            浏览全部文章，或前往
            <Link to="/blog-plaza">博客广场</Link>
            发现更多作者。
          </p>
          {theme.socialLinks.length > 0 ? (
            <p>
              侧栏底部可以找到作者留下的外链。
            </p>
          ) : null}
        </div>
      </article>
    )
  }

  if (theme.themeId === 'mizuki') {
    return (
      <article className="mz-article">
        <h1>关于</h1>
        <div className="mz-prose">
          <div className="mb-6 flex items-center gap-4">
            {author?.avatar ? (
              <img
                src={author.avatar}
                alt=""
                className="size-20 rounded-[1.1rem] object-cover"
                style={{ boxShadow: '0 0 0 3px var(--mz-btn-bg)' }}
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-[1.1rem] bg-[var(--mz-btn-bg)] text-2xl font-bold text-[var(--mz-primary)]">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xl font-semibold text-[var(--mz-text-90)]">
                {name}
              </p>
              <p className="text-[var(--mz-text-50)]">@{username}</p>
            </div>
          </div>
          {theme.subtitle ? <p>{theme.subtitle}</p> : null}
          <p>
            这是 <strong>{name}</strong> 在本站的个人博客。你可以在
            <Link to={`/blog/${username}`}>首页</Link>
            浏览全部文章，或前往
            <Link to="/blog-plaza">博客广场</Link>
            发现更多作者。
          </p>
          {theme.socialLinks.length > 0 ? (
            <p>右侧资料卡可以找到作者留下的外链。</p>
          ) : null}
        </div>
      </article>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold">关于</h1>
      <div className="flex items-center gap-4">
        {author?.avatar ? (
          <img
            src={author.avatar}
            alt=""
            className="size-16 rounded-full border object-cover"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
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
