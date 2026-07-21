import { NavLink, useLocation } from 'react-router-dom'
import {
  ActivityIcon,
  BarChart3Icon,
  ClipboardCheckIcon,
  FileSpreadsheetIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  NewspaperIcon,
  SettingsIcon,
  SirenIcon,
  UsersIcon,
  WrenchIcon,
  WorkflowIcon,
  type LucideIcon,
} from 'lucide-react'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'

type AdminNavItem = {
  to: string
  label: string
  icon: LucideIcon
  tooltip?: string
  isActive: (pathname: string) => boolean
}

function pathActive(
  pathname: string,
  to: string,
  opts?: { end?: boolean; excludePrefix?: string },
): boolean {
  if (opts?.excludePrefix && pathname.startsWith(opts.excludePrefix)) {
    return false
  }
  if (opts?.end) {
    return pathname === to || pathname === `${to}/`
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

function orgNavItems(canOrgSettings: boolean): AdminNavItem[] {
  const items: AdminNavItem[] = [
    {
      to: '/admin/statistics',
      label: '组织数据',
      icon: BarChart3Icon,
      tooltip: '组织数据统计',
      isActive: (p) => pathActive(p, '/admin/statistics'),
    },
    {
      to: '/admin/bulletin',
      label: '组织公告',
      icon: MegaphoneIcon,
      isActive: (p) => pathActive(p, '/admin/bulletin'),
    },
    {
      to: '/admin/group',
      label: '组织分组',
      icon: UsersIcon,
      isActive: (p) => pathActive(p, '/admin/group'),
    },
    {
      to: '/admin/user',
      label: '组织成员',
      icon: LayoutDashboardIcon,
      isActive: (p) => pathActive(p, '/admin/user'),
    },
  ]
  if (canOrgSettings) {
    items.push({
      to: '/admin/org',
      label: '组织设置',
      icon: SettingsIcon,
      isActive: (p) =>
        pathActive(p, '/admin/org', { excludePrefix: '/admin/orgs' }),
    })
  } else {
    items.push({
      to: '/admin/org',
      label: '组织训练报告',
      icon: FileSpreadsheetIcon,
      tooltip: '训练报告',
      isActive: (p) =>
        pathActive(p, '/admin/org', { excludePrefix: '/admin/orgs' }),
    })
  }
  return items
}

const SITE_NAV_ITEMS: AdminNavItem[] = [
  {
    to: '/admin/site-statistics',
    label: '站点数据',
    icon: BarChart3Icon,
    tooltip: '站点数据统计',
    isActive: (p) => pathActive(p, '/admin/site-statistics'),
  },
  {
    to: '/admin/access',
    label: '站点访问',
    icon: ActivityIcon,
    tooltip: '站点访问统计',
    isActive: (p) => pathActive(p, '/admin/access'),
  },
  {
    to: '/admin/site-users',
    label: '全站用户',
    icon: LayoutDashboardIcon,
    isActive: (p) => pathActive(p, '/admin/site-users'),
  },
  {
    to: '/admin/orgs',
    label: '全站组织',
    icon: UsersIcon,
    tooltip: '管理全部组织',
    isActive: (p) => pathActive(p, '/admin/orgs'),
  },
  {
    to: '/admin/problem-progress',
    label: '站点题库识别',
    icon: WorkflowIcon,
    isActive: (p) => pathActive(p, '/admin/problem-progress'),
  },
  {
    to: '/admin/problem-edits',
    label: '站点题库审查',
    icon: ClipboardCheckIcon,
    isActive: (p) => pathActive(p, '/admin/problem-edits'),
  },
  {
    to: '/admin/blog',
    label: '站点博客',
    icon: NewspaperIcon,
    isActive: (p) => pathActive(p, '/admin/blog'),
  },
  {
    to: '/admin/site-bulletin',
    label: '站点公告',
    icon: MegaphoneIcon,
    isActive: (p) => pathActive(p, '/admin/site-bulletin'),
  },
  {
    to: '/admin/emergency',
    label: '站点紧急通知',
    icon: SirenIcon,
    isActive: (p) => pathActive(p, '/admin/emergency'),
  },
  {
    to: '/admin/site',
    label: '站点设置',
    icon: SettingsIcon,
    // 勿用 startsWith('/admin/site')，会误伤 site-statistics / site-users 等
    isActive: (p) => p === '/admin/site' || p.startsWith('/admin/site/'),
  },
  {
    to: '/admin/ops',
    label: '站点运维',
    icon: WrenchIcon,
    isActive: (p) => pathActive(p, '/admin/ops'),
  },
]

type Props = {
  isStaff: boolean
  isSiteAdmin: boolean
  /** 站管或 org_admin：组织设置；否则训练报告 */
  canOrgSettings: boolean
  orgName?: string | null
}

/**
 * PC 侧栏二级管理导航：嵌在前台 AppLayout 内，
 * 「组织管理」与「站点管理」分两组，不再使用独立 AdminLayout。
 */
export function AdminSidebarNavGroups({
  isStaff,
  isSiteAdmin,
  canOrgSettings,
  orgName,
}: Props) {
  const { pathname } = useLocation()
  if (!isStaff) return null

  const orgTitle = orgName?.trim()
    ? `组织管理 · ${orgName.trim()}`
    : '组织管理'

  return (
    <>
      <SidebarSeparator className="mx-0" />
      <SidebarGroup>
        <SidebarGroupLabel>{orgTitle}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {orgNavItems(canOrgSettings).map((item) => {
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.to + item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.isActive(pathname)}
                    tooltip={item.tooltip || item.label}
                  >
                    <NavLink to={item.to}>
                      <Icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {isSiteAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel>站点管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SITE_NAV_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.to + item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.isActive(pathname)}
                      tooltip={item.tooltip || item.label}
                    >
                      <NavLink to={item.to}>
                        <Icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  )
}
