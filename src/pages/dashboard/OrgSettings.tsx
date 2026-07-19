import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import {
  addOrgMember,
  getInvite,
  listJoinRequests,
  listOrgMembers,
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
import { useListQueryState } from '@/hooks/use-list-query-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { orgRoleName } from '@/lib/roles'
import { OrgTrainingReportCard } from '@/pages/dashboard/OrgTrainingReportCard'

const DEFAULT_MEMBER_PAGE_SIZE = 10

export function DashboardOrgSettings() {
  const { isAdmin, isOrgAdmin, isStaff, currentOrg, user, refreshOrgs } = useAuth()
  const orgId = currentOrg?.id || user?.orgId || 0

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

  const loadMembers = useCallback(async () => {
    if (!orgId) return
    setMembersLoading(true)
    const r = await listOrgMembers(orgId, {
      page: memberPage,
      pageSize: memberPageSize,
      keyword: memberKeyword,
    })
    setMembersLoading(false)
    if (r.success) {
      setMembers(r.list)
      setMemberTotal(r.total)
    }
  }, [orgId, memberPage, memberPageSize, memberKeyword])

  useEffect(() => {
    if (!orgId) return
    setBrandTitle(currentOrg?.brandTitle || '')
    setBrandLogo(currentOrg?.brandLogo || '')
    setJoinMode(currentOrg?.joinMode || 'auto')
    setEnableAiEmail(currentOrg?.enableAiEmail !== false)
    setEnableAiWeeklyEmail(currentOrg?.enableAiWeeklyEmail !== false)
    setEnableSpider(currentOrg?.enableSpider !== false)
    setSpiderInterval(currentOrg?.spiderIntervalMin || 60)
    setEmailSchedule(currentOrg?.aiEmailSchedule || '30 7 * * *')
    void getInvite(orgId).then((r) => {
      if (r.inviteCode) setInviteCode(r.inviteCode)
    })
    void listJoinRequests(orgId).then((r) => setRequests(r.list as typeof requests))
  }, [orgId, currentOrg])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  useEffect(() => {
    if (!addSearch.trim()) {
      setAddCandidates([])
      return
    }
    const t = window.setTimeout(async () => {
      setAddSearching(true)
      const res = await getProfileByName(addSearch.trim())
      setAddSearching(false)
      if (res.success) setAddCandidates(res.data || [])
    }, 350)
    return () => window.clearTimeout(t)
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
    if (isAdmin) {
      payload.spiderIntervalMin = spiderInterval
      payload.aiEmailSchedule = emailSchedule
    }
    const res = await updateOrg(payload)
    if (res.success) {
      toast.success('已保存')
      await refreshOrgs()
    } else toast.error(res.message || '保存失败，请稍后重试')
  }

  // 教练/队长：仅训练报告；团队管理员/站管：完整组织设置
  if (!isAdmin && !isOrgAdmin && !isStaff) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        需要教练、队长、团队管理员或站点管理员才能访问。
      </div>
    )
  }

  const canEditOrg = isAdmin || isOrgAdmin

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      {(isStaff || isAdmin) && orgId > 0 ? <OrgTrainingReportCard orgId={orgId} /> : null}

      {canEditOrg ? (
      <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">组织品牌与加入方式</CardTitle>
          <CardDescription>{currentOrg?.name || '当前组织'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          {isAdmin && (
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
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              由站点管理员配置：数据同步每 {spiderInterval} 分钟 · 日报发送：
              {emailSchedule || '—'}
            </p>
          )}
          <Button onClick={() => void save()}>保存设置</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">团队识别码</CardTitle>
          <CardDescription>把识别码发给队员，即可申请加入本组织。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <code className="rounded bg-muted px-3 py-2 text-sm">{inviteCode || '—'}</code>
          <ConfirmDialog
            title="更换团队识别码？"
            description="更换后旧识别码立即失效，已发出去的邀请将无法再使用。确定继续？"
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
            <Button variant="secondary">更换识别码</Button>
          </ConfirmDialog>
        </CardContent>
      </Card>

      {requests.length > 0 && (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">成员与角色</CardTitle>
          <CardDescription>
            可设为成员、队长、教练或团队管理员。支持分页与模糊搜索。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
            members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center justify-between gap-2 rounded border p-2"
              >
                <div className="min-w-0 text-sm">
                  <span className="truncate">{m.name || m.orgDisplayName || m.username}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {orgRoleName(m.role)}
                  </span>
                </div>
                <Select
                  value={m.role || 'member'}
                  onValueChange={(role) => {
                    if (role === (m.role || 'member')) return
                    setRoleConfirm({
                      userId: m.userId,
                      name: m.name || m.orgDisplayName || m.username || String(m.userId),
                      from: m.role || 'member',
                      to: role,
                    })
                  }}
                >
                  <SelectTrigger className="w-36 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">成员</SelectItem>
                    <SelectItem value="captain">队长</SelectItem>
                    <SelectItem value="coach">教练</SelectItem>
                    <SelectItem value="org_admin">团队管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))
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
      </>
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
    </div>
  )
}
