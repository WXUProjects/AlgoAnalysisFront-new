import { useEffect, useState } from 'react'
import { Link, Navigate, useOutletContext } from 'react-router-dom'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  getBlogActivationStatus,
  saveBlogNotifyPref,
  saveBlogThemeConfig,
} from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  BLOG_THEME_META,
  SOCIAL_LINK_PRESETS,
  type BlogSocialLink,
  type BlogThemeId,
} from '@/lib/blog-theme'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogEmailNotifyStrategy } from '@shared/api'

/**
 * Owner-only: pick shell theme + customize Chirpy sidebar social links.
 */
export function BlogSettingsPage() {
  const { username, isOwner, theme, refreshMeta } =
    useOutletContext<BlogOutletContext>()
  const { isLogin, ready } = useAuth()

  const [themeId, setThemeId] = useState<BlogThemeId>(theme.themeId)
  const [subtitle, setSubtitle] = useState(theme.subtitle)
  const [links, setLinks] = useState<BlogSocialLink[]>(
    theme.socialLinks.length
      ? theme.socialLinks.map((l) => ({ ...l }))
      : [],
  )
  const [saving, setSaving] = useState(false)
  const [emailOn, setEmailOn] = useState(false)
  const [emailStrategy, setEmailStrategy] =
    useState<BlogEmailNotifyStrategy>('off')
  const [savingNotify, setSavingNotify] = useState(false)

  useEffect(() => {
    setThemeId(theme.themeId)
    setSubtitle(theme.subtitle)
    setLinks(theme.socialLinks.map((l) => ({ ...l })))
  }, [theme.themeId, theme.subtitle, theme.socialLinks])

  useEffect(() => {
    if (!isLogin || !isOwner) return
    void getBlogActivationStatus().then((res) => {
      if (res.success && res.data) {
        setEmailOn(Boolean(res.data.emailNotifyEnabled))
        setEmailStrategy(
          (res.data.emailNotifyStrategy as BlogEmailNotifyStrategy) || 'off',
        )
      }
    })
  }, [isLogin, isOwner])

  if (ready && !isLogin) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(`/blog/${username}/manage/settings`)}`}
        replace
      />
    )
  }

  if (ready && isLogin && !isOwner) {
    return <Navigate to={`/blog/${username}`} replace />
  }

  function addLink() {
    setLinks((prev) => [...prev, { type: 'github', url: '', label: '' }])
  }

  function updateLink(i: number, patch: Partial<BlogSocialLink>) {
    setLinks((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    )
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = links
      .map((l) => ({
        type: l.type.trim().toLowerCase(),
        url: l.url.trim(),
        label: (l.label || '').trim() || undefined,
      }))
      .filter((l) => l.type && l.url)

    setSaving(true)
    const res = await saveBlogThemeConfig({
      themeId,
      subtitle: subtitle.trim(),
      socialLinks: cleaned,
    })
    setSaving(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '保存失败')
      return
    }
    toast.success('外观已保存')
    await refreshMeta()
  }

  const cardClass =
    theme.themeId === 'chirpy'
      ? 'space-y-6 rounded-[10px] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]'
      : 'space-y-6 rounded-xl border bg-card p-6 shadow-sm'

  return (
    <form onSubmit={handleSave} className={cardClass}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">外观设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          选择博客主题，并自定义资料区/侧栏的外链图标（Chirpy、Mizuki
          会显示）。页脚备案信息与主站保持一致，无需在此填写。
        </p>
      </div>

      <div className="space-y-2">
        <Label>主题</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(BLOG_THEME_META) as BlogThemeId[]).map((id) => {
            const meta = BLOG_THEME_META[id]
            const active = themeId === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setThemeId(id)}
                className={
                  active
                    ? 'rounded-xl border-2 border-primary bg-primary/5 p-4 text-left'
                    : 'rounded-xl border p-4 text-left hover:bg-muted/50'
                }
              >
                <div className="font-medium">{meta.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {meta.description}
                </p>
                {id === 'mizuki' && (
                  <span className="mt-2 inline-block text-[11px] text-primary">
                    默认
                  </span>
                )}
                {meta.creditUrl ? (
                  <a
                    href={meta.creditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-[11px] text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    来源：{meta.credit || meta.creditUrl}
                  </a>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-subtitle">副标题 / 简介</Label>
        <Input
          id="blog-subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="一句话介绍你的博客（可选）"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          Chirpy 显示在左侧栏，Mizuki 显示在横幅与资料卡。
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>外链图标</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLink}>
            <PlusIcon className="size-3.5" />
            添加
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Chirpy 在左下角，Mizuki 在右侧资料卡；留空则不显示。
        </p>
        {links.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            还没有添加外链
          </div>
        ) : (
          <ul className="space-y-3">
            {links.map((l, i) => (
              <li
                key={i}
                className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[140px_1fr_1fr_auto]"
              >
                <Select
                  value={l.type || 'custom'}
                  onValueChange={(v) => updateLink(i, { type: v || 'custom' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_LINK_PRESETS.map((p) => (
                      <SelectItem key={p.type} value={p.type}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={l.url}
                  onChange={(e) => updateLink(i, { url: e.target.value })}
                  placeholder={
                    SOCIAL_LINK_PRESETS.find((p) => p.type === l.type)
                      ?.placeholder || 'https://…'
                  }
                />
                <Input
                  value={l.label || ''}
                  onChange={(e) => updateLink(i, { label: e.target.value })}
                  placeholder="显示名称（可选）"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeLink(i)}
                  aria-label="删除"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Label htmlFor="blog-email-on">互动邮件通知</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              有人点赞或评论时发邮件提醒。默认关闭；可选手动开启并选择发送策略。
            </p>
          </div>
          <Switch
            id="blog-email-on"
            checked={emailOn}
            onCheckedChange={(v) => {
              setEmailOn(v)
              if (v && emailStrategy === 'off') setEmailStrategy('immediate')
              if (!v) setEmailStrategy('off')
            }}
          />
        </div>
        {emailOn ? (
          <div className="mt-3 max-w-xs space-y-2">
            <Label>发送策略</Label>
            <Select
              value={emailStrategy === 'off' ? 'immediate' : emailStrategy}
              onValueChange={(v) =>
                setEmailStrategy((v || 'immediate') as BlogEmailNotifyStrategy)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="策略" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">立即发送</SelectItem>
                <SelectItem value="digest_daily">每日摘要</SelectItem>
                <SelectItem value="random">随机时段发送</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          disabled={savingNotify}
          onClick={async () => {
            setSavingNotify(true)
            const res = await saveBlogNotifyPref({
              emailNotifyEnabled: emailOn,
              emailNotifyStrategy: emailOn ? emailStrategy : 'off',
            })
            setSavingNotify(false)
            if (!res.success) {
              toast.error(res.message || '保存失败')
              return
            }
            toast.success('通知偏好已保存')
          }}
        >
          {savingNotify ? '保存中…' : '保存通知偏好'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存外观'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link to={`/blog/${username}`}>打开博客</Link>
        </Button>
      </div>
    </form>
  )
}
