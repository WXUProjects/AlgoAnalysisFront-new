import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { ThemeProvider } from '@/components/theme-provider'
import { SiteConfigProvider } from '@/site/SiteConfigContext'
import { router } from './router'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SiteConfigProvider>
          <RouterProvider router={router} />
        </SiteConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
