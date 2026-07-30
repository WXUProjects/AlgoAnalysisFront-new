import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { getHomePath } from '@/lib/home-path'

/** 管理端守卫：组织 staff / 站管 / 持有任意管理权限（自定义角色） */
export function RequireCoach({ children }: { children: React.ReactNode }) {
  const { isLogin, canAccessAdmin, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner />
      </div>
    )
  }

  // 未登录：进登录页并带回跳，避免静默踢到前台
  if (!isLogin) {
    const redirect = location.pathname + location.search
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    )
  }

  // 已登录但无管理/审核权限：持久中文说明 + 返回入口（不得静默 Navigate）
  if (!canAccessAdmin) {
    const homeTo = getHomePath(true)
    return (
      <PageShell className="items-center justify-center" stagger={false}>
        <Card className="w-full max-w-md text-center motion-lift" role="alert">
          <CardHeader>
            <CardTitle>暂无管理权限</CardTitle>
            <CardDescription>
              当前账号无法进入管理中心，请联系管理员开通权限。
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center gap-2">
            <Button asChild>
              <Link to={homeTo}>返回首页</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/discover">去发现</Link>
            </Button>
          </CardFooter>
        </Card>
      </PageShell>
    )
  }

  return children
}
