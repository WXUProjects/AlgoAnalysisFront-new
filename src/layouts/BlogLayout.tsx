import { useEffect, useMemo, useState } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  ArrowLeftIcon,
  BarChart3Icon,
  BookOpenIcon,
  FolderOpenIcon,
  LogInIcon,
  NewspaperIcon,
  PenLineIcon,
} from 'lucide-react'
import { listBlogByUsername } from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  blogThemeStyle,
  resolveBlogTheme,
  type BlogThemeContext,
} from '@/lib/blog-theme'
import { cn } from '@/lib/utils'
import { MotionProvider } from '@/motion/MotionContext'
import type { BlogAuthor } from '@shared/api'

export type BlogOutletContext = {
  username: string
  author: BlogAuthor | null
  isOwner: boolean
  theme: BlogThemeContext
  refreshMeta: () => Promise<void>
}

/**
 * Independent blog shell — not AppLayout.
 * Return-to-main control + owner-only manage tabs; login → main site.
 */
export function BlogLayout() {
  const { username = '' } = useParams<{ username: string }>()
  const { isLogin, user, ready } = useAuth()
  const navigate = useNavigate()
  const [author, setAuthor] = useState<BlogAuthor | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [themeEnabled, setThemeEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshMeta = async () => {
    if (!username) return
    const res = await listBlogByUsername({ username, page: 1, pageSize: 1 })
    if (!res.success || !res.data) {
      setError(res.message || '找不到这个博客')
      setAuthor(null)
      setIsOwner(false)
      return
    }
    setError('')
    setAuthor(res.data.author)
    setIsOwner(res.data.isOwner)
    setThemeEnabled(res.data.themeEnabled)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refreshMeta()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- username / auth ready
  }, [username, ready, isLogin, user?.userId])

  const theme = useMemo(
    () => resolveBlogTheme({ enabled: themeEnabled }),
    [themeEnabled],
  )
  const themeStyle = blogThemeStyle(theme)

  const displayName = author?.name || author?.username || username
  const loginHref = `/login?redirect=${encodeURIComponent(`/blog/${username}`)}`

  const outletCtx: BlogOutletContext = {
    username,
    author,
    isOwner,
    theme,
    refreshMeta,
  }

  return (
    <MotionProvider>
      <TooltipProvider delayDuration={300}>
        <div
          className="flex min-h-svh flex-col bg-background text-foreground"
          style={themeStyle}
          data-blog-shell="1"
          data-blog-theme-enabled={theme.enabled ? '1' : '0'}
        >
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeftIcon className="size-3.5" />
                  <span className="hidden sm:inline">返回主站</span>
                </Button>
                <ThemeToggle />
                {!ready ? null : isLogin ? (
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {user?.username}
                  </span>
                ) : (
                  <Button variant="outline" size="sm" asChild className="gap-1.5">
                    <Link to={loginHref}>
                      <LogInIcon className="size-3.5" />
                      登录
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
              <BlogTab to={`/blog/${username}`} end>
                文章
              </BlogTab>
              {isOwner && (
                <>
                  <BlogTab to={`/blog/${username}/manage`}>
                    <PenLineIcon className="size-3.5" />
                    文章管理
                  </BlogTab>
                  <BlogTab to={`/blog/${username}/manage/analytics`}>
                    <BarChart3Icon className="size-3.5" />
                    数据
                  </BlogTab>
                  <BlogTab to={`/blog/${username}/manage/categories`}>
                    <FolderOpenIcon className="size-3.5" />
                    分类
                  </BlogTab>
                </>
              )}
            </nav>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <Spinner className="size-6" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                <p className="mb-4">{error}</p>
                <Button variant="outline" onClick={() => navigate('/')}>
                  回主站首页
                </Button>
              </div>
            ) : (
              <Outlet context={outletCtx} />
            )}
          </main>

          <footer className="border-t py-6 text-center text-xs text-muted-foreground">
            <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <Link to="/blog-plaza" className="hover:text-foreground">
                博客广场
              </Link>
              <span aria-hidden>·</span>
              <Link to="/" className="hover:text-foreground">
                返回 GoAlgo
              </Link>
            </span>
          </footer>
          <Toaster />
        </div>
      </TooltipProvider>
    </MotionProvider>
  )
}

function BlogTab({
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
