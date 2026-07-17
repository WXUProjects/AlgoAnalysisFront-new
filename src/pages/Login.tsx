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
function postLoginPath(explicitRedirect: string | null): string {
  return explicitRedirect || '/'
}

export function Login() {
  const { login, isLogin, ready } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)

  const redirectParam = searchParams.get('redirect')

  if (ready && isLogin) {
    return <Navigate to={postLoginPath(redirectParam)} replace />
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
      const msg = res.message || '登录成功'
      const days = res.data?.inactiveDays
      if (res.data?.wasDormant) {
        toast.message(msg, {
          description:
            days && days > 0
              ? `你已经有 ${days} 天没登录了。正在后台同步做题数据，完成后请刷新页面查看。`
              : '正在后台同步你的做题数据，可能需要几分钟；完成后请刷新页面查看。',
          duration: 8000,
        })
      } else if (days && days >= 3) {
        toast.success(msg || `欢迎回来！你已经有 ${days} 天没登录了。`)
      } else {
        toast.success(msg)
      }
      navigate(postLoginPath(redirectParam), { replace: true })
    } else {
      toast.error(res.message || '登录失败，请检查账号密码后重试')
    }
  }

  return (
    <PageShell className="items-center justify-center" stagger={false}>
      <Card className="w-full max-w-sm gap-4 py-4 motion-lift">
        <CardHeader className="gap-1 px-4">
          <CardTitle>登录</CardTitle>
          <CardDescription>使用账号或邮箱登录</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="username">账号 / 邮箱</FieldLabel>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="用户名或邮箱"
                  disabled={pending}
                />
              </Field>
              <Field className="gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="password">密码</FieldLabel>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    忘记密码？
                  </Link>
                </div>
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
