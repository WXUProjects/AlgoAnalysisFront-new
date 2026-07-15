import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { joinOrg, leaveOrg } from '@/api/org'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OrgHub() {
  const { orgs, currentOrg, switchOrg, refreshOrgs, user } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    if (!code.trim()) {
      toast.error('请输入团队识别码')
      return
    }
    setLoading(true)
    const res = await joinOrg(code.trim())
    setLoading(false)
    if (res.success) {
      toast.success(res.message || '操作成功')
      setCode('')
      await refreshOrgs()
    } else {
      toast.error(res.message || '加入失败')
    }
  }

  async function handleLeave(orgId: number, name: string, isSystem?: boolean) {
    if (isSystem) {
      toast.error('公共域不可退出')
      return
    }
    if (!confirm(`确定退出「${name}」？`)) return
    const res = await leaveOrg(orgId)
    if (res.success) {
      toast.success('已退出组织')
      await refreshOrgs()
    } else {
      toast.error(res.message || '退出失败')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">我的组织</h1>
        <p className="text-sm text-muted-foreground">
          默认加入公共域。可用团队识别码加入其他校队，并切换当前组织。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">当前组织</CardTitle>
          <CardDescription>
            {currentOrg?.name || '未选择'} ·{' '}
            {user?.orgRole === 'org_admin' ? '团队管理员' : '成员'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {orgs.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无组织数据，请重新登录。</p>
          )}
          {orgs.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div>
                <div className="font-medium">
                  {o.name}
                  {o.isSystem ? (
                    <span className="ml-2 text-xs text-muted-foreground">系统</span>
                  ) : null}
                  {o.id === user?.orgId ? (
                    <span className="ml-2 text-xs text-primary">当前</span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {o.myRole === 'org_admin' ? '团队管理员' : '成员'}
                </div>
              </div>
              <div className="flex gap-2">
                {o.id !== user?.orgId && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void switchOrg(o.id).then((r) => {
                      if (r.success) toast.success('已切换')
                      else toast.error(r.message)
                    })}
                  >
                    切换
                  </Button>
                )}
                {!o.isSystem && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleLeave(o.id, o.name, o.isSystem)}
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
          <CardDescription>向团队管理员索取「团队识别码」后在此填写。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="invite">团队识别码</Label>
            <Input
              id="invite"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="输入识别码"
            />
          </div>
          <Button disabled={loading} onClick={() => void handleJoin()}>
            {loading ? '提交中…' : '加入'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
