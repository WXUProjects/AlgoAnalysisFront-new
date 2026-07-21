import type { ComponentType, ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ActivityIcon,
  BarChart3Icon,
  Building2Icon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  FileSpreadsheetIcon,
  InfoIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  LogInIcon,
  LogOutIcon,
  MegaphoneIcon,
  MoonIcon,
  NewspaperIcon,
  SettingsIcon,
  SirenIcon,
  SunIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  WrenchIcon,
  WorkflowIcon,
  type LucideProps,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  isSiteAdminFromPayload,
  isStaffFromPayload,
  OrgRole,
} from '@/lib/roles'
import { cn } from '@/lib/utils'

/** 组织后台入口文案（按角色；站管也进组织侧，不叫「站点管理」） */
function orgAdminHubLabel(payload?: {
  isSiteAdmin?: boolean
  orgRole?: string
  roleId?: number | null
} | null): string {
  if (payload?.orgRole === OrgRole.Coach) return '教练工作台'
  if (payload?.orgRole === OrgRole.Captain) return '队长工作台'
  if (payload?.orgRole === OrgRole.OrgAdmin) return '组织工作台'
  // 站管或其它 staff：明确是「当前组织」后台，避免和站点管理混淆
  return '组织工作台'
}

/** 组织管理分区标题：永远带「组织管理」前缀 */
function orgManageSectionTitle(
  orgName?: string | null,
  payload?: {
    isSiteAdmin?: boolean
    orgRole?: string
    roleId?: number | null
  } | null,
): string {
  const roleHint =
    payload?.orgRole === OrgRole.Coach
      ? '教练'
      : payload?.orgRole === OrgRole.Captain
        ? '队长'
        : payload?.orgRole === OrgRole.OrgAdmin
          ? '团队管理员'
          : isSiteAdminFromPayload(payload)
            ? '站管视角'
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
            浏览其它功能与账号设置
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

/** 主题切换行（底部更多面板用） */
export function MobileMoreThemeRow() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const label = isDark ? '浅色模式' : '深色模式'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5',
        'bg-muted/50 text-sm ring-1 ring-border/50',
        'transition-colors active:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      aria-label={label}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/50">
        {isDark ? (
          <SunIcon className="size-4" />
        ) : (
          <MoonIcon className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left font-medium">外观</span>
      <span className="text-xs text-muted-foreground">
        {isDark ? '深色' : '浅色'}
      </span>
    </button>
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
          description="退出后需要重新登录才能访问个人相关功能。"
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
  /** 站管或组织教练/队长/团队管理员 */
  isStaff: boolean
  isSiteAdmin: boolean
  /**
   * 可改组织设置（品牌/识别码/任命）：站管或 org_admin。
   * 教练/队长为 false，只看训练报告。
   */
  canOrgSettings: boolean
  /** 当前组织名，用于管理分组标题 */
  orgName?: string | null
  /** 传给 staffNavLabel：isSiteAdmin / orgRole / roleId */
  staffLabelPayload?: {
    isSiteAdmin?: boolean
    orgRole?: string
    roleId?: number | null
  } | null
}

/**
 * 统一「更多」分区：浏览 + 我的 +（有权限时）组织管理 / 站点管理。
 * 分区标题与条目文案明确区分「当前组织」与「全站」，避免站管场景混淆。
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

  // —— 组织管理：当前组织范围（教练 / 队长 / 团队管理员 / 站管在组织视角下）——
  if (opts.isStaff) {
    const orgItems: MobileMoreLink[] = [
      {
        to: '/admin',
        label: orgAdminHubLabel(opts.staffLabelPayload),
        icon: LayoutDashboardIcon,
        end: true,
        match: (p) => p === '/admin' || p === '/admin/',
      },
      {
        to: '/admin/statistics',
        label: '组织数据',
        icon: BarChart3Icon,
        match: (p) =>
          p === '/admin/statistics' || p.startsWith('/admin/statistics/'),
      },
      {
        to: '/admin/bulletin',
        label: '组织公告',
        icon: MegaphoneIcon,
        match: (p) =>
          p === '/admin/bulletin' || p.startsWith('/admin/bulletin/'),
      },
      {
        to: '/admin/group',
        label: '组织分组',
        icon: UsersIcon,
      },
      {
        to: '/admin/user',
        label: '组织成员',
        icon: LayoutDashboardIcon,
        match: (p) => p === '/admin/user' || p.startsWith('/admin/user/'),
      },
    ]

    // 组织设置：站管 / 团队管理员；训练报告：教练 / 队长
    if (opts.canOrgSettings) {
      orgItems.push({
        to: '/admin/org',
        label: '组织设置',
        icon: SettingsIcon,
        match: (p) =>
          p.startsWith('/admin/org') && !p.startsWith('/admin/orgs'),
      })
    } else {
      orgItems.push({
        to: '/admin/org',
        label: '组织训练报告',
        icon: FileSpreadsheetIcon,
        match: (p) =>
          p.startsWith('/admin/org') && !p.startsWith('/admin/orgs'),
      })
    }

    sections.push({
      title: orgManageSectionTitle(opts.orgName, opts.staffLabelPayload),
      layout: 'list',
      items: orgItems,
    })
  }

  // —— 站点管理：仅站点管理员，全站范围（文案一律带「站点/全站」）——
  if (opts.isSiteAdmin) {
    sections.push({
      title: '站点管理',
      layout: 'list',
      items: [
        {
          to: '/admin/site-statistics',
          label: '站点数据',
          icon: BarChart3Icon,
        },
        { to: '/admin/access', label: '站点访问', icon: ActivityIcon },
        {
          to: '/admin/site-users',
          label: '全站用户',
          icon: LayoutDashboardIcon,
        },
        {
          to: '/admin/orgs',
          label: '全站组织',
          icon: UsersIcon,
        },
        {
          to: '/admin/problem-progress',
          label: '站点题库识别',
          icon: WorkflowIcon,
        },
        {
          to: '/admin/problem-edits',
          label: '站点题库审查',
          icon: ClipboardCheckIcon,
        },
        { to: '/admin/blog', label: '站点博客', icon: NewspaperIcon },
        {
          to: '/admin/site-bulletin',
          label: '站点公告',
          icon: MegaphoneIcon,
          match: (p) =>
            p === '/admin/site-bulletin' ||
            p.startsWith('/admin/site-bulletin/'),
        },
        { to: '/admin/emergency', label: '站点紧急通知', icon: SirenIcon },
        {
          to: '/admin/site',
          label: '站点设置',
          icon: SettingsIcon,
          match: (p) => p === '/admin/site' || p.startsWith('/admin/site/'),
        },
        { to: '/admin/ops', label: '站点运维', icon: WrenchIcon },
      ],
    })
  }

  return sections
}

/**
 * 从 Auth 字段拼装更多菜单（布局层薄封装）。
 * canOrgSettings：站管或 org_admin（Auth 里 isOrgAdmin 对站管也为 true）。
 */
export function buildMobileMoreSectionsFromAuth(opts: {
  isLogin: boolean
  isMemberLike: boolean
  username?: string
  showAbout: boolean
  isStaff: boolean
  isSiteAdmin: boolean
  isOrgAdmin: boolean
  orgName?: string | null
  orgRole?: string | null
  roleId?: number | null
}): MobileMoreSection[] {
  const payload = {
    isSiteAdmin: opts.isSiteAdmin,
    orgRole: opts.orgRole ?? undefined,
    roleId: opts.roleId,
  }
  // 双重校验，避免布局误传 isStaff
  const staff = opts.isStaff || isStaffFromPayload(payload)
  const siteAdmin = opts.isSiteAdmin || isSiteAdminFromPayload(payload)
  // 组织设置：站管 / 团队管理员（Auth.isOrgAdmin 对站管也为 true）
  // 教练、队长 isOrgAdmin=false → 训练报告
  const canOrgSettings = siteAdmin || opts.isOrgAdmin

  return buildMobileMoreSections({
    isLogin: opts.isLogin,
    isMemberLike: opts.isMemberLike,
    username: opts.username,
    showAbout: opts.showAbout,
    isStaff: staff,
    isSiteAdmin: siteAdmin,
    canOrgSettings,
    orgName: opts.orgName,
    staffLabelPayload: payload,
  })
}
