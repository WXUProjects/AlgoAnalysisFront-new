import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  BookOpenIcon,
  BarChart3Icon,
  LayoutDashboardIcon,
  LogOutIcon,
  MegaphoneIcon,
  SettingsIcon,
  UsersIcon,
  WorkflowIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { useSiteConfig } from '@/site/SiteConfigContext'
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

const titles: Record<string, string> = {
  '/admin': '后台',
  '/admin/statistics': '数据统计',
  '/admin/bulletin': '公告管理',
  '/admin/problem-progress': '题库识别',
  '/admin/group': '分组管理',
  '/admin/user': '用户管理',
  '/admin/site': '站点设置',
}

export function AdminLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isAdmin, logout } = useAuth()
  const { config } = useSiteConfig()
  const brand = config.siteTitle || 'Algo-CWUX'
  const title = titles[pathname] || (isAdmin ? '后台管理' : '教练管理')
  const userLabel = isAdmin ? '用户管理' : '队员管理'

  function handleLogout() {
    logout()
    toast.success('已退出登录')
    navigate('/login', { replace: true })
  }

  return (
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
                        className="size-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
                        管
                      </div>
                    )}
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{brand}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {isAdmin ? '管理后台' : '教练后台'}
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>管理</SidebarGroupLabel>
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
                  {isAdmin && (
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
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="返回前台">
                  <Link to="/">
                    <ArrowLeftIcon />
                    <span>返回前台</span>
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

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-sm font-medium">{title}</h1>
          </header>
          <div className="flex flex-1 flex-col p-4">
            <Outlet />
          </div>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  )
}
