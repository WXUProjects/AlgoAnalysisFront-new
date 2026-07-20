import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  ArrowLeftIcon,
  BarChart3Icon,
  FolderOpenIcon,
  LayoutListIcon,
  PenLineIcon,
  SettingsIcon,
} from 'lucide-react'
import { getBlogActivationStatus, listBlogByUsername } from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { BlogActivateDialog } from '@/components/blog/blog-activate-dialog'
import { MobileNavBack } from '@/components/mobile-nav-back'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  blogThemeStyle,
  resolveBlogTheme,
  type BlogThemeContext,
} from '@/lib/blog-theme'
import { getHomePath } from '@/lib/home-path'
import { resolvePageTitle } from '@/lib/page-title'
import { cn } from '@/lib/utils'
import { MotionProvider } from '@/motion/MotionContext'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogAuthor } from '@shared/api'

/**
 * Standalone blog admin shell（后台设置：文章 / 外观等）.
 * Opened in a new tab from the public blog; links back to blog / main site stay in this tab.
 */
export function BlogAdminLayout() {
  const { username = '' } = useParams<{ username: string }>()
  const { pathname } = useLocation()
  const { isLogin, user, ready } = useAuth()
  const navigate = useNavigate()

  const [author, setAuthor] = useState<BlogAuthor | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [theme, setTheme] = useState<BlogThemeContext>(() =>
    resolveBlogTheme({ themeId: 'simple' }),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [needAgreement, setNeedAgreement] = useState(false)
  const [activateOpen, setActivateOpen] = useState(false)

  const refreshMeta = useCallback(async () => {
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
    setTheme(
      resolveBlogTheme({
        themeId: res.data.themeId,
        subtitle: res.data.subtitle,
        socialLinks: res.data.socialLinks,
        enabled: res.data.themeEnabled,
      }),
    )
    if (res.data.isOwner && isLogin) {
      const act = await getBlogActivationStatus()
      const need = !(act.success && act.data?.activated)
      setNeedAgreement(need)
      if (need) setActivateOpen(true)
    } else {
      setNeedAgreement(false)
    }
  }, [username, isLogin])

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
  }, [username, ready, isLogin, user?.userId, refreshMeta])

  const displayName = author?.name || author?.username || username
  const base = `/blog/${username}`
  const manage = `${base}/manage`
  const homeTo = getHomePath(ready ? isLogin : false)
  const pageTitle = resolvePageTitle(pathname) || '博客管理'
  useDocumentTitle(pageTitle, displayName || '博客')

  const outletCtx: BlogOutletContext = useMemo(
    () => ({
      username,
      author,
      isOwner,
      theme,
      categories: [],
      recentPosts: [],
      refreshMeta,
      setBreadcrumb: () => {},
      setShowPanel: () => {},
      setPanelExtra: () => {},
    }),
    [username, author, isOwner, theme, refreshMeta],
  )

  const tabs = [
    { to: manage, end: true, label: '文章', icon: LayoutListIcon },
    { to: `${manage}/new`, label: '写文章', icon: PenLineIcon },
    { to: `${manage}/analytics`, label: '数据', icon: BarChart3Icon },
    { to: `${manage}/categories`, label: '分类', icon: FolderOpenIcon },
    { to: `${manage}/settings`, label: '外观', icon: SettingsIcon },
  ]

  return (
    <MotionProvider>
      <TooltipProvider delayDuration={300}>
        <div
          className="flex min-h-svh flex-col bg-background text-foreground"
          style={blogThemeStyle(theme)}
          data-blog-admin="1"
        >
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-3">
              <MobileNavBack />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  后台设置 · {displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{username}
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link to={base}>
                  <ArrowLeftIcon className="size-3.5" />
                  打开博客
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to={homeTo}>回主站</Link>
              </Button>
            </div>
            <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <t.icon className="size-3.5" />
                  {t.label}
                </NavLink>
              ))}
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
                <Button variant="outline" onClick={() => navigate(homeTo)}>
                  回主站首页
                </Button>
              </div>
            ) : needAgreement ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <p className="mb-2 font-medium">开通个人博客前须签署协议</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  请阅读并同意开通协议后，才能管理文章与外观。不同意则无法开通。
                </p>
                <Button onClick={() => setActivateOpen(true)}>阅读并签署协议</Button>
              </div>
            ) : (
              <Outlet context={outletCtx} />
            )}
          </main>
          <BlogActivateDialog
            open={activateOpen}
            onOpenChange={setActivateOpen}
            onActivated={() => {
              setNeedAgreement(false)
              void refreshMeta()
            }}
          />
          <Toaster />
        </div>
      </TooltipProvider>
    </MotionProvider>
  )
}
