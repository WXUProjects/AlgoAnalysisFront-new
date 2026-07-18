import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
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
  XIcon,
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
  recentPosts?: BlogArticle[]
  categories?: BlogCategory[]
  showSidebar?: boolean
  /** Article TOC or other right-rail extras (desktop sidebar) */
  panelExtra?: ReactNode
  children: ReactNode
}

/**
 * Mizuki-inspired shell (Material Design 3 / Astro theme).
 * Source: https://github.com/LyraVoid/Mizuki
 * Heavy effects (sakura, banner carousel, waves, swup) intentionally omitted —
 * animation kept light–medium (hover, soft enter, sticky glass nav).
 */
export function MizukiShell({
  username,
  author,
  displayName,
  subtitle,
  socialLinks,
  isOwner,
  recentPosts = [],
  categories = [],
  showSidebar = true,
  panelExtra,
  children,
}: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const [showTop, setShowTop] = useState(false)
  const [searchHits, setSearchHits] = useState<BlogArticle[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 360)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
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
        pageSize: 10,
        keyword: kw,
      }).then((res) => {
        setSearchHits(res.data?.list || [])
        setSearching(false)
      })
    }, 280)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [q, searchOpen, username])

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
    setSearchOpen(false)
  }

  const hasSidebarContent =
    showSidebar &&
    (Boolean(panelExtra) ||
      recentPosts.length > 0 ||
      categories.length > 0 ||
      true) // profile always

  return (
    <div className={cn('mz-shell', isDark && 'dark')}>
      <BlogSubsiteBar username={username} variant="mizuki" />
      <div className="mz-top-row">
        <header className="mz-navbar" aria-label="导航">
          <div className="mz-nav-inner">
            <Link to={base} className="mz-brand">
              {author?.avatar ? (
                <img
                  src={author.avatar}
                  alt=""
                  className="mz-brand-avatar"
                  width={28}
                  height={28}
                />
              ) : (
                <span className="mz-brand-fallback">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="truncate">{displayName}</span>
            </Link>

            <nav className="mz-nav-links" aria-label="博客导航">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn('mz-nav-link', isActive && 'is-active')
                  }
                >
                  <item.icon className="size-3.5 opacity-70" />
                  {item.label}
                </NavLink>
              ))}
              {isOwner && (
                <a
                  href={manageHref}
                  {...BLOG_NEW_TAB_PROPS}
                  className="mz-nav-link"
                >
                  <SettingsIcon className="size-3.5 opacity-70" />
                  后台
                  <ExternalLinkIcon className="size-3 opacity-50" />
                </a>
              )}
            </nav>

            <div className="mz-nav-actions">
              <button
                type="button"
                className="mz-icon-btn"
                aria-label="搜索"
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen((v) => !v)}
              >
                {searchOpen ? (
                  <XIcon className="size-4" />
                ) : (
                  <SearchIcon className="size-4" />
                )}
              </button>
              <button
                type="button"
                className="mz-icon-btn"
                aria-label="切换明暗"
                title="切换明暗"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
              >
                <span className="text-[0.8rem] leading-none">◐</span>
              </button>
              <Link
                to="/blog-plaza"
                className="mz-icon-btn hidden sm:inline-flex"
                title="博客广场"
                aria-label="博客广场"
              >
                <NewspaperIcon className="size-4" />
              </Link>
              <Link
                to="/"
                className="mz-icon-btn hidden sm:inline-flex"
                title="返回主站"
                aria-label="返回主站"
              >
                <ArrowLeftIcon className="size-4" />
              </Link>
              <button
                type="button"
                className="mz-icon-btn md:hidden"
                aria-label="打开菜单"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <MenuIcon className="size-4" />
              </button>
            </div>
          </div>
        </header>

        <div className={cn('mz-mobile-menu', menuOpen && 'is-open')}>
          <div className="mz-mobile-panel">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn('mz-nav-link', isActive && 'is-active')
                }
              >
                <item.icon className="size-3.5 opacity-70" />
                {item.label}
              </NavLink>
            ))}
            {isOwner && (
              <a
                href={manageHref}
                {...BLOG_NEW_TAB_PROPS}
                className="mz-nav-link"
                onClick={() => setMenuOpen(false)}
              >
                <SettingsIcon className="size-3.5 opacity-70" />
                后台设置
              </a>
            )}
            <Link
              to="/blog-plaza"
              className="mz-nav-link"
              onClick={() => setMenuOpen(false)}
            >
              <NewspaperIcon className="size-3.5 opacity-70" />
              博客广场
            </Link>
            <Link
              to="/"
              className="mz-nav-link"
              onClick={() => setMenuOpen(false)}
            >
              <ArrowLeftIcon className="size-3.5 opacity-70" />
              返回主站
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div className="relative z-60">
            <form className="mz-search-panel" onSubmit={submitSearch}>
              <input
                ref={searchInputRef}
                className="mz-search-input"
                type="search"
                placeholder="搜索文章标题…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="搜索文章"
              />
              <div className="mz-search-hits">
                {searching ? (
                  <p className="px-2 py-3 text-sm text-[var(--mz-text-50)]">
                    搜索中…
                  </p>
                ) : q.trim() && searchHits.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-[var(--mz-text-50)]">
                    没有匹配的文章
                  </p>
                ) : (
                  searchHits.map((a) => (
                    <Link
                      key={a.id}
                      to={`${base}/${a.slug}`}
                      className="mz-search-hit"
                      onClick={() => setSearchOpen(false)}
                    >
                      {a.title}
                      {a.summary ? (
                        <span className="mt-0.5 block line-clamp-1 text-xs font-normal text-[var(--mz-text-50)]">
                          <MarkdownSummary content={a.summary} />
                        </span>
                      ) : null}
                    </Link>
                  ))
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="mz-main-wrap">
        <div className={cn('mz-grid', hasSidebarContent && 'has-sidebar')}>
          <main className="mz-content" aria-label="正文">
            {children}
          </main>

          {hasSidebarContent && (
            <aside className="mz-sidebar" aria-label="侧栏">
              <div className="mz-widget mz-profile-card">
                {author?.avatar ? (
                  <img
                    src={author.avatar}
                    alt=""
                    className="mz-profile-avatar"
                    width={88}
                    height={88}
                  />
                ) : (
                  <div className="mz-profile-avatar-fallback">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <p className="mz-profile-name">{displayName}</p>
                <p className="mz-profile-bio">
                  {subtitle || `@${username}`}
                </p>
                {socialLinks.length > 0 && (
                  <div className="mz-social-row">
                    {socialLinks.map((link, i) => (
                      <a
                        key={`${link.type}-${i}`}
                        href={link.url}
                        className="mz-social-btn"
                        aria-label={socialAriaLabel(link)}
                        title={socialAriaLabel(link)}
                        target={link.type === 'email' ? undefined : '_blank'}
                        rel={
                          link.type === 'email'
                            ? undefined
                            : 'noopener noreferrer'
                        }
                      >
                        <SocialIcon type={link.type} />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {panelExtra}

              {recentPosts.length > 0 && (
                <div className="mz-widget">
                  <h2 className="mz-widget-title">最近更新</h2>
                  <ul className="mz-panel-list">
                    {recentPosts.slice(0, 6).map((a) => (
                      <li key={a.id}>
                        <Link to={`${base}/${a.slug}`}>{a.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {categories.length > 0 && (
                <div className="mz-widget">
                  <h2 className="mz-widget-title">分类</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="mz-tag"
                        onClick={() => {
                          navigate({
                            pathname: base,
                            search: `?categoryId=${c.id}`,
                          })
                        }}
                      >
                        {c.name}
                        {c.articleCount != null
                          ? ` · ${c.articleCount}`
                          : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      <BlogSiteFooter
        themeId="mizuki"
        displayName={displayName}
        username={username}
      />

      <button
        type="button"
        className={cn('mz-back-top', showTop && 'is-visible')}
        aria-label="回到顶部"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ArrowUpIcon className="size-4" />
      </button>
    </div>
  )
}
