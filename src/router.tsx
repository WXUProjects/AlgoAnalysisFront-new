import { Suspense, type ReactNode } from 'react'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
} from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { useAuth } from '@/auth/AuthContext'
import { RequireCoach } from '@/auth/RequireCoach'
import { RequireLogin } from '@/auth/RequireLogin'
import { RequirePerm } from '@/auth/RequirePerm'
import { Perm } from '@/lib/permissions'
import { RouteErrorFallback } from '@/components/error-boundary'
import { Spinner } from '@/components/ui/spinner'
import { lazyWithRetry as lazy } from '@/lib/lazy-with-retry'

const Login = lazy(() =>
  import('@/pages/Login').then((m) => ({ default: m.Login })),
)
const Register = lazy(() =>
  import('@/pages/Register').then((m) => ({ default: m.Register })),
)
const OrgInvite = lazy(() =>
  import('@/pages/OrgInvite').then((m) => ({ default: m.OrgInvite })),
)
const ForgotPassword = lazy(() =>
  import('@/pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })),
)
const ChangePassword = lazy(() =>
  import('@/pages/ChangePassword').then((m) => ({ default: m.ChangePassword })),
)
const NotFound = lazy(() =>
  import('@/pages/NotFound').then((m) => ({ default: m.NotFound })),
)
const Home = lazy(() =>
  import('@/pages/Home').then((m) => ({ default: m.Home })),
)
const Profile = lazy(() =>
  import('@/pages/Profile').then((m) => ({ default: m.Profile })),
)
const Social = lazy(() =>
  import('@/pages/Social').then((m) => ({ default: m.Social })),
)
const PrivacySettings = lazy(() =>
  import('@/pages/PrivacySettings').then((m) => ({
    default: m.PrivacySettings,
  })),
)
const ChangeProfile = lazy(() =>
  import('@/pages/ChangeProfile').then((m) => ({ default: m.ChangeProfile })),
)
const Bulletin = lazy(() =>
  import('@/pages/Bulletin').then((m) => ({ default: m.Bulletin })),
)
const Discover = lazy(() =>
  import('@/pages/Discover').then((m) => ({ default: m.Discover })),
)
const BlogPlaza = lazy(() =>
  import('@/pages/BlogPlaza').then((m) => ({ default: m.BlogPlaza })),
)
const AllActivities = lazy(() =>
  import('@/pages/AllActivities').then((m) => ({ default: m.AllActivities })),
)
const Contest = lazy(() =>
  import('@/pages/Contest').then((m) => ({ default: m.Contest })),
)
const ContestDetails = lazy(() =>
  import('@/pages/ContestDetails').then((m) => ({ default: m.ContestDetails })),
)

const QuestionBank = lazy(() =>
  import('@/pages/QuestionBank').then((m) => ({ default: m.QuestionBank })),
)
const QuestionBankDetail = lazy(() =>
  import('@/pages/QuestionBankDetail').then((m) => ({
    default: m.QuestionBankDetail,
  })),
)
const ProblemsetHome = lazy(() =>
  import('@/pages/problemset/ProblemsetHome').then((m) => ({
    default: m.ProblemsetHome,
  })),
)
const ProblemsetDetail = lazy(() =>
  import('@/pages/problemset/ProblemsetDetail').then((m) => ({
    default: m.ProblemsetDetail,
  })),
)
const ProblemsetAddManual = lazy(() =>
  import('@/pages/problemset/ProblemsetAddManual').then((m) => ({
    default: m.ProblemsetAddManual,
  })),
)
const ProblemContentEdit = lazy(() =>
  import('@/pages/ProblemContentEdit').then((m) => ({
    default: m.ProblemContentEdit,
  })),
)
const ProblemSolutionEdit = lazy(() =>
  import('@/pages/ProblemSolutionEdit').then((m) => ({
    default: m.ProblemSolutionEdit,
  })),
)
const ProblemSolutionView = lazy(() =>
  import('@/pages/ProblemSolutionView').then((m) => ({
    default: m.ProblemSolutionView,
  })),
)
const DashboardOrgStatistics = lazy(() =>
  import('@/pages/dashboard/Statistics').then((m) => ({
    default: m.DashboardOrgStatistics,
  })),
)
const DashboardSiteData = lazy(() =>
  import('@/pages/dashboard/SiteData').then((m) => ({
    default: m.DashboardSiteData,
  })),
)
const DashboardOrgPeople = lazy(() =>
  import('@/pages/dashboard/OrgPeople').then((m) => ({
    default: m.DashboardOrgPeople,
  })),
)
const DashboardSiteUser = lazy(() =>
  import('@/pages/dashboard/User').then((m) => ({
    default: m.DashboardSiteUser,
  })),
)
const DashboardOrgBulletinManage = lazy(() =>
  import('@/pages/dashboard/BulletinManage').then((m) => ({
    default: m.DashboardOrgBulletinManage,
  })),
)
const DashboardSiteNotices = lazy(() =>
  import('@/pages/dashboard/SiteNotices').then((m) => ({
    default: m.DashboardSiteNotices,
  })),
)
const DashboardProblemProgress = lazy(() =>
  import('@/pages/dashboard/ProblemProgress').then((m) => ({
    default: m.DashboardProblemProgress,
  })),
)
const DashboardProblemEditReview = lazy(() =>
  import('@/pages/dashboard/ProblemEditReview').then((m) => ({
    default: m.DashboardProblemEditReview,
  })),
)
const DashboardSiteSettings = lazy(() =>
  import('@/pages/dashboard/SiteSettings').then((m) => ({
    default: m.DashboardSiteSettings,
  })),
)
const DashboardOps = lazy(() =>
  import('@/pages/dashboard/Ops').then((m) => ({
    default: m.DashboardOps,
  })),
)
const DashboardOrgSettings = lazy(() =>
  import('@/pages/dashboard/OrgSettings').then((m) => ({
    default: m.DashboardOrgSettings,
  })),
)
const DashboardOrgsManage = lazy(() =>
  import('@/pages/dashboard/OrgsManage').then((m) => ({
    default: m.DashboardOrgsManage,
  })),
)
const DashboardReportsManage = lazy(() =>
  import('@/pages/dashboard/ReportsManage').then((m) => ({
    default: m.DashboardReportsManage,
  })),
)
const DashboardBlogAdmin = lazy(() =>
  import('@/pages/dashboard/BlogAdmin').then((m) => ({
    default: m.DashboardBlogAdmin,
  })),
)
const DashboardRolesManage = lazy(() =>
  import('@/pages/dashboard/RolesManage').then((m) => ({
    default: m.DashboardRolesManage,
  })),
)
const OrgHub = lazy(() =>
  import('@/pages/OrgHub').then((m) => ({ default: m.OrgHub })),
)
const About = lazy(() =>
  import('@/pages/About').then((m) => ({ default: m.About })),
)
const ToolsHub = lazy(() =>
  import('@/pages/tools/ToolsHub').then((m) => ({ default: m.ToolsHub })),
)
const PasteCreate = lazy(() =>
  import('@/pages/tools/PasteCreate').then((m) => ({ default: m.PasteCreate })),
)
const PasteView = lazy(() =>
  import('@/pages/tools/PasteView').then((m) => ({ default: m.PasteView })),
)
const CodeToImage = lazy(() =>
  import('@/pages/tools/CodeToImage').then((m) => ({ default: m.CodeToImage })),
)
const BlogLayout = lazy(() =>
  import('@/layouts/BlogLayout').then((m) => ({ default: m.BlogLayout })),
)
const BlogAdminLayout = lazy(() =>
  import('@/layouts/BlogAdminLayout').then((m) => ({
    default: m.BlogAdminLayout,
  })),
)
const BlogHome = lazy(() =>
  import('@/pages/blog/BlogHome').then((m) => ({ default: m.BlogHome })),
)
const BlogArticlePage = lazy(() =>
  import('@/pages/blog/BlogArticle').then((m) => ({
    default: m.BlogArticlePage,
  })),
)
const BlogManage = lazy(() =>
  import('@/pages/blog/BlogManage').then((m) => ({ default: m.BlogManage })),
)
const BlogEditor = lazy(() =>
  import('@/pages/blog/BlogEditor').then((m) => ({ default: m.BlogEditor })),
)
const BlogAnalyticsPage = lazy(() =>
  import('@/pages/blog/BlogAnalytics').then((m) => ({
    default: m.BlogAnalyticsPage,
  })),
)
const BlogCategoriesPage = lazy(() =>
  import('@/pages/blog/BlogCategories').then((m) => ({
    default: m.BlogCategoriesPage,
  })),
)
const BlogSettingsPage = lazy(() =>
  import('@/pages/blog/BlogSettings').then((m) => ({
    default: m.BlogSettingsPage,
  })),
)
const BlogCategoriesPublicPage = lazy(() =>
  import('@/pages/blog/BlogCategoriesPublic').then((m) => ({
    default: m.BlogCategoriesPublicPage,
  })),
)
const BlogArchivesPage = lazy(() =>
  import('@/pages/blog/BlogArchives').then((m) => ({
    default: m.BlogArchivesPage,
  })),
)
const BlogAboutPage = lazy(() =>
  import('@/pages/blog/BlogAbout').then((m) => ({ default: m.BlogAboutPage })),
)

function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <Spinner className="size-6" />
    </div>
  )
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

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
  { path: 'org', anyOf: [Perm.OrgInfoWrite, Perm.OrgPolicyToggle, Perm.OrgRoleManage] },
  { path: 'user', anyOf: [Perm.OrgGroupManage, Perm.OrgMemberRole] },
  { path: 'bulletin', anyOf: [Perm.OrgBulletinManage] },
  { path: 'problem-edits', anyOf: [Perm.ContentProblemReview] },
  { path: 'blog', anyOf: [Perm.ContentBlogModerate, Perm.SiteBlogBoard] },
  { path: 'reports', anyOf: [Perm.ContentReportHandle] },
  { path: 'site-statistics', anyOf: [Perm.SiteStatsRead] },
  { path: 'site-users', anyOf: [Perm.SiteUserList] },
  { path: 'site-bulletin', anyOf: [Perm.SiteBulletin, Perm.SiteEmergency] },
  { path: 'site', anyOf: [Perm.SiteConfigRead, Perm.SiteConfigWrite] },
]

function AdminIndexRedirect() {
  const { can, ready } = useAuth()
  if (!ready) return null
  const first = ADMIN_INDEX_CANDIDATES.find((c) => c.anyOf.some((x) => can(x)))
  return <Navigate to={first?.path ?? 'statistics'} replace />
}

const browserRouter = createBrowserRouter([
  // Manage is a standalone shell (new tab from public blog)
  {
    path: '/blog/:username/manage',
    element: (
      <Lazy>
        <BlogAdminLayout />
      </Lazy>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      // 无路径分组：子页崩溃隔离在博客管理壳内容区
      {
        errorElement: <RouteErrorFallback />,
        children: [
      {
        index: true,
        element: (
          <Lazy>
            <BlogManage />
          </Lazy>
        ),
      },
      {
        path: 'new',
        element: (
          <Lazy>
            <BlogEditor />
          </Lazy>
        ),
      },
      {
        path: 'edit/:id',
        element: (
          <Lazy>
            <BlogEditor />
          </Lazy>
        ),
      },
      {
        path: 'analytics',
        element: (
          <Lazy>
            <BlogAnalyticsPage />
          </Lazy>
        ),
      },
      {
        path: 'categories',
        element: (
          <Lazy>
            <BlogCategoriesPage />
          </Lazy>
        ),
      },
      {
        path: 'settings',
        element: (
          <Lazy>
            <BlogSettingsPage />
          </Lazy>
        ),
      },
        ],
      },
    ],
  },
  // Public reading shell (Chirpy / 简约)
  {
    path: '/blog/:username',
    element: (
      <Lazy>
        <BlogLayout />
      </Lazy>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      // 无路径分组：文章/列表崩溃隔离在博客阅读壳内容区
      {
        errorElement: <RouteErrorFallback />,
        children: [
      {
        index: true,
        element: (
          <Lazy>
            <BlogHome />
          </Lazy>
        ),
      },
      {
        path: 'categories',
        element: (
          <Lazy>
            <BlogCategoriesPublicPage />
          </Lazy>
        ),
      },
      {
        path: 'archives',
        element: (
          <Lazy>
            <BlogArchivesPage />
          </Lazy>
        ),
      },
      {
        path: 'about',
        element: (
          <Lazy>
            <BlogAboutPage />
          </Lazy>
        ),
      },
      {
        path: ':slug',
        element: (
          <Lazy>
            <BlogArticlePage />
          </Lazy>
        ),
      },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      // 无路径分组：子页崩溃时回退 UI 渲染在 AppLayout 内容区，导航仍可用
      {
        errorElement: <RouteErrorFallback />,
        children: [
      {
        index: true,
        element: (
          <Lazy>
            <Home />
          </Lazy>
        ),
      },
      {
        path: 'login',
        element: (
          <Lazy>
            <Login />
          </Lazy>
        ),
      },
      {
        path: 'register',
        element: (
          <Lazy>
            <Register />
          </Lazy>
        ),
      },
      {
        path: 'join',
        element: (
          <Lazy>
            <OrgInvite />
          </Lazy>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <Lazy>
            <ForgotPassword />
          </Lazy>
        ),
      },
      {
        path: 'change-password',
        element: (
          <RequireLogin>
            <Lazy>
              <ChangePassword />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'profile',
        element: (
          <RequireLogin>
            <Lazy>
              <Profile />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'profile/:username',
        element: (
          <Lazy>
            <Profile />
          </Lazy>
        ),
      },
      {
        path: 'social',
        element: (
          <Lazy>
            <Social />
          </Lazy>
        ),
      },
      {
        path: 'social/:username',
        element: (
          <Lazy>
            <Social />
          </Lazy>
        ),
      },
      {
        path: 'privacy',
        element: (
          <RequireLogin>
            <Lazy>
              <PrivacySettings />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'change-profile',
        element: (
          <RequireLogin>
            <Lazy>
              <ChangeProfile />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'discover',
        element: (
          <Lazy>
            <Discover />
          </Lazy>
        ),
      },
      {
        path: 'blog-plaza',
        element: (
          <Lazy>
            <BlogPlaza />
          </Lazy>
        ),
      },
      {
        path: 'all-activities',
        element: (
          <Lazy>
            <AllActivities />
          </Lazy>
        ),
      },
      {
        path: 'bulletin',
        element: (
          <Lazy>
            <Bulletin />
          </Lazy>
        ),
      },
      {
        path: 'contest',
        element: (
          <Lazy>
            <Contest />
          </Lazy>
        ),
      },
      {
        path: 'contest/:id',
        element: (
          <Lazy>
            <ContestDetails />
          </Lazy>
        ),
      },
      {
        path: 'contest-calendar',
        element: <Navigate to="/contest?tab=calendar" replace />,
      },
      {
        path: 'question-bank',
        element: (
          <Lazy>
            <QuestionBank />
          </Lazy>
        ),
      },
      {
        path: 'question-bank/add-problem',
        element: (
          <RequireLogin>
            <Lazy>
              <ProblemsetAddManual />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'problemset',
        element: (
          <Lazy>
            <ProblemsetHome />
          </Lazy>
        ),
      },
      {
        path: 'problemset/:id',
        element: (
          <Lazy>
            <ProblemsetDetail />
          </Lazy>
        ),
      },
      {
        path: 'problemset/:id/add-problem',
        element: (
          <RequireLogin>
            <Lazy>
              <ProblemsetAddManual />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'question-bank/detail/:id',
        element: (
          <Lazy>
            <QuestionBankDetail />
          </Lazy>
        ),
      },
      {
        path: 'question-bank/detail/:id/edit-content',
        element: (
          <RequireLogin>
            <Lazy>
              <ProblemContentEdit />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'question-bank/detail/:id/solution/new',
        element: (
          <RequireLogin>
            <Lazy>
              <ProblemSolutionEdit />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'question-bank/detail/:id/solution/:solutionId/edit',
        element: (
          <RequireLogin>
            <Lazy>
              <ProblemSolutionEdit />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'question-bank/detail/:id/solution/:solutionId',
        element: (
          <Lazy>
            <ProblemSolutionView />
          </Lazy>
        ),
      },
      {
        path: 'org',
        element: (
          <Lazy>
            <OrgHub />
          </Lazy>
        ),
      },
      {
        path: 'about',
        element: (
          <Lazy>
            <About />
          </Lazy>
        ),
      },
      {
        path: 'tools',
        element: (
          <Lazy>
            <ToolsHub />
          </Lazy>
        ),
      },
      {
        path: 'tools/paste',
        element: (
          <RequireLogin>
            <Lazy>
              <PasteCreate />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'tools/code-image',
        element: (
          <RequireLogin>
            <Lazy>
              <CodeToImage />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'p/:slug',
        element: (
          <Lazy>
            <PasteView />
          </Lazy>
        ),
      },
      { path: 'problem', element: <Navigate to="/question-bank" replace /> },
      { path: 'dashboard', element: <Navigate to="/admin" replace /> },
      { path: 'dashboard/*', element: <Navigate to="/admin" replace /> },
      // 管理页挂在前台 AppLayout 下（PC 侧栏二级分组；不再使用独立 AdminLayout）
      {
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
            // 融合页：组织成员 + 组织分组（原 /admin/group）
            path: 'user',
            element: (
              <RequirePerm anyOf={[Perm.OrgReportView, Perm.OrgGroupManage, Perm.OrgMemberRole]}>
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
            // 融合页：站点公告 + 紧急通知（原 /admin/emergency）
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
            element: (
              <Navigate to="/admin/site-bulletin?tab=emergency" replace />
            ),
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
              <RequirePerm anyOf={[Perm.SiteSpiderOps, Perm.SiteProblemOps, Perm.SiteBackup, Perm.SiteConfigWrite]}>
                <Lazy>
                  <DashboardOps />
                </Lazy>
              </RequirePerm>
            ),
          },
          {
            path: 'org',
            element: (
              <RequirePerm anyOf={[Perm.OrgInfoWrite, Perm.OrgPolicyToggle, Perm.OrgRoleManage, Perm.OrgReportView]}>
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
        ],
      },
      {
        path: '*',
        element: (
          <Lazy>
            <NotFound />
          </Lazy>
        ),
      },
        ],
      },
    ],
  },
])

// Page enter motion is GSAP via GsapPageTransition in AppLayout.
export const router = browserRouter
