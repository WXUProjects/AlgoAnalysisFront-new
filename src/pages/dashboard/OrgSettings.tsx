import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link2Icon, Share2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import {
  addOrgMember,
  getInvite,
  listJoinRequests,
  listOrgMembers,
  removeOrgMember,
  reviewJoinRequest,
  rotateInvite,
  setOrgMemberRole,
  updateOrg,
} from '@/api/org'
import { getProfileByName } from '@/api/profile'
import { uploadImage } from '@/api/upload'
import type { OrgMemberInfo, UserProfile } from '@shared/api'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ImageUploadTile } from '@/components/image-upload-tile'
import { Pagination } from '@/components/pagination'
import { OrgRoleSelect } from '@/components/rbac/org-role-select'
import { RoleManager } from '@/components/rbac/role-manager'
import { useListQueryState } from '@/hooks/use-list-query-state'
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
import { orgRoleName } from '@/lib/roles'
import { OrgTrainingReportCard } from '@/pages/dashboard/OrgTrainingReportCard'

const DEFAULT_MEMBER_PAGE_SIZE = 10

export function DashboardOrgSettings() {
  const { currentOrg, user, refreshOrgs, can } = useAuth()
  const orgId = currentOrg?.id || user?.orgId || 0

  // 细粒度权限判定（站管 / 团队管理员 / 自定义角色统一走 can()）
  const canEditInfo = can(Perm.OrgInfoWrite)
  const canTogglePolicy = can(Perm.OrgPolicyToggle)
  const canEditOrg = canEditInfo || canTogglePolicy
  const canSitePolicy = can(Perm.SiteOrgPolicy)
  const canViewReport = can(Perm.OrgReportView)
  const canManageRoles = can(Perm.OrgRoleManage)
  const canAddMember = can(Perm.OrgMemberAdd)
  const canSetMemberRole = can(Perm.OrgMemberRole)
  const canRemoveMember = can(Perm.OrgMemberRemove)
  const canReviewJoin = can(Perm.OrgJoinReview)
  const canViewInvite = can(Perm.OrgInviteView)
  const canRotateInvite = can(Perm.OrgInviteRotate)
  const canViewMembers = canSetMemberRole || canRemoveMember

  const {
    page: memberPage,
    pageSize: memberPageSize,
    setPage: setMemberPage,
    setPageSize: setMemberPageSize,
  } = useListQueryState({
    pageKey: 'mpage',
    pageSizeKey: 'mpageSize',
    defaultPageSize: DEFAULT_MEMBER_PAGE_SIZE,
  })

  const [brandTitle, setBrandTitle] = useState('')
  const [brandLogo, setBrandLogo] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [joinMode, setJoinMode] = useState('auto')
  const [enableAiEmail, setEnableAiEmail] = useState(true)
  const [enableAiWeeklyEmail, setEnableAiWeeklyEmail] = useState(true)
  const [enableSpider, setEnableSpider] = useState(true)
  const [spiderInterval, setSpiderInterval] = useState(60)
  const [emailSchedule, setEmailSchedule] = useState('30 7 * * *')
  const [inviteCode, setInviteCode] = useState('')
  const [members, setMembers] = useState<OrgMemberInfo[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [memberKeyword, setMemberKeyword] = useState('')
  const [memberKeywordDraft, setMemberKeywordDraft] = useState('')
  const [membersLoading, setMembersLoading] = useState(false)
  /** 竞态守卫：丢弃过期的成员列表响应 */
  const membersRequestId = useRef(0)
  const [requests, setRequests] = useState<
    { id: number; name: string; username: string; orgDisplayName?: string }[]
  >([])
  const [addSearch, setAddSearch] = useState('')
  const [addCandidates, setAddCandidates] = useState<UserProfile[]>([])
  const [addSearching, setAddSearching] = useState(false)
  /** 修改成员角色前二次确认 */
  const [roleConfirm, setRoleConfirm] = useState<{
    userId: number
    name: string
    from: string
    to: string
  } | null>(null)
  /** 移除成员前二次确认 */
  const [removeConfirm, setRemoveConfirm] = useState<{
    userId: number
    name: string
  } | null>(null)
  /** 本域入口链接弹窗（非邀请） */
  const [domainShareOpen, setDomainShareOpen] = useState(false)

  const isSystemOrg = Boolean(currentOrg?.isSystem)
  const myUserId = user?.userId || 0

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
      toast.error('暂无法生成链接，请确认已选中组织')
      return
    }
    void navigator.clipboard.writeText(domainShareUrl).then(
      () => toast.success('已复制本域入口链接'),
      () => toast.error('复制失败，请手动选择复制'),
    )
  }

  const loadMembers = useCallback(async () => {
    if (!orgId || !canViewMembers) return
    const rid = ++membersRequestId.current
    setMembersLoading(true)
    const r = await listOrgMembers(orgId, {
      page: memberPage,
      pageSize: memberPageSize,
      keyword: memberKeyword,
    })
    // 快速翻页/搜索时丢弃旧响应
    if (rid !== membersRequestId.current) return
    setMembersLoading(false)
    if (r.success) {
      setMembers(r.list)
      setMemberTotal(r.total)
    }
  }, [orgId, canViewMembers, memberPage, memberPageSize, memberKeyword])

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    setBrandTitle(currentOrg?.brandTitle || '')
    setBrandLogo(currentOrg?.brandLogo || '')
    setJoinMode(currentOrg?.joinMode || 'auto')
    setEnableAiEmail(currentOrg?.enableAiEmail !== false)
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
    if (canReviewJoin) {
      void listJoinRequests(orgId).then((r) => {
        if (cancelled) return
        setRequests(r.list as typeof requests)
      })
    }
    return () => {
      cancelled = true
    }
    // 仅在切换组织时重置草稿；依赖整个 currentOrg 会因对象引用变化反复重跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, currentOrg?.id, canViewInvite, canReviewJoin])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

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
      toast.error(res.message || '上传失败，请稍后重试')
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
      enableAiEmail,
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
    } else toast.error(res.message || '保存失败，请稍后重试')
  }

  // 按持有的权限决定可见区块；一个都没有则拒绝访问
  const hasOrgAdminAccess =
    canViewReport ||
    canEditOrg ||
    canManageRoles ||
    canAddMember ||
    canViewMembers ||
    canReviewJoin ||
    canViewInvite
  if (!hasOrgAdminAccess) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        你还没有本组织的管理权限；需要教练、队长、团队管理员或获得相应授权后才能访问。
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      {canViewReport && orgId > 0 ? <OrgTrainingReportCard orgId={orgId} /> : null}

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
                    <SelectItem value="auto">识别码自动通过</SelectItem>
                    <SelectItem value="review">需管理员审批</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {canTogglePolicy && (
            <>
              <div className="flex items-center justify-between">
                <Label>日报邮件（由组织开通）</Label>
                <Switch checked={enableAiEmail} onCheckedChange={setEnableAiEmail} />
              </div>
              <div className="flex items-center justify-between">
                <Label>周报邮件（教练 / 队长 / 管理员）</Label>
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
                <Label>数据同步间隔（分钟，仅站点管理员可改）</Label>
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
                  填写定时表达式。例如每天 7:30 写作 30 7 * * *
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">邀请加入</CardTitle>
          <CardDescription>
            复制邀请链接发给队员；对方打开后会看到欢迎提示，注册后自动加入本组织。也可只发识别码。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">识别码</span>
            <code className="rounded bg-muted px-3 py-2 text-sm">{inviteCode || '—'}</code>
            <Button
              variant="secondary"
              size="sm"
              disabled={!inviteCode}
              onClick={() => {
                if (!inviteCode) return
                void navigator.clipboard.writeText(inviteCode).then(
                  () => toast.success('已复制识别码'),
                  () => toast.error('复制失败，请手动选择复制'),
                )
              }}
            >
              复制识别码
            </Button>
            {canRotateInvite ? (
              <ConfirmDialog
                title="更换团队识别码？"
                description="更换后旧识别码与旧邀请链接立即失效。确定继续？"
                confirmLabel="更换"
                onConfirm={() =>
                  void rotateInvite(orgId).then((r) => {
                    if (r.success) {
                      setInviteCode(r.inviteCode || '')
                      toast.success('已更换识别码')
                    } else toast.error(r.message)
                  })
                }
              >
                <Button variant="outline" size="sm">
                  更换识别码
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
              发给已经在本组织里的成员，打开后会自动切到本域。不能用来邀请新人。
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
                  已经加入「{currentOrg?.name || '本组织'}」的成员打开后，会默认切到本域（前台与后台都生效），直到对方自己换组织。
                </p>
                <p>
                  还没加入的人打开后，只会留在公共域或自己原来的组织，不会自动成为成员。要加人请用上方的邀请链接或识别码。
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

      {canReviewJoin && requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">待审批加入</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border p-2">
                <span className="text-sm">
                  {r.orgDisplayName || r.name || r.username}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      void reviewJoinRequest(r.id, true).then(async (x) => {
                        if (x.success) {
                          toast.success('已通过')
                          const list = await listJoinRequests(orgId)
                          setRequests(list.list as typeof requests)
                          await loadMembers()
                        }
                      })
                    }
                  >
                    通过
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void reviewJoinRequest(r.id, false).then(async (x) => {
                        if (x.success) {
                          toast.success('已拒绝')
                          const list = await listJoinRequests(orgId)
                          setRequests(list.list as typeof requests)
                        }
                      })
                    }
                  >
                    拒绝
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                  void addOrgMember({ orgId, userId: c.userId }).then(async (r) => {
                    if (r.success) {
                      toast.success(r.message || '已加入')
                      setAddSearch('')
                      setAddCandidates([])
                      await loadMembers()
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

      {canViewMembers ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">成员与角色</CardTitle>
          <CardDescription>
            可设为成员、队长、教练或团队管理员；也可将成员移出本组织。支持分页与模糊搜索。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="搜索组织内名称或用户名"
              value={memberKeywordDraft}
              onChange={(e) => setMemberKeywordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setMemberPage(1)
                  setMemberKeyword(memberKeywordDraft.trim())
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                setMemberPage(1)
                setMemberKeyword(memberKeywordDraft.trim())
              }}
            >
              搜索
            </Button>
            {(memberKeyword || memberKeywordDraft) && (
              <Button
                variant="outline"
                onClick={() => {
                  setMemberKeywordDraft('')
                  setMemberKeyword('')
                  setMemberPage(1)
                }}
              >
                清空
              </Button>
            )}
          </div>
          {membersLoading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : (
            members.map((m) => {
              const label = m.name || m.orgDisplayName || m.username || String(m.userId)
              const canRemove =
                canRemoveMember && !isSystemOrg && m.userId !== myUserId
              return (
                <div
                  key={m.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-2"
                >
                  <div className="min-w-0 text-sm">
                    <span className="truncate">{label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {orgRoleName(m.role)}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canSetMemberRole ? (
                      <OrgRoleSelect
                        value={m.role || 'member'}
                        ariaLabel={`设置「${label}」的角色`}
                        onRoleChange={(role) =>
                          setRoleConfirm({
                            userId: m.userId,
                            name: label,
                            from: m.role || 'member',
                            to: role,
                          })
                        }
                      />
                    ) : null}
                    {canRemove ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setRemoveConfirm({ userId: m.userId, name: label })
                        }
                      >
                        移除
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
          {!membersLoading && !members.length && (
            <p className="text-sm text-muted-foreground">暂时还没有成员</p>
          )}
          <Pagination
            page={memberPage}
            total={memberTotal}
            pageSize={memberPageSize}
            onChange={setMemberPage}
            onPageSizeChange={setMemberPageSize}
            disabled={membersLoading}
          />
        </CardContent>
      </Card>
      ) : null}

      {canManageRoles && orgId > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">角色与权限</CardTitle>
            <CardDescription>
              内置角色（成员 / 队长 / 教练 / 团队管理员）的权限固定；也可以新建角色、自由勾选权限，并把组织成员加进来。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoleManager scope="org" orgId={orgId} />
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={roleConfirm != null}
        onOpenChange={(o) => {
          if (!o) setRoleConfirm(null)
        }}
        title="修改成员角色？"
        description={
          roleConfirm
            ? `确定将「${roleConfirm.name}」从「${orgRoleName(roleConfirm.from)}」改为「${orgRoleName(roleConfirm.to)}」？对方的后台权限会立即变化。`
            : ''
        }
        confirmLabel="确认修改"
        onConfirm={() => {
          if (!roleConfirm || !orgId) return
          const target = roleConfirm
          setRoleConfirm(null)
          void setOrgMemberRole(orgId, target.userId, target.to).then(
            async (r) => {
              if (r.success) {
                toast.success('已更新角色')
                await loadMembers()
              } else toast.error(r.message)
            },
          )
        }}
      />

      <ConfirmDialog
        open={removeConfirm != null}
        onOpenChange={(o) => {
          if (!o) setRemoveConfirm(null)
        }}
        title="移出组织？"
        description={
          removeConfirm
            ? `确定将「${removeConfirm.name}」移出本组织？对方将无法再访问本组织内容，可随时用邀请链接重新加入。`
            : ''
        }
        confirmLabel="确认移除"
        destructive
        onConfirm={() => {
          if (!removeConfirm || !orgId) return
          const target = removeConfirm
          setRemoveConfirm(null)
          void removeOrgMember(orgId, target.userId).then(async (r) => {
            if (r.success) {
              toast.success(r.message || '已移除成员')
              await loadMembers()
            } else toast.error(r.message || '移除失败，请稍后重试')
          })
        }}
      />
    </div>
  )
}
