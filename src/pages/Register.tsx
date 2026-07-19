import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  register as registerApi,
  sendCode,
  USERNAME_HINT,
  validateUsername,
} from '@/api/auth'
import { previewInvite } from '@/api/org'
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
import {
  buildOrgInvitePath,
  peekInviteCode,
  rememberInviteCode,
} from '@/lib/org-invite'

export function Register() {
  const { isLogin, ready } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteFromQuery = (searchParams.get('invite') || '').trim()
  const [inviteCode, setInviteCode] = useState(inviteFromQuery || peekInviteCode())
  const [inviteOrgName, setInviteOrgName] = useState('')
  const [form, setForm] = useState({
    username: '',
    password: '',
    passwordConfirm: '',
    name: '',
    email: '',
    code: '',
  })
  const [pending, setPending] = useState(false)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (inviteFromQuery) {
      rememberInviteCode(inviteFromQuery)
      setInviteCode(inviteFromQuery)
    }
  }, [inviteFromQuery])

  useEffect(() => {
    if (!inviteCode) {
      setInviteOrgName('')
      return
    }
    let cancelled = false
    void previewInvite(inviteCode).then((r) => {
      if (cancelled) return
      if (r.success && r.orgName) setInviteOrgName(r.orgName)
    })
    return () => {
      cancelled = true
    }
  }, [inviteCode])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  if (ready && isLogin) {
    return <Navigate to="/" replace />
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSendCode() {
    if (cooldown > 0 || sending) return
    setSending(true)
    const res = await sendCode(form.email, 'register')
    setSending(false)
    if (res.success) {
      toast.success(res.message || '验证码已发送')
      setCooldown(60)
    } else {
      toast.error(res.message || '发送失败，请稍后重试')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const usernameErr = validateUsername(form.username)
    if (usernameErr) {
      toast.error(usernameErr)
      return
    }
    setPending(true)
    const res = await registerApi({
      ...form,
      inviteCode: inviteCode || undefined,
    })
    setPending(false)
    if (res.success) {
      toast.success(res.message || '注册成功')
      const loginPath = inviteCode
        ? `/login?redirect=${encodeURIComponent(buildOrgInvitePath(inviteCode))}`
        : '/login'
      navigate(loginPath, { replace: true })
    } else {
      toast.error(res.message || '注册失败，请稍后重试')
    }
  }

  return (
    <PageShell className="items-center justify-center" stagger={false}>
      <Card className="w-full max-w-sm gap-4 py-4 motion-lift">
        <CardHeader className="gap-1 px-4">
          <CardTitle>注册</CardTitle>
          <CardDescription>
            {inviteOrgName
              ? `欢迎加入${inviteOrgName}。创建账号后将自动加入该组织（需邮箱验证）`
              : '创建账号，需完成邮箱验证'}
          </CardDescription>
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
                  placeholder="例如 student_01"
                  disabled={pending}
                  minLength={3}
                  maxLength={64}
                  pattern="[A-Za-z0-9_-]{3,64}"
                  title={USERNAME_HINT}
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">{USERNAME_HINT}</p>
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
                <FieldLabel htmlFor="reg-name">昵称</FieldLabel>
                <Input
                  id="reg-name"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="其他人看到的称呼"
                  disabled={pending}
                  maxLength={32}
                />
                <p className="text-xs text-muted-foreground">
                  {inviteOrgName
                    ? `此昵称将作为你在「${inviteOrgName}」与公共域中的称呼，之后可在组织里再改。`
                    : '注册后会自动加入「公共域」，此昵称即你在公共域中的对外称呼。加入其他校队时，可再单独设置队内名称。'}
                </p>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="reg-email">邮箱</FieldLabel>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="用于接收验证码，也可用于登录"
                  disabled={pending}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="reg-code">邮箱验证码</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="reg-code"
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
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 px-4">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              注册
            </Button>
            <p className="text-sm text-muted-foreground">
              已有账号？{' '}
              <Link
                to={
                  inviteCode
                    ? `/login?redirect=${encodeURIComponent(buildOrgInvitePath(inviteCode))}`
                    : '/login'
                }
                className="text-foreground underline-offset-4 hover:underline"
              >
                登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </PageShell>
  )
}
