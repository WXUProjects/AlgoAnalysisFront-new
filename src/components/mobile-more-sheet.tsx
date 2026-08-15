import type { ComponentType, ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Building2Icon,
  ChevronRightIcon,
  InfoIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  LogInIcon,
  LogOutIcon,
  MegaphoneIcon,
  NewspaperIcon,
  TicketIcon,
  UserIcon,
  UserPlusIcon,
  WrenchIcon,
  type LucideProps,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ThemeModeStatus } from '@/components/theme-toggle'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  ADMIN_SECTION_TITLES,
  adminNavEntries,
  type AdminNavEntry,
  type AdminNavSection,
} from '@/lib/admin-nav'
import {
  orgRoleName,
  staffKindFromPayload,
  type StaffLabelPayload,
} from '@/lib/roles'
import { cn } from '@/lib/utils'

/** 组织后台入口文案（按 roles.ts 规则表；站管也进组织侧，不叫「站点管理」） */
function orgAdminHubLabel(payload?: StaffLabelPayload | null): string {
  const kind = staffKindFromPayload(payload)
  if (kind === 'coach') return '教练工作台'
  if (kind === 'captain') return '队长工作台'
  // 团队管理员 / 站管 / 自定义角色：明确是「当前组织」后台，避免和站点管理混淆
  return '组织工作台'
}

/** 组织管理分区标题：永远带「组织管理」前缀 */
function orgManageSectionTitle(
  orgName?: string | null,
  payload?: StaffLabelPayload | null,
): string {
  const kind = staffKindFromPayload(payload)
  const roleHint =
    kind === 'siteAdmin'
      ? '站管视角'
      : kind === 'orgAdmin' || kind === 'coach' || kind === 'captain'
        ? orgRoleName(payload?.orgRole)
        : null
  const name = orgName?.trim()
  if (name && roleHint) return `组织管理 · ${name}（${roleHint}）`
  if (name) return `组织管理 · ${name}`
  if (roleHint) return `组织管理（${roleHint}）`
  return '组织管理'
}

type IconType = ComponentType<LucideProps>

export type MobileMoreLink = {
  to: string
  label: string
  icon: IconType
  /** 精确匹配路由（默认前缀匹配） */
  end?: boolean
  match?: (pathname: string) => boolean
  /** 命中任一权限才显示（与 src/router.tsx 路由守卫一致）；缺省不限制 */
  anyOf?: string[]
  /** 显示待处理小红点（如「服务」待回复） */
  badge?: boolean
}

export type MobileMoreSection = {
  title?: string
  /** grid：四列图标宫格；list：iOS 设置式分组列表 */
  layout?: 'grid' | 'list'
  items: MobileMoreLink[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: MobileMoreSection[]
  /** 底部操作区（主题 / 登录退出等） */
  footer?: ReactNode
}

function linkActive(pathname: string, item: MobileMoreLink): boolean {
  if (item.match) return item.match(pathname)
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/**
 * 移动端「更多」：自底部上拉的 Sheet（Apple 风格 grabber + 分组布局，shadcn 语义色）。
 */
export function MobileMoreSheet({
  open,
  onOpenChange,
  sections,
  footer,
}: Props) {
  const { pathname } = useLocation()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          'gap-0 overflow-hidden p-0',
          'rounded-t-[1.25rem] border-x-0 border-b-0 border-t bg-background shadow-2xl',
          'max-h-[min(92dvh,40rem)]',
          'pb-[env(safe-area-inset-bottom,0px)]',
        )}
      >
        <div className="flex shrink-0 justify-center pt-2.5 pb-1" aria-hidden>
          <div className="h-1 w-9 rounded-full bg-muted-foreground/25" />
        </div>

        <SheetHeader className="shrink-0 gap-0.5 px-4 pb-3 pt-1 text-left">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            更多
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            其它功能和账号设置都在这
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
          <div className="flex flex-col gap-4">
            {sections.map((section, si) => {
              if (section.items.length === 0) return null
              const layout = section.layout ?? 'list'
              return (
                <section key={si} className="flex flex-col gap-2">
                  {section.title ? (
                    <h3 className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                      {section.title}
                    </h3>
                  ) : null}

                  {layout === 'grid' ? (
                    <div className="grid grid-cols-4 gap-2">
                      {section.items.map((item) => {
                        const Icon = item.icon
                        const active = linkActive(pathname, item)
                        return (
                          <NavLink
                            key={item.to + item.label}
                            to={item.to}
                            end={item.end}
                            onClick={() => onOpenChange(false)}
                            className={cn(
                              'flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5',
                              'text-center transition-colors active:bg-muted/80',
                              'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              active
                                ? 'bg-muted text-foreground'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                            )}
                          >
                            <span
                              className={cn(
                                'flex size-11 items-center justify-center rounded-[0.85rem]',
                                'bg-background shadow-sm ring-1 ring-border/60',
                                active && 'ring-foreground/15',
                              )}
                            >
                              <Icon className="size-5 text-foreground" />
                            </span>
                            <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight">
                              {item.label}
                            </span>
                          </NavLink>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border/50">
                      {section.items.map((item, ii) => {
                        const Icon = item.icon
                        const active = linkActive(pathname, item)
                        return (
                          <NavLink
                            key={item.to + item.label}
                            to={item.to}
                            end={item.end}
                            onClick={() => onOpenChange(false)}
                            className={cn(
                              'flex min-h-11 items-center gap-3 px-3 py-2.5',
                              'text-sm transition-colors active:bg-muted',
                              'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                              ii > 0 && 'border-t border-border/60',
                              active
                                ? 'bg-background/80 font-medium text-foreground'
                                : 'text-foreground/90 hover:bg-background/50',
                            )}
                          >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/50">
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span
                                className="size-2 shrink-0 rounded-full bg-red-500"
                                aria-label="待回复"
                              />
                            )}
                            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60" />
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}

            {footer ? (
              <section className="flex flex-col gap-2">{footer}</section>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** 主题切换行（底部更多面板用）：浅色 / 深色 / 跟随系统 轮换 */
export function MobileMoreThemeRow() {
  return (
    <ThemeModeStatus
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5',
        'bg-muted/50 text-sm ring-1 ring-border/50',
        'transition-colors active:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    />
  )
}

type AccountFooterProps = {
  isLogin: boolean
  onLogout: () => void
  /** 额外列表项（如修改密码） */
  extraLinks?: MobileMoreLink[]
  onNavigate?: () => void
}

/** 账号区：主题 + 可选链接 + 登录/注册或退出 */
export function MobileMoreAccountFooter({
  isLogin,
  onLogout,
  extraLinks = [],
  onNavigate,
}: AccountFooterProps) {
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col gap-2">
      <MobileMoreThemeRow />

      {extraLinks.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border/50">
          {extraLinks.map((item, ii) => {
            const Icon = item.icon
            const active = linkActive(pathname, item)
            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.end}
                onClick={() => onNavigate?.()}
                className={cn(
                  'flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm',
                  'transition-colors active:bg-muted',
                  ii > 0 && 'border-t border-border/60',
                  active ? 'font-medium text-foreground' : 'text-foreground/90',
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/50">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60" />
              </NavLink>
            )
          })}
        </div>
      )}

      {!isLogin ? (
        <div className="overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border/50">
          <NavLink
            to="/login"
            onClick={() => onNavigate?.()}
            className={cn(
              'flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm',
              'transition-colors active:bg-muted',
              pathname === '/login' && 'font-medium',
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/50">
              <LogInIcon className="size-4" />
            </span>
            <span className="flex-1">登录</span>
            <ChevronRightIcon className="size-4 text-muted-foreground/60" />
          </NavLink>
          <NavLink
            to="/register"
            onClick={() => onNavigate?.()}
            className={cn(
              'flex min-h-11 items-center gap-3 border-t border-border/60 px-3 py-2.5 text-sm',
              'transition-colors active:bg-muted',
              pathname === '/register' && 'font-medium',
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/50">
              <UserPlusIcon className="size-4" />
            </span>
            <span className="flex-1">注册</span>
            <ChevronRightIcon className="size-4 text-muted-foreground/60" />
          </NavLink>
        </div>
      ) : (
        <ConfirmDialog
          title="确认退出？"
          description="退出后要重新登录，才能用个人相关功能。"
          confirmLabel="退出"
          onConfirm={() => {
            onLogout()
            onNavigate?.()
          }}
        >
          <button
            type="button"
            className={cn(
              'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5',
              'bg-muted/50 text-sm text-destructive ring-1 ring-border/50',
              'transition-colors active:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/50">
              <LogOutIcon className="size-4" />
            </span>
            <span className="flex-1 text-left font-medium">退出登录</span>
          </button>
        </ConfirmDialog>
      )}
    </div>
  )
}

/** 登录后账号区固定入口 */
export function buildMobileMoreAccountLinks(isLogin: boolean): MobileMoreLink[] {
  if (!isLogin) return []
  return [{ to: '/change-password', label: '修改密码', icon: KeyRoundIcon }]
}

export type BuildMobileMoreOptions = {
  isLogin: boolean
  isMemberLike: boolean
  username?: string
  showAbout: boolean
  /** 「服务」待回复红点 */
  serviceBadge?: boolean
  /** 可进管理后台：内置角色 / 持有任意管理权限（自定义角色） */
  canAccessAdmin: boolean
  /** 细粒度权限判定（useAuth().can） */
  can: (code: string) => boolean
  /** 当前组织名，用于管理分组标题 */
  orgName?: string | null
  /** 当前登录用户 JWT payload：分区标题 / 工作台文案按身份推导 */
  user?: StaffLabelPayload | null
}

/**
 * 统一「更多」分区：浏览 + 我的 +（canAccessAdmin 时）组织管理 / 内容审核 / 站点管理。
 * 管理条目来自 src/lib/admin-nav.ts 唯一注册表（与 PC 侧栏共用），
 * 显隐由权限驱动；分区标题明确区分「当前组织」与「全站」，避免站管场景混淆。
 */
export function buildMobileMoreSections(
  opts: BuildMobileMoreOptions,
): MobileMoreSection[] {
  const browse: MobileMoreLink[] = [
    { to: '/blog-plaza', label: '博客', icon: NewspaperIcon },
    { to: '/bulletin', label: '公告', icon: MegaphoneIcon },
    { to: '/problemset', label: '题单', icon: ListTodoIcon },
    {
      to: '/tools',
      label: '工具',
      icon: WrenchIcon,
      match: (p) => p.startsWith('/tools') || p.startsWith('/p/'),
    },
  ]

  const me: MobileMoreLink[] = []
  if (opts.isLogin) {
    me.push({
      to: '/service',
      label: '服务',
      icon: TicketIcon,
      match: (p) => p.startsWith('/service') || p.startsWith('/tickets'),
      badge: Boolean(opts.serviceBadge),
    })
  }
  if (opts.isLogin && opts.isMemberLike && opts.username) {
    me.push({
      to: `/profile/${opts.username}`,
      label: '个人资料',
      icon: UserIcon,
      match: (p) => p.startsWith('/profile'),
    })
    me.push({ to: '/org', label: '我的组织', icon: Building2Icon })
  }
  if (opts.showAbout) {
    me.push({ to: '/about', label: '关于我们', icon: InfoIcon })
  }

  const sections: MobileMoreSection[] = [
    { title: '浏览', layout: 'grid', items: browse },
  ]
  if (me.length > 0) {
    sections.push({ title: '我的', layout: 'list', items: me })
  }

  if (opts.canAccessAdmin) {
    const entries = adminNavEntries(opts.can)
    const toLink = (e: AdminNavEntry): MobileMoreLink => ({
      to: e.to,
      label: e.label,
      icon: e.icon,
      match: e.isActive,
    })
    const bySection = (s: AdminNavSection) =>
      entries.filter((e) => e.section === s).map(toLink)

    // —— 组织管理：当前组织范围（有任一组织条目权限才展示，含工作台入口）——
    const orgVisible = bySection('org')
    if (orgVisible.length > 0) {
      sections.push({
        title: orgManageSectionTitle(opts.orgName, opts.user),
        layout: 'list',
        items: [
          {
            to: '/admin',
            label: orgAdminHubLabel(opts.user),
            icon: LayoutDashboardIcon,
            end: true,
            match: (p) => p === '/admin' || p === '/admin/',
          },
          ...orgVisible,
        ],
      })
    }

    // —— 内容审核 / 站点管理：全站范围 ——
    for (const section of ['content', 'site'] as const) {
      const items = bySection(section)
      if (items.length > 0) {
        sections.push({
          title: ADMIN_SECTION_TITLES[section],
          layout: 'list',
          items,
        })
      }
    }
  }

  return sections
}
