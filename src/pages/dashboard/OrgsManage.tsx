import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  addOrgMember,
  createOrg,
  listMyOrgs,
  listOrgMembers,
  setOrgMemberRole,
  updateOrg,
} from '@/api/org'
import type { OrgInfo, OrgMemberInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
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
  const [newName, setNewName] = useState('')
  const [addKeyword, setAddKeyword] = useState('')
  const [saving, setSaving] = useState(false)

  const [brandTitle, setBrandTitle] = useState('')
  const [joinMode, setJoinMode] = useState('auto')
  const [enableAiSummary, setEnableAiSummary] = useState(true)
  const [enableAiEmail, setEnableAiEmail] = useState(true)
  const [enableSpider, setEnableSpider] = useState(true)
  const [spiderInterval, setSpiderInterval] = useState(60)
  const [aiInterval, setAiInterval] = useState(180)
  const [emailSchedule, setEmailSchedule] = useState('30 7 * * *')
  const [status, setStatus] = useState('active')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listMyOrgs({ all: true })
    setLoading(false)
    if (res.success) setOrgs(res.list)
    else toast.error(res.message || '加载组织失败')
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
    setEnableSpider(selected.enableSpider !== false)
    setSpiderInterval(selected.spiderIntervalMin || 60)
    setAiInterval(selected.aiSummaryIntervalMin || 180)
    setEmailSchedule(selected.aiEmailSchedule || '30 7 * * *')
    setStatus(selected.status || 'active')
    void listOrgMembers(selected.id).then((r) => setMembers(r.list))
  }, [selected])

  if (!isAdmin) {
    return (
      <div className="p-6 text-sm text-muted-foreground">仅站点管理员可访问。</div>
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
      enableSpider,
      spiderIntervalMin: spiderInterval,
      aiSummaryIntervalMin: aiInterval,
      aiEmailSchedule: emailSchedule,
      status,
      name: selected.name,
    })
    setSaving(false)
    if (res.success) {
      toast.success('已保存')
      await load()
      await refreshOrgs()
      if (res.data) setSelected(res.data)
    } else toast.error(res.message || '保存失败')
  }

  return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">创建组织</CardTitle>
            <CardDescription>无需切换当前组织即可开通校队。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>组织名称</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <Button
              onClick={() =>
                void createOrg({ name: newName, adminUserId: user?.userId }).then(async (r) => {
                  if (r.success) {
                    toast.success('已创建')
                    setNewName('')
                    await load()
                    await refreshOrgs()
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
              <CardDescription>点击一行编辑参数与成员。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && (
                <div className="flex justify-center p-6">
                  <Spinner />
                </div>
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
                        <span className="ml-2 text-xs text-muted-foreground">系统</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {o.status || 'active'} · {o.joinMode || 'auto'} · slug={o.slug}
                    </span>
                  </button>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selected ? `编辑：${selected.name}` : '选择左侧组织'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selected && (
                <p className="text-sm text-muted-foreground">从左侧列表选择一个组织。</p>
              )}
              {selected && (
                <>
                  <div className="space-y-2">
                    <Label>品牌标题</Label>
                    <Input value={brandTitle} onChange={(e) => setBrandTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>状态</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={selected.isSystem}
                    >
                      <option value="active">正常</option>
                      <option value="suspended">停用</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>加入方式</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      value={joinMode}
                      onChange={(e) => setJoinMode(e.target.value)}
                    >
                      <option value="auto">识别码自动通过</option>
                      <option value="review">需审批</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>AI 总结</Label>
                    <Switch checked={enableAiSummary} onCheckedChange={setEnableAiSummary} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>AI 邮件</Label>
                    <Switch checked={enableAiEmail} onCheckedChange={setEnableAiEmail} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>定时同步</Label>
                    <Switch checked={enableSpider} onCheckedChange={setEnableSpider} />
                  </div>
                  <div className="space-y-2">
                    <Label>爬虫间隔（分钟）</Label>
                    <Input
                      type="number"
                      value={spiderInterval}
                      onChange={(e) => setSpiderInterval(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>AI 总结间隔（分钟）</Label>
                    <Input
                      type="number"
                      value={aiInterval}
                      onChange={(e) => setAiInterval(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>邮件 cron</Label>
                    <Input value={emailSchedule} onChange={(e) => setEmailSchedule(e.target.value)} />
                  </div>
                  <Button disabled={saving} onClick={() => void saveSelected()}>
                    {saving ? '保存中…' : '保存参数'}
                  </Button>

                  <div className="border-t pt-4">
                    <Label className="mb-2 block">搜索用户加入本组织</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="用户名或姓名"
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
                              const m = await listOrgMembers(selected.id)
                              setMembers(m.list)
                            } else toast.error(r.message)
                          })
                        }
                      >
                        加入
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <Label>成员与角色</Label>
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
                                  const list = await listOrgMembers(selected.id)
                                  setMembers(list.list)
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
