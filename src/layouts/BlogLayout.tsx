import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { listBlogByUsername, listBlogCategories } from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { ChirpyShell } from '@/components/blog/chirpy-shell'
import { MizukiShell } from '@/components/blog/mizuki-shell'
import { SimpleShell } from '@/components/blog/simple-shell'
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
import { resolvePageTitle } from '@/lib/page-title'
import { MotionProvider } from '@/motion/MotionContext'
import type {
  BlogArticle,
  BlogAuthor,
  BlogCategory,
} from '@shared/api'
import '@/styles/blog-chirpy.css'
import '@/styles/blog-mizuki.css'

export type BlogOutletContext = {
  username: string
  author: BlogAuthor | null
  isOwner: boolean
  theme: BlogThemeContext
  categories: BlogCategory[]
  recentPosts: BlogArticle[]
  refreshMeta: () => Promise<void>
  setBreadcrumb: (items: { label: string; to?: string }[]) => void
  setShowPanel: (show: boolean) => void
  /** Chirpy right-panel slot (e.g. article TOC) */
  setPanelExtra: (node: React.ReactNode) => void
}

/**
 * Independent blog shell — not AppLayout.
 * Default theme: Chirpy；可选简约 / Mizuki。
 */
export function BlogLayout() {
  const { username = '' } = useParams<{ username: string }>()
  const { isLogin, user, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [author, setAuthor] = useState<BlogAuthor | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [themeEnabled, setThemeEnabled] = useState(false)
  const [themeId, setThemeId] = useState<string>('chirpy')
  const [subtitle, setSubtitle] = useState('')
  const [socialLinks, setSocialLinks] = useState<
    BlogThemeContext['socialLinks']
  >([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [recentPosts, setRecentPosts] = useState<BlogArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [breadcrumb, setBreadcrumb] = useState<
    { label: string; to?: string }[]
  >([{ label: '首页' }])
  const [showPanel, setShowPanel] = useState(true)
  const [panelExtra, setPanelExtra] = useState<ReactNode>(null)

  const refreshMeta = useCallback(async () => {
    if (!username) return
    const [res, cats] = await Promise.all([
      listBlogByUsername({ username, page: 1, pageSize: 8 }),
      listBlogCategories(username),
    ])
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
    setThemeId(res.data.themeId || 'chirpy')
    setSubtitle(res.data.subtitle || '')
    setSocialLinks(res.data.socialLinks || [])
    setRecentPosts(res.data.list || [])
    setCategories(cats.data || [])
  }, [username])

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

  // default breadcrumb from path
  // Note: do NOT clear panelExtra on article routes — child owns TOC and parent
  // effects run after children, which used to wipe the outline every time.
  useEffect(() => {
    const base = `/blog/${username}`
    const path = location.pathname
    // Mizuki keeps profile sidebar on secondary pages; Chirpy hides right panel
    const secondaryPanel = themeId === 'mizuki'
    if (path === base || path === `${base}/`) {
      setBreadcrumb([{ label: '首页' }])
      setShowPanel(true)
      setPanelExtra(null)
      return
    }
    if (path.startsWith(`${base}/categories`)) {
      setBreadcrumb([
        { label: '首页', to: base },
        { label: '分类' },
      ])
      setShowPanel(secondaryPanel)
      setPanelExtra(null)
      return
    }
    if (path.startsWith(`${base}/archives`)) {
      setBreadcrumb([
        { label: '首页', to: base },
        { label: '归档' },
      ])
      setShowPanel(secondaryPanel)
      setPanelExtra(null)
      return
    }
    if (path.startsWith(`${base}/about`)) {
      setBreadcrumb([
        { label: '首页', to: base },
        { label: '关于' },
      ])
      setShowPanel(secondaryPanel)
      setPanelExtra(null)
      return
    }
    // article page — keep right panel; BlogArticle fills 文章内容 outline
    setShowPanel(true)
  }, [location.pathname, username, themeId])

  const theme = useMemo(
    () =>
      resolveBlogTheme({
        themeId,
        subtitle,
        socialLinks,
        enabled: themeEnabled,
      }),
    [themeId, subtitle, socialLinks, themeEnabled],
  )
  const themeStyle = blogThemeStyle(theme)
  const displayName = author?.name || author?.username || username
  const pageTitle = resolvePageTitle(location.pathname) || '博客'
  // 博客用博主名作品牌后缀，更易辨认标签页
  useDocumentTitle(pageTitle, displayName || '博客')

  const outletCtx: BlogOutletContext = {
    username,
    author,
    isOwner,
    theme,
    categories,
    recentPosts,
    refreshMeta,
    setBreadcrumb,
    setShowPanel,
    setPanelExtra,
  }

  const body = loading ? (
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
  )

  return (
    <MotionProvider>
      <TooltipProvider delayDuration={300}>
        <div
          style={themeStyle}
          data-blog-shell="1"
          data-blog-theme={theme.themeId}
          data-blog-theme-enabled={theme.enabled ? '1' : '0'}
        >
          {theme.themeId === 'chirpy' ? (
            <ChirpyShell
              username={username}
              author={author}
              displayName={displayName}
              subtitle={theme.subtitle}
              socialLinks={theme.socialLinks}
              isOwner={isOwner}
              breadcrumb={breadcrumb}
              recentPosts={recentPosts}
              categories={categories}
              showPanel={showPanel && !loading && !error}
              panelExtra={panelExtra}
            >
              {body}
            </ChirpyShell>
          ) : theme.themeId === 'mizuki' ? (
            <MizukiShell
              username={username}
              author={author}
              displayName={displayName}
              subtitle={theme.subtitle}
              socialLinks={theme.socialLinks}
              isOwner={isOwner}
              recentPosts={recentPosts}
              categories={categories}
              showSidebar={showPanel && !loading && !error}
              panelExtra={panelExtra}
            >
              {body}
            </MizukiShell>
          ) : (
            <SimpleShell
              username={username}
              displayName={displayName}
              isOwner={isOwner}
            >
              {body}
            </SimpleShell>
          )}
          <Toaster />
        </div>
      </TooltipProvider>
    </MotionProvider>
  )
}
