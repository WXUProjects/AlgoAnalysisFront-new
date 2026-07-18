import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  downloadBackupJob,
  getBackupJob,
  getSiteAdminConfig,
  listBackupJobs,
  startBackupExport,
  startBackupImport,
  testSiteEmail,
  updateSiteConfig,
  type BackupJob,
} from '@/api/site'
import { uploadImage } from '@/api/upload'
import { useAuth } from '@/auth/AuthContext'
import { useSiteConfig } from '@/site/SiteConfigContext'
import { ImageUploadTile } from '@/components/image-upload-tile'
import { PageShell } from '@/components/page-shell'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

function formatBytes(n: number): string {
  if (!n || n < 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function jobStatusLabel(s: string): string {
  switch (s) {
    case 'pending':
      return '排队中'
    case 'running':
      return '进行中'
    case 'done':
      return '已完成'
    case 'failed':
      return '失败'
    default:
      return s || '—'
  }
}

const SECRET_PLACEHOLDER = '••••••••'

export function DashboardSiteSettings() {
  const { isAdmin } = useAuth()
  const { refresh } = useSiteConfig()

  const [title, setTitle] = useState('')
  const [logo, setLogo] = useState('')
  const [favicon, setFavicon] = useState('')
  const [footerIcp, setFooterIcp] = useState('')

  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('465')
  const [smtpUsername, setSmtpUsername] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false)
  const [smtpFrom, setSmtpFrom] = useState('')
  const [testTo, setTestTo] = useState('')

  const [agentModel, setAgentModel] = useState('')
  const [agentSecret, setAgentSecret] = useState('')
  const [agentSecretSet, setAgentSecretSet] = useState(false)

  const [aiEndpoint, setAiEndpoint] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [aiSecret, setAiSecret] = useState('')
  const [aiSecretSet, setAiSecretSet] = useState(false)

  const [inactiveDays, setInactiveDays] = useState('14')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null)

  // —— 数据备份 ——
  const [activeJob, setActiveJob] = useState<BackupJob | null>(null)
  const [recentJobs, setRecentJobs] = useState<BackupJob[]>([])
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importConfirm, setImportConfirm] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refreshJobs = useCallback(async (): Promise<BackupJob | null> => {
    const res = await listBackupJobs()
    if (!res.success || !res.data) return null
    setRecentJobs(res.data.slice(0, 5))
    const running = res.data.find(
      (j) => j.status === 'pending' || j.status === 'running',
    )
    if (running) {
      setActiveJob(running)
      return running
    }
    // 展示最近完成的导出，便于下载
    const lastExport = res.data.find(
      (j) => j.kind === 'export' && j.status === 'done',
    )
    if (lastExport) setActiveJob(lastExport)
    return null
  }, [])

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPoll = useCallback(
    (jobId: number) => {
      stopPoll()
      pollRef.current = setInterval(async () => {
        const res = await getBackupJob(jobId)
        if (!res.success || !res.data) return
        setActiveJob(res.data)
        if (res.data.status === 'done' || res.data.status === 'failed') {
          stopPoll()
          setExporting(false)
          setImporting(false)
          void refreshJobs()
          if (res.data.status === 'done') {
            toast.success(
              res.data.kind === 'export'
                ? '导出完成，可下载备份包'
                : '导入完成，请刷新页面',
            )
          } else {
            toast.error(res.data.errorDetail || res.data.message || '任务失败，请稍后重试')
          }
        }
      }, 2000)
    },
    [refreshJobs, stopPoll],
  )

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await getSiteAdminConfig()
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '站点配置加载失败，请稍后重试')
        return
      }
      const d = res.data
      setTitle(d.siteTitle || 'GoAlgo')
      setLogo(d.siteLogo || '')
      setFavicon(d.favicon || '')
      setFooterIcp(d.footerIcp || '苏ICP备2025217901号')
      setSmtpHost(d.smtpHost || '')
      setSmtpPort(String(d.smtpPort || 465))
      setSmtpUsername(d.smtpUsername || '')
      setSmtpPassword(d.smtpPasswordSet ? SECRET_PLACEHOLDER : '')
      setSmtpPasswordSet(d.smtpPasswordSet)
      setSmtpFrom(d.smtpFrom || '')
      setTestTo(d.smtpUsername || d.smtpFrom || '')
      setAgentModel(d.agentModel || '')
      setAgentSecret(d.agentSecretSet ? SECRET_PLACEHOLDER : '')
      setAgentSecretSet(d.agentSecretSet)
      setAiEndpoint(d.aiAnalyzeEndpoint || '')
      setAiModel(d.aiAnalyzeModel || '')
      setAiSecret(d.aiAnalyzeSecretSet ? SECRET_PLACEHOLDER : '')
      setAiSecretSet(d.aiAnalyzeSecretSet)
      setInactiveDays(String(d.inactiveDays || 14))
      const running = await refreshJobs()
      if (!cancelled && running) {
        startPoll(running.id)
      }
    })()
    return () => {
      cancelled = true
      stopPoll()
    }
  }, [isAdmin, refreshJobs, startPoll, stopPoll])

  if (!isAdmin) {
    return <Navigate to="/admin/statistics" replace />
  }

  async function onUpload(kind: 'logo' | 'favicon', file: File | null) {
    if (!file) return
    setUploading(kind)
    const res = await uploadImage(file, 'site')
    setUploading(null)
    if (!res.success || !res.data?.url) {
      toast.error(res.message || '上传失败，请稍后重试')
      return
    }
    if (kind === 'logo') setLogo(res.data.url)
    else setFavicon(res.data.url)
    toast.success('已上传，请点保存生效')
  }

  function secretPayload(
    value: string,
    alreadySet: boolean,
  ): { secret?: string; clear?: boolean } {
    const v = value.trim()
    if (v === '' && alreadySet) return { clear: true }
    if (v === '' || v === SECRET_PLACEHOLDER) return {}
    return { secret: v }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('站点标题不能为空')
      return
    }
    const port = Number(smtpPort) || 465
    const smtpPw = secretPayload(smtpPassword, smtpPasswordSet)
    const agentSec = secretPayload(agentSecret, agentSecretSet)
    const aiSec = secretPayload(aiSecret, aiSecretSet)

    const days = Math.max(1, Math.min(365, Number(inactiveDays) || 14))
    setSaving(true)
    const res = await updateSiteConfig({
      siteTitle: title.trim(),
      siteLogo: logo.trim(),
      favicon: favicon.trim(),
      footerIcp: footerIcp.trim(),
      smtpHost: smtpHost.trim(),
      smtpPort: port,
      smtpUsername: smtpUsername.trim(),
      smtpFrom: smtpFrom.trim(),
      smtpPassword: smtpPw.secret,
      clearSmtpPassword: smtpPw.clear,
      agentModel: agentModel.trim(),
      agentSecret: agentSec.secret,
      clearAgentSecret: agentSec.clear,
      aiAnalyzeEndpoint: aiEndpoint.trim(),
      aiAnalyzeModel: aiModel.trim(),
      aiAnalyzeSecret: aiSec.secret,
      clearAiAnalyzeSecret: aiSec.clear,
      inactiveDays: days,
      setInactiveDays: true,
    })
    setSaving(false)
    if (res.success) {
      toast.success('站点配置已保存')
      await refresh()
      // 刷新密钥状态
      const again = await getSiteAdminConfig()
      if (again.success && again.data) {
        setSmtpPassword(again.data.smtpPasswordSet ? SECRET_PLACEHOLDER : '')
        setSmtpPasswordSet(again.data.smtpPasswordSet)
        setAgentSecret(again.data.agentSecretSet ? SECRET_PLACEHOLDER : '')
        setAgentSecretSet(again.data.agentSecretSet)
        setAiSecret(again.data.aiAnalyzeSecretSet ? SECRET_PLACEHOLDER : '')
        setAiSecretSet(again.data.aiAnalyzeSecretSet)
      }
    } else {
      toast.error(res.message || '保存失败，请稍后重试')
    }
  }

  async function handleTestEmail() {
    if (!testTo.trim()) {
      toast.error('请填写收件人邮箱')
      return
    }
    const port = Number(smtpPort) || 465
    const smtpPw = secretPayload(smtpPassword, smtpPasswordSet)
    setTesting(true)
    const res = await testSiteEmail({
      to: testTo.trim(),
      smtpHost: smtpHost.trim(),
      smtpPort: port,
      smtpUsername: smtpUsername.trim(),
      smtpFrom: smtpFrom.trim(),
      smtpPassword: smtpPw.secret,
    })
    setTesting(false)
    if (res.success) toast.success(res.message || '测试邮件已发送')
    else toast.error(res.message || '发送失败，请稍后重试')
  }

  async function handleExport() {
    setExporting(true)
    const res = await startBackupExport(['all'])
    if (!res.success || !res.data?.jobId) {
      setExporting(false)
      toast.error(res.message || '导出任务创建失败，请稍后重试')
      return
    }
    toast.success('导出已在后台开始，可稍后回来下载')
    startPoll(res.data.jobId)
    const job = await getBackupJob(res.data.jobId)
    if (job.success && job.data) setActiveJob(job.data)
  }

  async function handleConfirmImport() {
    if (!importFile) {
      toast.error('请选择备份 zip 文件')
      return
    }
    if (importConfirm.trim() !== 'RESTORE') {
      toast.error('请输入 RESTORE 确认导入')
      return
    }
    setImporting(true)
    setImportOpen(false)
    const res = await startBackupImport(importFile, 'RESTORE')
    setImportFile(null)
    setImportConfirm('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!res.success || !res.data?.jobId) {
      setImporting(false)
      toast.error(res.message || '导入任务创建失败，请稍后重试')
      return
    }
    toast.message('正在导入，请勿关闭页面或中断服务…')
    startPoll(res.data.jobId)
    const job = await getBackupJob(res.data.jobId)
    if (job.success && job.data) setActiveJob(job.data)
  }

  function handleDownload(jobId: number) {
    const res = downloadBackupJob(jobId)
    if (res.success) toast.success('已开始下载')
    else toast.error(res.message || '下载失败，请稍后重试')
  }

  if (loading) {
    return (
      <PageShell stagger={false}>
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      </PageShell>
    )
  }

  const jobBusy =
    exporting ||
    importing ||
    activeJob?.status === 'pending' ||
    activeJob?.status === 'running'

  return (
    <PageShell stagger={false}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      <form
        onSubmit={handleSave}
        className="flex w-full flex-col gap-3"
      >
        <Card className="gap-3 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle>站点品牌</CardTitle>
            <CardDescription>设置站点显示名称、Logo 和浏览器标签图标</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="site-title">站点标题</FieldLabel>
                <Input
                  id="site-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="GoAlgo"
                />
              </Field>
              <Field className="gap-1.5">
                <ImageUploadTile
                  label="站点 Logo"
                  value={logo}
                  uploading={uploading === 'logo'}
                  sizeClass="size-28"
                  onFile={(file) => void onUpload('logo', file)}
                />
              </Field>
              <Field className="gap-1.5">
                <ImageUploadTile
                  label="浏览器图标"
                  value={favicon}
                  uploading={uploading === 'favicon'}
                  sizeClass="size-20"
                  onFile={(file) => void onUpload('favicon', file)}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle>页脚</CardTitle>
            <CardDescription>
              备案号展示在全站页脚；版权与开发者信息由系统固定展示
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="footer-icp">备案号</FieldLabel>
                <Input
                  id="footer-icp"
                  value={footerIcp}
                  onChange={(e) => setFooterIcp(e.target.value)}
                  placeholder="苏ICP备2025217901号"
                />
                <p className="text-xs text-muted-foreground">
                  留空则使用默认：苏ICP备2025217901号。链接至工信部备案查询。
                </p>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle>长期未登录休眠</CardTitle>
            <CardDescription>
              超过指定天数未登录的用户，将暂停自动同步与邮件，以节省资源。再次登录后会自动全量同步。
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="inactive-days">超过多少天未登录视为不活跃</FieldLabel>
                <Input
                  id="inactive-days"
                  type="number"
                  min={1}
                  max={365}
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(e.target.value)}
                  placeholder="14"
                />
                <p className="text-xs text-muted-foreground">
                  默认 14 天，范围 1–365。站点管理员、教练/队长、付费组织、强制同步组织，以及标记为「永不休眠」的用户不受影响。
                </p>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle>邮件发送设置</CardTitle>
            <CardDescription>
              用于验证码、找回密码与训练日报/周报。保存后立即生效。
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-host">邮件服务器地址</FieldLabel>
                <Input
                  id="smtp-host"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.163.com"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-port">端口</FieldLabel>
                <Input
                  id="smtp-port"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="465"
                  inputMode="numeric"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-username">用户名</FieldLabel>
                <Input
                  id="smtp-username"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="off"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-password">密码 / 授权码</FieldLabel>
                <Input
                  id="smtp-password"
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={
                    smtpPasswordSet ? '已保存；留空表示不修改' : '邮箱密码或授权码'
                  }
                  autoComplete="new-password"
                  onFocus={() => {
                    if (smtpPassword === SECRET_PLACEHOLDER) setSmtpPassword('')
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  显示为圆点表示已保存过。清空后再保存可删除密码。
                </p>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-from">发件人邮箱</FieldLabel>
                <Input
                  id="smtp-from"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="your@email.com"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-test-to">测试收件人</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="smtp-test-to"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="用来接收测试邮件的邮箱"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={testing}
                    onClick={() => void handleTestEmail()}
                  >
                    {testing ? <Spinner data-icon="inline-start" /> : null}
                    发送测试邮件
                  </Button>
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle>日报 / 周报所用模型</CardTitle>
            <CardDescription>
              用于自动生成个人日报与周报邮件
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="agent-model">模型名称</FieldLabel>
                <Input
                  id="agent-model"
                  value={agentModel}
                  onChange={(e) => setAgentModel(e.target.value)}
                  placeholder="模型名称"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="agent-secret">密钥</FieldLabel>
                <Input
                  id="agent-secret"
                  type="password"
                  value={agentSecret}
                  onChange={(e) => setAgentSecret(e.target.value)}
                  placeholder={
                    agentSecretSet ? '已保存；留空表示不修改' : '请填写密钥'
                  }
                  autoComplete="new-password"
                  onFocus={() => {
                    if (agentSecret === SECRET_PLACEHOLDER) setAgentSecret('')
                  }}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle>题库分析</CardTitle>
            <CardDescription>
              用于题面整理与标签分析的 AI 服务
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="ai-endpoint">服务地址</FieldLabel>
                <Input
                  id="ai-endpoint"
                  value={aiEndpoint}
                  onChange={(e) => setAiEndpoint(e.target.value)}
                  placeholder="服务商提供的接口地址"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="ai-model">模型名称</FieldLabel>
                <Input
                  id="ai-model"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="模型名称"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="ai-secret">密钥</FieldLabel>
                <Input
                  id="ai-secret"
                  type="password"
                  value={aiSecret}
                  onChange={(e) => setAiSecret(e.target.value)}
                  placeholder={
                    aiSecretSet ? '已保存；留空表示不修改' : '请填写密钥'
                  }
                  autoComplete="new-password"
                  onFocus={() => {
                    if (aiSecret === SECRET_PLACEHOLDER) setAiSecret('')
                  }}
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end gap-2 px-4 pt-0">
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              保存全部
            </Button>
          </CardFooter>
        </Card>
      </form>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle>数据备份与恢复</CardTitle>
            <CardDescription>
              导出站点数据（用户、组织、题库、提交与上传文件等），后台完成后可下载；
              完成后请在 10 分钟内下载，超时将自动删除。导入将
              <span className="font-medium text-destructive">覆盖现有数据</span>
              ，恢复为备份时的状态。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                disabled={jobBusy}
                onClick={() => void handleExport()}
              >
                {exporting ||
                (activeJob?.kind === 'export' &&
                  (activeJob.status === 'pending' ||
                    activeJob.status === 'running')) ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                导出全部站点数据
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={jobBusy}
                onClick={() => {
                  setImportConfirm('')
                  setImportOpen(true)
                }}
              >
                {importing ||
                (activeJob?.kind === 'import' &&
                  (activeJob.status === 'pending' ||
                    activeJob.status === 'running')) ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                导入备份包…
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  setImportFile(f)
                }}
              />
            </div>

            {activeJob &&
              (activeJob.status === 'pending' ||
                activeJob.status === 'running' ||
                activeJob.status === 'done' ||
                activeJob.status === 'failed') && (
                <div className="rounded-lg border bg-muted/40 px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      当前任务 #{activeJob.id}（
                      {activeJob.kind === 'export' ? '导出' : '导入'} ·{' '}
                      {jobStatusLabel(activeJob.status)}）
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {activeJob.progress}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
                      style={{
                        width: `${Math.min(100, Math.max(0, activeJob.progress))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    {activeJob.message || '…'}
                  </p>
                  {activeJob.errorDetail ? (
                    <p className="mt-1 text-destructive">{activeJob.errorDetail}</p>
                  ) : null}
                  {activeJob.downloadable ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleDownload(activeJob.id)}
                      >
                        下载备份包
                        {activeJob.fileSize
                          ? `（${formatBytes(activeJob.fileSize)}）`
                          : ''}
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}

            {recentJobs.length > 0 ? (
              <div className="text-sm">
                <p className="mb-1.5 font-medium text-muted-foreground">
                  最近任务
                </p>
                <ul className="divide-y rounded-lg border">
                  {recentJobs.map((j) => (
                    <li
                      key={j.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                    >
                      <span>
                        #{j.id}{' '}
                        {j.kind === 'export' ? '导出' : '导入'} ·{' '}
                        {jobStatusLabel(j.status)}
                        {j.fileSize ? ` · ${formatBytes(j.fileSize)}` : ''}
                      </span>
                      {j.downloadable ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(j.id)}
                        >
                          下载
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认导入并覆盖现有数据？</AlertDialogTitle>
            <AlertDialogDescription>
              导入将按备份包清空并重写对应表（用户密码哈希、提交记录、题库等均会被替换）。此操作不可撤销。请先确认已有可用备份。目标环境的配置加密密钥须与导出时一致。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 px-1">
            <Field className="gap-1.5">
              <FieldLabel>备份文件（.zip）</FieldLabel>
              <Input
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              {importFile ? (
                <p className="text-xs text-muted-foreground">
                  已选：{importFile.name}（{formatBytes(importFile.size)}）
                </p>
              ) : null}
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="restore-confirm">
                输入 RESTORE 确认
              </FieldLabel>
              <Input
                id="restore-confirm"
                value={importConfirm}
                onChange={(e) => setImportConfirm(e.target.value)}
                placeholder="RESTORE"
                autoComplete="off"
              />
            </Field>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={
                !importFile || importConfirm.trim() !== 'RESTORE' || importing
              }
              onClick={() => void handleConfirmImport()}
            >
              确认导入
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
