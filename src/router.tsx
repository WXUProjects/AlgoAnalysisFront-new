import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { RequireCoach } from '@/auth/RequireCoach'
import { RequireLogin } from '@/auth/RequireLogin'
import { RequireMemberLike } from '@/auth/RequireMemberLike'
import { RouteErrorFallback } from '@/components/error-boundary'
import { Spinner } from '@/components/ui/spinner'

const Login = lazy(() =>
  import('@/pages/Login').then((m) => ({ default: m.Login })),
)
const Register = lazy(() =>
  import('@/pages/Register').then((m) => ({ default: m.Register })),
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
const ChangeProfile = lazy(() =>
  import('@/pages/ChangeProfile').then((m) => ({ default: m.ChangeProfile })),
)
const Bulletin = lazy(() =>
  import('@/pages/Bulletin').then((m) => ({ default: m.Bulletin })),
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
const DashboardOrgStatistics = lazy(() =>
  import('@/pages/dashboard/Statistics').then((m) => ({
    default: m.DashboardOrgStatistics,
  })),
)
const DashboardSiteStatistics = lazy(() =>
  import('@/pages/dashboard/Statistics').then((m) => ({
    default: m.DashboardSiteStatistics,
  })),
)
const DashboardAccessAnalytics = lazy(() =>
  import('@/pages/dashboard/AccessAnalytics').then((m) => ({
    default: m.DashboardAccessAnalytics,
  })),
)
const DashboardGroup = lazy(() =>
  import('@/pages/dashboard/Group').then((m) => ({
    default: m.DashboardGroup,
  })),
)
const DashboardOrgUser = lazy(() =>
  import('@/pages/dashboard/User').then((m) => ({
    default: m.DashboardOrgUser,
  })),
)
const DashboardSiteUser = lazy(() =>
  import('@/pages/dashboard/User').then((m) => ({
    default: m.DashboardSiteUser,
  })),
)
const DashboardBulletinManage = lazy(() =>
  import('@/pages/dashboard/BulletinManage').then((m) => ({
    default: m.DashboardBulletinManage,
  })),
)
const DashboardProblemProgress = lazy(() =>
  import('@/pages/dashboard/ProblemProgress').then((m) => ({
    default: m.DashboardProblemProgress,
  })),
)
const DashboardSiteSettings = lazy(() =>
  import('@/pages/dashboard/SiteSettings').then((m) => ({
    default: m.DashboardSiteSettings,
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
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
          <RequireMemberLike>
            <Lazy>
              <Profile />
            </Lazy>
          </RequireMemberLike>
        ),
      },
      {
        path: 'change-profile',
        element: (
          <RequireMemberLike>
            <Lazy>
              <ChangeProfile />
            </Lazy>
          </RequireMemberLike>
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
        path: 'question-bank',
        element: (
          <Lazy>
            <QuestionBank />
          </Lazy>
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
  {
    path: '/admin',
    element: <CoachOutlet />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="statistics" replace /> },
          {
            path: 'statistics',
            element: (
              <Lazy>
                <DashboardOrgStatistics />
              </Lazy>
            ),
          },
          {
            path: 'site-statistics',
            element: (
              <Lazy>
                <DashboardSiteStatistics />
              </Lazy>
            ),
          },
          {
            path: 'access',
            element: (
              <Lazy>
                <DashboardAccessAnalytics />
              </Lazy>
            ),
          },
          {
            path: 'group',
            element: (
              <Lazy>
                <DashboardGroup />
              </Lazy>
            ),
          },
          {
            path: 'user',
            element: (
              <Lazy>
                <DashboardOrgUser />
              </Lazy>
            ),
          },
          {
            path: 'site-users',
            element: (
              <Lazy>
                <DashboardSiteUser />
              </Lazy>
            ),
          },
          {
            path: 'bulletin',
            element: (
              <Lazy>
                <DashboardBulletinManage />
              </Lazy>
            ),
          },
          {
            path: 'problem-progress',
            element: (
              <Lazy>
                <DashboardProblemProgress />
              </Lazy>
            ),
          },
          {
            path: 'site',
            element: (
              <Lazy>
                <DashboardSiteSettings />
              </Lazy>
            ),
          },
          {
            path: 'org',
            element: (
              <Lazy>
                <DashboardOrgSettings />
              </Lazy>
            ),
          },
          {
            path: 'orgs',
            element: (
              <Lazy>
                <DashboardOrgsManage />
              </Lazy>
            ),
          },
        ],
      },
    ],
  },
])
