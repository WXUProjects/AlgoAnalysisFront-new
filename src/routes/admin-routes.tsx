import { Navigate, Outlet, type RouteObject } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { RequireCoach } from '@/auth/RequireCoach'
import { RequirePerm } from '@/auth/RequirePerm'
import { RouteErrorFallback } from '@/components/error-boundary'
import { Perm } from '@/lib/permissions'
import { Lazy } from '@/routes/lazy'
import {
  DashboardBlogAdmin,
  DashboardOps,
  DashboardOrgBulletinManage,
  DashboardOrgPeople,
  DashboardOrgSettings,
  DashboardOrgStatistics,
  DashboardOrgsManage,
  DashboardPasteReview,
  DashboardProblemEditReview,
  DashboardProblemProgress,
  DashboardReportsManage,
  DashboardRolesManage,
  DashboardSiteData,
  DashboardSiteNotices,
  DashboardSiteSettings,
  DashboardSiteUser,
  DashboardSubscriptions,
  DashboardPluginsManage,
} from '@/routes/lazy-pages'

function CoachOutlet() {
  return (
    <RequireCoach>
      <Outlet />
    </RequireCoach>
  )
}

/** 管理首页候选：按权限找第一个可访问的管理页（自定义角色也能落到正确入口） */
const ADMIN_INDEX_CANDIDATES: { path: string; anyOf: string[] }[] = [
  { path: 'statistics', anyOf: [Perm.OrgReportView] },
  { path: 'org', anyOf: [Perm.OrgInfoWrite, Perm.OrgPolicyToggle] },
  {
    path: 'user',
    anyOf: [
      Perm.OrgReportView,
      Perm.OrgGroupManage,
      Perm.OrgMemberRole,
      Perm.OrgMemberRemove,
      Perm.OrgRoleManage,
      Perm.OrgJoinReview,
    ],
  },
  { path: 'bulletin', anyOf: [Perm.OrgBulletinManage] },
  { path: 'problem-edits', anyOf: [Perm.ContentProblemReview] },
  { path: 'blog', anyOf: [Perm.ContentBlogModerate, Perm.SiteBlogBoard] },
  { path: 'reports', anyOf: [Perm.ContentReportHandle] },
  { path: 'site-statistics', anyOf: [Perm.SiteStatsRead] },
  { path: 'site-users', anyOf: [Perm.SiteUserList] },
  { path: 'subscriptions', anyOf: [Perm.SiteUserSync] },
  { path: 'plugins', anyOf: [Perm.SiteUserSync] },
  { path: 'site-bulletin', anyOf: [Perm.SiteBulletin, Perm.SiteEmergency] },
  { path: 'site', anyOf: [Perm.SiteConfigRead, Perm.SiteConfigWrite] },
]

function AdminIndexRedirect() {
  const { can, ready } = useAuth()
  if (!ready) return null
  const first = ADMIN_INDEX_CANDIDATES.find((c) => c.anyOf.some((x) => can(x)))
  return <Navigate to={first?.path ?? 'statistics'} replace />
}

/** AppLayout 下 /admin 子路由 */
export const adminRoutes: RouteObject = {
  path: 'admin',
  element: <CoachOutlet />,
  // 管理分组独立错误边界：管理页崩溃隔离在内容区
  errorElement: <RouteErrorFallback />,
  children: [
    {
      index: true,
      element: <AdminIndexRedirect />,
    },
    {
      path: 'statistics',
      element: (
        <RequirePerm anyOf={[Perm.OrgReportView]}>
          <Lazy>
            <DashboardOrgStatistics />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      // 融合页：数据概览 + 访问分析（原 /admin/access）
      path: 'site-statistics',
      element: (
        <RequirePerm anyOf={[Perm.SiteStatsRead]}>
          <Lazy>
            <DashboardSiteData />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'access',
      element: <Navigate to="/admin/site-statistics?tab=access" replace />,
    },
    {
      path: 'group',
      element: <Navigate to="/admin/user?tab=group" replace />,
    },
    {
      // 融合页：组织成员 + 分组 + 成员任命 + 组织角色
      path: 'user',
      element: (
        <RequirePerm
          anyOf={[
            Perm.OrgReportView,
            Perm.OrgGroupManage,
            Perm.OrgMemberRole,
            Perm.OrgMemberRemove,
            Perm.OrgRoleManage,
            Perm.OrgJoinReview,
          ]}
        >
          <Lazy>
            <DashboardOrgPeople />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'site-users',
      element: (
        <RequirePerm anyOf={[Perm.SiteUserList]}>
          <Lazy>
            <DashboardSiteUser />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'subscriptions',
      element: (
        <RequirePerm anyOf={[Perm.SiteUserSync]}>
          <Lazy>
            <DashboardSubscriptions />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'plugins',
      element: (
        <RequirePerm anyOf={[Perm.SiteUserSync]}>
          <Lazy><DashboardPluginsManage /></Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'bulletin',
      element: (
        <RequirePerm anyOf={[Perm.OrgBulletinManage]}>
          <Lazy>
            <DashboardOrgBulletinManage />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      // 融合页：站点公告 + 紧急通知
      path: 'site-bulletin',
      element: (
        <RequirePerm anyOf={[Perm.SiteBulletin, Perm.SiteEmergency]}>
          <Lazy>
            <DashboardSiteNotices />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'emergency',
      element: <Navigate to="/admin/site-bulletin?tab=emergency" replace />,
    },
    {
      path: 'problem-progress',
      element: (
        <RequirePerm anyOf={[Perm.OrgReportView, Perm.SiteProblemOps]}>
          <Lazy>
            <DashboardProblemProgress />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'problem-edits',
      element: (
        <RequirePerm anyOf={[Perm.ContentProblemReview]}>
          <Lazy>
            <DashboardProblemEditReview />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'site',
      element: (
        <RequirePerm anyOf={[Perm.SiteConfigRead, Perm.SiteConfigWrite]}>
          <Lazy>
            <DashboardSiteSettings />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'ops',
      element: (
        <RequirePerm
          anyOf={[
            Perm.SiteSpiderOps,
            Perm.SiteProblemOps,
            Perm.SiteBackup,
            Perm.SiteConfigWrite,
          ]}
        >
          <Lazy>
            <DashboardOps />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'org',
      element: (
        <RequirePerm anyOf={[Perm.OrgInfoWrite, Perm.OrgPolicyToggle]}>
          <Lazy>
            <DashboardOrgSettings />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'orgs',
      element: (
        <RequirePerm anyOf={[Perm.SiteOrgList]}>
          <Lazy>
            <DashboardOrgsManage />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'roles',
      element: (
        <RequirePerm anyOf={[Perm.SiteRoleManage]}>
          <Lazy>
            <DashboardRolesManage />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'blog',
      element: (
        <RequirePerm anyOf={[Perm.ContentBlogModerate, Perm.SiteBlogBoard]}>
          <Lazy>
            <DashboardBlogAdmin />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'reports',
      element: (
        <RequirePerm anyOf={[Perm.ContentReportHandle]}>
          <Lazy>
            <DashboardReportsManage />
          </Lazy>
        </RequirePerm>
      ),
    },
    {
      path: 'paste-review',
      element: (
        <RequirePerm anyOf={[Perm.ContentCommunityMod, Perm.ContentReportHandle]}>
          <Lazy>
            <DashboardPasteReview />
          </Lazy>
        </RequirePerm>
      ),
    },
  ],
}
