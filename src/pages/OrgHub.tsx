import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { joinOrg, leaveOrg, setOrgDisplayName } from '@/api/org'
import type { OrgInfo } from '@shared/api'
import { orgRoleName } from '@/lib/roles'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

export function OrgHub() {
  const { orgs, currentOrg, switchOrg, refreshOrgs, sync, user } = useAuth()
  const [code, setCode] = useState('')
  const [orgDisplayName, setOrgDisplayNameInput] = useState('')
  const [loading, setLoading] = useState(false)

  const [editOrg, setEditOrg] = useState<OrgInfo | null>(null)
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [leaveTarget, setLeaveTarget] = useState<{
    id: number
    name: string
    isSystem?: boolean
  } | null>(null)
  const [leaving, setLeaving] = useState(false)

  async function handleJoin() {
    if (!code.trim()) {
      toast.error('请输入团队识别码')
      return
    }
    if (!orgDisplayName.trim()) {
      toast.error('请填写组织内名称')
      return
    }
    setLoading(true)
    const res = await joinOrg(code.trim(), orgDisplayName.trim())
    setLoading(false)
    if (res.success) {
      toast.success(res.message || '已提交加入申请')
      setCode('')
      setOrgDisplayNameInput('')
      await refreshOrgs()
    } else {
      toast.error(res.message || '加入失败，请稍后重试')
    }
  }

  function requestLeave(orgId: number, name: string, isSystem?: boolean) {
    if (isSystem) {
      toast.error('公共域为默认组织，无法退出')
      return
    }
    setLeaveTarget({ id: orgId, name, isSystem })
  }

  async function confirmLeave() {
    if (!leaveTarget) return
    setLeaving(true)
    const res = await leaveOrg(leaveTarget.id)
    setLeaving(false)
    if (res.success) {
      toast.success('已退出组织')
      setLeaveTarget(null)
      // 退出当前组织时后端会签发新 JWT；必须 sync 刷新 orgId/orgRole
      await sync()
    } else {
      toast.error(res.message || '退出失败，请稍后重试')
    }
  }

  function openEditDisplayName(o: OrgInfo) {
    setEditOrg(o)
    setEditName((o.orgDisplayName || '').trim())
  }

  async function handleSaveDisplayName() {
    if (!editOrg) return
    const name = editName.trim()
    if (!name) {
      toast.error('请填写组织内名称')
      return
    }
    if ([...name].length > 32) {
      toast.error('组织内名称最多 32 字')
      return
    }
    setSavingName(true)
    const res = await setOrgDisplayName({
      orgId: editOrg.id,
      orgDisplayName: name,
    })
    setSavingName(false)
    if (res.success) {
      toast.success(res.message || '已更新组织内名称')
      setEditOrg(null)
      await refreshOrgs()
    } else {
      toast.error(res.message || '更新失败，请稍后重试')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">我的组织</h1>
        <p className="text-sm text-muted-foreground">
          默认在公共域。可用团队识别码加入校队，并切换当前所在组织。
          <strong className="font-medium text-foreground">站内昵称请在下方「修改称呼」中设置</strong>
          （改公共域称呼即改昵称）；加入其他校队后可单独设置队内名称。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">当前组织</CardTitle>
          <CardDescription>
            {currentOrg?.name || '未选择'} · {orgRoleName(user?.orgRole)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {orgs.length === 0 && (
            <p className="text-sm text-muted-foreground">暂时读不到组织信息，请重新登录后再试。</p>
          )}
          {orgs.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="font-medium">
                  {o.name}
                  {o.isSystem ? (
                    <span className="ml-2 text-xs text-muted-foreground">公共域</span>
                  ) : null}
                  {o.id === user?.orgId ? (
                    <span className="ml-2 text-xs text-primary">当前</span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {orgRoleName(o.myRole)}
                  {o.orgDisplayName ? (
                    <span className="ml-2">· 对外称呼：{o.orgDisplayName}</span>
                  ) : (
                    <span className="ml-2">· 未设置组织内名称</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditDisplayName(o)}>
                  修改称呼
                </Button>
                {o.id !== user?.orgId && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void switchOrg(o.id).then((r) => {
                        if (r.success) toast.success('已切换')
                        else toast.error(r.message)
                      })
                    }
                  >
                    切换
                  </Button>
                )}
                {!o.isSystem && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestLeave(o.id, o.name, o.isSystem)}
                  >
                    退出
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">加入团队</CardTitle>
          <CardDescription>
            向管理员索取团队识别码，并填写你在队内显示的名称（仅本队可见）。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor="invite">团队识别码</Label>
            <Input
              id="invite"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="输入识别码"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-display-name">组织内名称</Label>
            <Input
              id="org-display-name"
              value={orgDisplayName}
              onChange={(e) => setOrgDisplayNameInput(e.target.value)}
              placeholder="在本团队里显示的名字"
              maxLength={32}
            />
            <p className="text-xs text-muted-foreground">
              仅在该团队内展示，与公共域昵称互不影响。加入后也可在上方列表中修改。
            </p>
          </div>
          <Button disabled={loading} onClick={() => void handleJoin()} className="sm:w-fit">
            {loading ? '提交中…' : '加入'}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!leaveTarget}
        onOpenChange={(open) => {
          if (!open && !leaving) setLeaveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>退出组织？</AlertDialogTitle>
            <AlertDialogDescription>
              确定退出「{leaveTarget?.name}」？退出后需重新用识别码加入。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaving}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={leaving}
              onClick={(e) => {
                e.preventDefault()
                void confirmLeave()
              }}
            >
              {leaving ? '退出中…' : '确认退出'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!editOrg}
        onOpenChange={(open) => {
          if (!open) setEditOrg(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editOrg?.isSystem ? '修改站内昵称（公共域）' : '修改组织内称呼'}
            </DialogTitle>
            <DialogDescription>
              {editOrg
                ? editOrg.isSystem
                  ? '公共域称呼会同步为站内昵称，在个人主页与公共空间展示。'
                  : `在「${editOrg.name}」中展示的名称，仅该组织成员可见。`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-org-display-name">组织内名称</Label>
            <Input
              id="edit-org-display-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="例如真实姓名或队内常用名"
              maxLength={32}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSaveDisplayName()
              }}
            />
            <p className="text-xs text-muted-foreground">
              最多 32 字。修改公共域称呼会同步更新站内昵称；其他组织仅在该组织内生效。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrg(null)} disabled={savingName}>
              取消
            </Button>
            <Button disabled={savingName} onClick={() => void handleSaveDisplayName()}>
              {savingName ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
