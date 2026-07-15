import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { setEmailEnabled, updateProfile } from '@/api/profile'
import { setSpider } from '@/api/spider'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { OJ_PLATFORMS, normalizeOjQuery, type OjPlatform } from '@/lib/link'

export function ChangeProfile() {
  const { user, profile, sync } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preOj = normalizeOjQuery(searchParams.get('oj'))

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailOn, setEmailOn] = useState(true)
  const [platform, setPlatform] = useState<OjPlatform>(preOj || 'AtCoder')
  const [ojUsername, setOjUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [binding, setBinding] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setEmail(profile.email || '')
      setEmailOn(profile.emailEnabled ?? true)
      const bound = profile.spiders.find((s) => s.platform === (preOj || platform))
      if (bound) setOjUsername(bound.username)
    }
  }, [profile, preOj, platform])

  useEffect(() => {
    if (preOj) setPlatform(preOj)
  }, [preOj])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!name.trim() || !email.trim()) {
      toast.error('姓名和邮箱不能为空')
      return
    }
    setSaving(true)
    const res = await updateProfile({
      userId: user.userId,
      name: name.trim(),
      email: email.trim(),
      avatar: profile?.avatar || '',
    })
    setSaving(false)
    if (res.success) {
      toast.success(res.message || '资料已更新')
      await sync()
    } else {
      toast.error(res.message || '更新失败')
    }
  }

  async function handleEmailToggle(checked: boolean) {
    if (!user) return
    setEmailOn(checked)
    const res = await setEmailEnabled(user.userId, checked)
    if (res.success) {
      toast.success(res.message || '已更新邮件通知')
      await sync()
    } else {
      setEmailOn(!checked)
      toast.error(res.message || '设置失败')
    }
  }

  async function handleBindOj(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!ojUsername.trim()) {
      toast.error('请输入 OJ 用户名')
      return
    }
    setBinding(true)
    const res = await setSpider({
      userId: user.userId,
      platform,
      username: ojUsername.trim(),
    })
    setBinding(false)
    if (res.success) {
      toast.success(res.message || '绑定成功')
      await sync()
    } else {
      toast.error(res.message || '绑定失败')
    }
  }

  return (
    <PageShell className="mx-auto w-full max-w-lg">
      <Card className="gap-4 py-4">
        <CardHeader className="gap-1 px-4">
          <CardTitle>编辑资料</CardTitle>
          <CardDescription>修改姓名、邮箱与邮件通知</CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveProfile}>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="name">姓名</FieldLabel>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="email">邮箱</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field className="flex-row items-center justify-between gap-3">
                <FieldLabel htmlFor="email-on">邮件通知</FieldLabel>
                <Switch
                  id="email-on"
                  checked={emailOn}
                  onCheckedChange={(v) => void handleEmailToggle(v)}
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex gap-2 px-4">
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              保存资料
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/profile">取消</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="gap-4 py-4">
        <CardHeader className="gap-1 px-4">
          <CardTitle>绑定 OJ</CardTitle>
          <CardDescription>绑定后可同步提交与比赛数据</CardDescription>
        </CardHeader>
        <form onSubmit={handleBindOj}>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel>平台</FieldLabel>
                <Select
                  value={platform}
                  onValueChange={(v) => {
                    const next = v as OjPlatform
                    setPlatform(next)
                    const bound = profile?.spiders.find((s) => s.platform === next)
                    setOjUsername(bound?.username || '')
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择平台" />
                  </SelectTrigger>
                  <SelectContent>
                    {OJ_PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="oj-username">用户名 / ID</FieldLabel>
                <Input
                  id="oj-username"
                  value={ojUsername}
                  onChange={(e) => setOjUsername(e.target.value)}
                  placeholder="填写对应平台用户名"
                  disabled={binding}
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="px-4">
            <Button type="submit" disabled={binding}>
              {binding ? <Spinner data-icon="inline-start" /> : null}
              绑定
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" onClick={() => navigate('/profile')}>
          返回个人资料
        </Button>
      </div>
    </PageShell>
  )
}
