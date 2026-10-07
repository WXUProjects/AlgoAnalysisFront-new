import type { ReactNode } from 'react'
import type { SubscriptionPlan } from '@shared/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/** 档位展示顺序 */
const PLAN_ORDER = ['free', 'plus', 'pro'] as const

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

/** 会员权益对比表（免费 / Plus / Pro）；children 渲染在功能行之后（如「当前状态」行） */
export function MembershipPlansTable({
  plans,
  children,
}: {
  plans: SubscriptionPlan[]
  children?: ReactNode
}) {
  const planOf = (plan: string) => plans.find((p) => p.plan === plan)
  return (
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
        {children}
      </TableBody>
    </Table>
  )
}
