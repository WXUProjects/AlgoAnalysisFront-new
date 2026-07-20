import { NavLink, useLocation } from 'react-router-dom'
import {
  ActivityIcon,
  BookOpenIcon,
  CalendarIcon,
  HomeIcon,
  InfoIcon,
  LayoutDashboardIcon,
  MoreHorizontalIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { bottomNavStaffLabel } from '@/lib/roles'

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

/** 非 staff 的 More 匹配路径（/admin 不在其中，因为非 staff 无管理入口） */
const MORE_ACTIVE_PATTERNS = [
  '/blog',
  '/bulletin',
  '/problemset',
  '/tools',
  '/p/',
  '/profile',
  '/org',
]

/**
 * 判断「更多」是否高亮。
 * staff：/admin 归底栏管理入口，不触发 More；/contest 归 More（不在底栏）。
 * 非 staff：/contest 归底栏，/admin 不可见。
 */
function isMoreActive(
  pathname: string,
  sheetOpen: boolean,
  isLogin: boolean,
  isStaff: boolean,
): boolean {
  if (sheetOpen) return true
  if (isLogin && pathname.startsWith('/about')) return true
  // staff 的比赛入口不在底栏，归 More
  if (isStaff && pathname.startsWith('/contest')) return true
  return MORE_ACTIVE_PATTERNS.some((p) => pathname.startsWith(p))
}

type Props = {
  isLogin: boolean
  isStaff: boolean
  isSiteAdmin: boolean
  isOrgAdmin: boolean
  isCoach: boolean
  isCaptain: boolean
  sheetOpen: boolean
  onMoreClick: () => void
}

/**
 * 移动端全局底部导航栏（仅 md:hidden），最多 5 个等宽入口。
 *
 * 已登录普通成员 5 Tab：首页 / 发现 / 比赛 / 题库 / 更多
 * 已登录 staff 5 Tab：首页 / 发现 / {管理入口} / 题库 / 更多
 *   管理入口文案按角色优先级：后台管理 > 组织管理 > 教练管理 > 队长管理
 * 未登录 5 Tab：首页(替换为 关于) / 发现 / 比赛 / 题库 / 更多
 *
 * Sheet 打开时更多按钮高亮；/about 仅登录态归 More。
 */
export function MainBottomNav({
  isLogin,
  isStaff,
  isSiteAdmin,
  isOrgAdmin,
  isCoach,
  isCaptain,
  sheetOpen,
  onMoreClick,
}: Props) {
  const { pathname } = useLocation()
  const moreActive = isMoreActive(pathname, sheetOpen, isLogin, isStaff)

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

          // staff：比赛位置替换为管理入口
          if (isStaff && to === '/contest') {
            const adminLabel = bottomNavStaffLabel({
              isSiteAdmin,
              orgRole: isOrgAdmin ? 'org_admin' : isCoach ? 'coach' : isCaptain ? 'captain' : undefined,
            })
            const adminActive = pathname.startsWith('/admin')
            return (
              <NavLink
                key="/admin"
                to="/admin"
                className={cn(
                  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md',
                  'text-[10px] transition-colors',
                  'min-h-[44px]',
                  adminActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground active:bg-muted/60',
                )}
                aria-current={adminActive ? 'page' : undefined}
              >
                <LayoutDashboardIcon
                  className={cn(
                    'size-5',
                    adminActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                />
                <span>{adminLabel}</span>
                {adminActive && (
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
