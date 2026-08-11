import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Link2Icon, Share2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import {
  addOrgMember,
  getInvite,
  rotateInvite,
  updateOrg,
} from '@/api/org'
import { getProfileByName } from '@/api/profile'
import { uploadImage } from '@/api/upload'
import type { UserProfile } from '@shared/api'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ImageUploadTile } from '@/components/image-upload-tile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { buildDomainShareUrl } from '@/lib/domain-hint'
import { buildOrgInviteUrl } from '@/lib/org-invite'
import { Perm } from '@/lib/permissions'

export function DashboardOrgSettings() {
  const { currentOrg, user, refreshOrgs, can } = useAuth()
  const orgId = currentOrg?.id || user?.orgId || 0

  // 细粒度权限判定（站管 / 团队管理员 / 自定义角色统一走 can()）
  // 训练报告已统一到「组织数据」页，本页不再挂报告入口
  const canEditInfo = can(Perm.OrgInfoWrite)
  const canTogglePolicy = can(Perm.OrgPolicyToggle)
  const canEditOrg = canEditInfo || canTogglePolicy
  const canSitePolicy = can(Perm.SiteOrgPolicy)
  const canAddMember = can(Perm.OrgMemberAdd)
  const canReviewJoin = can(Perm.OrgJoinReview)
  const canViewInvite = can(Perm.OrgInviteView)
  const canRotateInvite = can(Perm.OrgInviteRotate)

  const [brandTitle, setBrandTitle] = useState('')
  const [brandLogo, setBrandLogo] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [joinMode, setJoinMode] = useState('auto')
  const [enableAiWeeklyEmail, setEnableAiWeeklyEmail] = useState(true)
  const [enableSpider, setEnableSpider] = useState(true)
  const [spiderInterval, setSpiderInterval] = useState(60)
  const [emailSchedule, setEmailSchedule] = useState('30 7 * * *')
  const [inviteCode, setInviteCode] = useState('')
  const [addSearch, setAddSearch] = useState('')
  const [addCandidates, setAddCandidates] = useState<UserProfile[]>([])
  const [addSearching, setAddSearching] = useState(false)
  /** 本域入口链接弹窗（非邀请） */
  const [domainShareOpen, setDomainShareOpen] = useState(false)

  const domainShareKey = useMemo(() => {
    const slug = (currentOrg?.slug || '').trim()
    if (slug) return slug
    if (orgId > 0) return String(orgId)
    return ''
  }, [currentOrg?.slug, orgId])

  const domainShareUrl = useMemo(
    () => (domainShareKey ? buildDomainShareUrl(domainShareKey) : ''),
    [domainShareKey],
  )

  function copyDomainShareUrl() {
    if (!domainShareUrl) {
      toast.error('暂时生成不了链接，确认已选中组织')
      return
    }
    void navigator.clipboard.writeText(domainShareUrl).then(
      () => toast.success('已复制本域入口链接'),
      () => toast.error('复制失败，请手动选择复制'),
    )
  }

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    setBrandTitle(currentOrg?.brandTitle || '')
    setBrandLogo(currentOrg?.brandLogo || '')
    setJoinMode(currentOrg?.joinMode || 'auto')
    setEnableAiWeeklyEmail(currentOrg?.enableAiWeeklyEmail !== false)
    setEnableSpider(currentOrg?.enableSpider !== false)
    setSpiderInterval(currentOrg?.spiderIntervalMin || 60)
    setEmailSchedule(currentOrg?.aiEmailSchedule || '30 7 * * *')
    if (canViewInvite) {
      void getInvite(orgId).then((r) => {
        if (cancelled) return
        if (r.inviteCode) setInviteCode(r.inviteCode)
      })
    }
    return () => {
      cancelled = true
    }
    // 仅在切换组织时重置草稿；依赖整个 currentOrg 会因对象引用变化反复重跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, currentOrg?.id, canViewInvite])

  useEffect(() => {
    if (!addSearch.trim()) {
      setAddCandidates([])
      return
    }
    let cancelled = false
    const t = window.setTimeout(async () => {
      setAddSearching(true)
      const res = await getProfileByName(addSearch.trim())
      if (cancelled) return
      setAddSearching(false)
      if (res.success) setAddCandidates(res.data || [])
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [addSearch])

  async function onLogoUpload(file: File | null) {
    if (!file) return
    setLogoUploading(true)
    const res = await uploadImage(file, 'site')
    setLogoUploading(false)
    if (!res.success || !res.data?.url) {
      toast.error(res.message || '上传失败，稍后重试')
      return
    }
    setBrandLogo(res.data.url)
    toast.success('已上传，请点保存生效')
  }

  async function save() {
    if (!orgId) return
    const payload: Record<string, unknown> = {
      id: orgId,
      brandTitle,
      brandLogo,
      brandFavicon: currentOrg?.brandFavicon || '',
      joinMode,
      enableAiWeeklyEmail,
      enableSpider,
    }
    if (canSitePolicy) {
      payload.spiderIntervalMin = spiderInterval
      payload.aiEmailSchedule = emailSchedule
    }
    const res = await updateOrg(payload)
    if (res.success) {
      toast.success('已保存')
      await refreshOrgs()
    } else toast.error(res.message || '保存失败，稍后重试')
  }

  // 按持有的权限决定可见区块；一个都没有则拒绝访问
  // （成员任命与角色管理已迁至「成员与分组」页 /admin/user；训练报告在「组织数据」）
  const hasOrgAdminAccess =
    canEditOrg || canAddMember || canReviewJoin || canViewInvite
  if (!hasOrgAdminAccess) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        你还没有本组织的设置权限。训练报告去「组织数据」看；要改品牌或邀请的话，找团队管理员开通。
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      {canEditOrg ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">组织品牌与加入方式</CardTitle>
          <CardDescription>{currentOrg?.name || '当前组织'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEditInfo && (
            <>
              <div className="space-y-2">
                <Label>组织名称（显示在侧栏）</Label>
                <Input value={brandTitle} onChange={(e) => setBrandTitle(e.target.value)} />
              </div>
              <ImageUploadTile
                label="组织 Logo"
                value={brandLogo}
                uploading={logoUploading}
                sizeClass="size-28"
                onFile={(file) => void onLogoUpload(file)}
              />
              <div className="space-y-2">
                <Label>加入方式</Label>
                <Select
                  value={joinMode}
                  onValueChange={setJoinMode}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">邀请码自动通过</SelectItem>
                    <SelectItem value="review">需管理员审批</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {canTogglePolicy && (
            <>
              <div className="flex items-center justify-between">
                <Label>周报邮件</Label>
                <Switch
                  checked={enableAiWeeklyEmail}
                  onCheckedChange={setEnableAiWeeklyEmail}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>定时同步</Label>
                <Switch checked={enableSpider} onCheckedChange={setEnableSpider} />
              </div>
            </>
          )}
          {canSitePolicy && (
            <>
              <div className="space-y-2">
                <Label>数据同步间隔（分钟）</Label>
                <Input
                  type="number"
                  value={spiderInterval}
                  onChange={(e) => setSpiderInterval(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>日报发送时间</Label>
                <Input
                  value={emailSchedule}
                  onChange={(e) => setEmailSchedule(e.target.value)}
                  placeholder="例如 30 7 * * *，表示每天 7:30"
                />
                <p className="text-xs text-muted-foreground">
                  例如每天 7:30 写作 30 7 * * *
                </p>
              </div>
            </>
          )}
          {!canSitePolicy && (
            <p className="text-xs text-muted-foreground">
              由站点管理员配置：数据同步每 {spiderInterval} 分钟 · 日报发送：
              {emailSchedule || '—'}
            </p>
          )}
          <Button onClick={() => void save()}>保存设置</Button>
        </CardContent>
      </Card>
      ) : null}

      {canViewInvite ? (
      <Card id="org-invite" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="text-base">邀请加入</CardTitle>
          <CardDescription>
            复制邀请链接或邀请码发给队员。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">邀请码</span>
            <code className="rounded bg-muted px-3 py-2 text-sm">{inviteCode || '—'}</code>
            <Button
              variant="secondary"
              size="sm"
              disabled={!inviteCode}
              onClick={() => {
                if (!inviteCode) return
                void navigator.clipboard.writeText(inviteCode).then(
                  () => toast.success('已复制邀请码'),
                  () => toast.error('复制失败，请手动选择复制'),
                )
              }}
            >
              复制邀请码
            </Button>
            {canRotateInvite ? (
              <ConfirmDialog
                title="更换团队邀请码？"
                description="更换后旧邀请码与旧邀请链接立即失效。确定继续？"
                confirmLabel="更换"
                onConfirm={() =>
                  void rotateInvite(orgId).then((r) => {
                    if (r.success) {
                      setInviteCode(r.inviteCode || '')
                      toast.success('已更换邀请码')
                    } else toast.error(r.message)
                  })
                }
              >
                <Button variant="outline" size="sm">
                  更换邀请码
                </Button>
              </ConfirmDialog>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">邀请链接</span>
            <code className="max-w-full truncate rounded bg-muted px-3 py-2 text-xs sm:text-sm">
              {inviteCode ? buildOrgInviteUrl(inviteCode) : '—'}
            </code>
            <Button
              size="sm"
              disabled={!inviteCode}
              onClick={() => {
                if (!inviteCode) return
                void navigator.clipboard.writeText(buildOrgInviteUrl(inviteCode)).then(
                  () => toast.success('已复制邀请链接'),
                  () => toast.error('复制失败，请手动选择复制'),
                )
              }}
            >
              复制邀请链接
            </Button>
          </div>
        </CardContent>
      </Card>
      ) : null}

      {canEditOrg ? (
      <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="flex min-w-0 flex-col gap-1.5">
            <CardTitle className="text-base">本域入口</CardTitle>
            <CardDescription>
              发给本组织成员，打开后会切到本域；不能用来邀请新人。
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!domainShareKey}
            onClick={() => setDomainShareOpen(true)}
          >
            <Share2Icon data-icon="inline-start" />
            分享本域链接
          </Button>
        </CardHeader>
      </Card>

      <Dialog open={domainShareOpen} onOpenChange={setDomainShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>分享本域链接</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  这不是邀请链接，不会把任何人拉进组织。
                </p>
                <p>
                  已经加入「{currentOrg?.name || '本组织'}」的成员打开后，会默认切到本域（网站各处都会生效），直到对方自己换组织。
                </p>
                <p>
                  还没加入的人打开后，只会留在公共域或自己原来的组织，不会自动成为成员。要加人请用上方的邀请链接或邀请码。
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="domain-share-url">链接</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                id="domain-share-url"
                readOnly
                value={domainShareUrl}
                className="font-mono text-xs sm:text-sm"
                onFocus={(e) => e.target.select()}
              />
              <Button
                type="button"
                className="shrink-0"
                disabled={!domainShareUrl}
                onClick={copyDomainShareUrl}
              >
                <Link2Icon data-icon="inline-start" />
                复制链接
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDomainShareOpen(false)}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      ) : null}

      {canReviewJoin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">加入审批</CardTitle>
            <CardDescription>审核通过邀请码提交的加入申请</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/user?tab=join">去审批</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {canAddMember ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">搜索用户加入本组织</CardTitle>
          <CardDescription>按昵称或用户名搜索，将用户加入本组织。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            placeholder="站内昵称或用户名"
            value={addSearch}
            onChange={(e) => setAddSearch(e.target.value)}
          />
          {addSearching && (
            <p className="text-xs text-muted-foreground">搜索中…</p>
          )}
          {addCandidates.map((c) => (
            <div
              key={c.userId}
              className="flex items-center justify-between rounded border px-3 py-2 text-sm"
            >
              <span>
                {c.name}
                {c.username ? (
                  <span className="ml-1 text-muted-foreground">@{c.username}</span>
                ) : null}
              </span>
              <Button
                size="sm"
                onClick={() =>
                  void addOrgMember({ orgId, userId: c.userId }).then((r) => {
                    if (r.success) {
                      toast.success(r.message || '已加入')
                      setAddSearch('')
                      setAddCandidates([])
                    } else toast.error(r.message)
                  })
                }
              >
                加入
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      ) : null}

    </div>
  )
}
