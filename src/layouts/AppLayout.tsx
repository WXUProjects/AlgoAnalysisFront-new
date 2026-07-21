import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpenIcon,
  Building2Icon,
  CalendarIcon,
  HomeIcon,
  InfoIcon,
  ListTodoIcon,
  LogInIcon,
  LogOutIcon,
  MegaphoneIcon,
  ActivityIcon,
  NewspaperIcon,
  UserIcon,
  UserPlusIcon,
  WrenchIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { useDocumentMeta } from '@/hooks/use-document-meta'
import {
  DEFAULT_SITE_DESCRIPTION,
  resolvePageTitle,
} from '@/lib/page-title'
import { getHomePath } from '@/lib/home-path'
import { trackPageVisit } from '@/lib/visit-tracker'
import { useSiteConfig } from '@/site/SiteConfigContext'
import { AdminSidebarNavGroups } from '@/components/admin-sidebar-nav'
import { AnimatedTitle } from '@/components/animated-title'
import { DomainHintSync } from '@/components/domain-hint-sync'
import { GsapPageTransition } from '@/components/gsap-page-transition'
import {
  MainBottomNav,
  MainBottomNavSpacer,
} from '@/components/main-bottom-nav'
import {
  buildMobileMoreAccountLinks,
  buildMobileMoreSectionsFromAuth,
  MobileMoreAccountFooter,
  MobileMoreSheet,
} from '@/components/mobile-more-sheet'
import { MobileNavBack } from '@/components/mobile-nav-back'
import { formatOrgSwitchLabel, MobileOrgSwitcher } from '@/components/mobile-org-switcher'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MotionProvider } from '@/motion/MotionContext'

export function AppLayout() {
  return (
    <MotionProvider>
    <TooltipProvider>
      <DomainHintSync />
      <SidebarProvider>
        <AppLayoutInner />
      </SidebarProvider>
    </TooltipProvider>
    </MotionProvider>
  )
}

function AppLayoutInner() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { config } = useSiteConfig()
  /** 移动端「更多」底部面板（不再打开侧滑 Sidebar） */
  const [moreOpen, setMoreOpen] = useState(false)
  const {
    isLogin,
    isStaff,
    isSiteAdmin,
    isOrgAdmin,
    isCoach,
    isCaptain,
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
  const pageName = resolvePageTitle(pathname)
  const title = pageName
    ? pageName === brand
      ? brand
      : `${pageName} - ${brand}`
    : brand
  const isDetailOwned =
    pathname.startsWith('/question-bank/detail/') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/problemset/')
  useDocumentMeta(
    isDetailOwned
      ? null
      : {
          title,
          description: DEFAULT_SITE_DESCRIPTION,
          image: brandLogo || config.favicon || '/favicon.png',
          url: pathname,
          type: 'website',
          siteName: brand,
          noIndex:
            pathname.startsWith('/admin') ||
            pathname.startsWith('/login') ||
            pathname.startsWith('/register'),
        },
  )
  const homeTo = getHomePath(isLogin)
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

  const moreSections = useMemo(
    () =>
      buildMobileMoreSectionsFromAuth({
        isLogin,
        isMemberLike,
        username: user?.username,
        showAbout,
        isStaff,
        isSiteAdmin,
        isOrgAdmin,
        orgName: currentOrg?.name,
        orgRole: user?.orgRole,
        roleId: user?.roleId,
      }),
    [
      isLogin,
      isMemberLike,
      user?.username,
      user?.orgRole,
      user?.roleId,
      showAbout,
      isStaff,
      isSiteAdmin,
      isOrgAdmin,
      currentOrg?.name,
    ],
  )
  const moreAccountLinks = useMemo(
    () => buildMobileMoreAccountLinks(isLogin),
    [isLogin],
  )

  // 路由变化时收起「更多」
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

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
    <>
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
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                浏览
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isLogin && (
                    <SidebarMenuItem data-bottom-nav="true">
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
                  <SidebarMenuItem data-bottom-nav="true">
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
                      isActive={pathname.startsWith('/blog-plaza')}
                      tooltip="博客"
                    >
                      <NavLink to="/blog-plaza">
                        <NewspaperIcon />
                        <span>博客</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem data-bottom-nav="true">
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
                  <SidebarMenuItem data-bottom-nav="true">
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
                      isActive={pathname.startsWith('/problemset')}
                      tooltip="题单"
                    >
                      <NavLink to="/problemset">
                        <ListTodoIcon />
                        <span>题单</span>
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
                    <SidebarMenuItem {...(!isLogin ? { 'data-bottom-nav': 'true' } : {})}>
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

            {/* PC：管理作为前台侧栏二级分组；移动端走底栏 +「更多」 */}
            {isLogin && isStaff && (
              <AdminSidebarNavGroups
                isStaff={isStaff}
                isSiteAdmin={isSiteAdmin}
                canOrgSettings={isSiteAdmin || isOrgAdmin}
                orgName={currentOrg?.name}
              />
            )}
          </SidebarContent>

          <SidebarFooter>
            <SidebarSeparator />
            {isLogin && orgs.length > 0 && (
              <div className="group-data-[collapsible=icon]:hidden" data-bottom-nav="true">
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
                      {formatOrgSwitchLabel(o.name, o.myRole)}
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
                  <ConfirmDialog
                    title="确认退出？"
                    description="退出后需要重新登录才能访问个人相关功能。"
                    confirmLabel="退出"
                    onConfirm={handleLogout}
                  >
                    <SidebarMenuButton
                      type="button"
                      tooltip={user?.name || '退出'}
                    >
                      <LogOutIcon />
                      <span>退出登录</span>
                    </SidebarMenuButton>
                  </ConfirmDialog>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="h-svh min-h-0 overflow-hidden">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            {/* 移动端：子页左上角返回，主 Tab 仅底栏；桌面侧栏常开不显示返回 */}
            <MobileNavBack />
            <SidebarTrigger className="-ml-1 hidden md:flex" />
            <Separator orientation="vertical" className="mr-2 hidden h-4 md:block" />
            <AnimatedTitle className="min-w-0 flex-1 truncate text-base font-semibold max-[320px]:hidden">
              {title}
            </AnimatedTitle>
            {/* 移动端：紧凑组织切换（桌面由 SidebarFooter 提供） */}
            {isLogin && orgs.length > 0 && (
              <MobileOrgSwitcher
                orgs={orgs}
                currentOrgId={user?.orgId || currentOrg?.id}
                isSiteAdmin={isSiteAdmin}
                onSwitch={(id) => void handleSwitchOrg(id)}
              />
            )}
            <div className="flex shrink-0 items-center gap-1">
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
          <main
            data-app-scroll-container=""
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-x-none"
          >
            <div className="flex min-h-full min-w-0 flex-1 flex-col">
              <GsapPageTransition>
                {/* 切组织后 JWT 已变但页面常不 remount；用 org key 强制重拉租户数据 */}
                <Outlet key={user?.orgId || currentOrg?.id || 0} />
              </GsapPageTransition>
              <SiteFooter />
              {/* 与固定底栏等高的占位，保证备案号完整露在底栏上方 */}
              {!isAuthPage && <MainBottomNavSpacer />}
            </div>
          </main>
          {!isAuthPage && (
            <>
              <MainBottomNav
                isLogin={isLogin}
                isStaff={isStaff}
                isSiteAdmin={isSiteAdmin}
                isOrgAdmin={isOrgAdmin}
                isCoach={isCoach}
                isCaptain={isCaptain}
                sheetOpen={moreOpen}
                onMoreClick={() => setMoreOpen(true)}
              />
              <MobileMoreSheet
                open={moreOpen}
                onOpenChange={setMoreOpen}
                sections={moreSections}
                footer={
                  <MobileMoreAccountFooter
                    isLogin={isLogin}
                    onLogout={handleLogout}
                    onNavigate={() => setMoreOpen(false)}
                    extraLinks={moreAccountLinks}
                  />
                }
              />
            </>
          )}
        </SidebarInset>
        <Toaster richColors position="top-center" />
        <EmergencyDialogHost />
        <PrivacySetupDialog />
    </>
  )
}
