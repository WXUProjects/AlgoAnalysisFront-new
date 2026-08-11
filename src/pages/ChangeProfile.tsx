import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { SpiderBinding } from '@shared/api'
import { sendCode } from '@/api/auth'
import { getProblemUserProfile } from '@/api/problem'
import { setEmailEnabled, updateProfile } from '@/api/profile'
import { getMySubscription } from '@/api/subscription'
import { getPrivacy, updatePrivacy } from '@/api/social'
import { setSpider } from '@/api/spider'
import { uploadImage } from '@/api/upload'
import { useAuth } from '@/auth/AuthContext'
import { AvatarCropDialog } from '@/components/avatar-crop-dialog'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import {
  getPlatformHomeLink,
  OJ_BIND_GUIDES,
  OJ_PLATFORMS,
  normalizeOjQuery,
  type OjPlatform,
} from '@/lib/link'
import { spiderPlatformHealth } from '@/lib/spider-health'

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

function OjPlatformCard({
  platform,
  label,
  spider,
  acCount,
  onEdit,
}: {
  platform: OjPlatform
  label: string
  spider: SpiderBinding
  acCount?: number
  onEdit: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit()
        }
      }}
      className="flex cursor-pointer flex-col gap-1.5 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center gap-1.5">
        <span className="truncate text-sm font-semibold">{label}</span>
      </div>
      <p className="truncate text-xs">
        <a
          href={getPlatformHomeLink(platform, spider.username)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-foreground hover:underline"
        >
          {spider.username}
        </a>
      </p>
      {typeof acCount === 'number' && acCount > 0 ? (
        <p className="text-xs text-muted-foreground tabular-nums">已过 {acCount} 题</p>
      ) : null}
    </div>
  )
}

function OjBindDialog({
  open,
  lockedPlatform,
  spiders,
  onClose,
  onSave,
}: {
  open: boolean
  lockedPlatform: OjPlatform | ''
  spiders: SpiderBinding[] | undefined
  onClose: () => void
  onSave: (platform: OjPlatform, username: string) => Promise<boolean>
}) {
  const [platform, setPlatform] = useState<OjPlatform | ''>(lockedPlatform)
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)

  // 打开时初始化：锁定平台直接带入；自由模式先清空，等用户选
  useEffect(() => {
    if (!open) return
    setPlatform(lockedPlatform)
    setSaving(false)
    if (!lockedPlatform) {
      setUsername('')
      return
    }
    setUsername(spiders?.find((s) => s.platform === lockedPlatform)?.username ?? '')
  }, [open, lockedPlatform, spiders])

  // 自由模式：选中已绑定平台 → 预填用户名；未绑定 → 清空
  useEffect(() => {
    if (!open || lockedPlatform) return
    if (!platform) {
      setUsername('')
      return
    }
    setUsername(spiders?.find((s) => s.platform === platform)?.username ?? '')
  }, [open, lockedPlatform, platform, spiders])

  const guide = platform ? OJ_BIND_GUIDES[platform] : null
  const bound = platform
    ? spiders?.find((s) => s.platform === platform)
    : undefined
  const health = bound ? spiderPlatformHealth(bound) : null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>{lockedPlatform ? '编辑 OJ 绑定' : '绑定 OJ'}</DialogTitle>
          <DialogDescription>
            绑定常用 OJ 账号后，平台会自动同步你的提交与比赛记录
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <Field className="gap-1.5">
            <FieldLabel>OJ 平台</FieldLabel>
            <Select
              value={platform}
              onValueChange={(v) => setPlatform(v as OjPlatform)}
              disabled={Boolean(lockedPlatform)}
            >
              <SelectTrigger disabled={Boolean(lockedPlatform)}>
                <SelectValue placeholder="选择 OJ" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {OJ_PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                      {spiders?.some((s) => s.platform === p.value) ? '（已绑定）' : ''}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          {platform && guide ? (
            <Field className="gap-1.5">
              <FieldLabel>{guide.fieldLabel}</FieldLabel>
              <Input
                value={username}
                placeholder={guide.placeholder}
                disabled={saving}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
              />
              <FieldDescription>{guide.tip}</FieldDescription>
              {guide.example ? (
                <p className="break-all font-mono text-[11px] text-muted-foreground">
                  {guide.example}
                </p>
              ) : null}
            </Field>
          ) : null}

          {health?.kind === 'failed' ? (
            <p className="text-xs leading-relaxed text-destructive">{health.detail}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            size="sm"
            disabled={saving || !platform || !username.trim()}
            onClick={async () => {
              if (!platform) return
              setSaving(true)
              const ok = await onSave(platform, username.trim())
              setSaving(false)
              if (ok) onClose()
            }}
          >
            {saving ? <Spinner data-icon="inline-start" /> : null}
            {bound ? '保存' : '绑定'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ChangeProfile() {
  const { user, profile, sync } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preOj = normalizeOjQuery(searchParams.get('oj'))

  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [avatar, setAvatar] = useState('')
  const [emailOn, setEmailOn] = useState(false)
  const [weeklyOn, setWeeklyOn] = useState(false)
  /** AI 日报（仅 Pro 订阅显示；默认关） */
  const [aiDailyOn, setAiDailyOn] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [aiDailyLoading, setAiDailyLoading] = useState(false)
  const [bindOpen, setBindOpen] = useState(false)
  const [bindLocked, setBindLocked] = useState<OjPlatform | ''>(preOj || '')
  const [acCounts, setAcCounts] = useState<Map<string, number>>(new Map())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  /** 头像裁切：待裁切图片 object URL 与弹窗开关 */
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeCooldown, setCodeCooldown] = useState(0)
  const [privacyLoading, setPrivacyLoading] = useState(true)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [allowPublicProfile, setAllowPublicProfile] = useState(true)
  const [allowPublicFeed, setAllowPublicFeed] = useState(true)

  const boundEmail = (profile?.email || '').trim()
  const displayName = profile?.name || user?.username || 'U'
  const emailChanged = useMemo(() => {
    const next = email.trim().toLowerCase()
    const cur = boundEmail.toLowerCase()
    return next !== cur
  }, [email, boundEmail])

  useEffect(() => {
    if (profile) {
      setEmail(profile.email || '')
      setAvatar(profile.avatar || '')
      setEmailOn(profile.emailEnabled ?? false)
      setWeeklyOn(profile.emailWeeklyEnabled ?? false)
      setAiDailyOn(profile.aiDailyEnabled ?? false)
    }
  }, [profile])

  // AI 日报仅 Pro 会员显示：拉我的订阅判断档位
  useEffect(() => {
    let cancelled = false
    void getMySubscription().then((res) => {
      if (cancelled) return
      if (res.success && res.data?.tier === 'pro') setIsPro(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (preOj) {
      setBindLocked(preOj)
      setBindOpen(true)
    }
  }, [preOj])

  useEffect(() => {
    if (searchParams.get('focus') !== 'oj') return
    const el = document.getElementById('bind-oj')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [searchParams])


  useEffect(() => {
    if (codeCooldown <= 0) return
    const t = window.setTimeout(() => setCodeCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [codeCooldown])

  useEffect(() => {
    let cancelled = false
    void getPrivacy().then((res) => {
      if (cancelled) return
      setPrivacyLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '隐私设置没加载出来，过会儿再试')
        return
      }
      setAllowPublicProfile(res.data.allowPublicProfile)
      setAllowPublicFeed(res.data.allowPublicFeed)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // 各平台过题数（卡片展示用；无数据不阻塞）
  useEffect(() => {
    if (!user) return
    let cancelled = false
    void getProblemUserProfile(user.userId).then((res) => {
      if (cancelled || !res.success || !res.data) return
      const m = new Map<string, number>()
      res.data.platforms.forEach((p) => m.set(p.name, p.count))
      setAcCounts(m)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (window.location.hash !== '#privacy') return
    const t = window.setTimeout(() => {
      document.getElementById('privacy')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => window.clearTimeout(t)
  }, [privacyLoading])

  async function handleSendEmailCode() {
    if (!emailOk(email)) {
      toast.error('邮箱格式不对哦')
      return
    }
    if (!emailChanged) {
      toast.message('邮箱没变，不用验证')
      return
    }
    setSendingCode(true)
    const res = await sendCode(email.trim(), 'change_email')
    setSendingCode(false)
    if (res.success) {
      toast.success(res.message || '验证码已发送，请查收新邮箱')
      setCodeCooldown(60)
    } else {
      toast.error(res.message || '没发出去，过会儿再试')
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!email.trim()) {
      toast.error('邮箱还没填哦，收提醒和找回密码都要用它')
      return
    }
    if (!emailOk(email)) {
      toast.error('邮箱格式不对哦')
      return
    }
    if (emailChanged && !emailCode.trim()) {
      toast.error('改邮箱要填新邮箱收到的验证码')
      return
    }
    setSaving(true)
    const res = await updateProfile({
      userId: user.userId,
      email: email.trim(),
      avatar: avatar || undefined,
      emailCode: emailChanged ? emailCode.trim() : undefined,
    })
    setSaving(false)
    if (res.success) {
      toast.success(res.message || '资料更新好啦')
      setEmailCode('')
      await sync()
    } else {
      toast.error(res.message || '没更新成，过会儿再试')
    }
  }

  /** 选择图片后打开裁切弹窗（生成 object URL，关闭时释放） */
  function openAvatarCrop(file: File) {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    setCropOpen(true)
  }

  function closeAvatarCrop() {
    setCropOpen(false)
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc)
      setCropSrc(null)
    }
  }

  /** 裁切确认：上传压缩后的 JPEG 头像，并立即保存（无需再点保存资料） */
  async function handleAvatarCropConfirm(file: File) {
    if (!user) return
    setUploading(true)
    try {
      const res = await uploadImage(file, 'avatar')
      if (!res.success || !res.data?.url) {
        toast.error(res.message || '没传上去，过会儿再试')
        return
      }
      const newUrl = res.data.url
      const save = await updateProfile({
        userId: user.userId,
        // 只更新头像，邮箱保持当前已绑定的值，不影响页面上未保存的邮箱编辑
        email: boundEmail,
        avatar: newUrl,
      })
      if (!save.success) {
        toast.error(save.message || '头像没保存成功，过会儿再试')
        return
      }
      setAvatar(newUrl)
      toast.success('头像已保存')
      closeAvatarCrop()
    } finally {
      setUploading(false)
    }
  }

  async function handleEmailToggle(checked: boolean, kind: 'daily' | 'weekly') {
    if (!user) return
    if (!boundEmail) {
      toast.error('先绑邮箱，才能开邮件通知')
      return
    }
    if (kind === 'weekly' && checked && profile?.emailWeeklyAllowedByOrg === false) {
      toast.error('当前组织没开通周报（要教练/队长或管理员）')
      return
    }
    if (kind === 'daily') setEmailOn(checked)
    else setWeeklyOn(checked)
    const res = await setEmailEnabled(user.userId, checked, kind)
    if (!res.success) {
      if (kind === 'daily') setEmailOn(!checked)
      else setWeeklyOn(!checked)
      toast.error(res.message || '没设置成，过会儿再试')
      return
    }
    // 关掉日报邮件时，AI 日报也随之关闭（AI 日报靠邮件送达）
    if (kind === 'daily' && !checked && aiDailyOn) {
      const aiRes = await updateProfile({
        userId: user.userId,
        email: boundEmail,
        aiDailyEnabled: false,
      })
      if (aiRes.success) {
        setAiDailyOn(false)
        toast.success('已关闭日报邮件，AI 日报也随之关闭')
      } else {
        toast.error(aiRes.message || '日报邮件已关，AI 日报没关成，过会儿再试')
      }
      await sync()
      return
    }
    toast.success(res.message || '邮件设置更新好啦')
    await sync()
  }

  async function handleAiDailyToggle(checked: boolean) {
    if (!user) return
    if (!isPro) {
      toast.error('AI 日报仅 Pro 会员可用')
      return
    }
    if (!boundEmail) {
      toast.error('先绑邮箱，才能开启 AI 日报')
      return
    }
    setAiDailyOn(checked)
    setAiDailyLoading(true)
    // 打开 AI 日报 = 同步打开日报邮件（AI 日报以邮件形式送达）
    let turnedOnEmail = false
    if (checked && !emailOn) {
      const emailRes = await setEmailEnabled(user.userId, true, 'daily')
      if (!emailRes.success) {
        setAiDailyOn(false)
        setAiDailyLoading(false)
        toast.error(emailRes.message || '日报邮件没开成，过会儿再试')
        return
      }
      setEmailOn(true)
      turnedOnEmail = true
    }
    const res = await updateProfile({
      userId: user.userId,
      email: boundEmail,
      aiDailyEnabled: checked,
    })
    setAiDailyLoading(false)
    if (res.success) {
      toast.success(
        checked ? '已开启 AI 日报，日报将以邮件形式发送' : '已关闭 AI 日报',
      )
    } else {
      setAiDailyOn(!checked)
      if (turnedOnEmail) {
        setEmailOn(false)
        await setEmailEnabled(user.userId, false, 'daily')
      }
      toast.error(res.message || '没设置成，过会儿再试')
    }
    await sync()
  }

  const bound = OJ_PLATFORMS.flatMap((p) => {
    const bind = profile?.spiders?.find((s) => s.platform === p.value)
    return bind ? [{ platform: p, bind }] : []
  })

  async function handleCardSave(
    platform: OjPlatform,
    username: string,
  ): Promise<boolean> {
    if (!user) return false
    const res = await setSpider({
      userId: user.userId,
      platform,
      username,
    })
    if (res.success) {
      toast.success(res.message || '存好啦，正在同步做题数据')
      await sync()
      return true
    }
    toast.error(res.message || '没绑上，过会儿再试')
    return false
  }

  async function handleSavePrivacy() {
    setPrivacySaving(true)
    const res = await updatePrivacy({ allowPublicProfile, allowPublicFeed })
    setPrivacySaving(false)
    if (!res.success) {
      toast.error(res.message || '隐私设置没存上，过会儿再试')
      return
    }
    toast.success('隐私设置存好啦')
  }

  return (
    <PageShell className="mx-auto w-full max-w-2xl">
      <Card className="gap-4 py-4">
        <CardHeader className="gap-1 px-4">
          <CardTitle>编辑资料</CardTitle>
          <CardDescription>头像、邮箱、邮件通知都在这里。改昵称去「我的组织」。</CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveProfile}>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel>头像</FieldLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="size-14 border">
                    <AvatarImage src={avatar || undefined} alt="" />
                    <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
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
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            if (!file) return
                            if (!file.type.startsWith('image/')) {
                              toast.error('请选择图片文件')
                              return
                            }
                            openAvatarCrop(file)
                          }}
                        />
                      </label>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      支持 jpg / png / webp，不超过 3MB；上传时会先裁剪再压缩
                    </p>
                  </div>
                </div>
              </Field>

              <Field className="gap-1.5">
                <FieldLabel>昵称 / 组织内称呼</FieldLabel>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
                  <span className="min-w-0 flex-1 text-sm">
                    当前展示：
                    <span className="ml-1 font-medium text-foreground">
                      {profile?.name || user?.username || '未设置'}
                    </span>
                  </span>
                  <Button type="button" size="sm" variant="secondary" asChild>
                    <Link to="/org">去「我的组织」修改</Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  公共域显示站内昵称；进了别的校队，可以单独设队内称呼。
                </p>
              </Field>

              {!boundEmail ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-foreground">
                  邮箱还没绑哦，不验证就收不到比赛订阅和日报邮件。
                </div>
              ) : null}

              <Field className="gap-1.5">
                <FieldLabel htmlFor="email">邮箱</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailCode('')
                  }}
                  disabled={saving}
                  placeholder="收提醒、找回密码都用它"
                  autoComplete="email"
                />
                {boundEmail && !emailChanged ? (
                  <p className="text-xs text-muted-foreground">已绑定。换邮箱要往新地址发验证码。</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {emailChanged
                      ? '邮箱改啦，先往新邮箱发验证码再保存。'
                      : '验证常用邮箱后，就能收订阅和提醒。'}
                  </p>
                )}
              </Field>

              {emailChanged ? (
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="email-code">新邮箱验证码</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      id="email-code"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                      placeholder="6 位数字"
                      disabled={saving}
                      maxLength={8}
                      className="min-w-0 flex-1"
                      autoComplete="one-time-code"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={sendingCode || codeCooldown > 0 || saving}
                      onClick={() => void handleSendEmailCode()}
                    >
                      {sendingCode ? (
                        <Spinner data-icon="inline-start" />
                      ) : codeCooldown > 0 ? (
                        `${codeCooldown}s`
                      ) : (
                        '发送验证码'
                      )}
                    </Button>
                  </div>
                </Field>
              ) : null}

              <Field className="gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="email-on">日报邮件</FieldLabel>
                  <Switch
                    id="email-on"
                    checked={emailOn}
                    disabled={!boundEmail && !emailOn}
                    onCheckedChange={(v) => void handleEmailToggle(v, 'daily')}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  开启后，每天会收到一封训练日报。
                </p>
              </Field>
              <Field className="gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="weekly-on">周报邮件</FieldLabel>
                  <Switch
                    id="weekly-on"
                    checked={weeklyOn}
                    disabled={
                      (!boundEmail && !weeklyOn) ||
                      (profile?.emailWeeklyAllowedByOrg === false && !weeklyOn)
                    }
                    onCheckedChange={(v) => void handleEmailToggle(v, 'weekly')}
                  />
                </div>
                {profile?.emailWeeklyAllowedByOrg === false ? (
                  <p className="text-xs text-muted-foreground">
                    要教练、队长或管理员，且组织开了周报才行。
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    开了就每周一发队内训练周报。
                  </p>
                )}
              </Field>
              {isPro ? (
                <Field className="gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="ai-daily-on">AI 日报</FieldLabel>
                    <Switch
                      id="ai-daily-on"
                      checked={aiDailyOn}
                      disabled={aiDailyLoading || (!boundEmail && !aiDailyOn)}
                      onCheckedChange={(v) => void handleAiDailyToggle(v)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pro 会员专属：日报由 AI 生成点评与建议，开启后以邮件形式发送。
                  </p>
                </Field>
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex gap-2 px-4">
            <Button type="submit" disabled={saving || !profile}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              保存资料
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to={user?.username ? `/profile/${user.username}` : '/profile'}>
                取消
              </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card id="bind-oj" className="scroll-mt-20 gap-4 py-4">
        <CardHeader className="flex flex-row items-start justify-between gap-2 px-4">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>绑定 OJ</CardTitle>
            <CardDescription>
              把常用 OJ 账号都接进来吧～
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setBindLocked('')
              setBindOpen(true)
            }}
          >
            <PlusIcon data-icon="inline-start" />
            绑定 OJ
          </Button>
        </CardHeader>
        <CardContent className="px-4">
          {bound.length === 0 ? (
            <Empty className="rounded-xl border border-dashed">
              <EmptyContent>
                <EmptyTitle>还没有绑定 OJ</EmptyTitle>
                <EmptyDescription>
                  点右上角「绑定 OJ」，绑定后自动同步你的做题记录
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {bound.map(({ platform: p, bind }) => (
                <OjPlatformCard
                  key={p.value}
                  platform={p.value}
                  label={p.label}
                  spider={bind}
                  acCount={acCounts.get(p.value)}
                  onEdit={() => {
                    setBindLocked(p.value)
                    setBindOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <OjBindDialog
        open={bindOpen}
        lockedPlatform={bindLocked}
        spiders={profile?.spiders}
        onClose={() => setBindOpen(false)}
        onSave={handleCardSave}
      />

      <Card id="privacy" className="scroll-mt-20 gap-4 py-4">
        <CardHeader className="gap-1 px-4">
          <CardTitle>隐私设置</CardTitle>
          <CardDescription>
            只影响公共域。在校队这种私人组织里，队友还是能看到你的资料和动态。
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          {privacyLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <FieldGroup className="gap-5">
              <Field orientation="horizontal">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <FieldLabel htmlFor="set-profile">
                    允许他人查看个人资料
                  </FieldLabel>
                  <FieldDescription>
                    关掉后，公共域里的其他人就打不开你的资料页了
                  </FieldDescription>
                </div>
                <Switch
                  id="set-profile"
                  checked={allowPublicProfile}
                  onCheckedChange={setAllowPublicProfile}
                />
              </Field>
              <Field orientation="horizontal">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <FieldLabel htmlFor="set-feed">出现在公共域动态</FieldLabel>
                  <FieldDescription>
                    关掉后，公共域动态里就不会再出现你的提交了
                  </FieldDescription>
                </div>
                <Switch
                  id="set-feed"
                  checked={allowPublicFeed}
                  onCheckedChange={setAllowPublicFeed}
                />
              </Field>
              <Button
                type="button"
                className="w-fit"
                disabled={privacySaving}
                onClick={() => void handleSavePrivacy()}
              >
                {privacySaving ? <Spinner data-icon="inline-start" /> : null}
                保存隐私设置
              </Button>
            </FieldGroup>
          )}
        </CardContent>
      </Card>

      <Card className="gap-4 py-4">
        <CardHeader className="gap-1 px-4">
          <CardTitle>账号安全</CardTitle>
          <CardDescription>改登录密码，或用邮箱找回</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 px-4">
          <Button type="button" variant="outline" asChild>
            <Link to="/change-password">修改密码</Link>
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link to="/forgot-password">忘记密码？去邮箱找回</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            navigate(user?.username ? `/profile/${user.username}` : '/profile')
          }
        >
          返回个人资料
        </Button>
      </div>

      <AvatarCropDialog
        open={cropOpen}
        src={cropSrc}
        onOpenChange={(o) => {
          if (!o) closeAvatarCrop()
        }}
        onConfirm={(file) => handleAvatarCropConfirm(file)}
      />
    </PageShell>
  )
}
