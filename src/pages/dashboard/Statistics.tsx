import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { listGroups } from '@/api/group'
import { listProfiles } from '@/api/profile'
import { updateAllSpiders } from '@/api/spider'
import { getHeatmap, getPeriod } from '@/api/statistic'
import type { HeatmapItem, PeriodData } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { TrendChart } from '@/components/charts/trend-chart'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { daysAgoYmd, formatCompactNumber, todayYmd } from '@/lib/format'

const TREND_DAYS = 30

function delta(cur?: number, prev?: number) {
  if (cur === undefined || prev === undefined) return null
  return cur - prev
}

function DeltaText({ value }: { value: number | null }) {
  if (value === null) return null
  const sign = value > 0 ? '+' : ''
  const cls =
    value > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : value < 0
        ? 'text-destructive'
        : 'text-muted-foreground'
  return (
    <span className={`text-xs tabular-nums ${cls}`} title={String(value)}>
      {sign}
      {formatCompactNumber(value)}
    </span>
  )
}

function fmtStat(n?: number | null) {
  if (n === undefined || n === null) return '-'
  return formatCompactNumber(n)
}

type StatsScope = 'org' | 'site'

/** 组织数据统计：当前组织成员汇总 */
export function DashboardOrgStatistics() {
  return <StatisticsPage scope="org" />
}

/** 站点数据统计：全站提交/AC 汇总（仅站点管理员） */
export function DashboardSiteStatistics() {
  return <StatisticsPage scope="site" />
}

/** @deprecated 兼容旧 import */
export function DashboardStatistics() {
  return <StatisticsPage scope="org" />
}

function StatisticsPage({ scope }: { scope: StatsScope }) {
  const { isAdmin, currentOrg } = useAuth()
  const isSite = scope === 'site'
  const [period, setPeriod] = useState<PeriodData | null>(null)
  const [userCount, setUserCount] = useState(0)
  /** 已冻结（暂停同步）人数；仅站点统计展示 */
  const [frozenCount, setFrozenCount] = useState(0)
  const [groupCount, setGroupCount] = useState(0)
  const [submitHeat, setSubmitHeat] = useState<HeatmapItem[]>([])
  const [acHeat, setAcHeat] = useState<HeatmapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const periodUserId = isSite ? -2 : -1
  const heatmapUserId = isSite ? -2 : 0

  useEffect(() => {
    if (isSite && !isAdmin) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      const end = todayYmd()
      const start = daysAgoYmd(TREND_DAYS - 1)
      const listScope = isSite ? 'site' : 'org'
      const [p, users, frozenUsers, groups, hS, hA] = await Promise.all([
        getPeriod(periodUserId),
        listProfiles(1, 1, listScope),
        // 已冻结 = dormantOnly（含站管强制冻结/禁用）
        isSite
          ? listProfiles(1, 1, 'site', undefined, { dormantOnly: true })
          : Promise.resolve({
              success: true,
              data: { total: 0, list: [] },
            } as const),
        isSite
          ? Promise.resolve({ success: true, data: { total: 0, list: [] } as const })
          : listGroups(1, 1),
        getHeatmap({
          startDate: start,
          endDate: end,
          isAc: false,
          userId: heatmapUserId,
        }),
        getHeatmap({
          startDate: start,
          endDate: end,
          isAc: true,
          userId: heatmapUserId,
        }),
      ])
      if (cancelled) return
      if (p.success) setPeriod(p.data)
      if (users.success && users.data) setUserCount(users.data.total)
      if (isSite && frozenUsers.success && frozenUsers.data) {
        setFrozenCount(frozenUsers.data.total)
      } else {
        setFrozenCount(0)
      }
      if (groups.success && groups.data) setGroupCount(groups.data.total)
      if (hS.success) setSubmitHeat(hS.data || [])
      if (hA.success) setAcHeat(hA.data || [])
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isSite, isAdmin, currentOrg?.id, periodUserId, heatmapUserId])

  if (isSite && !isAdmin) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">仅站点管理员可查看全站统计。</p>
      </PageShell>
    )
  }

  async function handleUpdateAll() {
    setUpdating(true)
    const res = await updateAllSpiders()
    setUpdating(false)
    if (res.success) toast.success(res.message || '已开始全站同步')
    else toast.error(res.message || '全站同步失败，请稍后重试')
  }

  const activeUserCount = Math.max(0, userCount - frozenCount)
  const cards: {
    label: string
    value: string
    raw?: number
    delta?: number | null
  }[] = [
    {
      label: isSite ? '全站用户' : '组织成员',
      value: fmtStat(userCount),
      raw: userCount,
    },
    ...(isSite
      ? [
          {
            label: '已冻结',
            value: fmtStat(frozenCount),
            raw: frozenCount,
          },
          {
            label: '未冻结',
            value: fmtStat(activeUserCount),
            raw: activeUserCount,
          },
        ]
      : [{ label: '分组数', value: fmtStat(groupCount), raw: groupCount }]),
    // 站点/组织：后端 period 已按 AC 条数统计（不去重）
    {
      label: '生涯 AC',
      value: fmtStat(period?.ac.total),
      raw: period?.ac.total,
    },
    {
      label: '总提交',
      value: fmtStat(period?.submit.total),
      raw: period?.submit.total,
    },
    {
      label: '今日 AC / 提交',
      value: `${fmtStat(period?.ac.today)} / ${fmtStat(period?.submit.today)}`,
    },
    {
      label: '本周 AC',
      value: fmtStat(period?.ac.thisWeek),
      raw: period?.ac.thisWeek,
      delta: delta(period?.ac.thisWeek, period?.ac.lastWeek),
    },
    {
      label: '本月 AC',
      value: fmtStat(period?.ac.thisMonth),
      raw: period?.ac.thisMonth,
      delta: delta(period?.ac.thisMonth, period?.ac.lastMonth),
    },
    {
      label: '本年 AC',
      value: fmtStat(period?.ac.thisYear),
      raw: period?.ac.thisYear,
      delta: delta(period?.ac.thisYear, period?.ac.lastYear),
    },
  ]

  const title = isSite
    ? '站点数据统计'
    : currentOrg?.name
      ? `${currentOrg.name} · 数据统计`
      : '组织数据统计'
  const desc = isSite
    ? '全站用户提交与 AC 汇总；已冻结=后台已暂停同步（含站管强制冻结/禁用）。访问流量见「访问统计」。'
    : '按当前组织成员汇总提交与 AC（切换组织后数据随之变化）'

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
        {isSite && isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" size="sm" disabled={updating}>
                {updating ? <Spinner data-icon="inline-start" /> : null}
                同步全部 OJ 数据
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认同步全站做题数据？</AlertDialogTitle>
                <AlertDialogDescription>
                  将为所有用户同步各平台最新数据，过程可能较久，请确认后继续。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleUpdateAll()}>
                  确认同步
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))
          : cards.map((c) => (
              <Card key={c.label} className="gap-1 py-3">
                <CardHeader className="px-3 py-0">
                  <CardDescription>{c.label}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-end gap-2 px-3">
                  <span
                    className="text-xl font-semibold tabular-nums"
                    title={c.raw !== undefined && c.raw !== null ? String(c.raw) : undefined}
                  >
                    {c.value}
                  </span>
                  {c.delta !== undefined && <DeltaText value={c.delta ?? null} />}
                </CardContent>
              </Card>
            ))}
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">近 30 日趋势</CardTitle>
          <CardDescription>提交次数与通过次数对比</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <TrendChart submit={submitHeat} ac={acHeat} days={TREND_DAYS} />
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
