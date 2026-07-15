import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpenIcon,
  Building2Icon,
  CalendarIcon,
  HomeIcon,
  InfoIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  MegaphoneIcon,
  ActivityIcon,
  UserIcon,
  UserPlusIcon,
  WrenchIcon,
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
  '/': '首页',
  '/login': '登录',
  '/register': '注册',
  '/profile': '个人资料',
  '/change-profile': '编辑资料',
  '/all-activities': '动态',
  '/bulletin': '公告',
  '/contest': '比赛',
  '/question-bank': '题库',
  '/about': '关于我们',
  '/org': '我的组织',
  '/tools': '工具',
  '/tools/paste': '粘贴板',
}

function resolveTitle(pathname: string, brand: string): string {
  if (titles[pathname]) return titles[pathname]
  if (pathname.startsWith('/contest/')) return '比赛详情'
  if (pathname.startsWith('/question-bank/detail/')) return '题目详情'
  if (pathname.startsWith('/p/')) return '粘贴板'
  if (pathname.startsWith('/tools')) return '工具'
  return brand
}

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { config } = useSiteConfig()
  const {
    isLogin,
    isStaff,
    isMemberLike,
    user,
    orgs,
    currentOrg,
    logout,
    switchOrg,
  } = useAuth()

  const brand =
    (currentOrg?.brandTitle && currentOrg.brandTitle.trim()) ||
    config.siteTitle ||
    'GoAlgo'
  const brandLogo = currentOrg?.brandLogo || config.siteLogo
  const title = resolveTitle(pathname, brand)
  const homeTo = '/'
  const adminLabel = staffNavLabel(user)
  // 公共域（或未登录默认视图）展示「关于我们」
  const showAbout =
    !isLogin ||
    Boolean(currentOrg?.isSystem) ||
    currentOrg?.slug === 'public'

  function handleLogout() {
    logout()
    toast.success('已退出登录')
    navigate('/login', { replace: true })
  }

  async function handleSwitchOrg(orgId: number) {
    if (!orgId || orgId === user?.orgId) return
    const res = await switchOrg(orgId)
    if (res.success) toast.success('已切换组织')
    else toast.error(res.message || '切换失败')
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
                  <Link to={homeTo}>
                    {brandLogo ? (
                      <img
                        src={brandLogo}
                        alt=""
                        className="size-8 shrink-0 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
                        {(brand[0] || 'G').toUpperCase()}
                      </div>
                    )}
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{brand}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {currentOrg?.name || 'GoAlgo'}
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
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === '/'}
                      tooltip="首页"
                    >
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
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        pathname.startsWith('/tools') || pathname.startsWith('/p/')
                      }
                      tooltip="工具"
                    >
                      <NavLink to="/tools">
                        <WrenchIcon />
                        <span>工具</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {isLogin && isMemberLike && (
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

                  {isLogin && isStaff && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip={adminLabel}>
                        <Link to="/admin">
                          <LayoutDashboardIcon />
                          <span>{adminLabel}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {isLogin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/org')}
                        tooltip="我的组织"
                      >
                        <NavLink to="/org">
                          <Building2Icon />
                          <span>我的组织</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {showAbout && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/about')}
                        tooltip="关于我们"
                      >
                        <NavLink to="/about">
                          <InfoIcon />
                          <span>关于我们</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarSeparator />
            {isLogin && orgs.length > 0 && (
              <div className="px-2 pb-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  当前组织
                </label>
                <select
                  className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                  value={user?.orgId || currentOrg?.id || ''}
                  onChange={(e) => void handleSwitchOrg(Number(e.target.value))}
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                      {o.myRole === 'org_admin' ? ' · 管理' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
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

        <SidebarInset className="h-svh min-h-0 overflow-hidden">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AnimatedTitle className="text-base font-semibold">{title}</AnimatedTitle>
          </header>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-x-none">
            <Outlet />
          </main>
        </SidebarInset>
        <Toaster richColors position="top-center" />
      </SidebarProvider>
    </TooltipProvider>
    </MotionProvider>
  )
}
