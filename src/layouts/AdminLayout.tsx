import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ActivityIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  BarChart3Icon,
  CalendarIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MegaphoneIcon,
  SettingsIcon,
  UsersIcon,
  WorkflowIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { staffNavLabel } from '@/lib/roles'
import { useSiteConfig } from '@/site/SiteConfigContext'
import { AnimatedTitle } from '@/components/animated-title'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MotionProvider } from '@/motion/MotionContext'

const titles: Record<string, string> = {
  '/admin': '后台',
  '/admin/statistics': '数据统计',
  '/admin/bulletin': '公告管理',
  '/admin/problem-progress': '题库识别',
  '/admin/group': '分组管理',
  '/admin/user': '用户管理',
  '/admin/site': '站点设置',
  '/admin/org': '组织设置',
  '/admin/orgs': '组织管理',
}

export function AdminLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isAdmin, isOrgAdmin, isStaff, user, logout, currentOrg } = useAuth()
  const { config } = useSiteConfig()
  const brand =
    (currentOrg?.brandTitle && currentOrg.brandTitle.trim()) ||
    config.siteTitle ||
    'GoAlgo'
  const staffLabel = staffNavLabel(user)
  const staffSub = isAdmin ? '站点后台' : currentOrg?.name || '团队后台'
  const title = titles[pathname] || staffLabel
  const userLabel = isAdmin ? '用户管理' : '成员管理'
  const canOrgSettings = isAdmin || isOrgAdmin
  const showTeamNav = isStaff
  const frontTo = '/'
  const frontLabel = '返回前台'

  function handleLogout() {
    logout()
    toast.success('已退出登录')
    navigate('/login', { replace: true })
  }

  return (
    <MotionProvider>
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <Link to="/admin">
                    {config.siteLogo ? (
                      <img
                        src={config.siteLogo}
                        alt=""
                        className="size-8 shrink-0 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
                        管
                      </div>
                    )}
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{brand}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {staffSub}
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            {showTeamNav && (
              <SidebarGroup>
                <SidebarGroupLabel>团队（当前组织）</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/admin/statistics')}
                        tooltip="数据统计"
                      >
                        <NavLink to="/admin/statistics">
                          <BarChart3Icon />
                          <span>数据统计</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/admin/bulletin')}
                        tooltip="公告管理"
                      >
                        <NavLink to="/admin/bulletin">
                          <MegaphoneIcon />
                          <span>公告管理</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/admin/group')}
                        tooltip="分组"
                      >
                        <NavLink to="/admin/group">
                          <UsersIcon />
                          <span>分组管理</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/admin/user')}
                        tooltip={userLabel}
                      >
                        <NavLink to="/admin/user">
                          <LayoutDashboardIcon />
                          <span>{userLabel}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {canOrgSettings && (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={
                            pathname.startsWith('/admin/org') &&
                            !pathname.startsWith('/admin/orgs')
                          }
                          tooltip="组织设置"
                        >
                          <NavLink to="/admin/org">
                            <SettingsIcon />
                            <span>组织设置</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>站点</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/admin/orgs')}
                        tooltip="组织管理"
                      >
                        <NavLink to="/admin/orgs">
                          <UsersIcon />
                          <span>组织管理</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/admin/problem-progress')}
                        tooltip="题库识别"
                      >
                        <NavLink to="/admin/problem-progress">
                          <WorkflowIcon />
                          <span>题库识别</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/admin/site')}
                        tooltip="站点设置"
                      >
                        <NavLink to="/admin/site">
                          <SettingsIcon />
                          <span>站点设置</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={frontLabel}>
                  <Link to={frontTo}>
                    <ArrowLeftIcon />
                    <span>{frontLabel}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="比赛">
                  <Link to="/contest">
                    <CalendarIcon />
                    <span>比赛</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="动态">
                  <Link to="/all-activities">
                    <ActivityIcon />
                    <span>动态</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="题库">
                  <Link to="/question-bank">
                    <BookOpenIcon />
                    <span>题库</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="退出" onClick={handleLogout}>
                  <LogOutIcon />
                  <span>退出登录</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator />
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground">主题</span>
              <ThemeToggle />
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="h-svh min-h-0 overflow-hidden">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AnimatedTitle className="text-sm font-medium">{title}</AnimatedTitle>
          </header>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-x-none">
            <Outlet />
          </div>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
    </MotionProvider>
  )
}
