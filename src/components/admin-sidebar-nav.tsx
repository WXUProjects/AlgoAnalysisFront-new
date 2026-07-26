import { Fragment, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronRightIcon, LayoutDashboardIcon } from 'lucide-react'
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
import {
  ADMIN_SECTION_TITLES,
  adminNavEntries,
  type AdminNavEntry,
  type AdminNavSection,
} from '@/lib/admin-nav'
import { staffNavLabel } from '@/lib/roles'
import { cn } from '@/lib/utils'

const SECTION_ORDER: AdminNavSection[] = ['org', 'content', 'site']

function SubNavItems({ items }: { items: AdminNavEntry[] }) {
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

/** 二级区内的小分组标题（组织管理 / 内容审核 / 站点管理） */
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
 * PC 侧栏：旧版风格「一个管理入口」+ 展开后内部按分区小 label 分组。
 * 条目来自 src/lib/admin-nav.ts 唯一注册表（与移动端「更多」共用），
 * 显隐完全由权限驱动，与路由守卫一致（自定义角色也能看到对应入口）。
 */
export function AdminSidebarNavGroups() {
  const { can, user } = useAuth()
  const { pathname } = useLocation()
  const title = staffNavLabel(user)
  const items = useMemo(() => adminNavEntries(can), [can])
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
                    {SECTION_ORDER.map((section) => {
                      const sectionItems = items.filter(
                        (i) => i.section === section,
                      )
                      if (sectionItems.length === 0) return null
                      return (
                        <Fragment key={section}>
                          <SubSectionLabel>
                            {ADMIN_SECTION_TITLES[section]}
                          </SubSectionLabel>
                          <SubNavItems items={sectionItems} />
                        </Fragment>
                      )
                    })}
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
