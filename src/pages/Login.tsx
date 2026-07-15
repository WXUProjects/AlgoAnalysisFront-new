import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { jwt } from '@/lib/jwt'
import { isCoachOnlyRole } from '@/lib/roles'

function postLoginPath(explicitRedirect: string | null): string {
  // 纯教练：直接进入教练管理（无个人资料等队员流程）
  const roleId = jwt.getUserInfo()?.roleId
  if (isCoachOnlyRole(roleId)) return '/admin'
  return explicitRedirect || '/'
}

export function Login() {
  const { login, isLogin, isCoach, ready } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)

  const redirectParam = searchParams.get('redirect')

  if (ready && isLogin) {
    return <Navigate to={postLoginPath(isCoach ? null : redirectParam)} replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      toast.error('请输入账号和密码')
      return
    }
    setPending(true)
    const res = await login(username, password)
    setPending(false)
    if (res.success) {
      toast.success(res.message || '登录成功')
      navigate(postLoginPath(redirectParam), { replace: true })
    } else {
      toast.error(res.message || '登录失败')
    }
  }

  return (
    <PageShell className="items-center justify-center" stagger={false}>
      <Card className="w-full max-w-sm gap-4 py-4 motion-lift">
        <CardHeader className="gap-1 px-4">
          <CardTitle>登录</CardTitle>
          <CardDescription>使用账号密码登录 GoAlgo</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="username">账号</FieldLabel>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入账号"
                  disabled={pending}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="password">密码</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  disabled={pending}
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 px-4">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              登录
            </Button>
            <p className="text-sm text-muted-foreground">
              没有账号？{' '}
              <Link to="/register" className="text-foreground underline-offset-4 hover:underline">
                立即注册
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </PageShell>
  )
}
