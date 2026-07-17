import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  addOrgMember,
  createOrg,
  deleteOrg,
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
import { orgRoleName } from '@/lib/roles'

/** 站点管理员：集中管理所有组织，无需切换当前组织 */
export function DashboardOrgsManage() {
  const { isAdmin, user, refreshOrgs } = useAuth()
  const [orgs, setOrgs] = useState<OrgInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<OrgInfo | null>(null)
  const [members, setMembers] = useState<OrgMemberInfo[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [newName, setNewName] = useState('')
  const [newSeatLimit, setNewSeatLimit] = useState(50)
  const [addKeyword, setAddKeyword] = useState('')
  const [saving, setSaving] = useState(false)

  const [brandTitle, setBrandTitle] = useState('')
  const [joinMode, setJoinMode] = useState('auto')
  const [enableAiSummary, setEnableAiSummary] = useState(true)
  const [enableAiEmail, setEnableAiEmail] = useState(true)
  const [enableAiWeeklyEmail, setEnableAiWeeklyEmail] = useState(true)
  const [enableSpider, setEnableSpider] = useState(true)
  const [forceSync, setForceSync] = useState(false)
  const [spiderInterval, setSpiderInterval] = useState(60)
  const [aiInterval, setAiInterval] = useState(180)
  const [emailSchedule, setEmailSchedule] = useState('30 7 * * *')
  const [status, setStatus] = useState('active')
  const [seatLimit, setSeatLimit] = useState(50)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listMyOrgs({ all: true })
    setLoading(false)
    if (res.success) setOrgs(res.list)
    else toast.error(res.message || '组织列表加载失败，请稍后重试')
  }, [])

  useEffect(() => {
    if (isAdmin) void load()
  }, [isAdmin, load])

  useEffect(() => {
    if (!selected) return
    setBrandTitle(selected.brandTitle || '')
    setJoinMode(selected.joinMode || 'auto')
    setEnableAiSummary(selected.enableAiSummary !== false)
    setEnableAiEmail(selected.enableAiEmail !== false)
    setEnableAiWeeklyEmail(selected.enableAiWeeklyEmail !== false)
    setEnableSpider(selected.enableSpider !== false)
    setForceSync(!!selected.forceSync)
    setSpiderInterval(selected.spiderIntervalMin || 60)
    setAiInterval(selected.aiSummaryIntervalMin || 180)
    setEmailSchedule(selected.aiEmailSchedule || '30 7 * * *')
    setStatus(selected.status || 'active')
    setSeatLimit(selected.seatLimit && selected.seatLimit > 0 ? selected.seatLimit : 50)
    void listOrgMembers(selected.id, { page: 1, pageSize: 100 }).then((r) => {
      setMembers(r.list)
      setMemberTotal(r.total)
    })
  }, [selected])

  if (!isAdmin) {
    return (
      <div className="p-6 text-sm text-muted-foreground">仅站点管理员可使用此功能。</div>
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
      enableAiSummary,
      enableAiEmail,
      enableAiWeeklyEmail,
      enableSpider,
      forceSync,
      spiderIntervalMin: spiderInterval,
      aiSummaryIntervalMin: aiInterval,
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
    } else toast.error(res.message || '保存失败，请稍后重试')
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
    } else toast.error(res.message || '删除失败，请稍后重试')
  }

  return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">创建组织</CardTitle>
            <CardDescription>不用切换当前组织，也能直接创建校队。</CardDescription>
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
                    toast.success('已创建')
                    setNewName('')
                    setNewSeatLimit(50)
                    await load()
                    await refreshOrgs()
                    if (r.data) setSelected(r.data)
                  } else toast.error(r.message)
                })
              }
            >
              创建
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">全部组织</CardTitle>
              <CardDescription>点选一行即可编辑设置与成员。</CardDescription>
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
                      {o.joinMode === 'review' ? '需审批加入' : '识别码自动加入'} · 席位{' '}
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
                  <CardDescription>公共域是默认组织，不能删除。</CardDescription>
                ) : selected ? (
                  <CardDescription>改完设置后点保存；需要删除时用右侧按钮。</CardDescription>
                ) : null}
              </div>
              {selected && !selected.isSystem && (
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
                        删除后成员将回到公共域，组织内分组与加入申请一并清除。此操作不可在本页撤销。
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
                    <Input value={brandTitle} onChange={(e) => setBrandTitle(e.target.value)} />
                  </div>
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
                  <div className="space-y-2">
                    <Label>加入方式</Label>
                    <Select
                      value={joinMode}
                      onValueChange={setJoinMode}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">识别码自动通过</SelectItem>
                        <SelectItem value="review">需审批</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>用户数上限</Label>
                    <Input
                      type="number"
                      min={1}
                      value={seatLimit}
                      onChange={(e) => setSeatLimit(Number(e.target.value) || 50)}
                    />
                    <p className="text-xs text-muted-foreground">
                      当前占用 {selected.memberCount ?? '—'} /{' '}
                      {seatLimit && seatLimit > 0 ? seatLimit : 50}
                      {selected.isSystem
                        ? '。公共域只统计「未加入其它组织」的用户。'
                        : '。达上限后无法再加入成员。'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>AI 总结</Label>
                    <Switch checked={enableAiSummary} onCheckedChange={setEnableAiSummary} />
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
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Label>强制同步（不因长期未登录而暂停）</Label>
                      <span className="text-xs text-muted-foreground">
                        集训/比赛期：本组织成员不因不活跃暂停后台同步
                      </span>
                    </div>
                    <Switch checked={forceSync} onCheckedChange={setForceSync} />
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
                    <Label>训练小结生成间隔（分钟）</Label>
                    <Input
                      type="number"
                      value={aiInterval}
                      onChange={(e) => setAiInterval(Number(e.target.value))}
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

                  <div className="border-t pt-4">
                    <Label className="mb-2 block">搜索用户加入本组织</Label>
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
                              const m = await listOrgMembers(selected.id, {
                                page: 1,
                                pageSize: 100,
                              })
                              setMembers(m.list)
                              setMemberTotal(m.total)
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
                          共 {memberTotal} 人
                          {members.length < memberTotal
                            ? `（此处显示前 ${members.length} 人）`
                            : ''}
                        </span>
                      ) : null}
                    </Label>
                    {members.map((m) => (
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
                        <Select
                          value={m.role || 'member'}
                          onValueChange={(role) =>
                            void setOrgMemberRole(selected.id, m.userId, role).then(
                              async (r) => {
                                if (r.success) {
                                  toast.success('已更新')
                                  const list = await listOrgMembers(selected.id, {
                                    page: 1,
                                    pageSize: 100,
                                  })
                                  setMembers(list.list)
                                  setMemberTotal(list.total)
                                } else toast.error(r.message)
                              },
                            )
                          }
                        >
                          <SelectTrigger className="w-36 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">成员</SelectItem>
                            <SelectItem value="coach">教练</SelectItem>
                            <SelectItem value="captain">队长</SelectItem>
                            <SelectItem value="org_admin">团队管理员</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
