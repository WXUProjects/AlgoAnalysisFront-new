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

/**
 * 固定底栏总高度（内容 h-14 + 底部安全区）。
 * 用于内容区 / 页脚留白，避免备案号等被挡住。
 */
export const MAIN_BOTTOM_NAV_OFFSET =
  'calc(3.5rem + env(safe-area-inset-bottom, 0px))'

/** 移动端滚动内容底部占位（与固定底栏等高） */
export function MainBottomNavSpacer({ className }: { className?: string }) {
  return (
    <div
      data-main-bottom-nav-spacer=""
      className={cn('shrink-0 md:hidden', className)}
      style={{ height: MAIN_BOTTOM_NAV_OFFSET }}
      aria-hidden
    />
  )
}

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

/** 「更多」匹配路径（/admin 不在其中：staff 有独立管理入口） */
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
 * /admin 归底栏管理入口，不触发 More；/contest 始终在底栏，不归 More。
 * /about 仅登录态归 More（未登录时「关于」占首页位）。
 */
function isMoreActive(
  pathname: string,
  sheetOpen: boolean,
  isLogin: boolean,
): boolean {
  if (sheetOpen) return true
  if (isLogin && pathname.startsWith('/about')) return true
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

type RenderItem =
  | { kind: 'link'; item: BottomNavItem }
  | { kind: 'about' }
  | { kind: 'admin'; label: string }
  | { kind: 'more' }

/**
 * 移动端全局底部导航栏（仅 md:hidden）。
 *
 * 已登录普通成员 5 Tab：首页 / 发现 / 比赛 / 题库 / 更多
 * 已登录 staff 6 Tab：首页 / 发现 / 比赛 / 题库 / 管理 / 更多
 *   管理入口在题库右侧；文案按角色：站点管理 > 组织管理 > 教练管理 > 队长管理
 * 未登录 5 Tab：关于 / 发现 / 比赛 / 题库 / 更多
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
  const moreActive = isMoreActive(pathname, sheetOpen, isLogin)

  const adminLabel = bottomNavStaffLabel({
    isSiteAdmin,
    orgRole: isOrgAdmin
      ? 'org_admin'
      : isCoach
        ? 'coach'
        : isCaptain
          ? 'captain'
          : undefined,
  })

  const items: RenderItem[] = []
  for (const item of BOTTOM_ITEMS) {
    if (item.loginOnly && !isLogin) {
      items.push({ kind: 'about' })
      continue
    }
    items.push({ kind: 'link', item })
  }
  // staff：在题库右侧、更多左侧插入管理入口（比赛始终居中保留）
  if (isStaff) {
    items.push({ kind: 'admin', label: adminLabel })
  }
  items.push({ kind: 'more' })

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
        {items.map((entry) => {
          if (entry.kind === 'about') {
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

          if (entry.kind === 'admin') {
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
                <span className="max-w-full truncate px-0.5">{entry.label}</span>
                {adminActive && (
                  <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-foreground" />
                )}
              </NavLink>
            )
          }

          if (entry.kind === 'more') {
            return (
              <button
                key="more"
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
            )
          }

          const { to, icon: Icon, label, matchExact, extraPatterns } = entry.item
          const active = matchExact
            ? pathname === to
            : pathname.startsWith(to) ||
              (extraPatterns?.some((p) => pathname.startsWith(p)) ?? false)
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
      </div>
    </nav>
  )
}
