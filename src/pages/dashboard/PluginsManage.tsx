import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircleIcon } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import type { AdminPluginAuthorizationInfo, ClientSyncAuditInfo } from '@shared/api'
import { listPluginAuthorizations, listSyncAudits } from '@/api/plugin-admin'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const date = (value: number | string) => value ? new Date(Number(value) * 1000).toLocaleString('zh-CN') : '—'
const statusText = (value: string) => ({ active: '有效', revoked: '已撤销', expired: '已过期', running: '同步中', completed: '已完成', failed: '失败', terminated: '已终止' }[value] || value || '—')
const statuses = { authorizations: ['active', 'revoked', 'expired'], audits: ['running', 'completed', 'failed', 'terminated', 'expired'] } as const

export function platformLabel(value: string): string {
  return value === 'luogu' || value === 'LuoGu' ? '洛谷' : value
}

export function auditDateRange(from: string, to: string): { from?: number; to?: number } {
  const result: { from?: number; to?: number } = {}
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const [year, month, day] = from.split('-').map(Number)
    result.from = new Date(year, month - 1, day).getTime() / 1000
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const [year, month, day] = to.split('-').map(Number)
    result.to = new Date(year, month - 1, day + 1).getTime() / 1000
  }
  return result
}

export function filtersForTab(params: URLSearchParams, tab: 'authorizations' | 'audits'): URLSearchParams {
  const next = new URLSearchParams(params)
  if (tab === 'authorizations') {
    next.delete('from')
    next.delete('to')
  }
  const status = next.get('status')
  if (status && !statuses[tab].includes(status as never)) next.delete('status')
  return next
}

export function isCurrentPluginRequest(sequence: number, latest: number): boolean {
  return sequence === latest
}

function Filters({ tab, onChange }: { tab: 'authorizations' | 'audits'; onChange: (key: string, value: string) => void }) {
  const [params] = useSearchParams()
  return <div className="flex flex-wrap gap-2">
    <Input aria-label="搜索用户或账号" className="max-w-xs" placeholder="搜索用户或账号" defaultValue={params.get('keyword') || ''} onBlur={(e) => onChange('keyword', e.target.value.trim())} />
    <Select defaultValue={params.get('platform') || 'all'} onValueChange={(v) => onChange('platform', v === 'all' ? '' : v)}>
      <SelectTrigger aria-label="平台" className="w-32"><SelectValue placeholder="平台" /></SelectTrigger>
      <SelectContent><SelectGroup><SelectItem value="all">全部平台</SelectItem><SelectItem value="luogu">洛谷</SelectItem></SelectGroup></SelectContent>
    </Select>
    <Select defaultValue={params.get('status') || 'all'} onValueChange={(v) => onChange('status', v === 'all' ? '' : v)}>
      <SelectTrigger aria-label="状态" className="w-32"><SelectValue placeholder="状态" /></SelectTrigger>
      <SelectContent><SelectGroup><SelectItem value="all">全部状态</SelectItem>{statuses[tab].map((v) => <SelectItem key={v} value={v}>{statusText(v)}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
    {tab === 'audits' ? <><Input type="date" aria-label="开始日期" onChange={(e) => onChange('from', e.target.value)} /><Input type="date" aria-label="结束日期" onChange={(e) => onChange('to', e.target.value)} /></> : null}
  </div>
}

function AuthorizationTable({ rows }: { rows: AdminPluginAuthorizationInfo[] }) {
  if (!rows.length) return <Empty><EmptyTitle>还没有授权记录</EmptyTitle><EmptyDescription>用户连接同步插件后，记录会显示在这里。</EmptyDescription></Empty>
  return <div className="overflow-x-auto"><Table className="min-w-[980px]"><TableHeader><TableRow><TableHead>用户</TableHead><TableHead>平台</TableHead><TableHead>账号</TableHead><TableHead>版本</TableHead><TableHead>授权时间</TableHead><TableHead>最近使用</TableHead><TableHead>到期时间</TableHead><TableHead>状态</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={String(row.id)}><TableCell>{row.name || row.username}<div className="text-xs text-muted-foreground">@{row.username} · {row.userId}</div></TableCell><TableCell>{platformLabel(row.platform || row.provider)}</TableCell><TableCell>{row.ojUid}</TableCell><TableCell>{row.clientVersion}</TableCell><TableCell>{date(row.acceptedAt)}</TableCell><TableCell>{date(row.lastUsedAt)}</TableCell><TableCell>{date(row.expiresAt)}</TableCell><TableCell><Badge variant={row.status === 'active' ? 'default' : 'secondary'}>{statusText(row.status)}</Badge></TableCell></TableRow>)}</TableBody></Table></div>
}

function AuditTable({ rows }: { rows: ClientSyncAuditInfo[] }) {
  if (!rows.length) return <Empty><EmptyTitle>还没有同步日志</EmptyTitle><EmptyDescription>插件开始同步后，记录会显示在这里。</EmptyDescription></Empty>
  return <div className="overflow-x-auto"><Table className="min-w-[980px]"><TableHeader><TableRow><TableHead>用户 ID</TableHead><TableHead>平台账号</TableHead><TableHead>版本</TableHead><TableHead>开始</TableHead><TableHead>结束</TableHead><TableHead>页数</TableHead><TableHead>新增条数</TableHead><TableHead>结果</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.sessionId}><TableCell>{row.userId}</TableCell><TableCell>{row.platform} · {row.ojUid}</TableCell><TableCell>{row.clientVersion}</TableCell><TableCell>{date(row.startedAt)}</TableCell><TableCell>{date(row.terminalAt || row.updatedAt)}</TableCell><TableCell>{row.processedPages}</TableCell><TableCell>{row.inserted}</TableCell><TableCell><Badge variant={row.status === 'completed' ? 'default' : 'secondary'}>{statusText(row.status)}</Badge></TableCell></TableRow>)}</TableBody></Table></div>
}

export function DashboardPluginsManage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'audits' ? 'audits' : 'authorizations'
  const page = Number(params.get('page') || 1)
  const pageSize = Number(params.get('pageSize') || 10)
  const [authRows, setAuthRows] = useState<AdminPluginAuthorizationInfo[]>([])
  const [auditRows, setAuditRows] = useState<ClientSyncAuditInfo[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestSequence = useRef(0)
  const load = useCallback(async () => {
    const sequence = ++requestSequence.current
    setLoading(true); setError('')
    const common = { pageNum: page, pageSize, keyword: params.get('keyword') || undefined, platform: params.get('platform') || undefined }
    const result = tab === 'authorizations'
      ? await listPluginAuthorizations({ ...common, status: params.get('status') || undefined })
      : await listSyncAudits({ ...common, status: (params.get('status') || undefined) as 'running' | 'completed' | 'failed' | 'terminated' | 'expired' | undefined, ...auditDateRange(params.get('from') || '', params.get('to') || '') })
    if (!isCurrentPluginRequest(sequence, requestSequence.current)) return
    setLoading(false)
    if (!result.success || !result.data) { setError(result.message || '加载失败'); return }
    setTotal(Number(result.data.total))
    if (tab === 'authorizations') setAuthRows(result.data.list as AdminPluginAuthorizationInfo[])
    else setAuditRows(result.data.list as ClientSyncAuditInfo[])
  }, [page, pageSize, params, tab])
  useEffect(() => { void load() }, [load])
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
     setParams(next)
  }
  return <PageShell><Card><CardHeader><CardTitle>插件管理</CardTitle></CardHeader><CardContent><Tabs value={tab} onValueChange={(v) => { const next = filtersForTab(params, v as 'authorizations' | 'audits'); next.set('tab', v); next.set('page', '1'); setParams(next) }}><TabsList><TabsTrigger value="authorizations">授权记录</TabsTrigger><TabsTrigger value="audits">同步日志</TabsTrigger></TabsList><TabsContent value="authorizations" className="flex flex-col gap-4"><Filters tab="authorizations" onChange={update} />{error ? <Alert variant="destructive"><AlertCircleIcon /><AlertTitle>加载失败</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : loading ? <Skeleton className="h-48 w-full" /> : <AuthorizationTable rows={authRows} />}<Pagination page={page} pageSize={pageSize} total={total} onChange={(p) => update('page', String(p))} onPageSizeChange={(s) => update('pageSize', String(s))} /></TabsContent><TabsContent value="audits" className="flex flex-col gap-4"><Filters tab="audits" onChange={update} />{error ? <Alert variant="destructive"><AlertCircleIcon /><AlertTitle>加载失败</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : loading ? <Skeleton className="h-48 w-full" /> : <AuditTable rows={auditRows} />}<Pagination page={page} pageSize={pageSize} total={total} onChange={(p) => update('page', String(p))} onPageSizeChange={(s) => update('pageSize', String(s))} /></TabsContent></Tabs></CardContent></Card></PageShell>
}
