import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  grantSubscription,
  listPlans,
  listSubscriptions,
  revokeSubscription,
  updatePlans,
} from '@/api/subscription'
import type { SubUser, SubscriptionPlan } from '@shared/api'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { useListQueryState } from '@/hooks/use-list-query-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 10

/** 详情 Dialog：当前编辑用户 + 套餐表单草稿 */
type DetailState = SubUser | null

function fmtDate(unix: number): string {
  if (!unix) return '—'
  return new Date(unix * 1000).toLocaleDateString('zh-CN')
}

function tierLabel(tier: string): string {
  if (tier === 'pro') return 'Pro 会员'
  if (tier === 'plus') return 'Plus 会员'
  return '未订阅'
}

/** 会员管理：订阅用户列表 + 人工赋予/取消 + 套餐配置 */
export function DashboardSubscriptions() {
  const { page, pageSize, setPage, setPageSize, patch, searchParams } =
    useListQueryState({ defaultPageSize: DEFAULT_PAGE_SIZE })
  const keyword = (searchParams.get('keyword') || '').trim()
  const [keywordDraft, setKeywordDraft] = useState(keyword)

  const [total, setTotal] = useState(0)
  const [list, setList] = useState<SubUser[]>([])
  const [loading, setLoading] = useState(false)
  const [detailUser, setDetailUser] = useState<DetailState>(null)

  // 会员编辑草稿
  const [editTier, setEditTier] = useState('')
  const [editDays, setEditDays] = useState('30')
  const [savingGrant, setSavingGrant] = useState(false)

  // 套餐配置草稿（打开折叠区时从 plans 快照）
  const [planDrafts, setPlanDrafts] = useState<SubscriptionPlan[]>([])
  const [savingPlans, setSavingPlans] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listSubscriptions(page, pageSize, keyword)
    setLoading(false)
    if (res.success && res.data) {
      setList(res.data.list)
      setTotal(res.data.total)
    } else {
      toast.error(res.message || '加载失败')
    }
  }, [page, pageSize, keyword])

  useEffect(() => {
    void load()
  }, [load])

  async function loadPlans() {
    const res = await listPlans()
    if (res.success && res.data) {
      setPlanDrafts(res.data.map((p) => ({ ...p })))
    }
  }

  function openDetail(u: SubUser) {
    setDetailUser(u)
    setEditTier(u.tier || '')
    setEditDays('30')
    void loadPlans()
  }

  async function handleGrant() {
    if (!detailUser) return
    if (!editTier) {
      toast.error('请选择会员档位')
      return
    }
    const days = Number(editDays)
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      toast.error('天数须为 1–365 的整数')
      return
    }
    setSavingGrant(true)
    const res = await grantSubscription(detailUser.userId, editTier, days)
    setSavingGrant(false)
    if (res.success) {
      toast.success(res.message || '已赋予')
      void load()
      // 重拉该用户最新状态回填详情
      const fresh = await listSubscriptions(page, pageSize, keyword)
      if (fresh.success && fresh.data) {
        const u = fresh.data.list.find((x) => x.userId === detailUser.userId)
        if (u) setDetailUser(u)
      }
    } else {
      toast.error(res.message || '赋予失败')
    }
  }

  async function handleRevoke() {
    if (!detailUser) return
    setSavingGrant(true)
    const res = await revokeSubscription(detailUser.userId)
    setSavingGrant(false)
    if (res.success) {
      toast.success('已取消订阅')
      setDetailUser(null)
      void load()
    } else {
      toast.error(res.message || '取消失败')
    }
  }

  async function handleSavePlans() {
    setSavingPlans(true)
    const res = await updatePlans(planDrafts)
    setSavingPlans(false)
    if (res.success) {
      toast.success('套餐配置已保存')
    } else {
      toast.error(res.message || '保存失败')
    }
  }

  const patchPlan = (plan: string, key: keyof SubscriptionPlan, value: number | boolean) => {
    setPlanDrafts((prev) =>
      prev.map((p) => (p.plan === plan ? { ...p, [key]: value } : p)),
    )
  }

  const expired = (u: SubUser) => u.expireAt > 0 && u.expireAt * 1000 < Date.now()

  return (
    <PageShell>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            会员管理
            <Badge variant="outline" className="font-normal">
              {total}
            </Badge>
          </CardTitle>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              patch({ keyword: keywordDraft.trim() || null, page: '1' })
            }}
          >
            <Input
              placeholder="搜索用户名 / 昵称"
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" variant="outline" size="sm">
              搜索
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成员</TableHead>
                  <TableHead>会员档位</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      暂无订阅用户
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8">
                            <AvatarImage src="" alt="" />
                            <AvatarFallback>
                              {(u.name || u.username || '?').slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{u.name || u.username}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{u.username}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.tier === 'pro' ? 'default' : 'secondary'}>
                          {tierLabel(u.tier)}
                        </Badge>
                        {expired(u) ? (
                          <Badge variant="outline" className="ml-2 font-normal text-muted-foreground">
                            已过期
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        {fmtDate(u.expireAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.source === 'alipay' ? '支付宝' : u.source === 'manager' ? '管理员' : '—'}
                      </TableCell>
                      <TableCell>
                        <Button type="button" size="sm" variant="outline" onClick={() => openDetail(u)}>
                          详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <Dialog open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent className="max-h-[min(90vh,44rem)] overflow-y-auto sm:max-w-lg">
          {detailUser ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  会员详情 · {detailUser.name || detailUser.username}
                </DialogTitle>
                <DialogDescription>
                  @{detailUser.username} · 当前{' '}
                  <span className={cn('font-medium', detailUser.tier && 'text-foreground')}>
                    {tierLabel(detailUser.tier)}
                  </span>
                  {detailUser.expireAt > 0 ? ` · 到期 ${fmtDate(detailUser.expireAt)}` : ''}
                </DialogDescription>
              </DialogHeader>

              <Separator />

              <FieldGroup className="gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">会员编辑</p>
                  <p className="text-xs text-muted-foreground">
                    赋予/更新会员：从当前到期时间起叠加天数（已过期从今天起算）；取消订阅立即回落免费
                  </p>
                </div>
                <Field>
                  <FieldLabel htmlFor="sub-tier-select">会员档位</FieldLabel>
                  <Select value={editTier} onValueChange={setEditTier}>
                    <SelectTrigger id="sub-tier-select" className="w-40">
                      <SelectValue placeholder="选择档位" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plus">Plus 会员（2 元/月）</SelectItem>
                      <SelectItem value="pro">Pro 会员（7 元/月）</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="sub-days">天数（1–365）</FieldLabel>
                  <Input
                    id="sub-days"
                    type="number"
                    min={1}
                    max={365}
                    value={editDays}
                    onChange={(e) => setEditDays(e.target.value)}
                    disabled={savingGrant}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingGrant}
                    onClick={() => void handleGrant()}
                  >
                    {savingGrant ? '处理中…' : detailUser.tier ? '续期 / 更新' : '赋予会员'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={savingGrant || !detailUser.tier}
                    onClick={() => void handleRevoke()}
                  >
                    取消订阅
                  </Button>
                </div>
              </FieldGroup>

              <Separator />

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    套餐配置（价格 / 配额）
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <p className="text-xs text-muted-foreground">
                    调整各档位价格与配额（即时生效）。免费档价格必须为 0；手动刷新 0–100；
                    同步间隔 5–10080 分钟；AI 分析 0–10000 题/月。
                  </p>
                  {planDrafts.map((p) => (
                    <div key={p.plan} className="space-y-2 rounded-lg border p-3">
                      <p className="text-sm font-medium">
                        {p.plan === 'free' ? '免费' : p.plan === 'plus' ? 'Plus' : 'Pro'}
                        <Badge variant="outline" className="ml-2 font-normal">
                          {p.enabled ? '上架' : '下架'}
                        </Badge>
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Field>
                          <FieldLabel>价格（分）</FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            value={p.priceCents}
                            disabled={p.plan === 'free'}
                            onChange={(e) => patchPlan(p.plan, 'priceCents', Number(e.target.value))}
                          />
                        </Field>
                        <Field>
                          <FieldLabel>手动刷新（次/日）</FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={p.manualRefreshDaily}
                            onChange={(e) =>
                              patchPlan(p.plan, 'manualRefreshDaily', Number(e.target.value))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel>同步间隔（分钟）</FieldLabel>
                          <Input
                            type="number"
                            min={5}
                            max={10080}
                            value={p.syncIntervalMin}
                            onChange={(e) =>
                              patchPlan(p.plan, 'syncIntervalMin', Number(e.target.value))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel>AI 分析（题/月）</FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            max={10000}
                            value={p.aiAnalyzeMonth}
                            onChange={(e) =>
                              patchPlan(p.plan, 'aiAnalyzeMonth', Number(e.target.value))
                            }
                          />
                        </Field>
                      </div>
                      <FieldDescription>
                        能力开关：爬题面 {p.enableFetchProblem ? '开' : '关'} · AI 分析{' '}
                        {p.enableAiAnalyze ? '开' : '关'} · AI 日报 {p.enableAiDaily ? '开' : '关'} ·{' '}
                        常规日报 {p.enableRegularDaily ? '开' : '关'} · 时长 {p.days} 天
                        （能力开关与时长建议保持默认，仅在有明确调整需求时修改）
                      </FieldDescription>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingPlans}
                      onClick={() => void handleSavePlans()}
                    >
                      {savingPlans ? '保存中…' : '保存套餐配置'}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <DialogFooter className="sm:justify-start">
                <Button type="button" variant="outline" onClick={() => setDetailUser(null)}>
                  关闭
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
