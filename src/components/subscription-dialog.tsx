import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import {
  createOrder,
  getMyAiStatus,
  getMySubscription,
  getOrder,
  listPlans,
} from '@/api/subscription'
import { getRefreshStatus } from '@/api/spider'
import type {
  MyAiStatusRes,
  MySubscription,
  RefreshSpiderStatusRes,
  SubscriptionPlan,
} from '@shared/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

/** 支付回流轮询间隔 / 上限 */
const POLL_INTERVAL_MS = 3000
const POLL_MAX_MS = 120_000

/** 套餐档位行（对比表顺序） */
const PLAN_ORDER = ['free', 'plus', 'pro'] as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 支付成功后回调（刷新我的订阅） */
  onSubscribed?: () => void
}

/** 功能行 × 档位对比（值与 plan 字段映射；free/plus 无该能力显示 —） */
const FEATURE_ROWS: {
  label: string
  get: (p: SubscriptionPlan) => string
}[] = [
  { label: '价格', get: (p) => (p.priceCents > 0 ? `¥${(p.priceCents / 100).toFixed(2)}/月` : '免费') },
  { label: '手动刷新做题记录', get: (p) => `${p.manualRefreshDaily} 次/日` },
  { label: '自动同步间隔', get: (p) => `${p.syncIntervalMin} 分钟` },
  { label: '爬取题面', get: (p) => (p.enableFetchProblem ? '✓' : '—') },
  { label: 'AI 分析题目', get: (p) => (p.aiAnalyzeMonth > 0 ? `${p.aiAnalyzeMonth} 题/月` : '—') },
  { label: 'AI 日报', get: (p) => (p.enableAiDaily ? '✓（默认关）' : '—') },
  { label: '常规日报', get: (p) => (p.enableRegularDaily ? '✓' : '—') },
]

export function SubscriptionDialog({ open, onOpenChange, onSubscribed }: Props) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [mySub, setMySub] = useState<MySubscription | null>(null)
  /** 今日手动刷新做题记录状态（配额/剩余/生效同步间隔） */
  const [refreshStatus, setRefreshStatus] =
    useState<RefreshSpiderStatusRes | null>(null)
  /** 我的 AI 能力落地状态（AI 分析/日报实际权限） */
  const [myAiStatus, setMyAiStatus] = useState<MyAiStatusRes | null>(null)
  const [selected, setSelected] = useState<string>('plus')
  const [orderNo, setOrderNo] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [amountCents, setAmountCents] = useState(0)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopPoll()
    }
  }, [stopPoll])

  // 打开时拉套餐 + 我的订阅 + 今日刷新状态 + AI 能力落地状态
  useEffect(() => {
    if (!open) return
    setError('')
    void (async () => {
      const [plansRes, myRes, statusRes, aiRes] = await Promise.all([
        listPlans(),
        getMySubscription(),
        getRefreshStatus(),
        getMyAiStatus(),
      ])
      if (!mountedRef.current) return
      if (plansRes.success && plansRes.data) setPlans(plansRes.data)
      if (myRes.success) setMySub(myRes.data)
      if (statusRes.success) setRefreshStatus(statusRes.data)
      if (aiRes.success) setMyAiStatus(aiRes.data)
      // 默认选中当前未订阅的第一个可购档（plus）
      const buyable = plansRes.data?.filter((p) => p.enabled && p.priceCents > 0) ?? []
      if (buyable.length > 0) {
        setSelected(buyable[0].plan)
      }
    })()
  }, [open])

  // 支付回流轮询：paid → 提示 + 刷新我的订阅 + 关闭；closed/超时 → 提示重新下单
  const startPoll = useCallback(
    (no: string) => {
      stopPoll()
      const startedAt = Date.now()
      pollRef.current = setInterval(async () => {
        const res = await getOrder(no)
        if (!mountedRef.current) return
        if (res.success && res.data?.status === 'paid') {
          stopPoll()
          toast.success('支付成功，会员已开通')
          onSubscribed?.()
          const myRes = await getMySubscription()
          if (mountedRef.current && myRes.success) setMySub(myRes.data)
          onOpenChange(false)
          return
        }
        if (res.success && (res.data?.status === 'closed' || Date.now() - startedAt > POLL_MAX_MS)) {
          stopPoll()
          setQrCode('')
          setOrderNo('')
          toast.error('订单已过期，请重新下单')
        }
      }, POLL_INTERVAL_MS)
    },
    [onOpenChange, onSubscribed, stopPoll],
  )

  async function handlePay() {
    if (creating) return
    setCreating(true)
    setError('')
    const res = await createOrder(selected)
    setCreating(false)
    if (!mountedRef.current) return
    if (!res.success || !res.data) {
      // 未配置支付宝 / 下单失败：保留对比表并提示赞助方式
      setError(res.message || '下单失败，请稍后再试')
      return
    }
    setOrderNo(res.data.orderNo)
    setQrCode(res.data.qrCode)
    setAmountCents(res.data.amountCents)
    startPoll(res.data.orderNo)
  }

  const planOf = (plan: string) => plans.find((p) => p.plan === plan)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,46rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>开通会员</DialogTitle>
          <DialogDescription>
            GoAlgo 会员提供更多每日刷新次数与 AI 能力，功能与套餐见下。
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[9rem]">功能</TableHead>
              {PLAN_ORDER.map((plan) => {
                const p = planOf(plan)
                return (
                  <TableHead key={plan} className="text-center">
                    {plan === 'free' ? '免费' : plan === 'plus' ? 'Plus' : 'Pro'}
                    {p && p.priceCents > 0 && (
                      <div className="text-xs font-normal text-muted-foreground">
                        ¥{(p.priceCents / 100).toFixed(2)}/月
                      </div>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {FEATURE_ROWS.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="text-sm">{row.label}</TableCell>
                {PLAN_ORDER.map((plan) => {
                  const p = planOf(plan)
                  return (
                    <TableCell key={plan} className="text-center text-sm">
                      {p ? row.get(p) : '—'}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
            {mySub?.tier ? (
              <TableRow>
                <TableCell className="text-sm">当前状态</TableCell>
                <TableCell colSpan={3} className="text-center">
                  <Badge variant={mySub.tier === 'pro' ? 'default' : 'secondary'}>
                    {mySub.tier === 'pro' ? 'Pro 会员' : 'Plus 会员'}
                  </Badge>
                  <span className="ml-2 text-xs text-muted-foreground">
                    剩余 {mySub.daysLeft} 天
                  </span>
                  {refreshStatus && refreshStatus.syncIntervalMin > 0 ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      同步间隔 {refreshStatus.syncIntervalMin} 分钟
                    </span>
                  ) : null}
                  {refreshStatus && refreshStatus.limit > 0 ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      今日剩余刷新 {refreshStatus.remaining}/{refreshStatus.limit} 次
                    </span>
                  ) : null}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        {mySub?.tier ? (
          <div className="space-y-1 rounded-lg border p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="text-sm font-medium text-foreground">当前 AI 权限</p>
            {myAiStatus ? (
              <>
                <p>
                  AI 分析题目：
                  {myAiStatus.aiAnalyzeQuota > 0 ? (
                    <span className="font-medium text-foreground">
                      ✓ 已开通 · {myAiStatus.aiAnalyzeQuota} 题/月（
                      {myAiStatus.aiAnalyzeSource === 'pro_org'
                        ? 'Pro 会员 + 组织'
                        : myAiStatus.aiAnalyzeSource === 'pro'
                          ? 'Pro 会员'
                          : '组织已开通'}
                      ）
                    </span>
                  ) : (
                    '✗ 未开通'
                  )}
                </p>
                <p>
                  AI 日报：
                  {myAiStatus.aiDailyEnabled ? (
                    <span className="font-medium text-foreground">✓ 已生效（Pro 会员）</span>
                  ) : myAiStatus.aiDailyOrgAllowed ? (
                    <span className="font-medium text-foreground">
                      组织已授权 · 尚未开启
                    </span>
                  ) : (
                    '✗ 未开通'
                  )}
                </p>
              </>
            ) : null}
            <p>AI 分析题目，可以让画像更精准。</p>
          </div>
        ) : null}

        {qrCode ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="rounded-xl border bg-white p-4">
              <QRCodeSVG value={qrCode} size={208} />
            </div>
            <div className="text-center text-sm">
              <p className="font-medium">请用支付宝扫码支付</p>
              <p className="mt-1 text-xs text-muted-foreground">
                应付 ¥{(amountCents / 100).toFixed(2)} · 订单 {orderNo.slice(0, 12)}…
                <br />
                支付完成后本页会自动刷新，请勿关闭
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              {plans
                .filter((p) => p.enabled && p.priceCents > 0)
                .map((p) => (
                  <Button
                    key={p.plan}
                    type="button"
                    variant={selected === p.plan ? 'default' : 'outline'}
                    onClick={() => setSelected(p.plan)}
                  >
                    {p.plan === 'plus' ? 'Plus' : 'Pro'} · ¥{(p.priceCents / 100).toFixed(2)}/月
                  </Button>
                ))}
            </div>
            {error ? (
              <p className={cn('text-center text-sm', 'text-destructive')}>{error}</p>
            ) : null}
            <Button type="button" disabled={creating} onClick={() => void handlePay()}>
              {creating ? '下单中…' : '扫码支付'}
            </Button>
          </>
        )}

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          赞助或开通遇到问题，请联系站长微信 <span className="font-medium text-foreground">srcenchen</span>
          ，或加入 QQ 群 <span className="font-medium text-foreground">925338346</span>。
        </p>
      </DialogContent>
    </Dialog>
  )
}
