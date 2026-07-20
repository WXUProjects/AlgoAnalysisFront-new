import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { getHomePath } from '@/lib/home-path'

/** 管理端守卫：管理员 / 教练 / 队长 */
export function RequireCoach({ children }: { children: React.ReactNode }) {
  const { isLogin, isStaff, ready } = useAuth()
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

  // 已登录但非 staff：持久中文说明 + 返回入口（不得静默 Navigate）
  if (!isStaff) {
    const homeTo = getHomePath(true)
    return (
      <PageShell className="items-center justify-center" stagger={false}>
        <Card className="w-full max-w-md text-center motion-lift" role="alert">
          <CardHeader>
            <CardTitle>暂无管理权限</CardTitle>
            <CardDescription>
              当前账号无法进入管理后台。如需使用，请联系组织管理员开通教练、队长或团队管理员权限。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              你仍可使用前台功能查看题库、比赛与个人数据。
            </p>
          </CardContent>
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
