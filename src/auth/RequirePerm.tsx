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

/**
 * 细粒度权限路由守卫：perm 单权限或 anyOf 任一命中即放行。
 * 未登录 → 登录页带回跳；已登录无权限 → 持久中文说明（不静默跳转），
 * 与 RequireCoach 的失败表现保持一致。
 */
export function RequirePerm({
  perm,
  anyOf,
  children,
}: {
  perm?: string
  anyOf?: string[]
  children: React.ReactNode
}) {
  const { isLogin, can, ready } = useAuth()
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

  const codes = perm ? [perm, ...(anyOf ?? [])] : (anyOf ?? [])
  const allowed = codes.length === 0 || codes.some((c) => can(c))
  if (!allowed) {
    const homeTo = getHomePath(true)
    return (
      <PageShell className="items-center justify-center" stagger={false}>
        <Card className="w-full max-w-md text-center motion-lift" role="alert">
          <CardHeader>
            <CardTitle>暂无访问权限</CardTitle>
            <CardDescription>
              当前账号没有访问此页面所需的权限。如需使用，请联系组织管理员或站点管理员为你分配相应角色。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              权限调整后刷新页面即可生效。
            </p>
          </CardContent>
          <CardFooter className="justify-center gap-2">
            <Button asChild>
              <Link to={homeTo}>返回首页</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/statistics">回到管理首页</Link>
            </Button>
          </CardFooter>
        </Card>
      </PageShell>
    )
  }

  return children
}
