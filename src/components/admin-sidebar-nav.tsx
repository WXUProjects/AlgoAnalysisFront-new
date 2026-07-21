import { useEffect, useState } from 'react'
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

/** 二级区内的小分组标题（组织管理 / 站点管理） */
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

type Props = {
  isStaff: boolean
  isSiteAdmin: boolean
  canOrgSettings: boolean
  staffLabelPayload?: {
    isSiteAdmin?: boolean
    orgRole?: string
    roleId?: number | null
  } | null
}

/**
 * PC 侧栏：旧版风格「一个管理入口」+ 展开后内部用小 label 区分组织/站点。
 * 一级标题：站点管理 / 团队管理 / 教练管理 / 队长管理（staffNavLabel）。
 */
export function AdminSidebarNavGroups({
  isStaff,
  isSiteAdmin,
  canOrgSettings,
  staffLabelPayload,
}: Props) {
  const { pathname } = useLocation()
  const title = staffNavLabel(staffLabelPayload)
  const orgItems = orgNavItems(canOrgSettings)
  const siteItems = isSiteAdmin ? SITE_NAV_ITEMS : []
  const allItems = [...orgItems, ...siteItems]
  const childActive = allItems.some((i) => i.isActive(pathname))
  const [open, setOpen] = useState(childActive)

  useEffect(() => {
    if (childActive) setOpen(true)
  }, [childActive, pathname])

  if (!isStaff) return null

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
                    {/* 组织管理：教练/队长/团队管理员/站管 都有 */}
                    <SubSectionLabel>组织管理</SubSectionLabel>
                    <SubNavItems items={orgItems} />

                    {/* 站点管理：仅站管；小 label 与组织侧区分 */}
                    {isSiteAdmin && siteItems.length > 0 && (
                      <>
                        <SubSectionLabel>站点管理</SubSectionLabel>
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
