import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { setEmailEnabled, updateProfile } from '@/api/profile'
import { setSpider } from '@/api/spider'
import { uploadImage } from '@/api/upload'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
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
import {
  getOjBindGuide,
  OJ_PLATFORMS,
  normalizeOjQuery,
  type OjPlatform,
} from '@/lib/link'

export function ChangeProfile() {
  const { user, profile, sync } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preOj = normalizeOjQuery(searchParams.get('oj'))

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('')
  const [emailOn, setEmailOn] = useState(false)
  const [weeklyOn, setWeeklyOn] = useState(false)
  const [platform, setPlatform] = useState<OjPlatform>(preOj || 'AtCoder')
  const [ojUsername, setOjUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [binding, setBinding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const ojGuide = getOjBindGuide(platform)

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setEmail(profile.email || '')
      setAvatar(profile.avatar || '')
      setEmailOn(profile.emailEnabled ?? false)
      setWeeklyOn(profile.emailWeeklyEnabled ?? false)
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
      avatar: avatar || '',
    })
    setSaving(false)
    if (res.success) {
      toast.success(res.message || '资料已更新')
      await sync()
    } else {
      toast.error(res.message || '更新失败')
    }
  }

  async function handleEmailToggle(checked: boolean, kind: 'daily' | 'weekly') {
    if (!user) return
    if (kind === 'daily') {
      if (checked && profile && profile.emailAllowedByOrg === false) {
        toast.error('当前没有组织为你开通日报邮件权限')
        return
      }
      setEmailOn(checked)
    } else {
      if (checked && profile && profile.emailWeeklyAllowedByOrg === false) {
        toast.error('当前没有组织为你开通周报权限（需为教练/队长/团队管理员）')
        return
      }
      setWeeklyOn(checked)
    }
    const res = await setEmailEnabled(user.userId, checked, kind)
    if (res.success) {
      toast.success(res.message || '已更新邮件设置')
      await sync()
    } else {
      if (kind === 'daily') setEmailOn(!checked)
      else setWeeklyOn(!checked)
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
                <FieldLabel>头像</FieldLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="size-14 border">
                    <AvatarImage src={avatar || '/images/defaultAvatar.png'} alt="" />
                    <AvatarFallback>{(name || 'U').slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1.5">
                    <Button type="button" size="sm" variant="outline" asChild disabled={uploading}>
                      <label className="cursor-pointer">
                        {uploading ? <Spinner data-icon="inline-start" /> : null}
                        上传图片
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            if (!file) return
                            setUploading(true)
                            const res = await uploadImage(file, 'avatar')
                            setUploading(false)
                            if (!res.success || !res.data?.url) {
                              toast.error(res.message || '上传失败')
                              return
                            }
                            setAvatar(res.data.url)
                            toast.success('头像已上传，请点保存资料')
                          }}
                        />
                      </label>
                    </Button>
                    <p className="text-xs text-muted-foreground">jpg/png/webp，≤3MB</p>
                  </div>
                </div>
              </Field>
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
              <Field className="gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="email-on">日报邮件</FieldLabel>
                  <Switch
                    id="email-on"
                    checked={emailOn}
                    disabled={profile?.emailAllowedByOrg === false && !emailOn}
                    onCheckedChange={(v) => void handleEmailToggle(v, 'daily')}
                  />
                </div>
                {profile?.emailAllowedByOrg === false ? (
                  <p className="text-xs text-muted-foreground">
                    没有组织开通日报邮件权限时无法开启；权限被关闭后将自动关闭。
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    默认关闭。开启后将按组织策略发送训练日报。
                  </p>
                )}
              </Field>
              <Field className="gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="weekly-on">周报邮件</FieldLabel>
                  <Switch
                    id="weekly-on"
                    checked={weeklyOn}
                    disabled={profile?.emailWeeklyAllowedByOrg === false && !weeklyOn}
                    onCheckedChange={(v) => void handleEmailToggle(v, 'weekly')}
                  />
                </div>
                {profile?.emailWeeklyAllowedByOrg === false ? (
                  <p className="text-xs text-muted-foreground">
                    需在组织中为教练 / 队长 / 团队管理员，且组织开启周报，才可接收。
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    与日报独立；周一发送组织维度周报（staff）。
                  </p>
                )}
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
          <CardDescription>
            绑定 AtCoder / 洛谷 / 牛客 / Codeforces / QOJ / 力扣后，可同步提交与比赛数据
          </CardDescription>
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
              <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">如何填写？</p>
                <p className="mt-1 leading-relaxed">{ojGuide.tip}</p>
                {ojGuide.example ? (
                  <p className="mt-1 break-all font-mono text-xs leading-relaxed">
                    {ojGuide.example}
                  </p>
                ) : null}
              </div>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="oj-username">{ojGuide.fieldLabel}</FieldLabel>
                <Input
                  id="oj-username"
                  value={ojUsername}
                  onChange={(e) => setOjUsername(e.target.value)}
                  placeholder={ojGuide.placeholder}
                  disabled={binding}
                  autoComplete="off"
                />
                <FieldDescription>
                  填错会导致无法同步数据，请对照上方示例从个人主页复制。
                </FieldDescription>
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
