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
import { resolvePageTitle } from '@/lib/page-title'
import { staffNavLabel } from '@/lib/roles'
import { useSiteConfig } from '@/site/SiteConfigContext'
import { AnimatedTitle } from '@/components/animated-title'
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
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MotionProvider } from '@/motion/MotionContext'

export function AdminLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const {
    isAdmin,
    isOrgAdmin,
    isStaff,
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
            <SidebarGroup>
              <SidebarGroupLabel>浏览</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
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
                      <Link to="/discover">
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
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            {orgs.length > 0 && (
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
                <SidebarMenuButton asChild tooltip="返回前台">
                  <Link to="/">
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
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AnimatedTitle className="text-sm font-medium">{title}</AnimatedTitle>
            <div className="ml-auto flex items-center gap-1">
              <NotificationInbox enabled={!!user} />
            </div>
          </header>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-x-none">
            <div className="flex min-h-full min-w-0 flex-1 flex-col">
              <div className="min-w-0 flex-1">
                <Outlet />
              </div>
              <SiteFooter />
            </div>
          </div>
        </SidebarInset>
        <Toaster />
        <EmergencyDialogHost />
      </SidebarProvider>
    </TooltipProvider>
    </MotionProvider>
  )
}
