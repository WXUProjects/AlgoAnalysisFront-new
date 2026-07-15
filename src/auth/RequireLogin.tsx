import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Spinner } from '@/components/ui/spinner'

/** 仅需登录（任意角色） */
export function RequireLogin({ children }: { children: React.ReactNode }) {
  const { isLogin, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner />
      </div>
    )
  }

  if (!isLogin) {
    const redirect = location.pathname + location.search
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    )
  }

  return children
}
