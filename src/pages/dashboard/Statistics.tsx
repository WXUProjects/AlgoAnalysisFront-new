import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { listGroups } from '@/api/group'
import { listProfiles } from '@/api/profile'
import { listJoinRequests } from '@/api/org'
import { updateAllSpiders } from '@/api/spider'
import { getHeatmap, getPeriod, getRank } from '@/api/statistic'
import type { HeatmapItem, PeriodData, StatisticRankItem } from '@shared/api'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  sumHeatmap,
  computeActiveDays,
  computeDailyAvg,
  computePassRate,
  computeActiveMembers,
  computeParticipationRate,
  computePeakDay,
  computeConsecutiveDays,
  compareRecent7vsPrev7,
  computeNoAcMembers,
  computeWeekdayDistribution,
  WEEKDAY_LABELS,
} from '@/lib/dashboard-metrics'
import { cn } from '@/lib/utils'
import {
  daysAgoYmd,
  formatCompactNumber,
  todayYmd,
  ymdToDateKey,
} from '@/lib/format'

const TIME_RANGES = [
  { value: '7', label: '7 天', days: 7 },
  { value: '30', label: '30 天', days: 30 },
  { value: '90', label: '90 天', days: 90 },
] as const

type TimeRangeValue = (typeof TIME_RANGES)[number]['value']

function rangeDays(v: TimeRangeValue): number {
  return TIME_RANGES.find((r) => r.value === v)?.days ?? 30
}

function fmtStat(n?: number | null): string {
  if (n === undefined || n === null) return '-'
  return formatCompactNumber(n)
}

type StatsScope = 'org' | 'site'

type KpiCard = {
  label: string
  value: string
  raw?: number | null
  hint?: string
}

export function DashboardOrgStatistics() {
  return <StatisticsPage scope="org" />
}

export function DashboardSiteStatistics() {
  return <StatisticsPage scope="site" />
}

/** @deprecated 兼容旧 import */
export function DashboardStatistics() {
  return <StatisticsPage scope="org" />
}

function StatisticsPage({ scope }: { scope: StatsScope }) {
  const { isAdmin, isOrgAdmin, isCoach, isCaptain, currentOrg } = useAuth()
  const isSite = scope === 'site'

  const [timeRange, setTimeRange] = useState<TimeRangeValue>('30')
  const [period, setPeriod] = useState<PeriodData | null>(null)
  const [userCount, setUserCount] = useState(0)
  const [frozenCount, setFrozenCount] = useState(0)
  const [groupCount, setGroupCount] = useState(0)
  const [submitHeat, setSubmitHeat] = useState<HeatmapItem[]>([])
  const [acHeat, setAcHeat] = useState<HeatmapItem[]>([])
  const [rankList, setRankList] = useState<StatisticRankItem[]>([])
  const [rankTotal, setRankTotal] = useState(0)
  const [pendingJoinCount, setPendingJoinCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const hasLoadedOnce = useRef(false)

  const isStaff = isOrgAdmin || isCoach || isCaptain || isAdmin
  const periodUserId = isSite ? -2 : -1
  const heatmapUserId = isSite ? -2 : 0
  const days = rangeDays(timeRange)

  const abortRef = useRef(0)
  useEffect(() => {
    if (isSite && !isAdmin) {
      setLoading(false)
      return
    }
    const fetchId = ++abortRef.current
    let cancelled = false

    async function load() {
      setLoading(true)
      setErrors([])
      // rank 接口只接受 YYYY-MM-DD；todayYmd 是 YYYYMMDD，必须转换
      const end = ymdToDateKey(todayYmd())
      const start = ymdToDateKey(daysAgoYmd(days - 1))
      const listScope = isSite ? 'site' : 'org'

      try {
        const results = await Promise.allSettled([
          getPeriod(periodUserId),
          listProfiles(1, 1, listScope),
          isSite
            ? listProfiles(1, 1, 'site', undefined, { dormantOnly: true })
            : Promise.resolve({ success: true, data: { total: 0, list: [] } } as const),
          isSite
            ? Promise.resolve({ success: true, data: { total: 0, list: [] } } as const)
            : listGroups(1, 1),
          getHeatmap({ startDate: start, endDate: end, isAc: false, userId: heatmapUserId }),
          getHeatmap({ startDate: start, endDate: end, isAc: true, userId: heatmapUserId }),
          getRank({ startDate: start, endDate: end, scoreType: 'ac', pageSize: 50 }),
          // 仅团队管理员 / 站管拉待审批；教练、队长可能无权限
          !isSite && (isOrgAdmin || isAdmin) && currentOrg?.id
            ? listJoinRequests(currentOrg.id).catch(() => ({
                success: false,
                list: [] as unknown[],
              }))
            : Promise.resolve(null),
        ])

        if (cancelled || fetchId !== abortRef.current) return

        const failedItems: string[] = []

        const pResult = results[0]
        if (pResult.status === 'fulfilled' && pResult.value.success) {
          setPeriod(pResult.value.data)
        } else {
          failedItems.push('今日/本周统计')
        }

        const uResult = results[1]
        if (uResult.status === 'fulfilled' && uResult.value.success && uResult.value.data) {
          setUserCount(uResult.value.data.total)
        } else {
          failedItems.push('成员人数')
        }

        const fResult = results[2]
        if (isSite && fResult.status === 'fulfilled' && fResult.value.success && fResult.value.data) {
          setFrozenCount(fResult.value.data.total)
        } else if (isSite) {
          setFrozenCount(0)
        }

        const gResult = results[3]
        if (!isSite) {
          if (gResult.status === 'fulfilled' && gResult.value.success && gResult.value.data) {
            setGroupCount(gResult.value.data.total)
          } else {
            failedItems.push('分组')
          }
        }

        const hsResult = results[4]
        if (hsResult.status === 'fulfilled' && hsResult.value.success) {
          setSubmitHeat(hsResult.value.data || [])
        } else {
          failedItems.push('提交趋势')
        }

        const haResult = results[5]
        if (haResult.status === 'fulfilled' && haResult.value.success) {
          setAcHeat(haResult.value.data || [])
        } else {
          failedItems.push('通过趋势')
        }

        const rResult = results[6]
        if (rResult.status === 'fulfilled' && rResult.value.success && rResult.value.data) {
          setRankList(rResult.value.data.list)
          setRankTotal(rResult.value.data.total)
        } else if (!isSite) {
          failedItems.push('成员排行')
        }

        const jResult = results[7]
        if (jResult.status === 'fulfilled' && jResult.value && jResult.value.success) {
          setPendingJoinCount(jResult.value.list?.length ?? 0)
        }

        if (failedItems.length > 0) {
          setErrors([
            `有一部分数据没加载成功（${failedItems.join('、')}）。下面能显示的部分仍可查看，也可稍后刷新重试。`,
          ])
        }
        hasLoadedOnce.current = true
      } catch (e) {
        if (!cancelled && fetchId === abortRef.current) {
          setErrors([e instanceof Error ? e.message : '数据加载失败，请稍后重试'])
        }
      } finally {
        if (!cancelled && fetchId === abortRef.current) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isSite, isAdmin, isOrgAdmin, currentOrg?.id, periodUserId, heatmapUserId, days])

  const metrics = useMemo(() => {
    const rangeSubmit = sumHeatmap(submitHeat)
    const rangeAc = sumHeatmap(acHeat)
    const careerAc = period?.ac.total ?? 0
    const careerSubmit = period?.submit.total ?? 0

    const activeMembers = isSite
      ? Math.max(0, userCount - frozenCount)
      : computeActiveMembers(rankTotal, userCount)

    return {
      rangeSubmit,
      rangeAc,
      passRate: computePassRate(rangeAc, rangeSubmit),
      dailyAvg: computeDailyAvg(rangeSubmit, days),
      activeDays: computeActiveDays(submitHeat),
      careerAc,
      careerSubmit,
      activeMembers,
      participationRate: computeParticipationRate(activeMembers, userCount),
      peakDay: computePeakDay(submitHeat),
      consecutiveDays: computeConsecutiveDays(submitHeat),
      recent7vsPrev7: compareRecent7vsPrev7(submitHeat, todayYmd()),
      noAcMembers: computeNoAcMembers(userCount, rankTotal),
      weekdayDist: computeWeekdayDistribution(submitHeat),
    }
  }, [period, userCount, frozenCount, rankTotal, submitHeat, acHeat, days, isSite])

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

  const orgName = currentOrg?.name || '当前组织'
  let title: string
  let desc: string
  if (isSite) {
    title = '站点数据统计'
    desc = '查看全站用户的提交与通过情况。已冻结用户不会再自动同步做题数据。'
  } else if (isOrgAdmin) {
    title = `${orgName} · 组织管理`
    desc = '一眼掌握成员活跃、训练参与和待办审批，方便日常运营。'
  } else if (isCoach) {
    title = `${orgName} · 教练工作台`
    desc = '按时间范围查看训练参与与成员排行，及时了解队伍状态。'
  } else if (isCaptain) {
    title = `${orgName} · 队长工作台`
    desc = '按时间范围查看训练参与与成员排行。'
  } else {
    title = `${orgName} · 数据统计`
    desc = '按当前组织成员汇总提交与通过情况；切换组织后数据会随之更新。'
  }

  const kpiCards: KpiCard[] = isSite
    ? [
        { label: '全站用户', value: fmtStat(userCount), raw: userCount },
        { label: '已冻结', value: fmtStat(frozenCount), raw: frozenCount, hint: '已暂停同步' },
        {
          label: '未冻结',
          value: fmtStat(userCount - frozenCount),
          raw: userCount - frozenCount,
        },
        { label: '累计通过', value: fmtStat(metrics.careerAc), raw: metrics.careerAc, hint: '生涯 AC' },
        {
          label: '累计提交',
          value: fmtStat(metrics.careerSubmit),
          raw: metrics.careerSubmit,
        },
        {
          label: '今日通过 / 提交',
          value: `${fmtStat(period?.ac.today)} / ${fmtStat(period?.submit.today)}`,
        },
        { label: '本周通过', value: fmtStat(period?.ac.thisWeek), raw: period?.ac.thisWeek },
        { label: '本月通过', value: fmtStat(period?.ac.thisMonth), raw: period?.ac.thisMonth },
      ]
    : [
        { label: '组织成员', value: fmtStat(userCount), raw: userCount },
        { label: '分组数', value: fmtStat(groupCount), raw: groupCount },
        {
          label: '本期活跃',
          value: fmtStat(metrics.activeMembers),
          raw: metrics.activeMembers,
          hint: '有通过记录',
        },
        {
          label: '参与率',
          value: `${metrics.participationRate}%`,
          hint: '活跃 / 成员',
        },
        {
          label: '本期通过',
          value: fmtStat(metrics.rangeAc),
          raw: metrics.rangeAc,
          hint: `近 ${days} 天`,
        },
        {
          label: '本期提交',
          value: fmtStat(metrics.rangeSubmit),
          raw: metrics.rangeSubmit,
          hint: `近 ${days} 天`,
        },
        {
          label: '通过率',
          value: `${metrics.passRate}%`,
          hint: '通过 / 提交',
        },
        {
          label: '活跃天数',
          value: String(metrics.activeDays),
          hint: `近 ${days} 天有提交`,
        },
        {
          label: '日均提交',
          value: String(metrics.dailyAvg),
          hint: '总提交 ÷ 天数',
        },
        {
          label: '累计通过',
          value: fmtStat(metrics.careerAc),
          raw: metrics.careerAc,
          hint: '生涯 AC',
        },
      ]

  const showSkeleton = loading && !hasLoadedOnce.current
  const weekdayMax = Math.max(...metrics.weekdayDist, 1)

  return (
    <PageShell>
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="font-semibold tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(v) => {
              if (v) setTimeRange(v as TimeRangeValue)
            }}
            size="sm"
            variant="outline"
            className="hidden sm:flex"
            aria-label="统计时间范围"
          >
            {TIME_RANGES.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value} className="px-3">
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {!isSite && isOrgAdmin && pendingJoinCount !== null && pendingJoinCount > 0 && (
            <Button asChild size="sm" variant="destructive">
              <Link to="/admin/user">待审批 {pendingJoinCount}</Link>
            </Button>
          )}

          {isSite && isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" disabled={updating}>
                  {updating ? <Spinner data-icon="inline-start" /> : null}
                  同步全部做题数据
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认同步全站做题数据？</AlertDialogTitle>
                  <AlertDialogDescription>
                    将为所有用户拉取各平台最新提交，过程可能较久，期间可先离开本页。
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
      </div>

      <ToggleGroup
        type="single"
        value={timeRange}
        onValueChange={(v) => {
          if (v) setTimeRange(v as TimeRangeValue)
        }}
        size="sm"
        variant="outline"
        className="w-full sm:hidden"
        aria-label="统计时间范围"
      >
        {TIME_RANGES.map((r) => (
          <ToggleGroupItem key={r.value} value={r.value} className="flex-1">
            {r.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div
        className={cn(
          'grid grid-cols-2 gap-2 sm:grid-cols-3',
          isSite ? 'lg:grid-cols-4' : 'lg:grid-cols-5',
        )}
      >
        {showSkeleton
          ? Array.from({ length: isSite ? 8 : 10 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
            ))
          : kpiCards.map((c) => (
              <Card key={c.label} className="gap-1 py-3 shadow-none">
                <CardHeader className="px-3 py-0">
                  <CardDescription className="text-xs">{c.label}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-0.5 px-3">
                  <span
                    className={cn(
                      'text-xl font-semibold tabular-nums tracking-tight',
                      loading && hasLoadedOnce.current && 'opacity-70',
                    )}
                    title={c.raw !== undefined && c.raw !== null ? String(c.raw) : undefined}
                  >
                    {c.value}
                  </span>
                  {c.hint ? (
                    <span className="text-[10px] text-muted-foreground">{c.hint}</span>
                  ) : null}
                </CardContent>
              </Card>
            ))}
      </div>

      <Card className="gap-3 py-4 shadow-none">
        <CardHeader className="px-4">
          <CardTitle className="text-base">近 {days} 日趋势</CardTitle>
          <CardDescription>提交次数与通过次数的每日对比</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          {showSkeleton ? (
            <Skeleton className="h-64 w-full" />
          ) : submitHeat.length === 0 && acHeat.length === 0 ? (
            <Empty className="border-0 py-10 md:py-12">
              <EmptyHeader>
                <EmptyTitle>这段时间还没有提交</EmptyTitle>
                <EmptyDescription>
                  换一个时间范围，或等队员刷题同步后再来看趋势。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <TrendChart submit={submitHeat} ac={acHeat} days={days} />
          )}
        </CardContent>
      </Card>

      {!isSite && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="gap-3 py-4 shadow-none">
            <CardHeader className="px-4">
              <CardTitle className="text-base">成员排行（本期通过）</CardTitle>
              <CardDescription>
                {rankTotal > 0
                  ? `共 ${rankTotal} 人在近 ${days} 天有通过记录`
                  : `近 ${days} 天的通过排行`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              {showSkeleton ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : rankList.length === 0 ? (
                <Empty className="border-0 py-8 md:py-10">
                  <EmptyHeader>
                    <EmptyTitle>本期还没有排行</EmptyTitle>
                    <EmptyDescription>
                      队员有通过记录后会出现在这里。也可以先去「成员管理」看看同步状态。
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ol className="flex flex-col gap-0.5">
                  {rankList.slice(0, 10).map((r, i) => (
                    <li
                      key={r.userId}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-medium',
                            i < 3
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground',
                          )}
                        >
                          {i + 1}
                        </span>
                        <span className="truncate font-medium">{r.name || `用户 #${r.userId}`}</span>
                      </div>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {r.score} 通过
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="gap-3 py-4 shadow-none">
            <CardHeader className="px-4">
              <CardTitle className="text-base">活跃度洞察</CardTitle>
              <CardDescription>根据近 {days} 天提交自动汇总</CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              {showSkeleton ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : metrics.rangeSubmit === 0 ? (
                <Empty className="border-0 py-8 md:py-10">
                  <EmptyHeader>
                    <EmptyTitle>还没有足够数据</EmptyTitle>
                    <EmptyDescription>
                      有提交记录后，这里会显示峰值日、连续活跃与近两周对比。
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-2.5 text-sm">
                  <InsightRow
                    label="峰值日"
                    value={
                      metrics.peakDay
                        ? `${metrics.peakDay.date.slice(5)} · ${metrics.peakDay.count} 次`
                        : '暂无'
                    }
                  />
                  <InsightRow
                    label="最长连续活跃"
                    value={`${metrics.consecutiveDays} 天`}
                  />
                  <InsightRow
                    label="最近 7 天提交"
                    value={`${metrics.recent7vsPrev7.recent} 次`}
                    badge={
                      metrics.recent7vsPrev7.direction === 'up'
                        ? '上升'
                        : metrics.recent7vsPrev7.direction === 'down'
                          ? '下降'
                          : '持平'
                    }
                    badgeVariant={
                      metrics.recent7vsPrev7.direction === 'up'
                        ? 'default'
                        : metrics.recent7vsPrev7.direction === 'down'
                          ? 'destructive'
                          : 'secondary'
                    }
                  />
                  <InsightRow
                    label="前 7 天提交"
                    value={`${metrics.recent7vsPrev7.prev} 次`}
                  />
                  {metrics.noAcMembers > 0 && (
                    <InsightRow
                      label="本期暂无通过"
                      value={`${metrics.noAcMembers} 人`}
                      valueClassName="text-muted-foreground"
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!isSite && days >= 14 && (
        <Card className="gap-3 py-4 shadow-none">
          <CardHeader className="px-4">
            <CardTitle className="text-base">按星期分布</CardTitle>
            <CardDescription>近 {days} 天提交量按星期汇总，方便安排训练日</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            {showSkeleton ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="flex h-40 items-stretch gap-1.5 sm:gap-2">
                {metrics.weekdayDist.map((count, i) => {
                  const pct = Math.round((count / weekdayMax) * 100)
                  return (
                    <div key={WEEKDAY_LABELS[i]} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {count}
                      </span>
                      <div className="relative flex w-full flex-1 items-end justify-center">
                        <div
                          className="w-full max-w-10 rounded-t-md bg-primary/70 transition-[height]"
                          style={{ height: `${Math.max(pct, count > 0 ? 8 : 2)}%` }}
                          title={`${WEEKDAY_LABELS[i]}：${count} 次`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {WEEKDAY_LABELS[i]}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isSite && isOrgAdmin && currentOrg && (
        <Card className="gap-3 py-4 shadow-none">
          <CardHeader className="px-4">
            <CardTitle className="text-base">组织运营</CardTitle>
            <CardDescription>{currentOrg.name} 的席位与通知开关</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 px-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">席位占用</span>
              <span className="tabular-nums">
                {currentOrg.memberCount ?? 0} / {currentOrg.seatLimit ?? 50}
              </span>
            </div>
            {pendingJoinCount !== null && pendingJoinCount > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">待审批申请</span>
                <Badge variant="destructive">{pendingJoinCount} 人</Badge>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">定时同步做题数据</span>
              <Badge variant={currentOrg.enableSpider !== false ? 'default' : 'secondary'}>
                {currentOrg.enableSpider !== false ? '已开启' : '已关闭'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">日报邮件</span>
              <Badge variant={currentOrg.enableAiEmail !== false ? 'default' : 'secondary'}>
                {currentOrg.enableAiEmail !== false ? '已开启' : '已关闭'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">周报邮件</span>
              <Badge
                variant={currentOrg.enableAiWeeklyEmail !== false ? 'default' : 'secondary'}
              >
                {currentOrg.enableAiWeeklyEmail !== false ? '已开启' : '已关闭'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {!isSite && isStaff && (
        <Card className="gap-3 py-4 shadow-none">
          <CardHeader className="px-4">
            <CardTitle className="text-base">快捷操作</CardTitle>
            <CardDescription>常用管理入口，按你的权限显示</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 px-4">
            {isOrgAdmin && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/user">
                  成员与审批
                  {pendingJoinCount !== null && pendingJoinCount > 0
                    ? `（${pendingJoinCount}）`
                    : ''}
                </Link>
              </Button>
            )}
            {!isOrgAdmin && (isCoach || isCaptain) && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/user">成员管理</Link>
              </Button>
            )}
            {(isOrgAdmin || isCoach || isCaptain) && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/group">分组管理</Link>
              </Button>
            )}
            {(isOrgAdmin || isCoach || isCaptain) && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/org">生成训练报告</Link>
              </Button>
            )}
            {isOrgAdmin && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/org">组织设置</Link>
              </Button>
            )}
            {(isOrgAdmin || isCoach || isCaptain) && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/bulletin">公告管理</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!isSite && isStaff && (
        <p className="text-xs text-muted-foreground">
          {isOrgAdmin
            ? '你是团队管理员：可查看运营数据、处理申请，并生成训练报告。'
            : isCoach
              ? '你是教练：可查看训练参与与排行，并管理分组与成员。'
              : '你是队长：可查看训练参与与排行，并协助管理分组。'}
        </p>
      )}
    </PageShell>
  )
}

function InsightRow({
  label,
  value,
  badge,
  badgeVariant,
  valueClassName,
}: {
  label: string
  value: string
  badge?: string
  badgeVariant?: 'default' | 'destructive' | 'secondary'
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('flex items-center gap-1.5 tabular-nums', valueClassName)}>
        {value}
        {badge ? (
          <Badge variant={badgeVariant ?? 'secondary'} className="text-[10px]">
            {badge}
          </Badge>
        ) : null}
      </span>
    </div>
  )
}
