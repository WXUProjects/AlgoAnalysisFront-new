import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { changePassword } from '@/api/auth'
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

export function ChangePassword() {
  const { isMemberLike } = useAuth()
  const navigate = useNavigate()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await changePassword({
      oldPassword,
      newPassword,
      newPasswordConfirm,
    })
    setPending(false)
    if (res.success) {
      toast.success(res.message || '密码已更新')
      setOldPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
      navigate(isMemberLike ? '/change-profile' : '/admin', { replace: true })
    } else {
      toast.error(res.message || '修改失败')
    }
  }

  return (
    <PageShell className="items-center justify-center" stagger={false}>
      <Card className="w-full max-w-sm gap-4 py-4 motion-lift">
        <CardHeader className="gap-1 px-4">
          <CardTitle>修改密码</CardTitle>
          <CardDescription>
            验证当前密码后设置新密码。若忘记当前密码，可在登录页使用邮箱找回。
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="cp-old">当前密码</FieldLabel>
                <Input
                  id="cp-old"
                  type="password"
                  autoComplete="current-password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="cp-new">新密码</FieldLabel>
                <Input
                  id="cp-new"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="cp-new2">确认新密码</FieldLabel>
                <Input
                  id="cp-new2"
                  type="password"
                  autoComplete="new-password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 px-4">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              确认修改
            </Button>
            <Button type="button" variant="ghost" className="w-full" asChild>
              <Link to={isMemberLike ? '/change-profile' : '/admin'}>返回</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </PageShell>
  )
}
