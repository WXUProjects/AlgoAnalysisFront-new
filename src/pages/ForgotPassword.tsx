import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { resetPassword, sendCode } from '@/api/auth'
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

export function ForgotPassword() {
  const { isLogin, ready } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    code: '',
    password: '',
    passwordConfirm: '',
  })
  const [pending, setPending] = useState(false)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  if (ready && isLogin) {
    return <Navigate to="/change-password" replace />
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSendCode() {
    if (cooldown > 0 || sending) return
    setSending(true)
    const res = await sendCode(form.email, 'reset')
    setSending(false)
    if (res.success) {
      toast.success(res.message || '验证码已发送')
      setCooldown(60)
    } else {
      toast.error(res.message || '发送失败')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await resetPassword(form)
    setPending(false)
    if (res.success) {
      toast.success(res.message || '密码已重置')
      navigate('/login', { replace: true })
    } else {
      toast.error(res.message || '重置失败')
    }
  }

  return (
    <PageShell className="items-center justify-center" stagger={false}>
      <Card className="w-full max-w-sm gap-4 py-4 motion-lift">
        <CardHeader className="gap-1 px-4">
          <CardTitle>找回密码</CardTitle>
          <CardDescription>通过注册邮箱验证后设置新密码</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="fp-email">注册邮箱</FieldLabel>
                <Input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="请输入注册时使用的邮箱"
                  disabled={pending}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="fp-code">邮箱验证码</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="fp-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={form.code}
                    onChange={(e) => update('code', e.target.value)}
                    placeholder="6 位验证码"
                    disabled={pending}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || sending || cooldown > 0}
                    onClick={handleSendCode}
                    className="shrink-0"
                  >
                    {sending ? (
                      <Spinner data-icon="inline-start" />
                    ) : cooldown > 0 ? (
                      `${cooldown}s`
                    ) : (
                      '获取验证码'
                    )}
                  </Button>
                </div>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="fp-password">新密码</FieldLabel>
                <Input
                  id="fp-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="请输入新密码"
                  disabled={pending}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="fp-password-confirm">确认新密码</FieldLabel>
                <Input
                  id="fp-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.passwordConfirm}
                  onChange={(e) => update('passwordConfirm', e.target.value)}
                  placeholder="请再次输入新密码"
                  disabled={pending}
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 px-4">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              重置密码
            </Button>
            <p className="text-sm text-muted-foreground">
              想起密码了？{' '}
              <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
                返回登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </PageShell>
  )
}
