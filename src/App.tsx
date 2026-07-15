import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { ThemeProvider } from '@/components/theme-provider'
import { router } from './router'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}
