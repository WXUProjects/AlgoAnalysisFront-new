import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Spinner } from '@/components/ui/spinner'

/**
 * 队员侧页面守卫：
 * - 需登录
 * - 纯教练：不进自己的资料/编辑页，直接去管理端；看他人资料 (?id=) 仍允许
 */
export function RequireMemberLike({ children }: { children: React.ReactNode }) {
  const { isLogin, isCoach, user, ready } = useAuth()
  const location = useLocation()
  const [params] = useSearchParams()

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

  if (isCoach) {
    const viewId = params.get('id')
    const viewingOther =
      location.pathname === '/profile' &&
      viewId &&
      user &&
      Number(viewId) !== user.userId

    if (!viewingOther) {
      return <Navigate to="/admin" replace />
    }
  }

  return children
}
