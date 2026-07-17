import { Link } from 'react-router-dom'
import {
  FlameIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from 'lucide-react'
import type { PeriodData } from '@shared/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  isLogin: boolean
  period?: PeriodData | null
  followingCount?: number | null
  followerCount?: number | null
}

function fmtNum(n: number | null | undefined, loading: boolean): string {
  if (loading) return '…'
  if (n == null) return '—'
  return String(n)
}

function weekDelta(thisWeek: number, lastWeek: number): {
  text: string
  up: boolean | null
} | null {
  const d = thisWeek - lastWeek
  if (d === 0) return { text: '持平', up: null }
  if (d > 0) return { text: `+${d}`, up: true }
  return { text: `${d}`, up: false }
}

/**
 * 移动端个人看板：一屏宽紧凑条，替代左侧竖栏，避免关键指标在小屏消失。
 */
export function MobilePersonalStrip({
  isLogin,
  period,
  followingCount,
  followerCount,
}: Props) {
  const loading = isLogin && period == null
  const ac = period?.ac
  const submit = period?.submit
  const delta = ac != null ? weekDelta(ac.thisWeek, ac.lastWeek) : null
  const acRate =
    ac != null && submit != null && submit.total > 0
      ? `${((ac.total / submit.total) * 100).toFixed(0)}%`
      : loading
        ? '…'
        : '—'

  return (
    <Card
      data-discover-mobile-personal=""
      className="gap-0 py-0 shadow-none"
    >
      <CardContent className="flex flex-col gap-2.5 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FlameIcon className="size-3.5 text-orange-500" />
            个人看板
          </p>
          {isLogin ? (
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Link to="/profile">完整数据</Link>
            </Button>
          ) : null}
        </div>

        {isLogin ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">本周 AC</p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight leading-none">
                  {fmtNum(ac?.thisWeek, loading)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    题
                  </span>
                </p>
              </div>
              {delta ? (
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted/60 px-2 py-0.5 text-[11px]',
                    delta.up === true &&
                      'text-emerald-600 dark:text-emerald-400',
                    delta.up === false && 'text-rose-600 dark:text-rose-400',
                    delta.up === null && 'text-muted-foreground',
                  )}
                >
                  {delta.up === true ? (
                    <TrendingUpIcon className="size-3" />
                  ) : null}
                  {delta.up === false ? (
                    <TrendingDownIcon className="size-3" />
                  ) : null}
                  较上周 {delta.text}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { label: '今日', value: fmtNum(ac?.today, loading) },
                  { label: '本月', value: fmtNum(ac?.thisMonth, loading) },
                  { label: '累计', value: fmtNum(ac?.total, loading) },
                  { label: 'AC 率', value: acRate },
                ] as const
              ).map((cell) => (
                <div
                  key={cell.label}
                  className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-1.5 py-1.5 text-center"
                >
                  <p className="text-[10px] leading-none text-muted-foreground">
                    {cell.label}
                  </p>
                  <p className="text-sm font-semibold tabular-nums leading-tight">
                    {cell.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                今日提交{' '}
                <span className="font-medium tabular-nums text-foreground">
                  {fmtNum(submit?.today, loading)}
                </span>
              </span>
              <span className="text-border">·</span>
              <Link
                to="/social?tab=following&page=1"
                className="hover:text-foreground hover:underline"
              >
                关注{' '}
                <span className="font-medium tabular-nums text-foreground">
                  {followingCount != null ? followingCount : '—'}
                </span>
              </Link>
              <span className="text-border">·</span>
              <Link
                to="/social?tab=followers&page=1"
                className="hover:text-foreground hover:underline"
              >
                粉丝{' '}
                <span className="font-medium tabular-nums text-foreground">
                  {followerCount != null ? followerCount : '—'}
                </span>
              </Link>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              登录后可查看本周 AC、提交量与关注数据
            </p>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/login">去登录</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
