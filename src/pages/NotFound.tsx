import { Link } from 'react-router-dom'
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
import { getHomePath } from '@/lib/home-path'

export function NotFound() {
  const { isLogin, ready } = useAuth()
  // ready 前按访客 home，避免已登录用户短暂指向 /about 再改回 /
  const homeTo = getHomePath(ready ? isLogin : false)

  return (
    <PageShell className="items-center justify-center" stagger={false}>
      <Card className="w-full max-w-md text-center motion-lift">
        <CardHeader>
          <CardTitle>404</CardTitle>
          <CardDescription>找不到该页面</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            你访问的页面不存在，或已被移除。
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link to={homeTo}>返回首页</Link>
          </Button>
        </CardFooter>
      </Card>
    </PageShell>
  )
}
