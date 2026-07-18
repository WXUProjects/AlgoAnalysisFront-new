import { Link, useLocation } from 'react-router-dom'
import { ArrowLeftIcon, LogInIcon } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { useSiteConfig } from '@/site/SiteConfigContext'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'chirpy' | 'mizuki'

/**
 * 轻量分站提示：不 sticky、不抢顶栏，仅文档流一行，避免遮挡原有控件。
 */
export function BlogSubsiteBar({
  username,
  variant = 'default',
  className,
}: {
  username: string
  variant?: Variant
  className?: string
}) {
  const { isLogin, ready } = useAuth()
  const { config } = useSiteConfig()
  const location = useLocation()
  const siteTitle = config.siteTitle || 'GoAlgo'
  const returnPath = location.pathname + location.search
  const loginHref = `/login?redirect=${encodeURIComponent(returnPath || `/blog/${username}`)}`

  return (
    <div
      className={cn(
        'blog-subsite-bar flex h-8 shrink-0 items-center justify-between gap-2 border-b px-3 text-[11px] leading-none sm:px-4 sm:text-xs',
        variant === 'default' &&
          'border-border bg-muted/40 text-muted-foreground',
        variant === 'chirpy' &&
          'border-[var(--main-border-color)] bg-[var(--sidebar-bg)] text-[var(--sidebar-muted-color)]',
        variant === 'mizuki' &&
          'border-[var(--mz-border)] bg-[var(--mz-card)]/70 text-[var(--mz-text-50)]',
        className,
      )}
      role="region"
      aria-label="主站分站提示"
    >
      <p className="min-w-0 truncate">
        <span
          className={cn(
            'font-medium',
            variant === 'default' && 'text-foreground',
            variant === 'chirpy' && 'text-[var(--heading-color)]',
            variant === 'mizuki' && 'text-[var(--mz-text)]',
          )}
        >
          {siteTitle} 分站
        </span>
      </p>
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        <span className="hidden max-w-[12rem] truncate opacity-80 sm:inline sm:max-w-none">
          人人可一键开通博客
        </span>
        <Link
          to="/"
          className="inline-flex items-center gap-0.5 font-medium underline-offset-2 hover:underline"
          title={`返回 ${siteTitle}`}
        >
          <ArrowLeftIcon className="size-3 opacity-70" />
          主站
        </Link>
        {ready && !isLogin ? (
          <Link
            to={loginHref}
            className="inline-flex items-center gap-0.5 font-medium underline-offset-2 hover:underline"
          >
            <LogInIcon className="size-3 opacity-70" />
            登录
          </Link>
        ) : null}
      </div>
    </div>
  )
}
