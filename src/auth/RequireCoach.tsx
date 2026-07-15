import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Spinner } from '@/components/ui/spinner'

/** 管理端守卫：管理员 / 教练 / 队长 */
export function RequireCoach({ children }: { children: React.ReactNode }) {
  const { isLogin, isStaff, ready } = useAuth()

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner />
      </div>
    )
  }

  if (!isLogin || !isStaff) {
    return <Navigate to="/" replace />
  }

  return children
}
