import { Link, useLocation } from 'react-router-dom'
import { ArrowLeftIcon, LogInIcon, SparklesIcon } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { useSiteConfig } from '@/site/SiteConfigContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'chirpy' | 'mizuki'

/**
 * 个人博客分站身份条：回主站 + 未登录去登录（SSO redirect 回当前页）
 * 三主题共用信息架构，视觉随 variant 微调。
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
  const { isLogin, ready, user } = useAuth()
  const { config } = useSiteConfig()
  const location = useLocation()
  const siteTitle = config.siteTitle || 'GoAlgo'
  const returnPath = location.pathname + location.search
  const loginHref = `/login?redirect=${encodeURIComponent(returnPath || `/blog/${username}`)}`

  return (
    <div
      className={cn(
        'blog-subsite-bar flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-xs sm:px-4 sm:text-sm',
        variant === 'default' &&
          'border-border bg-muted/50 text-muted-foreground',
        variant === 'chirpy' &&
          'border-[var(--main-border-color)] bg-[var(--sidebar-bg)] text-[var(--sidebar-muted-color)]',
        variant === 'mizuki' &&
          'border-[var(--mz-border)] bg-[var(--mz-card)]/80 text-[var(--mz-text-50)] backdrop-blur-md',
        className,
      )}
      role="region"
      aria-label="主站分站提示"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 font-medium',
            variant === 'default' && 'text-foreground',
            variant === 'chirpy' && 'text-[var(--heading-color)]',
            variant === 'mizuki' && 'text-[var(--mz-text)]',
          )}
        >
          <SparklesIcon className="size-3.5 shrink-0 opacity-80" />
          {siteTitle} · 个人博客分站
        </span>
        <span className="min-w-0 truncate opacity-90">
          主站分站的个人空间，之后人人可一键开通自己的博客
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant={variant === 'default' ? 'outline' : 'ghost'}
          size="sm"
          className={cn(
            'h-8 gap-1',
            variant !== 'default' && 'text-inherit hover:bg-black/5 dark:hover:bg-white/10',
          )}
          asChild
        >
          <Link to="/" title={`返回 ${siteTitle}`}>
            <ArrowLeftIcon className="size-3.5" />
            <span>返回主站</span>
          </Link>
        </Button>
        {ready && !isLogin ? (
          <Button size="sm" className="h-8 gap-1" asChild>
            <Link to={loginHref}>
              <LogInIcon className="size-3.5" />
              去登录
            </Link>
          </Button>
        ) : ready && isLogin ? (
          <span
            className={cn(
              'hidden max-w-[8rem] truncate text-xs sm:inline',
              variant === 'default' && 'text-muted-foreground',
            )}
            title={user?.username}
          >
            {user?.username}
          </span>
        ) : null}
      </div>
    </div>
  )
}
