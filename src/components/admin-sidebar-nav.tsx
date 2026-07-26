import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ActivityIcon,
  BarChart3Icon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  FileSpreadsheetIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  NewspaperIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SirenIcon,
  UsersIcon,
  WrenchIcon,
  WorkflowIcon,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Perm } from '@/lib/permissions'
import { staffNavLabel } from '@/lib/roles'
import { cn } from '@/lib/utils'

type AdminNavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** 命中任一权限即显示（与 src/router.tsx 的 RequirePerm 守卫保持一致） */
  anyOf: string[]
  /** 分区：组织管理 / 站点管理 */
  section: 'org' | 'site'
  /** 内容审核条目：站点分区仅剩内容审核时，分区标题显示「内容审核」 */
  contentReview?: boolean
  isActive: (pathname: string) => boolean
}

function pathActive(
  pathname: string,
  to: string,
  opts?: { excludePrefix?: string },
): boolean {
  if (opts?.excludePrefix && pathname.startsWith(opts.excludePrefix)) {
    return false
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * 管理侧栏统一表：条目显隐由权限驱动（anyOf 与路由守卫一致）。
 * /admin/org 双语义：可改组织设置（品牌/识别码/任命）时显示「组织设置」，
 * 否则（仅教练/队长类查看权限）显示「训练报告」。
 */
function adminNavItems(can: (code: string) => boolean): AdminNavItem[] {
  const canOrgSettings =
    can(Perm.OrgInfoWrite) || can(Perm.OrgPolicyToggle) || can(Perm.OrgRoleManage)
  const items: AdminNavItem[] = [
    // —— 组织管理（当前组织范围） ——
    {
      to: '/admin/statistics',
      label: '组织数据',
      icon: BarChart3Icon,
      anyOf: [Perm.OrgReportView],
      section: 'org',
      isActive: (p) => pathActive(p, '/admin/statistics'),
    },
    {
      to: '/admin/bulletin',
      label: '组织公告',
      icon: MegaphoneIcon,
      anyOf: [Perm.OrgBulletinManage],
      section: 'org',
      isActive: (p) => pathActive(p, '/admin/bulletin'),
    },
    {
      to: '/admin/group',
      label: '组织分组',
      icon: UsersIcon,
      anyOf: [Perm.OrgGroupManage],
      section: 'org',
      isActive: (p) => pathActive(p, '/admin/group'),
    },
    {
      to: '/admin/user',
      label: '组织成员',
      icon: LayoutDashboardIcon,
      anyOf: [Perm.OrgReportView, Perm.OrgGroupManage, Perm.OrgMemberRole],
      section: 'org',
      isActive: (p) => pathActive(p, '/admin/user'),
    },
    {
      to: '/admin/org',
      label: canOrgSettings ? '组织设置' : '训练报告',
      icon: canOrgSettings ? SettingsIcon : FileSpreadsheetIcon,
      anyOf: [
        Perm.OrgInfoWrite,
        Perm.OrgPolicyToggle,
        Perm.OrgRoleManage,
        Perm.OrgReportView,
      ],
      section: 'org',
      isActive: (p) =>
        pathActive(p, '/admin/org', { excludePrefix: '/admin/orgs' }),
    },
    // —— 站点管理 / 内容审核（全站范围） ——
    {
      to: '/admin/site-statistics',
      label: '站点数据',
      icon: BarChart3Icon,
      anyOf: [Perm.SiteStatsRead],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/site-statistics'),
    },
    {
      to: '/admin/access',
      label: '站点访问',
      icon: ActivityIcon,
      anyOf: [Perm.SiteStatsRead],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/access'),
    },
    {
      to: '/admin/site-users',
      label: '全站用户',
      icon: LayoutDashboardIcon,
      anyOf: [Perm.SiteUserList],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/site-users'),
    },
    {
      to: '/admin/orgs',
      label: '全站组织',
      icon: UsersIcon,
      anyOf: [Perm.SiteOrgList],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/orgs'),
    },
    {
      to: '/admin/problem-progress',
      label: '题库识别',
      icon: WorkflowIcon,
      anyOf: [Perm.OrgReportView, Perm.SiteProblemOps],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/problem-progress'),
    },
    {
      to: '/admin/problem-edits',
      label: '题库审查',
      icon: ClipboardCheckIcon,
      anyOf: [Perm.ContentProblemReview],
      section: 'site',
      contentReview: true,
      isActive: (p) => pathActive(p, '/admin/problem-edits'),
    },
    {
      to: '/admin/blog',
      label: '博客管理',
      icon: NewspaperIcon,
      anyOf: [Perm.ContentBlogModerate, Perm.SiteBlogBoard],
      section: 'site',
      contentReview: true,
      isActive: (p) => pathActive(p, '/admin/blog'),
    },
    {
      to: '/admin/site-bulletin',
      label: '站点公告',
      icon: MegaphoneIcon,
      anyOf: [Perm.SiteBulletin],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/site-bulletin'),
    },
    {
      to: '/admin/emergency',
      label: '紧急通知',
      icon: SirenIcon,
      anyOf: [Perm.SiteEmergency],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/emergency'),
    },
    {
      to: '/admin/roles',
      label: '角色权限',
      icon: ShieldCheckIcon,
      anyOf: [Perm.SiteRoleManage],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/roles'),
    },
    {
      to: '/admin/site',
      label: '站点设置',
      icon: SettingsIcon,
      anyOf: [Perm.SiteConfigRead, Perm.SiteConfigWrite],
      section: 'site',
      isActive: (p) => p === '/admin/site' || p.startsWith('/admin/site/'),
    },
    {
      to: '/admin/ops',
      label: '运维',
      icon: WrenchIcon,
      anyOf: [Perm.SiteSpiderOps, Perm.SiteProblemOps, Perm.SiteBackup, Perm.SiteConfigWrite],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/ops'),
    },
  ]
  return items.filter((item) => item.anyOf.some(can))
}

function SubNavItems({ items }: { items: AdminNavItem[] }) {
  const { pathname } = useLocation()
  return (
    <>
      {items.map((item) => {
        const ItemIcon = item.icon
        const active = item.isActive(pathname)
        return (
          <SidebarMenuSubItem key={item.to + item.label}>
            <SidebarMenuSubButton asChild isActive={active}>
              <NavLink to={item.to}>
                <ItemIcon />
                <span>{item.label}</span>
              </NavLink>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )
      })}
    </>
  )
}

/** 二级区内的小分组标题（组织管理 / 站点管理 / 内容审核） */
function SubSectionLabel({ children }: { children: string }) {
  return (
    <li
      className={cn(
        'px-2 pt-2 pb-0.5 first:pt-0.5',
        'text-[10px] font-medium uppercase tracking-wide',
        'text-sidebar-foreground/50',
        'group-data-[collapsible=icon]:hidden',
        'list-none',
      )}
      aria-hidden={false}
      role="presentation"
    >
      {children}
    </li>
  )
}

/**
 * PC 侧栏：旧版风格「一个管理入口」+ 展开后内部用小 label 区分组织/站点。
 * 一级标题按身份推导（站点管理 / 团队管理 / 教练管理 / 队长管理 / 资源审核 / 管理中心）；
 * 条目显隐完全由权限驱动，与路由守卫一致（自定义角色也能看到对应入口）。
 */
export function AdminSidebarNavGroups() {
  const { can, user } = useAuth()
  const { pathname } = useLocation()
  const title = staffNavLabel(user)
  const items = useMemo(() => adminNavItems(can), [can])
  const orgItems = items.filter((i) => i.section === 'org')
  const siteItems = items.filter((i) => i.section === 'site')
  // 仅剩内容审核条目（如资源审核员）时，分区标题改为「内容审核」
  const siteSectionTitle = siteItems.every((i) => i.contentReview)
    ? '内容审核'
    : '站点管理'
  const childActive = items.some((i) => i.isActive(pathname))
  const [open, setOpen] = useState(childActive)

  useEffect(() => {
    if (childActive) setOpen(true)
  }, [childActive, pathname])

  if (items.length === 0) return null

  return (
    <>
      <SidebarSeparator className="mx-0" />
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <Collapsible
              open={open}
              onOpenChange={setOpen}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={title}
                    isActive={childActive && !open}
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <LayoutDashboardIcon />
                    <span>{title}</span>
                    <ChevronRightIcon
                      className={cn(
                        'ml-auto transition-transform duration-200 ease-out',
                        'motion-reduce:transition-none',
                        'group-data-[state=open]/collapsible:rotate-90',
                      )}
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub
                    className={cn(
                      'origin-top',
                      'data-[state=open]:animate-in',
                    )}
                  >
                    {orgItems.length > 0 && (
                      <>
                        <SubSectionLabel>组织管理</SubSectionLabel>
                        <SubNavItems items={orgItems} />
                      </>
                    )}

                    {siteItems.length > 0 && (
                      <>
                        <SubSectionLabel>{siteSectionTitle}</SubSectionLabel>
                        <SubNavItems items={siteItems} />
                      </>
                    )}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}
