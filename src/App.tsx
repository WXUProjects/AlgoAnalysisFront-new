import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { ErrorBoundary } from '@/components/error-boundary'
import { ThemeProvider } from '@/components/theme-provider'
import { SiteConfigProvider } from '@/site/SiteConfigContext'
import { router } from './router'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SiteConfigProvider>
            <RouterProvider router={router} />
          </SiteConfigProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
