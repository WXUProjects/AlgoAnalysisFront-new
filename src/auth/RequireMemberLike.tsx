import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Spinner } from '@/components/ui/spinner'

/**
 * 需登录即可访问（个人资料 / 编辑资料等）。
 * 教练与队员均可使用前台资料流程，不再强制跳转管理端。
 */
export function RequireMemberLike({ children }: { children: React.ReactNode }) {
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
