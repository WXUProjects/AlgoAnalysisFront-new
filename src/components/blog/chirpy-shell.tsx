import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  HomeIcon,
  InfoIcon,
  MenuIcon,
  NewspaperIcon,
  SearchIcon,
  SettingsIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { listBlogByUsername } from '@/api/blog'
import { SocialIcon, socialAriaLabel } from '@/components/blog/blog-social-icons'
import { BlogSiteFooter } from '@/components/blog/blog-site-footer'
import { BlogSubsiteBar } from '@/components/blog/blog-subsite-bar'
import { MarkdownSummary } from '@/components/markdown-summary'
import { BLOG_NEW_TAB_PROPS } from '@/lib/blog-nav'
import { cn } from '@/lib/utils'
import type { BlogSocialLink } from '@/lib/blog-theme'
import type { BlogArticle, BlogAuthor, BlogCategory } from '@shared/api'

type Props = {
  username: string
  author: BlogAuthor | null
  displayName: string
  subtitle: string
  socialLinks: BlogSocialLink[]
  isOwner: boolean
  breadcrumb: { label: string; to?: string }[]
  recentPosts?: BlogArticle[]
  categories?: BlogCategory[]
  showPanel?: boolean
  /** Extra panel content (e.g. article TOC) */
  panelExtra?: ReactNode
  children: ReactNode
}

export function ChirpyShell({
  username,
  author,
  displayName,
  subtitle,
  socialLinks,
  isOwner,
  breadcrumb,
  recentPosts = [],
  categories = [],
  showPanel = true,
  panelExtra,
  children,
}: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [showTop, setShowTop] = useState(false)
  const [searchHits, setSearchHits] = useState<BlogArticle[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!searchMode) return
    searchInputRef.current?.focus()
  }, [searchMode])

  // Live search (Chirpy SimpleJekyllSearch-like)
  useEffect(() => {
    if (!searchMode) return
    const kw = q.trim()
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!kw) {
      setSearchHits([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimer.current = setTimeout(() => {
      void listBlogByUsername({
        username,
        page: 1,
        pageSize: 12,
        keyword: kw,
      }).then((res) => {
        setSearchHits(res.data?.list || [])
        setSearching(false)
      })
    }, 280)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [q, searchMode, username])

  const base = `/blog/${username}`
  const navItems = useMemo(
    () => [
      { to: base, end: true, label: '首页', icon: HomeIcon },
      { to: `${base}/categories`, label: '分类', icon: FolderOpenIcon },
      { to: `${base}/archives`, label: '归档', icon: ArchiveIcon },
      { to: `${base}/about`, label: '关于', icon: InfoIcon },
    ],
    [base],
  )

  const manageHref = `${base}/manage`

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    navigate({ pathname: base, search: next.toString() ? `?${next}` : '' })
    setSearchMode(false)
    setSearchOpen(false)
  }

  function closeSearch() {
    setSearchMode(false)
    setSearchOpen(false)
    setQ(searchParams.get('q') || '')
    setSearchHits([])
  }

  return (
    <div
      className={cn('chirpy-shell', isDark && 'dark')}
      data-sidebar-open={sidebarOpen ? '1' : '0'}
      data-search-mode={searchMode ? '1' : '0'}
    >
      <BlogSubsiteBar
        username={username}
        variant="chirpy"
        className="sticky top-0 z-50"
      />
      <button
        type="button"
        className="chirpy-mask"
        aria-label="关闭侧栏"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className="chirpy-sidebar" aria-label="侧栏">
        <header className="chirpy-profile">
          <Link to={base} className="chirpy-avatar" id="avatar">
            {author?.avatar ? (
              <img src={author.avatar} alt="" width={112} height={112} />
            ) : (
              <span className="flex size-full items-center justify-center text-2xl font-bold text-[var(--sidebar-muted-color)]">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </Link>
          <Link to={base} className="chirpy-site-title">
            {displayName}
          </Link>
          {subtitle ? (
            <p className="chirpy-site-subtitle">{subtitle}</p>
          ) : null}
        </header>

        <nav className="w-full flex-1">
          <ul className="chirpy-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn('chirpy-nav-item block', isActive && 'is-active')
                }
              >
                <span className="chirpy-nav-link">
                  <item.icon />
                  <span>{item.label}</span>
                </span>
              </NavLink>
            ))}
            {isOwner && (
              <a
                href={manageHref}
                {...BLOG_NEW_TAB_PROPS}
                className="chirpy-nav-item block"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="chirpy-nav-link">
                  <SettingsIcon />
                  <span>后台设置</span>
                  <ExternalLinkIcon className="ml-auto size-3 opacity-50" />
                </span>
              </a>
            )}
          </ul>
        </nav>

        <div className="chirpy-sidebar-bottom">
          <button
            type="button"
            className="chirpy-icon-btn"
            aria-label="切换明暗"
            title="切换明暗"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            <span className="text-[0.7rem] leading-none">◐</span>
          </button>
          {socialLinks.length > 0 && (
            <span className="chirpy-icon-border" aria-hidden />
          )}
          {socialLinks.map((link, i) => (
            <a
              key={`${link.type}-${i}`}
              href={link.url}
              className="chirpy-icon-btn"
              aria-label={socialAriaLabel(link)}
              title={socialAriaLabel(link)}
              target={link.type === 'email' ? undefined : '_blank'}
              rel={link.type === 'email' ? undefined : 'noopener noreferrer'}
            >
              <SocialIcon type={link.type} />
            </a>
          ))}
        </div>
      </aside>

      <div className="chirpy-main-wrapper">
        <div className="chirpy-container">
          <header className="chirpy-topbar-wrapper" aria-label="顶栏">
            <div className="chirpy-topbar">
              {!searchMode && (
                <nav className="chirpy-breadcrumb" aria-label="面包屑">
                  {breadcrumb.map((b, i) =>
                    b.to && i < breadcrumb.length - 1 ? (
                      <span key={`${b.label}-${i}`}>
                        <Link to={b.to}>{b.label}</Link>
                      </span>
                    ) : (
                      <span key={`${b.label}-${i}`}>{b.label}</span>
                    ),
                  )}
                </nav>
              )}

              <button
                type="button"
                className="chirpy-topbar-btn"
                aria-label="打开侧栏"
                onClick={() => setSidebarOpen(true)}
              >
                <MenuIcon className="size-5" />
              </button>

              {!searchMode && (
                <div className="chirpy-topbar-title">{displayName}</div>
              )}

              <button
                type="button"
                className="chirpy-topbar-btn"
                aria-label="搜索"
                onClick={() => {
                  setSearchMode(true)
                  setSearchOpen(true)
                }}
              >
                <SearchIcon className="size-5" />
              </button>

              <form
                className={cn(
                  'chirpy-search-wrap',
                  (searchOpen || searchMode) && 'is-open',
                )}
                id="search"
                onSubmit={submitSearch}
              >
                <div className="chirpy-search-field">
                  <SearchIcon />
                  <input
                    ref={searchInputRef}
                    className="chirpy-search-input"
                    type="search"
                    placeholder="搜索..."
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value)
                      setSearchMode(true)
                    }}
                    onFocus={() => setSearchMode(true)}
                    aria-label="搜索文章"
                  />
                </div>
                <button
                  type="button"
                  className="chirpy-search-cancel"
                  onClick={closeSearch}
                >
                  取消
                </button>
              </form>

              {!searchMode && (
                <div className="ml-auto hidden items-center gap-2 sm:flex">
                  <Link
                    to="/blog-plaza"
                    className="inline-flex items-center gap-1 text-sm text-[var(--text-muted-color)] hover:text-[var(--link-hover)]"
                    title="博客广场"
                  >
                    <NewspaperIcon className="size-3.5" />
                    <span className="hidden lg:inline">广场</span>
                  </Link>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1 text-sm text-[var(--text-muted-color)] hover:text-[var(--link-hover)]"
                    title="返回主站"
                  >
                    <ArrowLeftIcon className="size-3.5" />
                    <span className="hidden lg:inline">主站</span>
                  </Link>
                </div>
              )}
            </div>
          </header>

          {searchMode ? (
            <div className="chirpy-search-results px-4 pb-10 pt-4">
              {categories.length > 0 && !q.trim() && (
                <section className="mb-6">
                  <h2 className="chirpy-panel-heading mb-3">热门分类</h2>
                  <div className="flex flex-wrap">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="chirpy-post-tag"
                        onClick={() => {
                          closeSearch()
                          navigate({
                            pathname: base,
                            search: `?categoryId=${c.id}`,
                          })
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {searching ? (
                <p className="chirpy-empty">搜索中…</p>
              ) : q.trim() && searchHits.length === 0 ? (
                <p className="chirpy-empty">搜索结果为空</p>
              ) : (
                <ul className="space-y-4">
                  {searchHits.map((a) => (
                    <li key={a.id}>
                      <Link
                        to={`${base}/${a.slug}`}
                        className="block rounded-[10px] p-3 transition hover:bg-[var(--sidebar-hover-bg)]"
                        onClick={closeSearch}
                      >
                        <h2 className="text-lg font-semibold text-[var(--heading-color)]">
                          {a.title}
                        </h2>
                        {a.summary ? (
                          <div className="mt-1 line-clamp-2 text-sm text-[var(--text-muted-color)]">
                            <MarkdownSummary content={a.summary} />
                          </div>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="chirpy-content-row">
              <main className="chirpy-main" aria-label="正文">
                {children}
              </main>

              {showPanel && (
                <aside className="chirpy-panel" aria-label="侧栏信息">
                  <div className="access">
                    {/* 文章页：只显示「文章内容」大纲，替换最近更新/分类 */}
                    {panelExtra ? (
                      panelExtra
                    ) : (
                      <>
                        {recentPosts.length > 0 && (
                          <section>
                            <h2 className="chirpy-panel-heading">最近更新</h2>
                            <ul className="chirpy-panel-list">
                              {recentPosts.slice(0, 5).map((a) => (
                                <li key={a.id}>
                                  <Link to={`${base}/${a.slug}`}>{a.title}</Link>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}
                        {categories.length > 0 && (
                          <section>
                            <h2 className="chirpy-panel-heading">分类</h2>
                            <div className="mt-3 mb-1 flex flex-wrap">
                              {categories.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="chirpy-post-tag"
                                  onClick={() => {
                                    const next = new URLSearchParams()
                                    next.set('categoryId', String(c.id))
                                    setSearchParams(next)
                                    navigate({
                                      pathname: base,
                                      search: `?${next}`,
                                    })
                                  }}
                                >
                                  {c.name}
                                </button>
                              ))}
                            </div>
                          </section>
                        )}
                      </>
                    )}
                  </div>
                </aside>
              )}
            </div>
          )}

          {!searchMode && (
            <div className="px-4">
              <BlogSiteFooter
                themeId="chirpy"
                displayName={displayName}
                username={username}
              />
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className={cn('chirpy-back-top', showTop && 'is-visible')}
        aria-label="回到顶部"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ArrowUpIcon className="size-4" />
      </button>
    </div>
  )
}
