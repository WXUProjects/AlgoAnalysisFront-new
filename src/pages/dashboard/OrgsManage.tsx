import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  addOrgMember,
  createOrg,
  deleteOrg,
  switchOrg,
  listMyOrgs,
  listOrgMembers,
  setOrgMemberRole,
  updateOrg,
} from '@/api/org'
import type { OrgInfo, OrgMemberInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Spinner } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Pagination } from '@/components/pagination'
import { OrgRoleSelect } from '@/components/rbac/org-role-select'
import { Perm } from '@/lib/permissions'
import { orgRoleName } from '@/lib/roles'

const MEMBER_PAGE_SIZE = 20

/** 站点侧：集中管理所有组织，无需切换当前组织 */
export function DashboardOrgsManage() {
  const { can, user, refreshOrgs } = useAuth()
  const navigate = useNavigate()
  const canListOrgs = can(Perm.SiteOrgList)
  const canOrgPolicy = can(Perm.SiteOrgPolicy)
  const canCreateOrg = can(Perm.SiteOrgCreate)
  const canDeleteOrg = can(Perm.SiteOrgDelete)
  const [orgs, setOrgs] = useState<OrgInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<OrgInfo | null>(null)
  const [members, setMembers] = useState<OrgMemberInfo[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [memberPage, setMemberPage] = useState(1)
  const [memberPageSize, setMemberPageSize] = useState(MEMBER_PAGE_SIZE)
  const [membersLoading, setMembersLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSeatLimit, setNewSeatLimit] = useState(50)
  const [addKeyword, setAddKeyword] = useState('')
  const [saving, setSaving] = useState(false)

  const [brandTitle, setBrandTitle] = useState('')
  const [joinMode, setJoinMode] = useState('auto')
  const [enableAiWeeklyEmail, setEnableAiWeeklyEmail] = useState(true)
  const [enableSpider, setEnableSpider] = useState(true)
  const [forceSync, setForceSync] = useState(false)
  const [enableFetchProblem, setEnableFetchProblem] = useState(true)
  const [enableAiAnalyze, setEnableAiAnalyze] = useState(true)
  const [spiderInterval, setSpiderInterval] = useState(60)
  const [emailSchedule, setEmailSchedule] = useState('30 7 * * *')
  const [status, setStatus] = useState('active')
  const [seatLimit, setSeatLimit] = useState(50)
  /** 修改成员角色前二次确认（与组织设置页一致） */
  const [roleConfirm, setRoleConfirm] = useState<{
    orgId: number
    userId: number
    name: string
    from: string
    to: string
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listMyOrgs({ all: true })
    setLoading(false)
    if (res.success) setOrgs(res.list)
    else toast.error(res.message || '组织列表加载失败，稍后重试')
  }, [])

  useEffect(() => {
    if (canListOrgs) void load()
  }, [canListOrgs, load])

  const loadMembers = useCallback(
    async (orgId: number, page: number, pageSize: number) => {
      setMembersLoading(true)
      const r = await listOrgMembers(orgId, { page, pageSize })
      setMembersLoading(false)
      if (!r.success) {
        toast.error('成员列表加载失败，稍后重试')
        return
      }
      setMembers(r.list)
      setMemberTotal(r.total)
      const maxPage = Math.max(1, Math.ceil(r.total / pageSize) || 1)
      if (page > maxPage) setMemberPage(maxPage)
    },
    [],
  )

  const selectedId = selected?.id

  // 切换组织：重置到第 1 页并填表单
  useEffect(() => {
    if (!selected) {
      setMembers([])
      setMemberTotal(0)
      return
    }
    setBrandTitle(selected.brandTitle || '')
    setJoinMode(selected.joinMode || 'auto')
    setEnableAiWeeklyEmail(selected.enableAiWeeklyEmail !== false)
    setEnableFetchProblem(selected.enableFetchProblem !== false)
    setEnableAiAnalyze(selected.enableAiAnalyze !== false)
    setEnableSpider(selected.enableSpider !== false)
    setForceSync(!!selected.forceSync)
    setSpiderInterval(selected.spiderIntervalMin || 60)
    setEmailSchedule(selected.aiEmailSchedule || '30 7 * * *')
    setStatus(selected.status || 'active')
    setSeatLimit(selected.seatLimit && selected.seatLimit > 0 ? selected.seatLimit : 50)
    setMemberPage(1)
    // 仅在切换组织 id 时重置表单与页码
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 成员分页加载（角色顺序由后端：团队管理员 > 教练 > 队长 > 成员）
  useEffect(() => {
    if (!selectedId) return
    void loadMembers(selectedId, memberPage, memberPageSize)
  }, [selectedId, memberPage, memberPageSize, loadMembers])

  if (!canListOrgs) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        需要站点管理员或获得相应授权后才能集中管理组织。
      </div>
    )
  }

  async function saveSelected() {
    if (!selected) return
    setSaving(true)
    const res = await updateOrg({
      id: selected.id,
      brandTitle,
      brandLogo: selected.brandLogo || '',
      brandFavicon: selected.brandFavicon || '',
      joinMode,
      enableAiWeeklyEmail,
      enableFetchProblem,
      enableAiAnalyze,
      enableSpider,
      forceSync,
      spiderIntervalMin: spiderInterval,
      aiEmailSchedule: emailSchedule,
      status,
      name: selected.name,
      seatLimit: Math.max(1, seatLimit || 50),
    })
    setSaving(false)
    if (res.success) {
      toast.success('已保存')
      await load()
      await refreshOrgs()
      if (res.data) setSelected(res.data)
    } else toast.error(res.message || '保存失败，稍后重试')
  }

  async function handleDeleteOrg() {
    if (!selected || selected.isSystem) return
    setSaving(true)
    const res = await deleteOrg(selected.id)
    setSaving(false)
    if (res.success) {
      toast.success(res.message || '已删除组织')
      setSelected(null)
      await load()
      await refreshOrgs()
    } else toast.error(res.message || '删除失败，稍后重试')
  }

  return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        {canCreateOrg ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">创建组织</CardTitle>
            <CardDescription>创建新的校队组织。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>组织名称</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="w-full space-y-2 sm:w-36">
              <Label>用户数上限</Label>
              <Input
                type="number"
                min={1}
                value={newSeatLimit}
                onChange={(e) => setNewSeatLimit(Number(e.target.value) || 50)}
              />
            </div>
            <Button
              onClick={() =>
                void createOrg({
                  name: newName,
                  adminUserId: user?.userId,
                  seatLimit: Math.max(1, newSeatLimit || 50),
                }).then(async (r) => {
                  if (r.success) {
                    toast.success('组织已创建，正在打开设置页以便复制邀请链接')
                    setNewName('')
                    setNewSeatLimit(50)
                    await load()
                    await refreshOrgs()
                    if (r.data) {
                      setSelected(r.data)
                      const orgId = r.data.id
                      if (orgId) {
                        const sw = await switchOrg(orgId)
                        if (sw.success) {
                          await refreshOrgs()
                          navigate('/admin/org')
                          return
                        }
                      }
                    }
                  } else toast.error(r.message)
                })
              }
            >
              创建
            </Button>
          </CardContent>
        </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">全部组织</CardTitle>
              <CardDescription>点选一行进行管理。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && (
                <div className="flex justify-center p-6">
                  <Spinner />
                </div>
              )}
              {!loading && orgs.length === 0 && (
                <p className="text-sm text-muted-foreground">暂时还没有组织</p>
              )}
              {!loading &&
                orgs.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelected(o)}
                    className={`flex w-full flex-col rounded-lg border p-3 text-left text-sm transition hover:bg-muted/50 ${
                      selected?.id === o.id ? 'border-primary bg-muted/40' : ''
                    }`}
                  >
                    <span className="font-medium">
                      {o.name}
                      {o.isSystem ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          默认公共域 · 不可删除
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {o.status === 'suspended' ? '停用' : '正常'} ·{' '}
                      {o.joinMode === 'review' ? '需审批加入' : '邀请码自动加入'} · 席位{' '}
                      {o.memberCount ?? '—'}
                      {' / '}
                      {o.seatLimit && o.seatLimit > 0 ? o.seatLimit : 50}
                      {o.isSystem ? '（仅计只属公共域）' : ''}
                    </span>
                  </button>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-base">
                  {selected ? `编辑：${selected.name}` : '选择左侧组织'}
                </CardTitle>
                {selected?.isSystem ? (
                  <CardDescription>公共域不能删除。</CardDescription>
                ) : selected ? (
                  <CardDescription>修改后请保存。</CardDescription>
                ) : null}
              </div>
              {selected && !selected.isSystem && canDeleteOrg && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm" disabled={saving}>
                      删除组织
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除组织「{selected.name}」？</AlertDialogTitle>
                      <AlertDialogDescription>
                        删除后成员将回到公共域，此操作无法撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        disabled={saving}
                        onClick={(e) => {
                          e.preventDefault()
                          void handleDeleteOrg()
                        }}
                      >
                        确认删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!selected && (
                <p className="text-sm text-muted-foreground">请从左侧选择一个组织。</p>
              )}
              {selected && (
                <>
                  <div className="space-y-2">
                    <Label>品牌标题</Label>
                    <Input
                      value={brandTitle}
                      disabled={!canOrgPolicy}
                      onChange={(e) => setBrandTitle(e.target.value)}
                    />
                  </div>
                  {canOrgPolicy && (
                    <div className="space-y-2">
                      <Label>状态</Label>
                      <Select
                        value={status}
                        onValueChange={setStatus}
                        disabled={selected.isSystem}
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">正常</SelectItem>
                          <SelectItem value="suspended">停用</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>加入方式</Label>
                    <Select
                      value={joinMode}
                      onValueChange={setJoinMode}
                      disabled={!canOrgPolicy}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">邀请码自动通过</SelectItem>
                        <SelectItem value="review">需审批</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {canOrgPolicy && (
                    <div className="space-y-2">
                      <Label>用户数上限</Label>
                      <Input
                        type="number"
                        min={1}
                        value={seatLimit}
                        onChange={(e) => setSeatLimit(Number(e.target.value) || 50)}
                      />
                      <p className="text-xs text-muted-foreground">
                        当前 {selected.memberCount ?? '—'} /{' '}
                        {seatLimit && seatLimit > 0 ? seatLimit : 50}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label>周报邮件</Label>
                    <Switch
                      checked={enableAiWeeklyEmail}
                      disabled={!canOrgPolicy}
                      onCheckedChange={setEnableAiWeeklyEmail}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>定时同步</Label>
                    <Switch
                      checked={enableSpider}
                      disabled={!canOrgPolicy}
                      onCheckedChange={setEnableSpider}
                    />
                  </div>
                  {canOrgPolicy && (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <Label>强制同步（不因长期未登录而暂停）</Label>
                          <span className="text-xs text-muted-foreground">
                            集训/比赛期：本组织成员不因不活跃暂停自动同步
                          </span>
                        </div>
                        <Switch checked={forceSync} onCheckedChange={setForceSync} />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <Label>题面爬取</Label>
                          <span className="text-xs text-muted-foreground">
                            近窗提交时自动爬取题面内容（管理端覆盖优先）
                          </span>
                        </div>
                        <Switch checked={enableFetchProblem} onCheckedChange={setEnableFetchProblem} />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <Label>题面 AI 分析</Label>
                          <span className="text-xs text-muted-foreground">
                            近窗提交时自动调用大模型分析题面（管理端覆盖优先）
                          </span>
                        </div>
                        <Switch checked={enableAiAnalyze} onCheckedChange={setEnableAiAnalyze} />
                      </div>
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
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={saving} onClick={() => void saveSelected()}>
                          {saving ? '保存中…' : '保存参数'}
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="border-t pt-4">
                    <Label className="mb-2 block">搜索用户直接加入本组织</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="用户名或昵称"
                        value={addKeyword}
                        onChange={(e) => setAddKeyword(e.target.value)}
                      />
                      <Button
                        variant="secondary"
                        onClick={() =>
                          void addOrgMember({
                            orgId: selected.id,
                            username: addKeyword.trim(),
                          }).then(async (r) => {
                            if (r.success) {
                              toast.success(r.message || '已加入')
                              setAddKeyword('')
                              setMemberPage(1)
                              await loadMembers(selected.id, 1, memberPageSize)
                            } else toast.error(r.message)
                          })
                        }
                      >
                        加入
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <Label>
                      成员与角色
                      {memberTotal > 0 ? (
                        <span className="ml-2 font-normal text-muted-foreground">
                          共 {memberTotal} 人 · 按角色排序
                        </span>
                      ) : null}
                    </Label>
                    {membersLoading && (
                      <div className="flex justify-center py-4">
                        <Spinner />
                      </div>
                    )}
                    {!membersLoading && members.length === 0 && (
                      <p className="text-sm text-muted-foreground">还没有成员</p>
                    )}
                    {!membersLoading &&
                      members.map((m) => (
                        <div
                          key={m.userId}
                          className="flex items-center justify-between gap-2 rounded border p-2 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            {m.name || m.username}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {orgRoleName(m.role)}
                            </span>
                          </span>
                          <OrgRoleSelect
                            value={m.role || 'member'}
                            actorRole="org_admin"
                            isSiteAdmin
                            triggerClassName="w-36 shrink-0"
                            ariaLabel={`设置「${m.name || m.username}」的角色`}
                            onRoleChange={(role) =>
                              setRoleConfirm({
                                orgId: selected.id,
                                userId: m.userId,
                                name: m.name || m.username,
                                from: m.role || 'member',
                                to: role,
                              })
                            }
                          />
                        </div>
                      ))}
                    {memberTotal > 0 && (
                      <Pagination
                        page={memberPage}
                        total={memberTotal}
                        pageSize={memberPageSize}
                        onChange={setMemberPage}
                        onPageSizeChange={(size) => {
                          setMemberPageSize(size)
                          setMemberPage(1)
                        }}
                        pageSizeOptions={[20, 50, 100]}
                        disabled={membersLoading}
                      />
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <ConfirmDialog
          open={roleConfirm != null}
          onOpenChange={(o) => {
            if (!o) setRoleConfirm(null)
          }}
          title="修改成员角色？"
          description={
            roleConfirm
              ? roleConfirm.to === 'captain' ||
                roleConfirm.to === 'group_leader'
                ? `任命「${orgRoleName(roleConfirm.to)}」须指定分组或分队。请到该组织的「成员与角色」页完成任命（需先切换到目标组织）。`
                : `确定将「${roleConfirm.name}」从「${orgRoleName(roleConfirm.from)}」改为「${orgRoleName(roleConfirm.to)}」？对方的管理权限会立即变化。`
              : ''
          }
          confirmLabel={
            roleConfirm &&
            (roleConfirm.to === 'captain' ||
              roleConfirm.to === 'group_leader')
              ? '知道了'
              : '确认修改'
          }
          onConfirm={() => {
            if (!roleConfirm) return
            const target = roleConfirm
            setRoleConfirm(null)
            if (
              target.to === 'captain' ||
              target.to === 'group_leader'
            ) {
              return
            }
            void setOrgMemberRole(target.orgId, target.userId, target.to).then(
              async (r) => {
                if (r.success) {
                  toast.success('已更新角色')
                  await loadMembers(target.orgId, memberPage, memberPageSize)
                } else toast.error(r.message)
              },
            )
          }}
        />
      </div>
  )
}
