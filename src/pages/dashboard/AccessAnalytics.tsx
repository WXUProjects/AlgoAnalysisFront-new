import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
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
import { getAccessStats, type AccessStats } from '@/api/site'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCompactNumber } from '@/lib/format'

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

function fmtNum(n?: number) {
  if (n === undefined || n === null) return '-'
  return formatCompactNumber(n)
}

function fmtTime(ts?: number) {
  if (!ts) return '-'
  try {
    return new Date(ts * 1000).toLocaleString('zh-CN', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

type MetricCard = {
  label: string
  value: number | undefined
  hint?: string
  delta?: number | null
}

function MetricGrid({
  items,
  loading,
}: {
  items: MetricCard[]
  loading: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {loading
        ? Array.from({ length: items.length || 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        : items.map((c) => (
            <Card key={c.label} className="gap-1 py-3">
              <CardHeader className="px-3 py-0">
                <CardDescription>{c.label}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0.5 px-3">
                <div className="flex items-end gap-2">
                  <span
                    className="text-2xl font-semibold tabular-nums tracking-tight"
                    title={
                      c.value !== undefined && c.value !== null
                        ? String(c.value)
                        : undefined
                    }
                  >
                    {fmtNum(c.value)}
                  </span>
                  {c.delta !== undefined && <DeltaText value={c.delta ?? null} />}
                </div>
                {c.hint ? (
                  <p className="text-[11px] text-muted-foreground">{c.hint}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
    </div>
  )
}

/** 站点访问与用量（仅站点管理员）— 审核截图用专业看板 */
export function DashboardAccessAnalytics() {
  const { isAdmin } = useAuth()
  const [data, setData] = useState<AccessStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [days, setDays] = useState(30)

  const load = useCallback(
    async (silent = false) => {
      if (!isAdmin) {
        setLoading(false)
        return
      }
      if (!silent) setLoading(true)
      else setRefreshing(true)
      const res = await getAccessStats(days)
      if (res.success && res.data) setData(res.data)
      else {
        setData(null)
        if (!silent) toast.error(res.message || '访问统计加载失败，请稍后重试')
      }
      setLoading(false)
      setRefreshing(false)
    },
    [isAdmin, days],
  )

  useEffect(() => {
    void load()
  }, [load])

  const trendData = useMemo(
    () =>
      data?.series.map((s) => ({
        date: s.date.slice(5),
        PV: s.pv,
        DAU: s.dau,
        UV: s.uv,
        IP: s.uniqueIp,
      })) ?? [],
    [data],
  )

  const registerData = useMemo(
    () =>
      data?.series.map((s) => ({
        date: s.date.slice(5),
        新增注册: s.newUsers,
      })) ?? [],
    [data],
  )

  const registerToday = data?.today?.newUsers
  const registerYesterday = data?.yesterday?.newUsers
  const registerSum = useMemo(
    () => data?.series.reduce((sum, s) => sum + (s.newUsers || 0), 0) ?? 0,
    [data],
  )

  const catData = useMemo(
    () =>
      data?.categories.map((c) => ({
        name: c.category,
        PV: c.pv,
        share: c.share,
      })) ?? [],
    [data],
  )

  if (!isAdmin) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">仅站点管理员可查看访问统计。</p>
      </PageShell>
    )
  }

  const t = data?.today
  const y = data?.yesterday

  const userCards: MetricCard[] = [
    {
      label: '注册用户',
      value: data?.registeredUsers,
      hint: '当前账号总数',
    },
    {
      label: '今日新增注册',
      value: registerToday,
      delta: delta(registerToday, registerYesterday),
      hint: '当日新注册账号',
    },
    {
      label: '今日活跃 DAU',
      value: t?.dau,
      delta: delta(t?.dau, y?.dau),
      hint: '当日登录并访问的用户',
    },
    {
      label: '月活跃 MAU',
      value: data?.mau,
      hint: '当月登录访问去重',
    },
    {
      label: '昨日活跃',
      value: y?.dau,
      hint: y?.date || '昨日日活',
    },
    {
      label: `近 ${days} 日新增`,
      value: data ? registerSum : undefined,
      hint: '区间内新注册合计',
    },
  ]

  const trafficCards: MetricCard[] = [
    {
      label: '今日 PV',
      value: t?.pv,
      delta: delta(t?.pv, y?.pv),
      hint: '页面浏览量',
    },
    {
      label: '今日 UV',
      value: t?.uv,
      delta: delta(t?.uv, y?.uv),
      hint: '独立访客',
    },
    {
      label: '今日独立 IP',
      value: t?.uniqueIp,
      delta: delta(t?.uniqueIp, y?.uniqueIp),
      hint: data?.clientIpAvailable ? '已解析访客 IP' : '未能解析真实 IP 时可能不准',
    },
    {
      label: `近 ${days} 日 PV`,
      value: data?.totalPv,
      hint: '区间合计',
    },
  ]

  const techCards: MetricCard[] = [
    {
      label: '今日 API 请求',
      value: data?.apiRequestsToday,
      hint: '今日接口访问合计',
    },
    {
      label: '并发峰值',
      value: data?.apiPeakConcurrent,
      hint: '今日最高同时处理数',
    },
    {
      label: '当前并发',
      value: data?.apiInflight,
      hint: '当前进行中的请求',
    },
    {
      label: '同步任务次数',
      value: data?.spiderEnqueuedToday,
      hint: '今日安排的数据同步次数',
    },
    {
      label: '爬虫成功 / 失败',
      value: undefined,
      hint:
        data != null
          ? `${fmtNum(data.spiderOkToday)} / ${fmtNum(data.spiderFailToday)}`
          : undefined,
    },
    {
      label: '抓取数据量',
      value: data?.spiderRowsToday,
      hint: '今日新写入提交记录',
    },
  ]

  // 成功/失败用自定义展示
  const techCardsFixed: MetricCard[] = techCards.map((c) => {
    if (c.label === '爬虫成功 / 失败') {
      return {
        ...c,
        value: data ? data.spiderOkToday : undefined,
        hint: data
          ? `成功 ${fmtNum(data.spiderOkToday)} · 失败 ${fmtNum(data.spiderFailToday)}`
          : '今日任务结果',
      }
    }
    return c
  })

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">访问统计</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            用户量 · 页面流量 · API 与爬虫技术指标（大数以 k/M 约显）
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 14, 30].map((d) => (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={days === d ? 'default' : 'outline'}
              onClick={() => setDays(d)}
            >
              {d} 日
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={refreshing || loading}
            onClick={() => void load(true)}
          >
            {refreshing ? <Spinner data-icon="inline-start" /> : null}
            刷新
          </Button>
        </div>
      </div>

      <section className="space-y-2">
        <h4 className="text-sm font-medium">用户量</h4>
        <MetricGrid items={userCards} loading={loading} />
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-medium">访问流量</h4>
        <MetricGrid items={trafficCards} loading={loading} />
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-medium">服务指标</h4>
        <MetricGrid items={techCardsFixed} loading={loading} />
      </section>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">趋势：浏览量 / 日活 / 访客 / 独立 IP</CardTitle>
          <CardDescription>近 {days} 日访问汇总</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : trendData.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">
              暂时还没有数据。站点上线后，用户浏览会自动累计。
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={44}
                    tickFormatter={(v) => formatCompactNumber(v)}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const n = typeof value === 'number' ? value : Number(value) || 0
                      return [formatCompactNumber(n), name]
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="PV" stroke="var(--color-chart-1, #6366f1)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="DAU" stroke="var(--color-chart-2, #22c55e)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="UV" stroke="var(--color-chart-3, #f59e0b)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="IP" stroke="var(--color-chart-4, #ec4899)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">趋势：每日新增注册</CardTitle>
          <CardDescription>
            近 {days} 日每日新增注册（按自然日）
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : registerData.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">暂时还没有注册趋势数据</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={registerData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={40}
                    allowDecimals={false}
                    tickFormatter={(v) => formatCompactNumber(v)}
                  />
                  <Tooltip
                    formatter={(value) => {
                      const n = typeof value === 'number' ? value : Number(value) || 0
                      return [formatCompactNumber(n), '新增注册']
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="新增注册"
                    stroke="var(--color-chart-2, #22c55e)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">功能使用分布</CardTitle>
            <CardDescription>今天访客使用过的功能（按页面归类）</CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : catData.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">今天还没有功能访问数据</p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      width={40}
                      tickFormatter={(v) => formatCompactNumber(v)}
                    />
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const n = typeof value === 'number' ? value : Number(value) || 0
                        const share = (
                          item as { payload?: { share?: number } } | undefined
                        )?.payload?.share
                        return [
                          `${formatCompactNumber(n)}${share != null ? `（${share.toFixed(1)}%）` : ''}`,
                          'PV',
                        ]
                      }}
                    />
                    <Bar dataKey="PV" fill="var(--color-chart-1, #6366f1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">热门页面</CardTitle>
            <CardDescription>今天访问最多的页面</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {loading ? (
              <div className="space-y-2 px-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : !data?.topPaths?.length ? (
              <p className="px-4 text-sm text-muted-foreground">暂时还没有页面访问数据</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>路径</TableHead>
                    <TableHead>模块</TableHead>
                    <TableHead className="text-right">PV</TableHead>
                    <TableHead className="text-right">占比</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topPaths.map((p, i) => (
                    <TableRow key={p.path}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="max-w-[160px] truncate font-mono text-xs">
                        {p.path}
                      </TableCell>
                      <TableCell className="text-sm">{p.category}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(p.pv)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.share.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">独立 IP 明细</CardTitle>
          <CardDescription>
            今日访问 IP 列表（真实 IP：Cloudflare / 反代头；按 PV 降序，最多 200 条）
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="space-y-2 px-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !data?.ips?.length ? (
            <p className="px-4 text-sm text-muted-foreground">
              暂无 IP 记录。请确认前置 Nginx/Cloudflare 已传递 CF-Connecting-IP 或 X-Real-IP。
            </p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>IP 地址</TableHead>
                    <TableHead className="text-right">今日 PV</TableHead>
                    <TableHead>最近访问</TableHead>
                    <TableHead className="text-right">最近时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ips.map((ip, i) => (
                    <TableRow key={ip.ip}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{ip.ip}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(ip.pv)}</TableCell>
                      <TableCell className="max-w-[180px] truncate font-mono text-xs">
                        {ip.lastPath || '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {fmtTime(ip.lastSeen)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {data?.metricNote ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{data.metricNote}</p>
      ) : null}
    </PageShell>
  )
}
