import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpenIcon,
  CalendarIcon,
  ExternalLinkIcon,
  HomeIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  MegaphoneIcon,
  ActivityIcon,
  UserIcon,
  UserPlusIcon,
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
  '/': '首页',
  '/login': '登录',
  '/register': '注册',
  '/profile': '个人资料',
  '/change-profile': '编辑资料',
  '/all-activities': '动态',
  '/bulletin': '公告',
  '/contest': '比赛',
  '/question-bank': '题库',
}

function resolveTitle(pathname: string, brand: string): string {
  if (titles[pathname]) return titles[pathname]
  if (pathname.startsWith('/contest/')) return '比赛详情'
  if (pathname.startsWith('/question-bank/detail/')) return '题目详情'
  return brand
}

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { config } = useSiteConfig()
  const brand = config.siteTitle || 'Algo-CWUX'
  const title = resolveTitle(pathname, brand)
  const { isLogin, isAdmin, isCoach, user, logout } = useAuth()

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
                  <Link to="/">
                    {config.siteLogo ? (
                      <img
                        src={config.siteLogo}
                        alt=""
                        className="size-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
                        {(brand[0] || 'A').toUpperCase()}
                      </div>
                    )}
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{brand}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        算法协会
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="首页">
                      <NavLink to="/" end>
                        <HomeIcon />
                        <span>首页</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/contest')}
                      tooltip="比赛"
                    >
                      <NavLink to="/contest">
                        <CalendarIcon />
                        <span>比赛</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/bulletin')}
                      tooltip="公告"
                    >
                      <NavLink to="/bulletin">
                        <MegaphoneIcon />
                        <span>公告</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/all-activities')}
                      tooltip="动态"
                    >
                      <NavLink to="/all-activities">
                        <ActivityIcon />
                        <span>动态</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/question-bank')}
                      tooltip="题库"
                    >
                      <NavLink to="/question-bank">
                        <BookOpenIcon />
                        <span>题库</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {isLogin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/profile')}
                        tooltip="个人资料"
                      >
                        <NavLink to="/profile">
                          <UserIcon />
                          <span>个人资料</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {isLogin && (isAdmin || isCoach) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={isAdmin ? '后台管理' : '教练管理'}
                      >
                        <Link to="/admin">
                          <LayoutDashboardIcon />
                          <span>{isAdmin ? '后台管理' : '教练管理'}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="论坛">
                      <a
                        href="http://bbs.algo.zhiyuansofts.cn/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLinkIcon />
                        <span>论坛</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu>
              <SidebarMenuItem>
                <ThemeToggle />
              </SidebarMenuItem>
              {!isLogin ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === '/login'}
                      tooltip="登录"
                    >
                      <NavLink to="/login">
                        <LogInIcon />
                        <span>登录</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === '/register'}
                      tooltip="注册"
                    >
                      <NavLink to="/register">
                        <UserPlusIcon />
                        <span>注册</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    tooltip={user?.name || '退出'}
                    onClick={handleLogout}
                  >
                    <LogOutIcon />
                    <span>退出登录</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-base font-semibold">{title}</h1>
          </header>
          <main className="flex flex-1 flex-col overflow-auto">
            <Outlet />
          </main>
        </SidebarInset>
        <Toaster richColors position="top-center" />
      </SidebarProvider>
    </TooltipProvider>
  )
}
