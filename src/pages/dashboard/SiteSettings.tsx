import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  getSiteAdminConfig,
  testSiteEmail,
  updateSiteConfig,
} from '@/api/site'
import { uploadImage } from '@/api/upload'
import { useAuth } from '@/auth/AuthContext'
import { useSiteConfig } from '@/site/SiteConfigContext'
import { ImageUploadTile } from '@/components/image-upload-tile'
import { PageShell } from '@/components/page-shell'
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

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await getSiteAdminConfig()
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '加载站点配置失败')
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
    })()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  if (!isAdmin) {
    return <Navigate to="/admin/statistics" replace />
  }

  async function onUpload(kind: 'logo' | 'favicon', file: File | null) {
    if (!file) return
    setUploading(kind)
    const res = await uploadImage(file, 'site')
    setUploading(null)
    if (!res.success || !res.data?.url) {
      toast.error(res.message || '上传失败')
      return
    }
    if (kind === 'logo') setLogo(res.data.url)
    else setFavicon(res.data.url)
    toast.success('上传成功，请点保存')
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
      toast.error(res.message || '保存失败')
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
    else toast.error(res.message || '发送失败')
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

  return (
    <PageShell stagger={false}>
      <form
        onSubmit={handleSave}
        className="mx-auto flex w-full max-w-2xl flex-col gap-3"
      >
        <Card className="gap-3 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle>站点品牌</CardTitle>
            <CardDescription>站点名称、Logo 与浏览器图标</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel>站点标题</FieldLabel>
                <Input
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
                <FieldLabel>备案号</FieldLabel>
                <Input
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
            <CardTitle>邮件发送设置</CardTitle>
            <CardDescription>
              用于注册验证码、密码找回与 AI 日报/周报。保存后立即生效。
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel>邮件服务器地址</FieldLabel>
                <Input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.163.com"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>端口</FieldLabel>
                <Input
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="465"
                  inputMode="numeric"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>用户名</FieldLabel>
                <Input
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="off"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>密码 / 授权码</FieldLabel>
                <Input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={
                    smtpPasswordSet ? '已保存，留空表示不修改' : '邮箱密码或授权码'
                  }
                  autoComplete="new-password"
                  onFocus={() => {
                    if (smtpPassword === SECRET_PLACEHOLDER) setSmtpPassword('')
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  显示为圆点表示已保存。清空并保存可删除密码。
                </p>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>发件人邮箱</FieldLabel>
                <Input
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="your@email.com"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>测试收件人</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="接收测试邮件的邮箱"
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
            <CardTitle>AI 总结模型</CardTitle>
            <CardDescription>
              用于个人日报、周报与近期训练总结
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel>模型名称</FieldLabel>
                <Input
                  value={agentModel}
                  onChange={(e) => setAgentModel(e.target.value)}
                  placeholder="请填写模型名称"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>密钥（API Key）</FieldLabel>
                <Input
                  type="password"
                  value={agentSecret}
                  onChange={(e) => setAgentSecret(e.target.value)}
                  placeholder={
                    agentSecretSet ? '已保存，留空表示不修改' : '请填写密钥'
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
            <CardTitle>题库 AI 分析</CardTitle>
            <CardDescription>
              用于题面整理与标签分析的 AI 服务
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel>接口地址</FieldLabel>
                <Input
                  value={aiEndpoint}
                  onChange={(e) => setAiEndpoint(e.target.value)}
                  placeholder="请填写服务商提供的接口地址"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>模型名称</FieldLabel>
                <Input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="请填写模型名称"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>密钥（API Key）</FieldLabel>
                <Input
                  type="password"
                  value={aiSecret}
                  onChange={(e) => setAiSecret(e.target.value)}
                  placeholder={
                    aiSecretSet ? '已保存，留空表示不修改' : '请填写密钥'
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
    </PageShell>
  )
}
