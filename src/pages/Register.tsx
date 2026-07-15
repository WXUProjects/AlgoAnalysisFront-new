import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { register as registerApi } from '@/api/auth'
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

export function Register() {
  const { isLogin, ready } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    password: '',
    passwordConfirm: '',
    name: '',
    email: '',
  })
  const [pending, setPending] = useState(false)

  if (ready && isLogin) {
    return <Navigate to="/" replace />
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await registerApi(form)
    setPending(false)
    if (res.success) {
      toast.success(res.message || '注册成功')
      navigate('/login', { replace: true })
    } else {
      toast.error(res.message || '注册失败')
    }
  }

  return (
    <PageShell className="items-center justify-center" stagger={false}>
      <Card className="w-full max-w-sm gap-4 py-4 motion-lift">
        <CardHeader className="gap-1 px-4">
          <CardTitle>注册</CardTitle>
          <CardDescription>创建 GoAlgo 账号</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="reg-username">账号</FieldLabel>
                <Input
                  id="reg-username"
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => update('username', e.target.value)}
                  placeholder="请输入账号"
                  disabled={pending}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="reg-password">密码</FieldLabel>
                <Input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="请输入密码"
                  disabled={pending}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="reg-password-confirm">确认密码</FieldLabel>
                <Input
                  id="reg-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.passwordConfirm}
                  onChange={(e) => update('passwordConfirm', e.target.value)}
                  placeholder="请再次输入密码"
                  disabled={pending}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="reg-name">姓名</FieldLabel>
                <Input
                  id="reg-name"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="请输入真实姓名"
                  disabled={pending}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="reg-email">邮箱</FieldLabel>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="请输入邮箱"
                  disabled={pending}
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 px-4">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              注册
            </Button>
            <p className="text-sm text-muted-foreground">
              已有账号？{' '}
              <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
                立即登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </PageShell>
  )
}
