import { Link } from 'react-router-dom'
import { useSiteConfig } from '@/site/SiteConfigContext'
import type { BlogThemeId } from '@/lib/blog-theme'

const DEFAULT_ICP = '苏ICP备2025217901号'
const ICP_URL = 'https://beian.miit.gov.cn/'
const MIZUKI_GITHUB = 'https://github.com/LyraVoid/Mizuki'

/**
 * Blog footer: uses main-site ICP (备案) from SiteConfig.
 * Chirpy layout mirrors jekyll-theme-chirpy footer; Mizuki credits upstream.
 */
export function BlogSiteFooter({
  themeId,
  displayName,
  username,
}: {
  themeId: BlogThemeId
  displayName: string
  username: string
}) {
  const { config } = useSiteConfig()
  const year = new Date().getFullYear()
  const icp = (config.footerIcp || '').trim() || DEFAULT_ICP
  const siteTitle = config.siteTitle || 'GoAlgo'

  if (themeId === 'chirpy') {
    return (
      <footer className="chirpy-footer" aria-label="站点信息">
        <div className="chirpy-footer-inner">
          <p>
            © <time>{year}</time>{' '}
            <Link to={`/blog/${username}`}>{displayName}</Link>
            <span className="mx-1">·</span>
            <a href={ICP_URL} target="_blank" rel="noreferrer">
              {icp}
            </a>
          </p>
          <p>
            主题 <span title="Chirpy">Chirpy</span>
            <span className="mx-1">·</span>
            <Link to="/">{siteTitle}</Link>
          </p>
        </div>
      </footer>
    )
  }

  if (themeId === 'mizuki') {
    return (
      <footer className="mz-footer" aria-label="站点信息">
        <p>
          © {year}{' '}
          <Link to={`/blog/${username}`}>{displayName}</Link>
          <span className="mx-1.5">·</span>
          <a href={ICP_URL} target="_blank" rel="noreferrer">
            {icp}
          </a>
        </p>
        <p className="mz-credit">
          主题适配自{' '}
          <a href={MIZUKI_GITHUB} target="_blank" rel="noopener noreferrer">
            LyraVoid/Mizuki
          </a>
          <span className="mx-1.5">·</span>
          <Link to="/">{siteTitle}</Link>
          <span className="mx-1.5">·</span>
          <Link to="/blog-plaza">博客广场</Link>
        </p>
      </footer>
    )
  }

  return (
    <footer className="border-t py-6 text-center text-xs text-muted-foreground">
      <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link to="/blog-plaza" className="hover:text-foreground">
          博客广场
        </Link>
        <span aria-hidden>·</span>
        <Link to="/" className="hover:text-foreground">
          返回 {siteTitle}
        </Link>
        <span aria-hidden>·</span>
        <a
          href={ICP_URL}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground"
        >
          {icp}
        </a>
      </span>
    </footer>
  )
}
