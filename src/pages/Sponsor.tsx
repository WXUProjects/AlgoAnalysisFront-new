import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CloudIcon,
  GiftIcon,
  HeartHandshakeIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  TrendingDownIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'
import {
  donate,
  getDonationStatus,
  getSponsorOverview,
  getSponsorSettings,
  listDonations,
  listExpenses,
  type Donation,
  type Expense,
  type SponsorOverview,
} from '@/api/sponsor'
import { listPlans } from '@/api/subscription'
import { useAuth } from '@/auth/AuthContext'
import { MarkdownBody } from '@/components/markdown-body'
import { MembershipPlansTable } from '@/components/membership-plans-table'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { SubscriptionPlan } from '@shared/api'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
const EXPENSE_PAGE_SIZE = 5
const AMOUNT_OPTIONS = [100, 500, 1000, 2000]

function fmtMoney(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  danger,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  danger?: boolean
}) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p
          className={cn(
            'text-2xl font-semibold tabular-nums tracking-tight',
            danger && 'text-destructive',
          )}
        >
          {value}
        </p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

export function Sponsor() {
  const { isLogin } = useAuth()

  const [overview, setOverview] = useState<SponsorOverview | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [expensePage, setExpensePage] = useState(1)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [introMarkdown, setIntroMarkdown] = useState('')
  const [loading, setLoading] = useState(true)
  const [donorsLoading, setDonorsLoading] = useState(true)

  const [selected, setSelected] = useState<string>('1000')
  const [otherYuan, setOtherYuan] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [payUrl, setPayUrl] = useState('')
  const [orderNo, setOrderNo] = useState('')
  const [checking, setChecking] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [giftEnabled, setGiftEnabled] = useState(false)
  const [giftDialogOpen, setGiftDialogOpen] = useState(false)
  const [giftCountdown, setGiftCountdown] = useState(5)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const giftConfirmingRef = useRef(false)

  const loadStats = useCallback(async () => {
    const [ov, ex] = await Promise.all([getSponsorOverview(), listExpenses()])
    if (ov.success && ov.data) setOverview(ov.data)
    if (ex.success && ex.data) setExpenses(ex.data)
  }, [])

  const loadDonations = useCallback(async (p: number) => {
    setDonorsLoading(true)
    const res = await listDonations(p, PAGE_SIZE)
    setDonorsLoading(false)
    if (res.success && res.data) {
      setDonations(res.data.list)
      setTotal(res.data.total)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void getSponsorSettings().then((res) => {
      if (cancelled) return
      if (res.success && res.data) {
        setEnabled(res.data.donationEnabled)
        setIntroMarkdown(res.data.introMarkdown)
      } else {
        setEnabled(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadStats().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [loadStats])

  useEffect(() => {
    void loadDonations(page)
  }, [page, loadDonations])

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPoll(), [stopPoll])

  const refreshAfterPaid = useCallback(() => {
    void loadStats()
    setPage(1)
    void loadDonations(1)
  }, [loadStats, loadDonations])

  const checkPaid = useCallback(
    async (no: string): Promise<boolean> => {
      const res = await getDonationStatus(no)
      if (res.success && res.data?.status === 'paid') {
        stopPoll()
        toast.success('感谢你的支持！')
        setPayUrl('')
        setOrderNo('')
        refreshAfterPaid()
        return true
      }
      return false
    },
    [stopPoll, refreshAfterPaid],
  )

  const startPoll = useCallback(
    (no: string) => {
      stopPoll()
      const startedAt = Date.now()
      pollRef.current = setInterval(async () => {
        if (await checkPaid(no)) return
        if (Date.now() - startedAt > 120_000) {
          stopPoll()
          setPayUrl('')
          setOrderNo('')
          toast.error('订单已过期，请重新下单')
        }
      }, 3000)
    },
    [checkPaid, stopPoll],
  )

  useEffect(() => {
    if (!giftDialogOpen) return
    setGiftCountdown(5)
    const t = window.setInterval(() => {
      setGiftCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => window.clearInterval(t)
  }, [giftDialogOpen])

  if (enabled === null) {
    return (
      <PageShell>
        <Skeleton className="h-40 w-full" />
      </PageShell>
    )
  }

  if (!enabled) {
    return (
      <PageShell>
        <Card className="mx-auto w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>赞助功能暂未开放</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            站点暂时关闭了打赏赞助入口，感谢你的关心。
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const amountCents =
    selected === 'other'
      ? Math.round(Number(otherYuan) * 100)
      : Number(selected)

  const giftTierLabel = amountCents >= 1000 ? 'Pro 会员' : 'Plus 会员'

  function handleGiftToggle(checked: boolean) {
    if (!checked) {
      setGiftEnabled(false)
      return
    }
    giftConfirmingRef.current = false
    setGiftCountdown(5)
    setGiftDialogOpen(true)
    if (plans.length === 0) {
      void listPlans().then((res) => {
        if (res.success && res.data) setPlans(res.data)
      })
    }
  }

  function handleGiftDialogOpenChange(open: boolean) {
    if (open) {
      setGiftDialogOpen(true)
      return
    }
    setGiftDialogOpen(false)
    if (!giftConfirmingRef.current) setGiftEnabled(false)
    giftConfirmingRef.current = false
  }

  function confirmGift() {
    giftConfirmingRef.current = true
    setGiftEnabled(true)
    setGiftDialogOpen(false)
  }

  async function handleDonate() {
    if (!isLogin) return
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      toast.error('请选择或填写赞助金额')
      return
    }
    setSubmitting(true)
    const res = await donate(amountCents, message, giftEnabled)
    setSubmitting(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '下单失败，请稍后再试')
      return
    }
    setOrderNo(res.data.orderNo)
    setPayUrl(res.data.payUrl)
    window.open(res.data.payUrl, '_blank', 'noopener,noreferrer')
    startPoll(res.data.orderNo)
  }

  async function handleAlreadyPaid() {
    if (!orderNo || checking) return
    setChecking(true)
    const paid = await checkPaid(orderNo)
    setChecking(false)
    if (!paid) toast.info('还没检测到支付，请确认已完成付款后重试')
  }

  const pagedExpenses = expenses.slice(
    (expensePage - 1) * EXPENSE_PAGE_SIZE,
    expensePage * EXPENSE_PAGE_SIZE,
  )

  return (
    <PageShell className="gap-5">
      {/* 顶部说明 */}
      <Card className="gap-3 overflow-hidden py-5">
        <CardHeader className="px-5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HeartHandshakeIcon className="size-5 text-primary" />
            赞助支持
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            GoAlgo 目前没有其他收入来源，服务器、CDN、域名等开销都靠赞助维持。
          </p>
          <MarkdownBody
            content={introMarkdown}
            className="text-sm leading-relaxed text-muted-foreground"
          />
          <p className="flex items-center gap-1.5 text-foreground">
            <ShieldCheckIcon className="size-4 shrink-0" />
            赞助用于服务器、CDN 等必要开支；是否接受回赠会员由你选择。
          </p>
        </CardContent>
      </Card>

      {overview?.loss ? (
        <Alert variant="destructive">
          <TrendingDownIcon />
          <AlertTitle>当前支出已超过当前可用赞助收入余额</AlertTitle>
          <AlertDescription>
            如果长期处于亏本状态，这个站点可能就要和大家说再见了。每一份支持都会让它可以走得更久。
          </AlertDescription>
        </Alert>
      ) : null}

      {/* 资金概览 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {loading || !overview ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))
        ) : (
          <>
            <StatCard
              icon={WalletIcon}
              label="当前可用金额"
              value={fmtMoney(overview.balanceCents)}
              hint="赞助收入减去全部开支"
              danger={overview.balanceCents < 0}
            />
            <StatCard
              icon={ReceiptTextIcon}
              label="本月开支"
              value={fmtMoney(overview.monthExpenseCents)}
            />
            <StatCard
              icon={UsersIcon}
              label="累计赞助人数"
              value={`${overview.donationCount} 人`}
            />
          </>
        )}
      </div>

      {/* 赞助面板 + 开支明细 */}
      <div className="flex flex-col gap-4">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-base">我要赞助</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <ToggleGroup
                type="single"
                variant="outline"
                value={selected}
                onValueChange={(v) => v && setSelected(v)}
                className="flex-wrap"
              >
                {AMOUNT_OPTIONS.map((c) => (
                  <ToggleGroupItem key={c} value={String(c)}>
                    {fmtMoney(c)}
                  </ToggleGroupItem>
                ))}
                <ToggleGroupItem value="other">其他金额</ToggleGroupItem>
              </ToggleGroup>
              {selected === 'other' ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">¥</span>
                  <Input
                    type="number"
                    step="1"
                    value={otherYuan}
                    onChange={(e) => setOtherYuan(e.target.value)}
                    placeholder="输入金额"
                    className="max-w-40"
                  />
                </div>
              ) : null}
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="留言（可选）"
              maxLength={60}
              rows={2}
            />

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <GiftIcon className="size-4 text-muted-foreground" />
                  获赠 1 个月会员
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {amountCents < 100
                    ? '赞助满 ¥1 起，满 ¥10 赠 Pro，否则赠 Plus'
                    : `当前可获赠：${giftTierLabel}（1 个月）`}
                </p>
              </div>
              <Switch
                checked={giftEnabled}
                disabled={isLogin ? Boolean(payUrl) : true}
                onCheckedChange={handleGiftToggle}
                aria-label="获赠 1 个月会员"
              />
            </div>

            {payUrl ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-center text-sm">
                  请在新打开的页面完成付款，支付完成后本页会自动刷新。
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    disabled={checking}
                    onClick={() => void handleAlreadyPaid()}
                  >
                    {checking ? '查询中…' : '已经支付'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      window.open(payUrl, '_blank', 'noopener,noreferrer')
                    }
                  >
                    重新打开支付页
                  </Button>
                </div>
              </div>
            ) : isLogin ? (
              <Button
                type="button"
                size="lg"
                disabled={submitting}
                onClick={() => void handleDonate()}
              >
                {submitting
                  ? '提交中…'
                  : amountCents > 0
                    ? `赞助 ${fmtMoney(amountCents)}`
                    : '赞助'}
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link to="/login?redirect=%2Fsponsor">登录后赞助</Link>
              </Button>
            )}
            <p className="text-center text-xs text-muted-foreground">
              赞助将全部用于服务器、CDN 等必要开支。
            </p>
          </CardContent>
        </Card>

        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CloudIcon className="size-4 text-muted-foreground" />
              开支明细
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : expenses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                还没有开支记录
              </p>
            ) : (
              <>
                {pagedExpenses.map((e, idx) => (
                  <div key={e.id}>
                    {idx > 0 ? <Separator /> : null}
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex items-center gap-2 text-sm">
                          <span className="truncate">{e.note}</span>
                          {e.kind === 'adjust' ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 font-normal"
                            >
                              余额调整
                            </Badge>
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatTime(e.spentAt)}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-destructive">
                        -{fmtMoney(e.amountCents)}
                      </span>
                    </div>
                  </div>
                ))}
                <Pagination
                  page={expensePage}
                  pageSize={EXPENSE_PAGE_SIZE}
                  total={expenses.length}
                  onChange={setExpensePage}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 赞助名单 */}
      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartHandshakeIcon className="size-4 text-muted-foreground" />
            赞助名单
            <Badge variant="outline" className="font-normal">
              {total}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {donorsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : donations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              还没有人赞助，期待你的第一份支持
            </p>
          ) : (
            <div className="flex flex-col">
              {donations.map((d, idx) => (
                <div key={d.id}>
                  {idx > 0 ? <Separator /> : null}
                  <div className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="max-w-32 shrink-0 truncate font-medium">
                      {d.nickname}
                    </span>
                    {d.message ? (
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {d.message}
                      </span>
                    ) : (
                      <span className="min-w-0 flex-1" />
                    )}
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                      {fmtMoney(d.amountCents)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatTime(d.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={setPage}
          />
        </CardContent>
      </Card>

      <Dialog open={giftDialogOpen} onOpenChange={handleGiftDialogOpenChange}>
        <DialogContent className="max-h-[min(90vh,46rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>赞助回赠会员</DialogTitle>
            <DialogDescription>
              勾选后，本次赞助将获赠 1 个月会员：赞助满 ¥10 赠 Pro，否则赠 Plus。
              会员为赞助的赠送，一经赞助恕不退款。
            </DialogDescription>
          </DialogHeader>
          <MembershipPlansTable plans={plans} />
          <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              本次赞助将获赠：
              <span className="font-medium text-foreground">{giftTierLabel}</span>（1 个月）
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleGiftDialogOpenChange(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                disabled={giftCountdown > 0}
                onClick={confirmGift}
              >
                {giftCountdown > 0 ? `请等待 ${giftCountdown} 秒` : '确认获赠'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
