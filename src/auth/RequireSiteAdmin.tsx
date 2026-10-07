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

/** 站点管理员守卫：仅 isSiteAdmin 可进入 */
export function RequireSiteAdmin({ children }: { children: React.ReactNode }) {
  const { isLogin, isSiteAdmin, ready } = useAuth()
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

  if (!isSiteAdmin) {
    const homeTo = getHomePath(true)
    return (
      <PageShell className="items-center justify-center" stagger={false}>
        <Card className="w-full max-w-md text-center motion-lift" role="alert">
          <CardHeader>
            <CardTitle>需要站点管理员权限</CardTitle>
            <CardDescription>
              打赏管理只有站点管理员可以打开。
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center gap-2">
            <Button asChild>
              <Link to={homeTo}>返回首页</Link>
            </Button>
          </CardFooter>
        </Card>
      </PageShell>
    )
  }

  return children
}
