import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { RouteErrorFallback } from '@/components/error-boundary'
import { blogRoutes } from '@/routes/blog-routes'
import { mainRouteChildren } from '@/routes/main-routes'

const browserRouter = createBrowserRouter([
  ...blogRoutes,
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorFallback />,
    children: mainRouteChildren,
  },
])

// Page enter motion is GSAP via GsapPageTransition in AppLayout.
export const router = browserRouter
