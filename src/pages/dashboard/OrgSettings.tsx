import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import {
  createOrg,
  getInvite,
  listJoinRequests,
  listOrgMembers,
  reviewJoinRequest,
  rotateInvite,
  setOrgMemberRole,
  updateOrg,
} from '@/api/org'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function DashboardOrgSettings() {
  const { isAdmin, isOrgAdmin, currentOrg, user, refreshOrgs } = useAuth()
  const orgId = currentOrg?.id || user?.orgId || 0

  const [brandTitle, setBrandTitle] = useState('')
  const [brandLogo, setBrandLogo] = useState('')
  const [joinMode, setJoinMode] = useState('auto')
  const [enableAiSummary, setEnableAiSummary] = useState(true)
  const [enableAiEmail, setEnableAiEmail] = useState(true)
  const [enableSpider, setEnableSpider] = useState(true)
  const [spiderInterval, setSpiderInterval] = useState(60)
  const [aiInterval, setAiInterval] = useState(180)
  const [emailSchedule, setEmailSchedule] = useState('30 7 * * *')
  const [inviteCode, setInviteCode] = useState('')
  const [members, setMembers] = useState<
    { userId: number; name: string; username: string; role: string }[]
  >([])
  const [requests, setRequests] = useState<{ id: number; name: string; username: string }[]>([])
  const [newOrgName, setNewOrgName] = useState('')

  useEffect(() => {
    if (!orgId) return
    setBrandTitle(currentOrg?.brandTitle || '')
    setBrandLogo(currentOrg?.brandLogo || '')
    setJoinMode(currentOrg?.joinMode || 'auto')
    setEnableAiSummary(currentOrg?.enableAiSummary !== false)
    setEnableAiEmail(currentOrg?.enableAiEmail !== false)
    setEnableSpider(currentOrg?.enableSpider !== false)
    setSpiderInterval(currentOrg?.spiderIntervalMin || 60)
    setAiInterval(currentOrg?.aiSummaryIntervalMin || 180)
    setEmailSchedule(currentOrg?.aiEmailSchedule || '30 7 * * *')
    void getInvite(orgId).then((r) => {
      if (r.inviteCode) setInviteCode(r.inviteCode)
    })
    void listOrgMembers(orgId).then((r) => setMembers(r.list as typeof members))
    void listJoinRequests(orgId).then((r) => setRequests(r.list as typeof requests))
  }, [orgId, currentOrg])

  async function save() {
    if (!orgId) return
    const payload: Record<string, unknown> = {
      id: orgId,
      brandTitle,
      brandLogo,
      brandFavicon: currentOrg?.brandFavicon || '',
      joinMode,
      enableAiSummary,
      enableAiEmail,
      enableSpider,
    }
    if (isAdmin) {
      payload.spiderIntervalMin = spiderInterval
      payload.aiSummaryIntervalMin = aiInterval
      payload.aiEmailSchedule = emailSchedule
    }
    const res = await updateOrg(payload)
    if (res.success) {
      toast.success('已保存')
      await refreshOrgs()
    } else toast.error(res.message || '保存失败')
  }

  if (!isAdmin && !isOrgAdmin) {
    return (
      <div className="p-6 text-sm text-muted-foreground">需要团队管理员或站点管理员权限。</div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">创建组织</CardTitle>
            <CardDescription>仅站点管理员可开通新校队/机构。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>组织名称</Label>
              <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
            </div>
            <Button
              onClick={() =>
                void createOrg({ name: newOrgName, adminUserId: user?.userId }).then(async (r) => {
                  if (r.success) {
                    toast.success('已创建')
                    setNewOrgName('')
                    await refreshOrgs()
                  } else toast.error(r.message)
                })
              }
            >
              创建
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">组织品牌与加入方式</CardTitle>
          <CardDescription>{currentOrg?.name || '当前组织'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>组织标题（侧栏覆盖）</Label>
            <Input value={brandTitle} onChange={(e) => setBrandTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input value={brandLogo} onChange={(e) => setBrandLogo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>加入方式</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={joinMode}
              onChange={(e) => setJoinMode(e.target.value)}
            >
              <option value="auto">识别码自动通过</option>
              <option value="review">需管理员审批</option>
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
          {isAdmin && (
            <>
              <div className="space-y-2">
                <Label>爬虫间隔（分钟，仅站点可改）</Label>
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
                <Label>邮件时间（cron）</Label>
                <Input value={emailSchedule} onChange={(e) => setEmailSchedule(e.target.value)} />
              </div>
            </>
          )}
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              间隔由站点管理员配置：爬虫 {spiderInterval} 分钟 · AI {aiInterval} 分钟 · 邮件{' '}
              {emailSchedule}
            </p>
          )}
          <Button onClick={() => void save()}>保存设置</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">团队识别码</CardTitle>
          <CardDescription>分享给队员用于加入本组织。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <code className="rounded bg-muted px-3 py-2 text-sm">{inviteCode || '—'}</code>
          <Button
            variant="secondary"
            onClick={() =>
              void rotateInvite(orgId).then((r) => {
                if (r.success) {
                  setInviteCode(r.inviteCode || '')
                  toast.success('已更换识别码')
                } else toast.error(r.message)
              })
            }
          >
            更换识别码
          </Button>
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
                  {r.name || r.username}
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
                          await listOrgMembers(orgId).then((m) => setMembers(m.list as typeof members))
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
          <CardTitle className="text-base">成员与管理员</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between rounded border p-2">
              <div className="text-sm">
                {m.name || m.username}
                <span className="ml-2 text-xs text-muted-foreground">
                  {m.role === 'org_admin' ? '团队管理员' : '成员'}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void setOrgMemberRole(
                    orgId,
                    m.userId,
                    m.role === 'org_admin' ? 'member' : 'org_admin',
                  ).then(async (r) => {
                    if (r.success) {
                      toast.success('已更新角色')
                      const list = await listOrgMembers(orgId)
                      setMembers(list.list as typeof members)
                    } else toast.error(r.message)
                  })
                }
              >
                {m.role === 'org_admin' ? '降为成员' : '设为管理员'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
