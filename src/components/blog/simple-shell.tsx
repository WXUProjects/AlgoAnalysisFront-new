import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  BookOpenIcon,
  ExternalLinkIcon,
  NewspaperIcon,
  SettingsIcon,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { BlogSiteFooter } from '@/components/blog/blog-site-footer'
import { BlogSubsiteBar } from '@/components/blog/blog-subsite-bar'
import { BLOG_NEW_TAB_PROPS } from '@/lib/blog-nav'
import { cn } from '@/lib/utils'

type Props = {
  username: string
  displayName: string
  isOwner: boolean
  children: ReactNode
}

/** Original shadcn top-bar blog shell（简约主题） */
export function SimpleShell({
  username,
  displayName,
  isOwner,
  children,
}: Props) {
  const manageHref = `/blog/${username}/manage`

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <BlogSubsiteBar username={username} variant="default" />
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link
            to={`/blog/${username}`}
            className="flex min-w-0 items-center gap-2 font-semibold tracking-tight"
          >
            <BookOpenIcon className="size-4 shrink-0 text-primary" />
            <span className="truncate">{displayName} 的博客</span>
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              asChild
            >
              <Link to="/blog-plaza">
                <NewspaperIcon className="size-3.5" />
                <span className="hidden sm:inline">博客广场</span>
              </Link>
            </Button>
            <ThemeToggle variant="button" />
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          <SimpleTab to={`/blog/${username}`} end>
            文章
          </SimpleTab>
          <SimpleTab to={`/blog/${username}/categories`}>分类</SimpleTab>
          <SimpleTab to={`/blog/${username}/archives`}>归档</SimpleTab>
          <SimpleTab to={`/blog/${username}/about`}>关于</SimpleTab>
          {isOwner && (
            <a
              href={manageHref}
              {...BLOG_NEW_TAB_PROPS}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <SettingsIcon className="size-3.5" />
              后台设置
              <ExternalLinkIcon className="size-3 opacity-60" />
            </a>
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <BlogSiteFooter
        themeId="simple"
        displayName={displayName}
        username={username}
      />
    </div>
  )
}

function SimpleTab({
  to,
  end,
  children,
}: {
  to: string
  end?: boolean
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      {children}
    </NavLink>
  )
}
