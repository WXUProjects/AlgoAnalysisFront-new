import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ActivityIcon,
  BarChart3Icon,
  Building2Icon,
  ChevronRightIcon,
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
import { staffNavLabel } from '@/lib/roles'
import { cn } from '@/lib/utils'

type AdminNavItem = {
  to: string
  label: string
  icon: LucideIcon
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

function orgNavItems(canOrgSettings: boolean): AdminNavItem[] {
  const items: AdminNavItem[] = [
    {
      to: '/admin/statistics',
      label: '组织数据',
      icon: BarChart3Icon,
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
      label: '训练报告',
      icon: FileSpreadsheetIcon,
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
    isActive: (p) => pathActive(p, '/admin/site-statistics'),
  },
  {
    to: '/admin/access',
    label: '站点访问',
    icon: ActivityIcon,
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
    isActive: (p) => pathActive(p, '/admin/orgs'),
  },
  {
    to: '/admin/problem-progress',
    label: '题库识别',
    icon: WorkflowIcon,
    isActive: (p) => pathActive(p, '/admin/problem-progress'),
  },
  {
    to: '/admin/problem-edits',
    label: '题库审查',
    icon: ClipboardCheckIcon,
    isActive: (p) => pathActive(p, '/admin/problem-edits'),
  },
  {
    to: '/admin/blog',
    label: '博客管理',
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
    label: '紧急通知',
    icon: SirenIcon,
    isActive: (p) => pathActive(p, '/admin/emergency'),
  },
  {
    to: '/admin/site',
    label: '站点设置',
    icon: SettingsIcon,
    isActive: (p) => p === '/admin/site' || p.startsWith('/admin/site/'),
  },
  {
    to: '/admin/ops',
    label: '运维',
    icon: WrenchIcon,
    isActive: (p) => pathActive(p, '/admin/ops'),
  },
]

/** 可折叠一级入口 + 二级子 Tab */
function AdminCollapsibleNav({
  title,
  icon: Icon,
  items,
}: {
  title: string
  icon: LucideIcon
  items: AdminNavItem[]
}) {
  const { pathname } = useLocation()
  const childActive = items.some((i) => i.isActive(pathname))
  const [open, setOpen] = useState(childActive)

  // 进入任一子路由时自动展开对应分组
  useEffect(() => {
    if (childActive) setOpen(true)
  }, [childActive, pathname])

  return (
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
            <Icon />
            <span>{title}</span>
            <ChevronRightIcon
              className={cn(
                'ml-auto transition-transform duration-200',
                'group-data-[state=open]/collapsible:rotate-90',
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
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
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

type Props = {
  isStaff: boolean
  isSiteAdmin: boolean
  canOrgSettings: boolean
  /** 组织侧折叠标题：教练管理 / 队长管理 / 组织管理 / 站点管理场景下的组织侧 */
  staffLabelPayload?: {
    isSiteAdmin?: boolean
    orgRole?: string
    roleId?: number | null
  } | null
}

/**
 * PC 侧栏二级 Tab 组：
 * 一级为「教练管理 / 组织管理 / 站点管理」可折叠入口，
 * 点击展开二级子 Tab（组织数据、成员… / 站点数据、运维…）。
 */
export function AdminSidebarNavGroups({
  isStaff,
  isSiteAdmin,
  canOrgSettings,
  staffLabelPayload,
}: Props) {
  if (!isStaff) return null

  // 站管：组织侧固定叫「组织管理」，与「站点管理」并列；其它角色用 staffNavLabel
  const orgTitle = isSiteAdmin
    ? '组织管理'
    : staffNavLabel(staffLabelPayload)

  return (
    <>
      <SidebarSeparator className="mx-0" />
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <AdminCollapsibleNav
              title={orgTitle}
              icon={isSiteAdmin ? Building2Icon : LayoutDashboardIcon}
              items={orgNavItems(canOrgSettings)}
            />
            {isSiteAdmin && (
              <AdminCollapsibleNav
                title="站点管理"
                icon={LayoutDashboardIcon}
                items={SITE_NAV_ITEMS}
              />
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}
