import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { listGroups } from '@/api/group'
import { listProfiles } from '@/api/profile'
import { getAccessStats, type AccessStats } from '@/api/site'
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
import { todayYmd } from '@/lib/format'

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
    <span className={`text-xs ${cls}`}>
      {sign}
      {value}
    </span>
  )
}

type StatsScope = 'org' | 'site'

/** 组织数据统计：当前组织成员汇总 */
export function DashboardOrgStatistics() {
  return <StatisticsPage scope="org" />
}

/** 站点数据统计：全站汇总（仅站点管理员） */
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
  const [groupCount, setGroupCount] = useState(0)
  const [submitHeat, setSubmitHeat] = useState<HeatmapItem[]>([])
  const [acHeat, setAcHeat] = useState<HeatmapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [access, setAccess] = useState<AccessStats | null>(null)

  // period: -1 组织 / -2 全站；heatmap: 0 组织 / -2 全站
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
      const [p, users, groups, hS, hA, acc] = await Promise.all([
        getPeriod(periodUserId),
        listProfiles(1, 1, isSite ? 'site' : 'org'),
        isSite
          ? Promise.resolve({ success: true, data: { total: 0, list: [] } as const })
          : listGroups(1, 1),
        getHeatmap({
          startDate: '20230101',
          endDate: end,
          isAc: false,
          userId: heatmapUserId,
        }),
        getHeatmap({
          startDate: '20230101',
          endDate: end,
          isAc: true,
          userId: heatmapUserId,
        }),
        isSite && isAdmin
          ? getAccessStats(30)
          : Promise.resolve({ success: false, data: null, message: '' } as const),
      ])
      if (cancelled) return
      if (p.success) setPeriod(p.data)
      if (users.success && users.data) setUserCount(users.data.total)
      if (groups.success && groups.data) setGroupCount(groups.data.total)
      if (hS.success) setSubmitHeat(hS.data || [])
      if (hA.success) setAcHeat(hA.data || [])
      if (acc.success && acc.data) setAccess(acc.data)
      else setAccess(null)
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
    else toast.error(res.message || '全站同步失败')
  }

  const cards = [
    { label: isSite ? '全站用户' : '组织成员', value: userCount },
    ...(isSite
      ? []
      : [{ label: '分组数', value: groupCount }]),
    { label: '总 AC', value: period?.ac.total },
    { label: '总提交', value: period?.submit.total },
    {
      label: '今日 AC / 提交',
      value: `${period?.ac.today ?? '-'} / ${period?.submit.today ?? '-'}`,
    },
    {
      label: '本周 AC',
      value: period?.ac.thisWeek,
      delta: delta(period?.ac.thisWeek, period?.ac.lastWeek),
    },
    {
      label: '本月 AC',
      value: period?.ac.thisMonth,
      delta: delta(period?.ac.thisMonth, period?.ac.lastMonth),
    },
    {
      label: '本年 AC',
      value: period?.ac.thisYear,
      delta: delta(period?.ac.thisYear, period?.ac.lastYear),
    },
  ]

  const accToday = access?.today
  const accYday = access?.yesterday
  const accessCards = isSite
    ? [
        {
          label: '今日访问',
          value: accToday?.pv ?? (loading ? undefined : 0),
          delta: delta(accToday?.pv, accYday?.pv),
        },
        {
          label: '今日活跃用户',
          value: accToday?.dau ?? (loading ? undefined : 0),
          delta: delta(accToday?.dau, accYday?.dau),
        },
        {
          label: '今日访客',
          value: accToday?.uv ?? (loading ? undefined : 0),
          delta: delta(accToday?.uv, accYday?.uv),
        },
        {
          label: '昨日访问',
          value: accYday?.pv ?? (loading ? undefined : 0),
        },
      ]
    : []

  const accessChartData =
    access?.series.map((s) => ({
      date: s.date.slice(5),
      访问: s.pv,
      活跃: s.dau,
      访客: s.uv,
    })) ?? []

  const title = isSite
    ? '站点数据统计'
    : currentOrg?.name
      ? `${currentOrg.name} · 数据统计`
      : '组织数据统计'
  const desc = isSite
    ? '全站访问、提交与 AC 汇总'
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
                <AlertDialogTitle>同步全站 OJ 数据？</AlertDialogTitle>
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

      {isSite && (
        <div className="space-y-2">
          <div>
            <h4 className="text-sm font-medium">访问情况</h4>
            <p className="text-xs text-muted-foreground">
              今日访问人次、登录活跃用户与独立访客（按页面浏览统计）
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))
              : accessCards.map((c) => (
                  <Card key={c.label} className="gap-1 py-3">
                    <CardHeader className="px-3 py-0">
                      <CardDescription>{c.label}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-end gap-2 px-3">
                      <span className="text-xl font-semibold tabular-nums">
                        {c.value ?? '-'}
                      </span>
                      {'delta' in c && <DeltaText value={c.delta ?? null} />}
                    </CardContent>
                  </Card>
                ))}
          </div>
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-base">近 30 日访问趋势</CardTitle>
              <CardDescription>访问人次 · 活跃用户 · 访客</CardDescription>
            </CardHeader>
            <CardContent className="px-2">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : accessChartData.length === 0 ? (
                <p className="px-2 text-sm text-muted-foreground">
                  暂无访问数据，用户打开页面后会自动累计。
                </p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={accessChartData}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={36} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="访问"
                        stroke="var(--color-chart-1, #8884d8)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="活跃"
                        stroke="var(--color-chart-2, #82ca9d)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="访客"
                        stroke="var(--color-chart-3, #ffc658)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                  <span className="text-xl font-semibold tabular-nums">
                    {c.value ?? '-'}
                  </span>
                  {'delta' in c && <DeltaText value={c.delta ?? null} />}
                </CardContent>
              </Card>
            ))}
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">近 30 日趋势</CardTitle>
          <CardDescription>提交数与 AC 数对比</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <TrendChart submit={submitHeat} ac={acHeat} days={30} />
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
