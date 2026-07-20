import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ActivityIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  BarChart3Icon,
  NewspaperIcon,
  CalendarIcon,
  ClipboardCheckIcon,
  FileSpreadsheetIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MegaphoneIcon,
  SettingsIcon,
  SirenIcon,
  UsersIcon,
  WrenchIcon,
  WorkflowIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { getHomePath } from '@/lib/home-path'
import { resolvePageTitle } from '@/lib/page-title'
import { staffNavLabel } from '@/lib/roles'
import { useSiteConfig } from '@/site/SiteConfigContext'
import { AnimatedTitle } from '@/components/animated-title'
import { DomainHintSync } from '@/components/domain-hint-sync'
import { GsapPageTransition } from '@/components/gsap-page-transition'
import { MainBottomNav } from '@/components/main-bottom-nav'
import { MobileNavBack } from '@/components/mobile-nav-back'
import { formatOrgSwitchLabel, MobileOrgSwitcher } from '@/components/mobile-org-switcher'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmergencyDialogHost } from '@/components/emergency-dialog'
import { NotificationInbox } from '@/components/notification-inbox'
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
  useSidebar,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MotionProvider } from '@/motion/MotionContext'

/** 与前台 AppLayout 同构：Provider 外层 + Inner 使用 useSidebar */
export function AdminLayout() {
  return (
    <MotionProvider>
      <TooltipProvider>
        <DomainHintSync />
        <SidebarProvider>
          <AdminLayoutInner />
        </SidebarProvider>
      </TooltipProvider>
    </MotionProvider>
  )
}

function AdminLayoutInner() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { openMobile, setOpenMobile } = useSidebar()
  const {
    isAdmin,
    isOrgAdmin,
    isCoach,
    isCaptain,
    isStaff,
    isLogin,
    user,
    orgs,
    logout,
    currentOrg,
    switchOrg,
  } = useAuth()
  const { config } = useSiteConfig()
  const brand =
    (currentOrg?.brandTitle && currentOrg.brandTitle.trim()) ||
    config.siteTitle ||
    'GoAlgo'
  const staffLabel = staffNavLabel(user)
  const staffSub = isAdmin
    ? '站点后台'
    : currentOrg?.name
      ? `${currentOrg.name} · 组织后台`
      : '组织后台'
  const title = resolvePageTitle(pathname) || staffLabel
  useDocumentTitle(title, brand)
  // 组织设置（品牌/识别码/任命）仅 org_admin / 站管；教练/队长单独「训练报告」
  const canOrgSettings = isAdmin || isOrgAdmin
  const canTrainingReport = isStaff
  const showTeamNav = isStaff
  const homeTo = getHomePath(isLogin)

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
              <SidebarGroupLabel>
                {currentOrg?.name ? `组织 · ${currentOrg.name}` : '组织'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        pathname === '/admin/statistics' ||
                        pathname.startsWith('/admin/statistics/')
                      }
                      tooltip="组织数据统计"
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
                      isActive={
                        pathname === '/admin/bulletin' ||
                        pathname.startsWith('/admin/bulletin/')
                      }
                      tooltip="组织公告"
                    >
                      <NavLink to="/admin/bulletin">
                        <MegaphoneIcon />
                        <span>组织公告</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/admin/group')}
                      tooltip="分组管理"
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
                      isActive={
                        pathname === '/admin/user' ||
                        pathname.startsWith('/admin/user/')
                      }
                      tooltip="组织成员"
                    >
                      <NavLink to="/admin/user">
                        <LayoutDashboardIcon />
                        <span>成员管理</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {canTrainingReport && !canOrgSettings && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          pathname.startsWith('/admin/org') &&
                          !pathname.startsWith('/admin/orgs')
                        }
                        tooltip="训练报告"
                      >
                        <NavLink to="/admin/org">
                          <FileSpreadsheetIcon />
                          <span>训练报告</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
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
                      isActive={pathname.startsWith('/admin/site-statistics')}
                      tooltip="站点数据统计"
                    >
                      <NavLink to="/admin/site-statistics">
                        <BarChart3Icon />
                        <span>数据统计</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/admin/access')}
                      tooltip="访问统计"
                    >
                      <NavLink to="/admin/access">
                        <ActivityIcon />
                        <span>访问统计</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/admin/site-users')}
                      tooltip="站点用户"
                    >
                      <NavLink to="/admin/site-users">
                        <LayoutDashboardIcon />
                        <span>用户管理</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
                      isActive={pathname.startsWith('/admin/problem-edits')}
                      tooltip="题库审查"
                    >
                      <NavLink to="/admin/problem-edits">
                        <ClipboardCheckIcon />
                        <span>审查</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/admin/blog')}
                      tooltip="博客管理"
                    >
                      <NavLink to="/admin/blog">
                        <NewspaperIcon />
                        <span>博客管理</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        pathname === '/admin/site-bulletin' ||
                        pathname.startsWith('/admin/site-bulletin/')
                      }
                      tooltip="站点公告"
                    >
                      <NavLink to="/admin/site-bulletin">
                        <MegaphoneIcon />
                        <span>站点公告</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/admin/emergency')}
                      tooltip="紧急通知"
                    >
                      <NavLink to="/admin/emergency">
                        <SirenIcon />
                        <span>紧急通知</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        pathname === '/admin/site' ||
                        pathname.startsWith('/admin/site/')
                      }
                      tooltip="站点设置"
                    >
                      <NavLink to="/admin/site">
                        <SettingsIcon />
                        <span>站点设置</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/admin/ops')}
                      tooltip="运维"
                    >
                      <NavLink to="/admin/ops">
                        <WrenchIcon />
                        <span>运维</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          {/* 与底栏重复的前台入口：移动端 Sheet 内隐藏，避免与底栏重复 */}
          <SidebarGroup>
            <SidebarGroupLabel>浏览</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem data-bottom-nav="true">
                  <SidebarMenuButton asChild tooltip="比赛">
                    <Link to="/contest">
                      <CalendarIcon />
                      <span>比赛</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem data-bottom-nav="true">
                  <SidebarMenuButton asChild tooltip="动态">
                    <Link to="/discover">
                      <ActivityIcon />
                      <span>动态</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem data-bottom-nav="true">
                  <SidebarMenuButton asChild tooltip="题库">
                    <Link to="/question-bank">
                      <BookOpenIcon />
                      <span>题库</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          {orgs.length > 0 && (
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
              <SidebarMenuButton asChild tooltip="返回前台">
                <Link to={homeTo}>
                  <ArrowLeftIcon />
                  <span>返回前台</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="修改密码">
                <Link to="/change-password">
                  <KeyRoundIcon />
                  <span>修改密码</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <ConfirmDialog
                title="确认退出？"
                description="退出后需要重新登录才能访问个人相关功能。"
                confirmLabel="退出"
                onConfirm={handleLogout}
              >
                <SidebarMenuButton tooltip="退出">
                  <LogOutIcon />
                  <span>退出登录</span>
                </SidebarMenuButton>
              </ConfirmDialog>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <ThemeToggle />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="h-svh min-h-0 overflow-hidden">
        {/* 顶栏：与前台一致 — 移动端返回 + 隐藏汉堡（改用底栏「更多」）+ 组织切换 */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <MobileNavBack />
          <SidebarTrigger className="-ml-1 hidden md:flex" />
          <Separator orientation="vertical" className="mr-2 hidden h-4 md:block" />
          <AnimatedTitle className="min-w-0 flex-1 truncate text-base font-semibold max-[320px]:hidden">
            {title}
          </AnimatedTitle>
          {orgs.length > 0 && (
            <MobileOrgSwitcher
              orgs={orgs}
              currentOrgId={user?.orgId || currentOrg?.id}
              isSiteAdmin={isAdmin}
              onSwitch={(id) => void handleSwitchOrg(id)}
            />
          )}
          <div className="flex shrink-0 items-center gap-1">
            <NotificationInbox enabled={!!user} />
          </div>
        </header>

        <main
          data-app-scroll-container=""
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-x-none"
        >
          {/* 底栏留白在内容盒内，避免页脚被固定底栏遮挡 */}
          <div className="flex min-h-full min-w-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            <GsapPageTransition>
              <Outlet />
            </GsapPageTransition>
            <SiteFooter />
          </div>
        </main>

        {/* 与前台同一套底栏：staff 为 首页/发现/比赛/题库/管理/更多 */}
        <MainBottomNav
          isLogin
          isStaff={isStaff}
          isSiteAdmin={isAdmin}
          isOrgAdmin={isOrgAdmin}
          isCoach={isCoach}
          isCaptain={isCaptain}
          sheetOpen={openMobile}
          onMoreClick={() => setOpenMobile(true)}
        />
      </SidebarInset>

      <Toaster richColors position="top-center" />
      <EmergencyDialogHost />
    </>
  )
}
