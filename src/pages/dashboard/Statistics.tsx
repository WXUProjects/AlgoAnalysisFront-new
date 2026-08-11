import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { listGroups } from '@/api/group'
import { listSquads } from '@/api/squad'
import { listProfiles } from '@/api/profile'
import { listJoinRequests } from '@/api/org'
import { updateAllSpiders } from '@/api/spider'
import { getHeatmap, getPeriod, getRank } from '@/api/statistic'
import type { HeatmapItem, PeriodData, StatisticRankItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { CoachWeekPanel } from '@/pages/dashboard/CoachWeekPanel'
import { OrgTrainingReportCard } from '@/pages/dashboard/OrgTrainingReportCard'
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
import { Perm } from '@/lib/permissions'
import { OrgRole } from '@/lib/roles'
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
  const { isSiteAdmin, can, perms, currentOrg } = useAuth()
  const isSite = scope === 'site'

  const [timeRange, setTimeRange] = useState<TimeRangeValue>('30')
  /** 0 = 全组织 */
  const [scopeGroupId, setScopeGroupId] = useState(0)
  const [scopeSquadId, setScopeSquadId] = useState(0)
  const [scopeGroups, setScopeGroups] = useState<Array<{ id: number; name: string }>>([])
  const [scopeSquads, setScopeSquads] = useState<Array<{ id: number; name: string; groupId: number }>>([])
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

  useEffect(() => {
    if (isSite) return
    let cancelled = false
    void (async () => {
      const gRes = await listGroups(1, 100)
      if (cancelled) return
      if (gRes.success && gRes.data?.list) {
        setScopeGroups(
          gRes.data.list.map((g) => ({
            id: Number(g.id),
            name: g.name || `组 #${g.id}`,
          })),
        )
      }
      const sRes = await listSquads()
      if (cancelled) return
      if (sRes.success && sRes.data) {
        setScopeSquads(
          sRes.data.map((s) => ({
            id: s.id,
            name: s.name,
            groupId: s.groupId,
          })),
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isSite, currentOrg?.id])

  const canSiteStats = can(Perm.SiteStatsRead)
  const canJoinReview = can(Perm.OrgJoinReview)
  const periodUserId = isSite ? -2 : -1
  const heatmapUserId = isSite ? -2 : 0
  const days = rangeDays(timeRange)

  const abortRef = useRef(0)
  useEffect(() => {
    if (isSite && !canSiteStats) {
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
          getPeriod(periodUserId, isSite ? undefined : { groupId: scopeGroupId || undefined, squadId: scopeSquadId || undefined }),
          listProfiles(1, 1, listScope),
          isSite
            ? listProfiles(1, 1, 'site', undefined, { dormantOnly: true })
            : Promise.resolve({ success: true, data: { total: 0, list: [] } } as const),
          isSite
            ? Promise.resolve({ success: true, data: { total: 0, list: [] } } as const)
            : listGroups(1, 1),
          getHeatmap({
            startDate: start,
            endDate: end,
            isAc: false,
            userId: heatmapUserId,
            groupId: isSite ? undefined : scopeGroupId || undefined,
            squadId: isSite ? undefined : scopeSquadId || undefined,
          }),
          getHeatmap({
            startDate: start,
            endDate: end,
            isAc: true,
            userId: heatmapUserId,
            groupId: isSite ? undefined : scopeGroupId || undefined,
            squadId: isSite ? undefined : scopeSquadId || undefined,
          }),
          getRank({
            startDate: start,
            endDate: end,
            scoreType: 'ac',
            pageSize: 50,
            groupId: isSite ? undefined : scopeGroupId || undefined,
            squadId: isSite ? undefined : scopeSquadId || undefined,
          }),
          // 仅持有入队审批权限的角色拉待审批，其余成员不请求
          !isSite && canJoinReview && currentOrg?.id
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
          setErrors([e instanceof Error ? e.message : '数据加载失败，稍后重试'])
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
  }, [isSite, canSiteStats, canJoinReview, currentOrg?.id, periodUserId, heatmapUserId, days, scopeGroupId, scopeSquadId])

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

  if (isSite && !canSiteStats) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">
          你还没有查看全站统计的权限。有需要的话，找站点管理员开通。
        </p>
      </PageShell>
    )
  }

  async function handleUpdateAll() {
    setUpdating(true)
    const res = await updateAllSpiders()
    setUpdating(false)
    if (res.success) toast.success(res.message || '已开始全站同步')
    else toast.error(res.message || '全站同步失败，稍后重试')
  }

  const orgName = currentOrg?.name || '当前组织'
  // 文案按身份分支：站点管理员按团队管理员展示；自定义角色（不改 orgRole，仅赋权限）落到通用「管理中心」
  const roleForCopy = isSiteAdmin ? OrgRole.OrgAdmin : currentOrg?.myRole
  const hasOrgManagePerm = Array.from(perms).some((c) => c.startsWith('org.'))
  let title: string
  let desc: string
  if (isSite) {
    title = '站点数据统计'
    desc = '查看全站用户的提交与通过情况。'
  } else if (roleForCopy === OrgRole.OrgAdmin) {
    title = `${orgName} · 组织管理`
    desc = '成员活跃、训练参与与待办审批。'
  } else if (roleForCopy === OrgRole.Coach) {
    title = `${orgName} · 教练工作台`
    desc = '按时间范围查看训练参与与成员排行。'
  } else if (roleForCopy === OrgRole.Captain) {
    title = `${orgName} · 队长工作台`
    desc = '按时间范围查看训练参与与成员排行。'
  } else if (hasOrgManagePerm) {
    title = `${orgName} · 管理中心`
    desc = '常用管理入口与组织训练数据。'
  } else {
    title = `${orgName} · 数据统计`
    desc = '按当前组织成员汇总提交与通过情况。'
  }

  const hasQuickAction =
    canJoinReview ||
    can(Perm.OrgMemberRole) ||
    can(Perm.OrgGroupManage) ||
    can(Perm.OrgReportView) ||
    can(Perm.OrgInfoWrite) ||
    can(Perm.OrgBulletinManage)

  const kpiCards: KpiCard[] = isSite
    ? [
        { label: '全站用户', value: fmtStat(userCount), raw: userCount },
        { label: '已暂停同步', value: fmtStat(frozenCount), raw: frozenCount },
        {
          label: '正常同步',
          value: fmtStat(userCount - frozenCount),
          raw: userCount - frozenCount,
        },
        { label: '累计通过', value: fmtStat(metrics.careerAc), raw: metrics.careerAc },
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

          
          {!isSite ? (
            <>
              <select
                className="h-8 rounded-md border bg-background px-2 text-sm"
                value={scopeGroupId}
                onChange={(e) => {
                  setScopeGroupId(Number(e.target.value) || 0)
                  setScopeSquadId(0)
                }}
                aria-label="按分组查看"
              >
                <option value={0}>全组织</option>
                {scopeGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded-md border bg-background px-2 text-sm"
                value={scopeSquadId}
                onChange={(e) => setScopeSquadId(Number(e.target.value) || 0)}
                aria-label="按分队查看"
              >
                <option value={0}>全部分队</option>
                {scopeSquads
                  .filter((s) => !scopeGroupId || s.groupId === scopeGroupId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </>
          ) : null}

          {!isSite && canJoinReview && pendingJoinCount !== null && pendingJoinCount > 0 && (
            <Button asChild size="sm" variant="destructive">
              <Link to="/admin/user?tab=join">待审批 {pendingJoinCount}</Link>
            </Button>
          )}

          {isSite && can(Perm.SiteSpiderOps) && (
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

      {/* KPI + 趋势置顶：标题栏后立刻看到本期数据 */}
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
          <CardDescription>提交与通过的每日对比</CardDescription>
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

      {!isSite && can(Perm.OrgReportView) && (currentOrg?.id ?? 0) > 0 ? (
        <>
          <CoachWeekPanel
            orgId={currentOrg!.id}
            canInvite={can(Perm.OrgInviteView)}
          />
          {/* 队况 + 训练报告相邻：报告入口只此一处（组织设置不再挂） */}
          <div id="training-report" className="scroll-mt-20">
            <OrgTrainingReportCard orgId={currentOrg!.id} />
          </div>
        </>
      ) : null}

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
                        : '—'
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
                      label="本期还没有通过"
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
            <CardDescription>近 {days} 天提交量按星期汇总</CardDescription>
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

      {!isSite && can(Perm.OrgInfoWrite) && currentOrg && (
        <Card className="gap-3 py-4 shadow-none">
          <CardHeader className="px-4">
            <CardTitle className="text-base">组织运营</CardTitle>
            <CardDescription>{currentOrg.name} 的通知开关</CardDescription>
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
                {canJoinReview ? (
                  <Link
                    to="/admin/user?tab=join"
                    className="inline-flex"
                  >
                    <Badge variant="destructive" className="cursor-pointer">
                      {pendingJoinCount} 人
                    </Badge>
                  </Link>
                ) : (
                  <Badge variant="destructive">{pendingJoinCount} 人</Badge>
                )}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">定时同步做题数据</span>
              <Badge variant={currentOrg.enableSpider !== false ? 'default' : 'secondary'}>
                {currentOrg.enableSpider !== false ? '已开启' : '已关闭'}
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

      {!isSite && hasQuickAction && (
        <Card className="gap-3 py-4 shadow-none">
          <CardHeader className="px-4">
            <CardTitle className="text-base">快捷操作</CardTitle>
            <CardDescription>常用管理入口，按你的权限显示</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 px-4">
            {canJoinReview && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/user?tab=join">
                  加入审批
                  {pendingJoinCount !== null && pendingJoinCount > 0
                    ? `（${pendingJoinCount}）`
                    : ''}
                </Link>
              </Button>
            )}
            {can(Perm.OrgMemberRole) && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/user">成员管理</Link>
              </Button>
            )}
            {can(Perm.OrgGroupManage) && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/user?tab=group">分组管理</Link>
              </Button>
            )}
            {can(Perm.OrgReportView) && (
              <Button asChild size="sm" variant="outline">
                <a href="#training-report">生成训练报告</a>
              </Button>
            )}
            {(can(Perm.OrgInfoWrite) || can(Perm.OrgPolicyToggle)) && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/org">组织设置</Link>
              </Button>
            )}
            {can(Perm.OrgBulletinManage) && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/bulletin">公告管理</Link>
              </Button>
            )}
          </CardContent>
        </Card>
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
