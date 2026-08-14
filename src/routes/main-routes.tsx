import { Navigate, type RouteObject } from 'react-router-dom'
import { RequireLogin } from '@/auth/RequireLogin'
import { RouteErrorFallback } from '@/components/error-boundary'
import { Lazy } from '@/routes/lazy'
import { adminRoutes } from '@/routes/admin-routes'
import {
  About,
  AllActivities,
  BlogPlaza,
  Bulletin,
  ChangePassword,
  ChangeProfile,
  CodeToImage,
  Contest,
  ContestDetails,
  Discover,
  ForgotPassword,
  Home,
  Login,
  NotFound,
  OrgHub,
  OrgInvite,
  PasteCreate,
  PasteView,
  PrivacySettings,
  ProblemContentEdit,
  ProblemsetAddManual,
  ProblemsetDetail,
  ProblemsetHome,
  ProblemSolutionEdit,
  ProblemSolutionView,
  Profile,
  QuestionBank,
  QuestionBankDetail,
  Register,
  Social,
  TicketCreate,
  TicketDetail,
  TicketList,
  ToolsHub,
} from '@/routes/lazy-pages'

/** AppLayout 下主路由 children（含 admin 与 404） */
export const mainRouteChildren: RouteObject[] = [
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
      // 工单：列表+创建入口（RequireLogin）
      {
        path: 'tickets',
        element: (
          <RequireLogin>
            <Lazy>
              <TicketList />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'tickets/create',
        element: (
          <RequireLogin>
            <Lazy>
              <TicketCreate />
            </Lazy>
          </RequireLogin>
        ),
      },
      {
        path: 'tickets/:id',
        element: (
          <RequireLogin>
            <Lazy>
              <TicketDetail />
            </Lazy>
          </RequireLogin>
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
      adminRoutes,
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
]
