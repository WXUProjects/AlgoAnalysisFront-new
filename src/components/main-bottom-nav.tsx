import { NavLink, useLocation } from 'react-router-dom'
import {
  ActivityIcon,
  BookOpenIcon,
  CalendarIcon,
  HomeIcon,
  InfoIcon,
  MoreHorizontalIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type BottomNavItem = {
  to: string
  icon: typeof HomeIcon
  label: string
  loginOnly: boolean
  matchExact: boolean
  extraPatterns?: readonly string[]
}

const BOTTOM_ITEMS: readonly BottomNavItem[] = [
  { to: '/', icon: HomeIcon, label: '首页', loginOnly: true, matchExact: true },
  { to: '/discover', icon: ActivityIcon, label: '发现', loginOnly: false, matchExact: false, extraPatterns: ['/all-activities'] },
  { to: '/contest', icon: CalendarIcon, label: '比赛', loginOnly: false, matchExact: false },
  { to: '/question-bank', icon: BookOpenIcon, label: '题库', loginOnly: false, matchExact: false },
]

const MORE_ACTIVE_PATTERNS = [
  '/blog',
  '/bulletin',
  '/problemset',
  '/tools',
  '/p/',
  '/profile',
  '/admin',
  '/org',
]

/** /about 仅登录态归 More（未登录时 About 在底栏，不归 More） */
function isMoreActive(pathname: string, sheetOpen: boolean, isLogin: boolean): boolean {
  if (sheetOpen) return true
  if (isLogin && pathname.startsWith('/about')) return true
  return MORE_ACTIVE_PATTERNS.some((p) => pathname.startsWith(p))
}

type Props = {
  isLogin: boolean
  sheetOpen: boolean
  onMoreClick: () => void
}

/**
 * 移动端全局底部导航栏（仅 md:hidden）。
 * 已登录 5 Tab：首页 / 发现 / 比赛 / 题库 / 更多
 * 未登录 5 Tab：首页(替换为 关于) / 发现 / 比赛 / 题库 / 更多
 * Sheet 打开时更多按钮高亮；/about 仅登录态归 More。
 */
export function MainBottomNav({ isLogin, sheetOpen, onMoreClick }: Props) {
  const { pathname } = useLocation()
  const moreActive = isMoreActive(pathname, sheetOpen, isLogin)

  return (
    <nav
      data-main-bottom-nav=""
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 md:hidden',
        'border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80',
        'touch-manipulation',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch px-1">
        {BOTTOM_ITEMS.map(({ to, icon: Icon, label, loginOnly, matchExact, extraPatterns }) => {
          if (loginOnly && !isLogin) {
            const aboutActive = pathname.startsWith('/about')
            return (
              <NavLink
                key="/about"
                to="/about"
                className={cn(
                  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md',
                  'text-[10px] transition-colors',
                  'min-h-[44px]',
                  aboutActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground active:bg-muted/60',
                )}
                aria-current={aboutActive ? 'page' : undefined}
              >
                <InfoIcon
                  className={cn(
                    'size-5',
                    aboutActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                />
                <span>关于</span>
                {aboutActive && (
                  <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-foreground" />
                )}
              </NavLink>
            )
          }
          const active = matchExact
            ? pathname === to
            : pathname.startsWith(to) || (extraPatterns?.some((p) => pathname.startsWith(p)) ?? false)
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md',
                'text-[10px] transition-colors',
                'min-h-[44px]',
                active
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground active:bg-muted/60',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'size-5',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              />
              <span>{label}</span>
              {active && (
                <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-foreground" />
              )}
            </NavLink>
          )
        })}
        {/* 更多 */}
        <button
          type="button"
          onClick={onMoreClick}
          className={cn(
            'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md',
            'text-[10px] transition-colors',
            'min-h-[44px]',
            moreActive
              ? 'text-foreground font-medium'
              : 'text-muted-foreground active:bg-muted/60',
          )}
          aria-label="更多"
          aria-expanded={sheetOpen}
        >
          <MoreHorizontalIcon
            className={cn(
              'size-5',
              moreActive ? 'text-foreground' : 'text-muted-foreground',
            )}
          />
          <span>更多</span>
          {moreActive && (
            <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-foreground" />
          )}
        </button>
      </div>
    </nav>
  )
}
