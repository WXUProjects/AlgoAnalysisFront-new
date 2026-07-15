import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Spinner } from '@/components/ui/spinner'

export function RequireCoach({ children }: { children: React.ReactNode }) {
  const { isLogin, isAdmin, isCoach, ready } = useAuth()

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner />
      </div>
    )
  }

  if (!isLogin || (!isAdmin && !isCoach)) {
    return <Navigate to="/" replace />
  }

  return children
}
