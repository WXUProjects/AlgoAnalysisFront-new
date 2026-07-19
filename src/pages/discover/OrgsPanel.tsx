import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Building2Icon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { discoverOrgs, joinOrg } from '@/api/org'
import type { OrgDiscoverItem } from '@shared/api'
import { Pagination } from '@/components/pagination'
import { useListQueryState } from '@/hooks/use-list-query-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

const DEFAULT_PAGE_SIZE = 20

export function OrgsPanel({
  isLogin,
  switchOrg,
  refreshOrgs,
}: {
  isLogin: boolean
  switchOrg: (orgId: number) => Promise<{ success: boolean; message: string }>
  refreshOrgs: () => Promise<unknown>
}) {
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    pageKey: 'opage',
    pageSizeKey: 'opageSize',
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [list, setList] = useState<OrgDiscoverItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [joinTarget, setJoinTarget] = useState<OrgDiscoverItem | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [joining, setJoining] = useState(false)
  const [switching, setSwitching] = useState(0)

  const reload = useCallback(async () => {
    setLoading(true)
    const res = await discoverOrgs({ page, pageSize, q })
    setLoading(false)
    if (!res.success) {
      toast.error(res.message || '组织列表加载失败，请稍后重试')
      setList([])
      setTotal(0)
      return
    }
    setList(res.list)
    setTotal(res.total)
  }, [page, pageSize, q])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleSwitch(org: OrgDiscoverItem) {
    setSwitching(org.id)
    const res = await switchOrg(org.id)
    setSwitching(0)
    if (!res.success) {
      toast.error(res.message || '切换失败，请稍后重试')
      return
    }
    toast.success(`已切换到「${org.name}」`)
    await refreshOrgs()
    void reload()
  }

  async function handleJoin() {
    if (!joinTarget) return
    if (!inviteCode.trim()) {
      toast.error('请输入团队识别码')
      return
    }
    if (!displayName.trim()) {
      toast.error('请填写组织内名称')
      return
    }
    setJoining(true)
    const res = await joinOrg(inviteCode.trim(), displayName.trim())
    setJoining(false)
    if (!res.success) {
      toast.error(res.message || '加入失败，请稍后重试')
      return
    }
    toast.success(res.message || '已提交加入申请')
    setJoinTarget(null)
    setInviteCode('')
    setDisplayName('')
    await refreshOrgs()
    void reload()
  }

  function runOrgSearch(e?: FormEvent) {
    e?.preventDefault()
    setPage(1)
    setQ(qInput.trim())
  }

  return (
    <>
      <Card data-discover-orgs-panel="" className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2Icon className="size-4 text-muted-foreground" />
            发现组织
          </CardTitle>
          <CardDescription>
            浏览可加入的团队；加入需团队识别码
          </CardDescription>
          <CardAction>
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={runOrgSearch}
            >
              <Input
                className="w-40 sm:w-48"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="筛选组织名称"
              />
              <Button type="submit" size="sm" variant="outline">
                <SearchIcon data-icon="inline-start" />
                筛选
              </Button>
            </form>
          </CardAction>
        </CardHeader>
        <CardContent className="p-4">
          {/* 中栏固定宽度内最多两列，避免撑破三栏布局 */}
          <div className="grid gap-3 sm:grid-cols-2">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            {!loading &&
              list.map((o) => (
                <Card key={o.id} className="gap-3 py-4 shadow-none">
                  <CardHeader className="flex flex-row items-start gap-3 px-4">
                    <Avatar className="size-12">
                      <AvatarImage src={o.brandLogo || undefined} alt="" />
                      <AvatarFallback>
                        <Building2Icon className="size-5 opacity-60" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">
                        {o.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {o.memberCount} 人
                      </CardDescription>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {o.isSystem ? (
                          <Badge variant="secondary">系统组织</Badge>
                        ) : null}
                        {o.isCurrent ? (
                          <Badge variant="default">当前</Badge>
                        ) : null}
                        {o.isMember && !o.isCurrent ? (
                          <Badge variant="outline">已加入</Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter className="px-4">
                    {!isLogin ? (
                      <p className="text-xs text-muted-foreground">
                        登录后可加入或切换组织
                      </p>
                    ) : o.isMember ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={o.isCurrent ? 'secondary' : 'default'}
                        disabled={o.isCurrent || switching === o.id}
                        onClick={() => void handleSwitch(o)}
                      >
                        {switching === o.id ? (
                          <Spinner data-icon="inline-start" />
                        ) : null}
                        {o.isCurrent ? '当前组织' : '切换到此组织'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setJoinTarget(o)
                          setInviteCode('')
                          setDisplayName('')
                        }}
                      >
                        加入
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            {!loading && !list.length && (
              <div className="col-span-full">
                <Empty className="border-0 py-10 md:py-12">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Building2Icon />
                    </EmptyMedia>
                    <EmptyTitle>暂时还没有组织</EmptyTitle>
                    <EmptyDescription>
                      {q ? '没有匹配的组织名称' : '暂时没有可展示的组织'}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </div>
        </CardContent>
        {total > pageSize && (
          <CardFooter className="border-t py-3">
            <Pagination
              page={page}
              total={total}
              pageSize={pageSize}
              onChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={loading}
            />
          </CardFooter>
        )}
      </Card>

      <Dialog
        open={Boolean(joinTarget)}
        onOpenChange={(open) => {
          if (!open) setJoinTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>加入「{joinTarget?.name}」</DialogTitle>
            <DialogDescription>
              请输入该组织的团队识别码，并填写你在组织内的名称。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="join-code">团队识别码</Label>
              <Input
                id="join-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="识别码"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="join-name">组织内名称</Label>
              <Input
                id="join-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="在组织里显示的名字"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setJoinTarget(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={joining}
              onClick={() => void handleJoin()}
            >
              {joining ? <Spinner data-icon="inline-start" /> : null}
              确认加入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
