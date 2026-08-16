import { useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getHealthOverview,
  getResourceSeries,
  type HealthOverview,
  type ResourceSample,
} from '@/api/health'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyDescription } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactNumber, formatTime } from '@/lib/format'
import { Perm } from '@/lib/permissions'

const SERVICE_LABELS: Record<string, string> = {
  agent: '日报模型',
  ai_analyze: '题库分析',
  smtp: '邮件服务',
  oj_luogu: '洛谷账号',
  oj_qoj: 'QOJ 账号',
}

const BACKEND_SERVICE_LABELS: Record<string, string> = {
  user: '用户服务',
  'core-data': '核心数据',
  agent: '智能服务',
}

const MIDDLEWARE_LABELS: Record<string, string> = {
  database: '数据库',
  redis: 'Redis',
  registry: '注册中心',
  mq: '消息队列',
}

const RESOURCE_LABELS: Record<string, string> = {
  cpu: 'CPU',
  memory: '内存',
  disk: '磁盘',
  load: '系统负载',
}

/** 时序图 X 轴时间：unix 秒 → HH:mm */
function chartHHMM(t: number): string {
  if (!t) return '-'
  const d = new Date(t * 1000)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ok':
      return 'default'
    case 'warn':
      return 'secondary'
    case 'fail':
    case 'critical':
      return 'destructive'
    default:
      return 'outline'
  }
}

function statusText(status: string): string {
  switch (status) {
    case 'ok':
      return '正常'
    case 'warn':
      return '偏高'
    case 'fail':
      return '异常'
    case 'critical':
      return '危险'
    case 'unchecked':
      return '未验证'
    default:
      return status
  }
}

function formatBytes(n: number): string {
  if (!n || n < 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{statusText(status)}</Badge>
}

function HealthOverviewCard() {
  const [data, setData] = useState<HealthOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getHealthOverview()
    setLoading(false)
    if (!res.success || !res.data) {
      setError(res.message || '监控数据加载失败')
      return
    }
    setData(res.data)
    setError('')
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 60_000)
    return () => clearInterval(timer)
  }, [load])

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">系统监控</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">系统监控</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const capacity = data?.capacity
  const loadLevel = capacity?.loadLevel || 'low'
  const loadLevelText: Record<string, string> = {
    low: '低',
    normal: '正常',
    high: '偏高',
    critical: '危险',
  }
  const loadStatus = loadLevel === 'critical' ? 'critical' : loadLevel === 'high' ? 'warn' : 'ok'

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">系统监控</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            采集于 {data?.collectedAt ? formatTime(data.collectedAt) : '—'}
            {' · '}每 60 秒自动刷新
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">后台服务</CardTitle>
              <CardDescription>GoAlgo 后台进程</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {data?.backendServices.length === 0 ? <Empty><EmptyDescription>暂未取得服务状态</EmptyDescription></Empty> : null}
              {data?.backendServices.map((service) => (
                <div key={service.name} className="flex min-w-0 items-start justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{BACKEND_SERVICE_LABELS[service.name] || service.name}</p>
                  </div>
                  <StatusBadge status={service.status} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">外部服务</CardTitle>
              <CardDescription>最近一次业务调用</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {data?.services.length === 0 ? <Empty><EmptyDescription>暂未取得服务状态</EmptyDescription></Empty> : null}
              {data?.services.map((service) => (
                <div key={service.name} className="flex min-w-0 items-start justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{SERVICE_LABELS[service.name] || service.name}</p>
                    {service.at > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">最近 {formatTime(service.at)}</p>
                    ) : null}
                  </div>
                  <StatusBadge status={service.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 中间件状态 */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data?.middleware.map((m) => (
            <div key={m.name} className="rounded-xl border bg-card px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">
                  {MIDDLEWARE_LABELS[m.name] || m.name}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge status={m.status} />
                {m.latencyMs > 0 ? ` · ${m.latencyMs}ms` : ''}
              </div>
            </div>
          ))}
        </div>

        {/* 服务器资源 */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data?.resources.map((r) => (
            <div key={r.name} className="rounded-xl border bg-card px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">
                    {RESOURCE_LABELS[r.name] || r.name}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {r.usedPercent > 0 ? `${r.usedPercent.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${r.status === 'critical' ? 'bg-destructive' : r.status === 'warn' ? 'bg-muted-foreground' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, Math.max(0, r.usedPercent))}%` }}
                />
              </div>
              {r.detail ? (
                <p className="mt-1 text-[11px] text-muted-foreground">{r.detail}</p>
              ) : r.total > 0 ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatBytes(r.used)} / {formatBytes(r.total)}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        {/* 近 24h CPU/内存时序 */}
        <ResourceTrendCard />

        {/* API 延迟与请求 */}
        {data?.api ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat
              label="今日请求"
              value={formatCompactNumber(data.api.requestsToday)}
            />
            <MiniStat
              label="当前并发 / 峰值"
              value={`${data.api.concurrentNow} / ${data.api.peakConcurrentToday}`}
            />
            <MiniStat
              label="平均延迟"
              value={`${data.api.latencyAvgMs}ms`}
              hint={`p50 ${data.api.latencyP50Ms}ms · p95 ${data.api.latencyP95Ms}ms · p99 ${data.api.latencyP99Ms}ms`}
            />
            <MiniStat
              label="爬虫 入队/成功/失败"
              value={`${data.api.spiderEnqueuedToday} / ${data.api.spiderOkToday} / ${data.api.spiderFailToday}`}
            />
          </div>
        ) : null}

        {/* 容量估算 */}
        {capacity ? (
          <div className="rounded-xl border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">容量估算</p>
              <Badge variant={statusVariant(loadStatus)}>当前负载：{loadLevelText[loadLevel]}</Badge>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <MiniStat label="注册用户" value={formatCompactNumber(capacity.registeredUsers)} />
              <MiniStat label="月活跃" value={formatCompactNumber(capacity.mau)} />
              <MiniStat
                label="峰值用户（估算）"
                value={formatCompactNumber(capacity.peakUsers)}
                hint="当前资源配置安全上限"
              />
              <MiniStat
                label="健康用户（推荐）"
                value={formatCompactNumber(capacity.healthyUsers)}
                hint="建议长期负载水平"
              />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <MiniStat
                label="今日访问 UV / PV"
                value={`${formatCompactNumber(capacity.todayUv)} / ${formatCompactNumber(capacity.todayPv)}`}
              />
              <MiniStat
                label="存储"
                value={
                  capacity.storageTotal > 0
                    ? `${formatBytes(capacity.storageUsed)} / ${formatBytes(capacity.storageTotal)}`
                    : formatBytes(capacity.storageUsed)
                }
              />
              <MiniStat label="负载说明" value={capacity.loadNote || '—'} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

/** 近 24h CPU / 内存占用时序图（后台 25s 采样缓存） */
function ResourceTrendCard() {
  const [samples, setSamples] = useState<ResourceSample[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await getResourceSeries(288)
    if (!res.success || !res.data) {
      setError(res.message || '资源时序加载失败')
      return
    }
    setSamples(res.data.samples)
    setError('')
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 60_000)
    return () => clearInterval(timer)
  }, [load])

  const chartData = (samples || []).map((s) => ({
    time: chartHHMM(s.t),
    cpu: Math.round(s.cpu * 10) / 10,
    mem: Math.round(s.mem * 10) / 10,
  }))

  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">近 24 小时资源占用</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-[var(--color-chart-1)]" />
            CPU
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-[var(--color-chart-2)]" />
            内存
          </span>
        </div>
      </div>
      <div className="mt-2 h-40 w-full">
        {error && !samples ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !samples || chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            采集中，稍后展示
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="memFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={48} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={32} />
              <Tooltip
                formatter={(v, name) => [
                  `${v}%`,
                  name === 'cpu' ? 'CPU' : name === 'mem' ? '内存' : name,
                ]}
              />
              <Area
                type="monotone"
                dataKey="cpu"
                name="cpu"
                stroke="var(--color-chart-1)"
                strokeWidth={1.5}
                fill="url(#cpuFill)"
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="mem"
                name="mem"
                stroke="var(--color-chart-2)"
                strokeWidth={1.5}
                fill="url(#memFill)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums" title={value}>
        {value}
      </p>
      {hint ? (
        <p className="truncate text-[11px] text-muted-foreground" title={hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function OpsMonitorSection() {
  const { can } = useAuth()
  if (!can(Perm.SiteConfigRead) && !can(Perm.SiteConfigWrite)) {
    return null
  }
  return <HealthOverviewCard />
}
