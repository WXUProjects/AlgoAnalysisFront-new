import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { RequireAuth } from '@/auth/RequireAuth'
import { RequireCoach } from '@/auth/RequireCoach'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { NotFound } from '@/pages/NotFound'
import { Home } from '@/pages/Home'
import { Profile } from '@/pages/Profile'
import { ChangeProfile } from '@/pages/ChangeProfile'
import { Bulletin } from '@/pages/Bulletin'
import { AllActivities } from '@/pages/AllActivities'
import { Contest } from '@/pages/Contest'
import { ContestDetails } from '@/pages/ContestDetails'
import { QuestionBank } from '@/pages/QuestionBank'
import { QuestionBankDetail } from '@/pages/QuestionBankDetail'
import { DashboardStatistics } from '@/pages/dashboard/Statistics'
import { DashboardGroup } from '@/pages/dashboard/Group'
import { DashboardUser } from '@/pages/dashboard/User'
import { DashboardBulletinManage } from '@/pages/dashboard/BulletinManage'
import { DashboardProblemProgress } from '@/pages/dashboard/ProblemProgress'
import { DashboardSiteSettings } from '@/pages/dashboard/SiteSettings'

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
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      {
        path: 'profile',
        element: (
          <RequireAuth>
            <Profile />
          </RequireAuth>
        ),
      },
      {
        path: 'change-profile',
        element: (
          <RequireAuth>
            <ChangeProfile />
          </RequireAuth>
        ),
      },
      { path: 'all-activities', element: <AllActivities /> },
      { path: 'bulletin', element: <Bulletin /> },
      { path: 'contest', element: <Contest /> },
      { path: 'contest/:id', element: <ContestDetails /> },
      { path: 'question-bank', element: <QuestionBank /> },
      {
        path: 'question-bank/detail/:id',
        element: <QuestionBankDetail />,
      },
      { path: 'problem', element: <Navigate to="/question-bank" replace /> },
      // 旧路径兼容
      { path: 'dashboard', element: <Navigate to="/admin" replace /> },
      { path: 'dashboard/*', element: <Navigate to="/admin" replace /> },
      { path: '*', element: <NotFound /> },
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
          { path: 'statistics', element: <DashboardStatistics /> },
          { path: 'group', element: <DashboardGroup /> },
          { path: 'user', element: <DashboardUser /> },
          { path: 'bulletin', element: <DashboardBulletinManage /> },
          { path: 'problem-progress', element: <DashboardProblemProgress /> },
          { path: 'site', element: <DashboardSiteSettings /> },
        ],
      },
    ],
  },
])
