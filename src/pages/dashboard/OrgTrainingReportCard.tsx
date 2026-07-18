import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { listAllGroups } from '@/api/group'
import {
  downloadTrainingReport,
  getTrainingReportJob,
  listTrainingReportJobs,
  startTrainingReport,
  statusLabel,
} from '@/api/training-report'
import type { GroupInfo, TrainingReportJob } from '@shared/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

function defaultRange(): { start: string; end: string } {
  // 默认上周：相对今天，昨天往前 6 天
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  end.setDate(end.getDate() - 1)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return { start: fmt(start), end: fmt(end) }
}

function formatExpires(ts?: number): string {
  if (!ts) return ''
  try {
    return new Date(ts * 1000).toLocaleString()
  } catch {
    return ''
  }
}

export function OrgTrainingReportCard({ orgId }: { orgId: number }) {
  const defaults = useMemo(() => defaultRange(), [])
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [groupId, setGroupId] = useState<string>('all')
  const [useAi, setUseAi] = useState(false)
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [starting, setStarting] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string>('')
  const [activeJob, setActiveJob] = useState<TrainingReportJob | null>(null)
  const [jobs, setJobs] = useState<TrainingReportJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)

  const loadJobs = useCallback(async () => {
    if (!orgId) return
    setLoadingJobs(true)
    const res = await listTrainingReportJobs({ orgId, limit: 8 })
    setLoadingJobs(false)
    if (res.success && res.data) setJobs(res.data)
  }, [orgId])

  useEffect(() => {
    void listAllGroups().then((r) => {
      if (r.success && r.data?.list) setGroups(r.data.list)
    })
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  // 轮询进行中的任务
  useEffect(() => {
    if (!activeJobId) return
    let cancelled = false
    const tick = async () => {
      const res = await getTrainingReportJob(activeJobId)
      if (cancelled) return
      if (res.success && res.data) {
        setActiveJob(res.data)
        if (res.data.status === 'done' || res.data.status === 'failed' || res.data.status === 'expired') {
          void loadJobs()
          if (res.data.status === 'done') {
            toast.success('训练报告已生成，可下载（24 小时内有效）')
          } else if (res.data.status === 'failed') {
            toast.error(res.data.errorDetail || res.data.message || '生成失败，请稍后重试')
          }
          return
        }
      }
      window.setTimeout(() => void tick(), 2500)
    }
    void tick()
    return () => {
      cancelled = true
    }
  }, [activeJobId, loadJobs])

  async function onStart() {
    if (!orgId) return
    if (!startDate || !endDate) {
      toast.error('请选择分析起止日期')
      return
    }
    if (startDate > endDate) {
      toast.error('结束日期不能早于开始日期')
      return
    }
    setStarting(true)
    const res = await startTrainingReport({
      orgId,
      startDate,
      endDate,
      groupId: groupId === 'all' ? 0 : Number(groupId),
      useAi,
    })
    setStarting(false)
    if (!res.success || !res.data?.jobId) {
      toast.error(res.message || '创建失败，请稍后重试')
      return
    }
    toast.success('已开始生成，完成后会发邮件通知你')
    setActiveJobId(res.data.jobId)
    setActiveJob({
      jobId: res.data.jobId,
      status: 'pending',
      progress: 0,
      startDate,
      endDate,
      useAi,
      message: '排队中',
    })
    void loadJobs()
  }

  function onDownload(jobId: string, format: 'pdf' | 'html' = 'pdf') {
    const r = downloadTrainingReport(jobId, format)
    if (!r.success) toast.error(r.message)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">导出训练报告</CardTitle>
        <CardDescription>
          按日期区间汇总组织训练数据，可限定分组。可选生成 AI 评语；完成后发邮件，24 小时内可下载 PDF。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tr-start">开始日期</Label>
            <Input
              id="tr-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tr-end">结束日期</Label>
            <Input
              id="tr-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>范围</Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="整组织" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">整组织</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name || `组 #${g.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">默认整组织；选分组后只统计该组队员。</p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div className="space-y-0.5">
            <Label>启用 AI 分析</Label>
            <p className="text-xs text-muted-foreground">
              关闭时用规则模板；开启后使用与日报/周报相同的分析模型，耗时更长。
            </p>
          </div>
          <Switch checked={useAi} onCheckedChange={setUseAi} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void onStart()} disabled={starting || !orgId}>
            {starting ? '提交中…' : '开始生成'}
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              const r = defaultRange()
              setStartDate(r.start)
              setEndDate(r.end)
            }}
          >
            填入上周
          </Button>
        </div>

        {activeJob && (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                当前任务：{statusLabel(activeJob.status)}
                {activeJob.progress != null ? ` · ${activeJob.progress}%` : ''}
              </span>
              {activeJob.downloadable && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onDownload(activeJob.jobId, 'pdf')}>
                    下载 PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload(activeJob.jobId, 'html')}
                  >
                    下载 HTML
                  </Button>
                </div>
              )}
            </div>
            {activeJob.message && (
              <p className="mt-1 text-xs text-muted-foreground">{activeJob.message}</p>
            )}
            {activeJob.status === 'done' && activeJob.expiresAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                下载截止：{formatExpires(activeJob.expiresAt)}
              </p>
            ) : null}
            {activeJob.status === 'failed' && activeJob.errorDetail ? (
              <p className="mt-1 text-xs text-destructive">{activeJob.errorDetail}</p>
            ) : null}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>最近任务</Label>
            <Button
              variant="ghost"
              size="sm"
              disabled={loadingJobs}
              onClick={() => void loadJobs()}
            >
              刷新
            </Button>
          </div>
          {loadingJobs && jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : null}
          {!loadingJobs && jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有导出记录。选好日期后点「开始生成」。</p>
          ) : null}
          <ul className="space-y-2">
            {jobs.map((j) => (
              <li
                key={j.jobId}
                className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div>
                    {j.startDate} ~ {j.endDate}
                    <span className="ml-2 text-muted-foreground">{statusLabel(j.status)}</span>
                    {j.useAi ? (
                      <span className="ml-1 text-xs text-muted-foreground">AI</span>
                    ) : null}
                  </div>
                  {j.expiresAt && j.status === 'done' ? (
                    <div className="text-xs text-muted-foreground">
                      有效至 {formatExpires(j.expiresAt)}
                    </div>
                  ) : null}
                </div>
                {j.downloadable ? (
                  <Button size="sm" variant="secondary" onClick={() => onDownload(j.jobId, 'pdf')}>
                    下载
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
