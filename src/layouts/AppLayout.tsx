import { useEffect } from 'react'
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
import { trackPageVisit } from '@/lib/visit-tracker'
import { useSiteConfig } from '@/site/SiteConfigContext'
import { AnimatedTitle } from '@/components/animated-title'
import { EmergencyDialogHost } from '@/components/emergency-dialog'
import { NotificationInbox } from '@/components/notification-inbox'
import { PrivacySetupDialog } from '@/components/privacy-setup-dialog'
import { SiteFooter } from '@/components/site-footer'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MotionProvider } from '@/motion/MotionContext'

const titles: Record<string, string> = {
  '/': '首页',
  '/login': '登录',
  '/register': '注册',
  '/forgot-password': '找回密码',
  '/change-password': '修改密码',
  '/profile': '个人资料',
  '/change-profile': '编辑资料',
  '/privacy': '隐私设置',
  '/social': '关注与粉丝',
  '/discover': '发现',
  '/all-activities': '提交动态',
  '/bulletin': '公告',
  '/contest': '比赛',
  '/question-bank': '题库',
  '/about': '关于我们',
  '/org': '我的组织',
  '/tools': '工具',
  '/tools/paste': '粘贴板',
  '/tools/code-image': '代码转图片',
}

function resolveTitle(pathname: string, brand: string): string {
  if (titles[pathname]) return titles[pathname]
  if (pathname.startsWith('/profile/')) return '个人资料'
  if (pathname.startsWith('/social')) return '关注与粉丝'
  if (pathname.startsWith('/contest/')) return '比赛详情'
  if (pathname.includes('/edit-content')) return '编辑题面'
  if (pathname.includes('/solution/new')) return '写题解'
  if (pathname.includes('/solution/') && pathname.endsWith('/edit'))
    return '编辑题解'
  if (pathname.includes('/solution/')) return '题解'
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
    ready,
    logout,
    switchOrg,
  } = useAuth()

  const brand =
    (currentOrg?.brandTitle && currentOrg.brandTitle.trim()) ||
    config.siteTitle ||
    'GoAlgo'
  const brandLogo = currentOrg?.brandLogo || config.siteLogo
  const title = resolveTitle(pathname, brand)
  const homeTo = isLogin ? '/' : '/about'
  const adminLabel = staffNavLabel(user)
  // 公共域（或未登录默认视图）展示「关于我们」
  const showAbout =
    !isLogin ||
    Boolean(currentOrg?.isSystem) ||
    currentOrg?.slug === 'public'
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password'
  const showLoginBanner = ready && !isLogin && !isAuthPage

  // 未登录访问首页 → 强制跳到关于我们
  useEffect(() => {
    if (!ready || isLogin) return
    if (pathname === '/') {
      navigate('/about', { replace: true })
    }
  }, [ready, isLogin, pathname, navigate])

  // 站点访问人次 / 日活上报
  useEffect(() => {
    if (!ready) return
    if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') {
      return
    }
    trackPageVisit(pathname)
  }, [ready, pathname])

  function handleLogout() {
    logout()
    toast.success('已退出登录')
    navigate('/login', { replace: true })
  }

  async function handleSwitchOrg(orgId: number) {
    if (!orgId || orgId === user?.orgId) return
    const res = await switchOrg(orgId)
    if (res.success) toast.success('已切换组织')
    else toast.error(res.message || '切换失败，请稍后重试')
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
                  {isLogin && (
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
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        pathname.startsWith('/discover') ||
                        pathname.startsWith('/all-activities')
                      }
                      tooltip="发现"
                    >
                      <NavLink to="/discover">
                        <ActivityIcon />
                        <span>发现</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        pathname === '/contest' ||
                        pathname.startsWith('/contest/')
                      }
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

                  {isLogin && isMemberLike && user?.username && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/profile')}
                        tooltip="个人资料"
                      >
                        <NavLink to={`/profile/${user.username}`}>
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
              <div className="group-data-[collapsible=icon]:hidden">
                <label className="mb-1 block px-0.5 text-xs text-muted-foreground">
                  当前组织
                </label>
                <Select
                  value={String(user?.orgId || currentOrg?.id || '')}
                  onValueChange={(value) => void handleSwitchOrg(Number(value))}
                >
                  <SelectTrigger size="sm" className="w-full text-xs" aria-label="当前组织">
                    <SelectValue placeholder="选择组织" />
                  </SelectTrigger>
                  <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                      {o.myRole === 'org_admin' ? ' · 管理' : ''}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
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
            <div className="ml-auto flex items-center gap-1">
              <NotificationInbox enabled={isLogin} />
            </div>
          </header>
          {showLoginBanner && (
            <div className="shrink-0 border-b bg-muted/50 px-4 py-2.5 text-center text-sm text-muted-foreground">
              您还没有登录，请{' '}
              <Link
                to="/register"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                注册
              </Link>
              {' / '}
              <Link
                to="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                登录
              </Link>
            </div>
          )}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-x-none">
            <div className="flex min-h-full min-w-0 flex-1 flex-col">
              <div className="min-w-0 flex-1">
                <Outlet />
              </div>
              <SiteFooter />
            </div>
          </main>
        </SidebarInset>
        <Toaster richColors position="top-center" />
        <EmergencyDialogHost />
        <PrivacySetupDialog />
      </SidebarProvider>
    </TooltipProvider>
    </MotionProvider>
  )
}
