import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  getSiteAdminConfig,
  testSiteEmail,
  updateSiteConfig,
  verifyOjCredential,
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
  CardFooter,
} from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Perm } from '@/lib/permissions'
import { formatTime } from '@/lib/format'
import { ChevronDown } from 'lucide-react'
import {
  buildSectionPayload,
  sectionDirty,
  secretUpdate,
  type SiteFormState,
  type SingleSection,
} from '@/lib/site-config'
import type { SiteConfigSection } from '@shared/api'

// buildFormState 从当前 React state 组装 SiteFormState（供 payload 与 dirty 计算）
function buildFormState(
  s: {
    title: string; logo: string; favicon: string; footerIcp: string; inactiveDays: string
    smtpHost: string; smtpPort: string; smtpUsername: string; smtpFrom: string
    smtpPassword: string; smtpPasswordSet: boolean; clearSmtpPassword: boolean
    adminNotifyEmails: string; opsNotifyEmails: string; dataDiskPath: string
    agentEndpoint: string; agentModel: string; agentSecret: string; agentSecretSet: boolean; clearAgentSecret: boolean
    aiEndpoint: string; aiModel: string; aiSecret: string; aiSecretSet: boolean; clearAiSecret: boolean
    upyunBucket: string; upyunOperator: string; upyunPassword: string; upyunPasswordSet: boolean; clearUpyunPassword: boolean
    upyunDomain: string; upyunScheme: string
    ojLuoguUsername: string; ojLuoguPassword: string; ojLuoguPasswordSet: boolean; clearOjLuoguPassword: boolean
    ojQojUsername: string; ojQojPassword: string; ojQojPasswordSet: boolean; clearOjQojPassword: boolean
    payfmApiBase: string; payfmMerchantNo: string; payfmSecret: string; payfmSecretSet: boolean; clearPayfmSecret: boolean
    payfmPayType: string
    backupEnabled: boolean
    backupTime: string
    backupPrefix: string
    configVersion: number
  },
): SiteFormState {
  return {
    siteTitle: s.title, siteLogo: s.logo, favicon: s.favicon, footerIcp: s.footerIcp,
    inactiveDays: s.inactiveDays,
    smtpHost: s.smtpHost, smtpPort: s.smtpPort, smtpUsername: s.smtpUsername, smtpFrom: s.smtpFrom,
    adminNotifyEmails: s.adminNotifyEmails, opsNotifyEmails: s.opsNotifyEmails, dataDiskPath: s.dataDiskPath,
    agentEndpoint: s.agentEndpoint, agentModel: s.agentModel,
    aiEndpoint: s.aiEndpoint, aiModel: s.aiModel,
    upyunBucket: s.upyunBucket, upyunOperator: s.upyunOperator, upyunDomain: s.upyunDomain, upyunScheme: s.upyunScheme,
    ojLuoguUsername: s.ojLuoguUsername, ojQojUsername: s.ojQojUsername,
    payfmApiBase: s.payfmApiBase, payfmMerchantNo: s.payfmMerchantNo, payfmPayType: s.payfmPayType,
    backupEnabled: s.backupEnabled,
    backupTime: s.backupTime,
    backupPrefix: s.backupPrefix,
    configVersion: s.configVersion,
    smtpPassword: { draft: s.smtpPassword, alreadySet: s.smtpPasswordSet, clearRequested: s.clearSmtpPassword },
    agentSecret: { draft: s.agentSecret, alreadySet: s.agentSecretSet, clearRequested: s.clearAgentSecret },
    aiSecret: { draft: s.aiSecret, alreadySet: s.aiSecretSet, clearRequested: s.clearAiSecret },
    upyunPassword: { draft: s.upyunPassword, alreadySet: s.upyunPasswordSet, clearRequested: s.clearUpyunPassword },
    ojLuoguPassword: { draft: s.ojLuoguPassword, alreadySet: s.ojLuoguPasswordSet, clearRequested: s.clearOjLuoguPassword },
    ojQojPassword: { draft: s.ojQojPassword, alreadySet: s.ojQojPasswordSet, clearRequested: s.clearOjQojPassword },
    payfmSecret: { draft: s.payfmSecret, alreadySet: s.payfmSecretSet, clearRequested: s.clearPayfmSecret },
  }
}

// buildPristineFromAdmin 从 admin-config 构造初始快照（dirty 基准）
function buildPristineFromAdmin(d: {
  siteTitle?: string; siteLogo?: string; favicon?: string; footerIcp?: string; inactiveDays?: number
  smtpHost?: string; smtpPort?: number; smtpUsername?: string; smtpFrom?: string
  smtpPasswordSet?: boolean
  adminNotifyEmails?: string; opsNotifyEmails?: string; dataDiskPath?: string
  agentEndpoint?: string; agentModel?: string; agentSecretSet?: boolean
  aiAnalyzeEndpoint?: string; aiAnalyzeModel?: string; aiAnalyzeSecretSet?: boolean
  upyunBucket?: string; upyunOperator?: string; upyunPasswordSet?: boolean
  upyunDomain?: string; upyunScheme?: string
  ojLuoguUsername?: string; ojLuoguPasswordSet?: boolean
  ojQojUsername?: string; ojQojPasswordSet?: boolean
  payfmApiBase?: string; payfmMerchantNo?: string; payfmSecretSet?: boolean
  payfmPayType?: string
  backupEnabled?: boolean
  backupTime?: string
  backupPrefix?: string
  configVersion?: number
}): SiteFormState {
  return {
    siteTitle: d.siteTitle ?? '', siteLogo: d.siteLogo ?? '', favicon: d.favicon ?? '',
    footerIcp: d.footerIcp ?? '', inactiveDays: String(d.inactiveDays ?? 14),
    smtpHost: d.smtpHost ?? '', smtpPort: String(d.smtpPort ?? 465), smtpUsername: d.smtpUsername ?? '',
    smtpFrom: d.smtpFrom ?? '', adminNotifyEmails: d.adminNotifyEmails ?? '',
    opsNotifyEmails: d.opsNotifyEmails ?? '', dataDiskPath: d.dataDiskPath ?? '',
    agentEndpoint: d.agentEndpoint ?? '', agentModel: d.agentModel ?? '',
    aiEndpoint: d.aiAnalyzeEndpoint ?? '', aiModel: d.aiAnalyzeModel ?? '',
    upyunBucket: d.upyunBucket ?? '', upyunOperator: d.upyunOperator ?? '',
    upyunDomain: d.upyunDomain ?? '', upyunScheme: d.upyunScheme ?? 'http',
    ojLuoguUsername: d.ojLuoguUsername ?? '', ojQojUsername: d.ojQojUsername ?? '',
    payfmApiBase: d.payfmApiBase ?? '', payfmMerchantNo: d.payfmMerchantNo ?? '',
    payfmPayType: d.payfmPayType ?? '', configVersion: d.configVersion ?? 0,
    backupEnabled: Boolean(d.backupEnabled),
    backupTime: d.backupTime ?? '02:00',
    backupPrefix: d.backupPrefix ?? '',
    smtpPassword: { draft: '', alreadySet: Boolean(d.smtpPasswordSet), clearRequested: false },
    agentSecret: { draft: '', alreadySet: Boolean(d.agentSecretSet), clearRequested: false },
    aiSecret: { draft: '', alreadySet: Boolean(d.aiAnalyzeSecretSet), clearRequested: false },
    upyunPassword: { draft: '', alreadySet: Boolean(d.upyunPasswordSet), clearRequested: false },
    ojLuoguPassword: { draft: '', alreadySet: Boolean(d.ojLuoguPasswordSet), clearRequested: false },
    ojQojPassword: { draft: '', alreadySet: Boolean(d.ojQojPasswordSet), clearRequested: false },
    payfmSecret: { draft: '', alreadySet: Boolean(d.payfmSecretSet), clearRequested: false },
  }
}

function CollapsibleCard({
  title,
  description,
  defaultOpen = false,
  footer,
  children,
}: {
  title: string
  description?: string
  defaultOpen?: boolean
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="gap-0 py-0 overflow-hidden">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors">
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold leading-none">{title}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-3">
            {children}
          </CardContent>
          {footer && (
            <CardFooter className="justify-end gap-2 px-4 pb-3 pt-0">
              {footer}
            </CardFooter>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export function DashboardSiteSettings() {
  const { can } = useAuth()
  const canWrite = can(Perm.SiteConfigWrite)
  const canRead = can(Perm.SiteConfigRead) || canWrite
  const { config: siteConfig, refresh } = useSiteConfig()

  const [title, setTitle] = useState('')
  const [logo, setLogo] = useState('')
  const [favicon, setFavicon] = useState('')
  const [footerIcp, setFooterIcp] = useState('')

  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('465')
  const [smtpUsername, setSmtpUsername] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false)
  const [clearSmtpPassword, setClearSmtpPassword] = useState(false)
  const [smtpFrom, setSmtpFrom] = useState('')
  const [testTo, setTestTo] = useState('')

  const [agentModel, setAgentModel] = useState('')
  const [agentEndpoint, setAgentEndpoint] = useState('')
  const [agentSecret, setAgentSecret] = useState('')
  const [agentSecretSet, setAgentSecretSet] = useState(false)
  const [clearAgentSecret, setClearAgentSecret] = useState(false)

  const [aiEndpoint, setAiEndpoint] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [aiSecret, setAiSecret] = useState('')
  const [aiSecretSet, setAiSecretSet] = useState(false)
  const [clearAiSecret, setClearAiSecret] = useState(false)

  const [inactiveDays, setInactiveDays] = useState('14')
  const [adminNotifyEmails, setAdminNotifyEmails] = useState('')
  const [opsNotifyEmails, setOpsNotifyEmails] = useState('')
  const [dataDiskPath, setDataDiskPath] = useState('')

  const [upyunBucket, setUpyunBucket] = useState('')
  const [upyunOperator, setUpyunOperator] = useState('')
  const [upyunPassword, setUpyunPassword] = useState('')
  const [upyunPasswordSet, setUpyunPasswordSet] = useState(false)
  const [clearUpyunPassword, setClearUpyunPassword] = useState(false)
  const [upyunDomain, setUpyunDomain] = useState('')
  const [upyunScheme, setUpyunScheme] = useState('http')

  const [ojLuoguUsername, setOjLuoguUsername] = useState('')
  const [ojLuoguPassword, setOjLuoguPassword] = useState('')
  const [ojLuoguPasswordSet, setOjLuoguPasswordSet] = useState(false)
  const [clearOjLuoguPassword, setClearOjLuoguPassword] = useState(false)
  const [ojLuoguStatus, setOjLuoguStatus] = useState<'unchecked' | 'ok' | 'fail' | 'loading'>('unchecked')
  const [ojLuoguStatusAt, setOjLuoguStatusAt] = useState(0)
  const [ojLuoguErrMsg, setOjLuoguErrMsg] = useState('')
  const [ojQojUsername, setOjQojUsername] = useState('')
  const [ojQojPassword, setOjQojPassword] = useState('')
  const [ojQojPasswordSet, setOjQojPasswordSet] = useState(false)
  const [clearOjQojPassword, setClearOjQojPassword] = useState(false)
  const [ojQojStatus, setOjQojStatus] = useState<'unchecked' | 'ok' | 'fail' | 'loading'>('unchecked')
  const [ojQojStatusAt, setOjQojStatusAt] = useState(0)
  const [ojQojErrMsg, setOjQojErrMsg] = useState('')
  const [payfmApiBase, setPayfmApiBase] = useState('')
  const [payfmMerchantNo, setPayfmMerchantNo] = useState('')
  const [payfmSecret, setPayfmSecret] = useState('')
  const [payfmSecretSet, setPayfmSecretSet] = useState(false)
  const [clearPayfmSecret, setClearPayfmSecret] = useState(false)
  const [payfmPayType, setPayfmPayType] = useState('')
  const [payfmNotifyUrl, setPayfmNotifyUrl] = useState('')
  const [backupEnabled, setBackupEnabled] = useState(false)
  const [backupTime, setBackupTime] = useState('02:00')
  const [backupPrefix, setBackupPrefix] = useState('')
  const [agentStatus, setAgentStatus] = useState('unchecked')
  const [agentStatusAt, setAgentStatusAt] = useState(0)
  const [agentErrMsg, setAgentErrMsg] = useState('')
  const [aiStatus, setAiStatus] = useState('unchecked')
  const [aiStatusAt, setAiStatusAt] = useState(0)
  const [aiErrMsg, setAiErrMsg] = useState('')
  const [smtpStatus, setSmtpStatus] = useState('unchecked')
  const [smtpStatusAt, setSmtpStatusAt] = useState(0)
  const [smtpErrMsg, setSmtpErrMsg] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingSection, setSavingSection] = useState<SiteConfigSection | null>(null)
  const [testing, setTesting] = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null)

  // 配置乐观版本 + 初始快照（dirty 计算基准）
  const [configVersion, setConfigVersion] = useState(0)
  const [pristine, setPristine] = useState<SiteFormState | null>(null)
  /** 每个分区编辑次数，用于保存期间继续编辑时不覆盖 */
  const revRef = useRef<Record<SingleSection, number>>({
    basic: 0,
    email: 0,
    ai: 0,
    upyun: 0,
    oj: 0,
    payment: 0,
    backup: 0,
  })
  const bump = (section: SingleSection) => {
    revRef.current[section] += 1
  }

  useEffect(() => {
    if (!canRead) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await getSiteAdminConfig()
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '站点配置加载失败，稍后重试')
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
      setSmtpPassword('')
      setSmtpPasswordSet(d.smtpPasswordSet)
      setClearSmtpPassword(false)
      setSmtpFrom(d.smtpFrom || '')
      setTestTo(d.smtpUsername || d.smtpFrom || '')
      setAgentModel(d.agentModel || '')
      setAgentEndpoint(d.agentEndpoint || '')
      setAgentSecret('')
      setAgentSecretSet(d.agentSecretSet)
      setClearAgentSecret(false)
      setAiEndpoint(d.aiAnalyzeEndpoint || '')
      setAiModel(d.aiAnalyzeModel || '')
      setAiSecret('')
      setAiSecretSet(d.aiAnalyzeSecretSet)
      setClearAiSecret(false)
      setInactiveDays(String(d.inactiveDays || 14))
      setAdminNotifyEmails(d.adminNotifyEmails || '')
      setOpsNotifyEmails(d.opsNotifyEmails || '')
      setDataDiskPath(d.dataDiskPath || '')
      setUpyunBucket(d.upyunBucket || '')
      setUpyunOperator(d.upyunOperator || '')
      setUpyunPassword('')
      setUpyunPasswordSet(d.upyunPasswordSet)
      setClearUpyunPassword(false)
      setUpyunDomain(d.upyunDomain || '')
      setUpyunScheme(d.upyunScheme || 'http')
      setOjLuoguUsername(d.ojLuoguUsername || '')
      setOjLuoguPassword('')
      setOjLuoguPasswordSet(d.ojLuoguPasswordSet)
      setClearOjLuoguPassword(false)
      setOjLuoguStatus((d.ojLuoguStatus as 'unchecked' | 'ok' | 'fail') || 'unchecked')
      setOjLuoguStatusAt(d.ojLuoguStatusAt || 0)
      setOjLuoguErrMsg(d.ojLuoguErrMsg || '')
      setOjQojUsername(d.ojQojUsername || '')
      setOjQojPassword('')
      setOjQojPasswordSet(d.ojQojPasswordSet)
      setClearOjQojPassword(false)
      setOjQojStatus((d.ojQojStatus as 'unchecked' | 'ok' | 'fail') || 'unchecked')
      setOjQojStatusAt(d.ojQojStatusAt || 0)
      setOjQojErrMsg(d.ojQojErrMsg || '')
      setPayfmApiBase(d.payfmApiBase || '')
      setPayfmMerchantNo(d.payfmMerchantNo || '')
      setPayfmSecret('')
      setPayfmSecretSet(d.payfmSecretSet)
      setClearPayfmSecret(false)
      setPayfmPayType(d.payfmPayType || '')
      setPayfmNotifyUrl(d.payfmNotifyUrl || '')
      setBackupEnabled(Boolean(d.backupEnabled))
      setBackupTime(d.backupTime || '02:00')
      setBackupPrefix(d.backupPrefix || '')
      setAgentStatus(d.agentStatus || 'unchecked')
      setAgentStatusAt(d.agentStatusAt || 0)
      setAgentErrMsg(d.agentErrMsg || '')
      setAiStatus(d.aiAnalyzeStatus || 'unchecked')
      setAiStatusAt(d.aiAnalyzeStatusAt || 0)
      setAiErrMsg(d.aiAnalyzeErrMsg || '')
      setSmtpStatus(d.smtpStatus || 'unchecked')
      setSmtpStatusAt(d.smtpStatusAt || 0)
      setSmtpErrMsg(d.smtpErrMsg || '')
      setConfigVersion(d.configVersion || 0)
      setPristine(buildPristineFromAdmin(d))
    })()
    return () => {
      cancelled = true
    }
  }, [canRead])

  if (!canRead) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">
          你还没有查看站点设置的权限。有需要的话，找站点管理员开通。
        </p>
      </PageShell>
    )
  }

  async function onUpload(kind: 'logo' | 'favicon', file: File | null) {
    if (!file) return
    setUploading(kind)
    const res = await uploadImage(file, 'site')
    setUploading(null)
    if (!res.success || !res.data?.url) {
      toast.error(res.message || '上传失败，稍后重试')
      return
    }
    if (kind === 'logo') { setLogo(res.data.url); bump('basic') }
    else { setFavicon(res.data.url); bump('basic') }
    toast.success('已上传，请点保存生效')
  }

  function currentForm(): SiteFormState {
    return buildFormState({
      title, logo, favicon, footerIcp, inactiveDays,
      smtpHost, smtpPort, smtpUsername, smtpFrom,
      smtpPassword, smtpPasswordSet, clearSmtpPassword,
      adminNotifyEmails, opsNotifyEmails, dataDiskPath,
      agentEndpoint, agentModel, agentSecret, agentSecretSet, clearAgentSecret,
      aiEndpoint, aiModel, aiSecret, aiSecretSet, clearAiSecret,
      upyunBucket, upyunOperator, upyunPassword, upyunPasswordSet, clearUpyunPassword,
      upyunDomain, upyunScheme,
      ojLuoguUsername, ojLuoguPassword, ojLuoguPasswordSet, clearOjLuoguPassword,
      ojQojUsername, ojQojPassword, ojQojPasswordSet, clearOjQojPassword,
      payfmApiBase, payfmMerchantNo, payfmSecret, payfmSecretSet, clearPayfmSecret,
      payfmPayType,
      backupEnabled, backupTime, backupPrefix,
      configVersion,
    })
  }

  // 保存成功后重新拉取配置并回填该分区；若用户保存期间继续编辑则保留本地输入
  async function syncFromServer(section: SingleSection, savedRev: number) {
    const again = await getSiteAdminConfig()
    if (!again.success || !again.data) {
      toast.error('配置已保存，但刷新状态失败')
      return
    }
    const d = again.data
    setConfigVersion(d.configVersion || 0)
    setPristine(buildPristineFromAdmin(d))
    if (revRef.current[section] !== savedRev) return
    if (section === 'basic') {
      setTitle(d.siteTitle || 'GoAlgo')
      setLogo(d.siteLogo || '')
      setFavicon(d.favicon || '')
      setFooterIcp(d.footerIcp || '苏ICP备2025217901号')
      setInactiveDays(String(d.inactiveDays || 14))
    } else if (section === 'email') {
      setSmtpHost(d.smtpHost || '')
      setSmtpPort(String(d.smtpPort || 465))
      setSmtpUsername(d.smtpUsername || '')
      setSmtpFrom(d.smtpFrom || '')
      setAdminNotifyEmails(d.adminNotifyEmails || '')
      setOpsNotifyEmails(d.opsNotifyEmails || '')
      setDataDiskPath(d.dataDiskPath || '')
      setSmtpPassword('')
      setSmtpPasswordSet(d.smtpPasswordSet)
      setClearSmtpPassword(false)
      setSmtpStatus(d.smtpStatus || 'unchecked')
      setSmtpStatusAt(d.smtpStatusAt || 0)
      setSmtpErrMsg(d.smtpErrMsg || '')
    } else if (section === 'ai') {
      setAgentEndpoint(d.agentEndpoint || '')
      setAgentModel(d.agentModel || '')
      setAgentSecret('')
      setAgentSecretSet(d.agentSecretSet)
      setClearAgentSecret(false)
      setAiEndpoint(d.aiAnalyzeEndpoint || '')
      setAiModel(d.aiAnalyzeModel || '')
      setAiSecret('')
      setAiSecretSet(d.aiAnalyzeSecretSet)
      setClearAiSecret(false)
      setAgentStatus(d.agentStatus || 'unchecked')
      setAgentStatusAt(d.agentStatusAt || 0)
      setAgentErrMsg(d.agentErrMsg || '')
      setAiStatus(d.aiAnalyzeStatus || 'unchecked')
      setAiStatusAt(d.aiAnalyzeStatusAt || 0)
      setAiErrMsg(d.aiAnalyzeErrMsg || '')
    } else if (section === 'upyun') {
      setUpyunBucket(d.upyunBucket || '')
      setUpyunOperator(d.upyunOperator || '')
      setUpyunPassword('')
      setUpyunPasswordSet(d.upyunPasswordSet)
      setClearUpyunPassword(false)
      setUpyunDomain(d.upyunDomain || '')
      setUpyunScheme(d.upyunScheme || 'http')
    } else if (section === 'oj') {
      setOjLuoguUsername(d.ojLuoguUsername || '')
      setOjLuoguPassword('')
      setOjLuoguPasswordSet(d.ojLuoguPasswordSet)
      setClearOjLuoguPassword(false)
      setOjQojUsername(d.ojQojUsername || '')
      setOjQojPassword('')
      setOjQojPasswordSet(d.ojQojPasswordSet)
      setClearOjQojPassword(false)
      setOjLuoguStatus((d.ojLuoguStatus as 'unchecked' | 'ok' | 'fail') || 'unchecked')
      setOjQojStatus((d.ojQojStatus as 'unchecked' | 'ok' | 'fail') || 'unchecked')
    } else if (section === 'payment') {
      setPayfmApiBase(d.payfmApiBase || '')
      setPayfmMerchantNo(d.payfmMerchantNo || '')
      setPayfmSecret('')
      setPayfmSecretSet(d.payfmSecretSet)
      setClearPayfmSecret(false)
      setPayfmPayType(d.payfmPayType || '')
      setPayfmNotifyUrl(d.payfmNotifyUrl || '')
    } else if (section === 'backup') {
      setBackupEnabled(Boolean(d.backupEnabled))
      setBackupTime(d.backupTime || '02:00')
      setBackupPrefix(d.backupPrefix || '')
    }
  }

  async function handleSaveSection(section: SingleSection) {
    if (!canWrite || savingSection || saving) return
    if (section === 'backup' && !backupPrefix.trim()) {
      toast.error('存储目录必填，先填写再保存')
      return
    }
    const savedRev = revRef.current[section]
    setSavingSection(section)
    const res = await updateSiteConfig(buildSectionPayload(section, currentForm()))
    if (!res.success) {
      setSavingSection(null)
      toast.error(res.message || '保存失败，稍后重试')
      return
    }
    toast.success('已保存')
    void refresh()
    await syncFromServer(section, savedRev)
    setSavingSection(null)
  }

  async function handleSaveAll() {
    if (!canWrite || savingSection || saving) return
    const savedRevs = { ...revRef.current }
    setSaving(true)
    const res = await updateSiteConfig(buildSectionPayload('all', currentForm()))
    if (!res.success) {
      setSaving(false)
      toast.error(res.message || '保存失败，稍后重试')
      return
    }
    toast.success('全部配置已保存')
    void refresh()
    const again = await getSiteAdminConfig()
    if (!again.success || !again.data) {
      setSaving(false)
      toast.error('配置已保存，但刷新状态失败')
      return
    }
    const d = again.data
    setConfigVersion(d.configVersion || 0)
    setPristine(buildPristineFromAdmin(d))
    if (revRef.current.basic === savedRevs.basic) setTitle(d.siteTitle || 'GoAlgo')
    if (revRef.current.email === savedRevs.email) setSmtpHost(d.smtpHost || '')
    if (revRef.current.ai === savedRevs.ai) setAgentEndpoint(d.agentEndpoint || '')
    if (revRef.current.upyun === savedRevs.upyun) setUpyunBucket(d.upyunBucket || '')
    if (revRef.current.oj === savedRevs.oj) setOjLuoguUsername(d.ojLuoguUsername || '')
    if (revRef.current.payment === savedRevs.payment) setPayfmApiBase(d.payfmApiBase || '')
    if (revRef.current.backup === savedRevs.backup) {
      setBackupEnabled(Boolean(d.backupEnabled))
      setBackupTime(d.backupTime || '02:00')
      setBackupPrefix(d.backupPrefix || '')
    }
    setSaving(false)
  }

  async function handleTestEmail() {
    if (!testTo.trim()) {
      toast.error('收件人邮箱要填')
      return
    }
    const port = Number(smtpPort) || 465
    const smtpPw = secretUpdate({
      draft: smtpPassword,
      alreadySet: smtpPasswordSet,
      clearRequested: clearSmtpPassword,
    })
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
    else toast.error(res.message || '发送失败，稍后重试')
  }

  async function handleVerifyOj(platform: 'LuoGu' | 'QOJ') {
    const setStatus = platform === 'LuoGu' ? setOjLuoguStatus : setOjQojStatus
    const setErr = platform === 'LuoGu' ? setOjLuoguErrMsg : setOjQojErrMsg
    const user = platform === 'LuoGu' ? ojLuoguUsername.trim() : ojQojUsername.trim()
    const pass = platform === 'LuoGu' ? ojLuoguPassword : ojQojPassword
    if (!user) {
      toast.error('先填用户名')
      return
    }
    setStatus('loading')
    setErr('')
    const pw = secretUpdate({
      draft: pass,
      alreadySet: platform === 'LuoGu' ? ojLuoguPasswordSet : ojQojPasswordSet,
      clearRequested: platform === 'LuoGu' ? clearOjLuoguPassword : clearOjQojPassword,
    })
    const res = await verifyOjCredential({
      platform,
      username: user,
      password: pw.secret,
    })
    if (res.data?.ok) {
      setStatus('ok')
      toast.success(`${platform === 'LuoGu' ? '洛谷' : 'QOJ'} 验证通过`)
    } else {
      setStatus('fail')
      const detail = res.data?.errorDetail || res.message || '验证失败'
      setErr(detail)
      toast.error(detail)
    }
  }

  const isDirty = (section: SingleSection): boolean => {
    if (!pristine) return false
    return sectionDirty(section, currentForm(), pristine)
  }

  const anyDirty =
    !!pristine &&
    (['basic', 'email', 'ai', 'upyun', 'oj', 'payment', 'backup'] as SingleSection[]).some(
      (section) => sectionDirty(section, currentForm(), pristine!),
    )

  function CardSaveButton({ section }: { section: SingleSection }) {
    const busy = savingSection === section
    return (
      <Button
        type="button"
        size="sm"
        disabled={!canWrite || savingSection !== null || saving || !isDirty(section)}
        onClick={() => void handleSaveSection(section)}
      >
        {busy ? <Spinner data-icon="inline-start" /> : null}
        保存
      </Button>
    )
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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      {!canWrite && (
        <p className="text-sm text-muted-foreground">
          你当前只能查看站点配置，无法修改。要调整的话，找站点管理员。
        </p>
      )}
      <div className="flex w-full flex-col gap-3">
        {/* 只读权限：整表单只读展示 */}
        <fieldset disabled={!canWrite} className="contents">
        <CollapsibleCard title="基本设置" defaultOpen footer={<CardSaveButton section="basic" />}>
          <FieldGroup className="gap-3">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="site-title">站点标题</FieldLabel>
              <Input
                id="site-title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); bump('basic') }}
                placeholder="GoAlgo"
              />
            </Field>
            <Field className="gap-1.5">
              <div className="flex items-end gap-4">
                <ImageUploadTile
                  label="站点 Logo"
                  value={logo}
                  uploading={uploading === 'logo'}
                  sizeClass="size-20"
                  onFile={(file) => void onUpload('logo', file)}
                />
                <ImageUploadTile
                  label="浏览器图标"
                  value={favicon}
                  uploading={uploading === 'favicon'}
                  sizeClass="size-16"
                  onFile={(file) => void onUpload('favicon', file)}
                />
              </div>
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="footer-icp">备案号</FieldLabel>
              <Input
                id="footer-icp"
                value={footerIcp}
                onChange={(e) => { setFooterIcp(e.target.value); bump('basic') }}
                placeholder="苏ICP备2025217901号"
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="inactive-days">不活跃天数阈值</FieldLabel>
              <Input
                id="inactive-days"
                type="number"
                min={1}
                max={365}
                value={inactiveDays}
                onChange={(e) => { setInactiveDays(e.target.value); bump('basic') }}
                placeholder="14"
              />
              <p className="text-xs text-muted-foreground">
                超过该天数未登录将暂停自动同步与邮件提醒（默认 14 天）
              </p>
            </Field>
          </FieldGroup>
        </CollapsibleCard>

        <CollapsibleCard title="邮件" description="验证码、找回密码、日报/周报、审核提醒" footer={<CardSaveButton section="email" />}>
          <FieldGroup className="gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`inline-block size-2 rounded-full ${
                  smtpStatus === 'ok'
                    ? 'bg-green-500'
                    : smtpStatus === 'fail'
                      ? 'bg-red-500'
                      : 'bg-muted-foreground/30'
                }`}
              />
              邮件服务：{smtpStatus === 'ok' ? '正常' : smtpStatus === 'fail' ? '异常' : '未验证'}
              {smtpStatusAt > 0 && (
                <span className="text-muted-foreground">· 最近发送 {formatTime(smtpStatusAt)}</span>
              )}
              {smtpErrMsg && <span className="text-muted-foreground truncate max-w-56" title={smtpErrMsg}>{smtpErrMsg}</span>}
            </div>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="admin-notify-emails">
                审核 / 举报邮件接收人
              </FieldLabel>
              <textarea
                id="admin-notify-emails"
                value={adminNotifyEmails}
                onChange={(e) => { setAdminNotifyEmails(e.target.value); bump('email') }}
                placeholder={'admin@example.com\nops@example.com'}
                rows={2}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full min-w-0 rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                每行或逗号分隔；留空则发给全部站点管理员
              </p>
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="ops-notify-emails">
                运维告警邮件接收人
              </FieldLabel>
              <textarea
                id="ops-notify-emails"
                value={opsNotifyEmails}
                onChange={(e) => { setOpsNotifyEmails(e.target.value); bump('email') }}
                placeholder={'ops@example.com\nops2@example.com'}
                rows={2}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full min-w-0 rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                每行或逗号分隔；留空则运维告警不发邮件
              </p>
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="data-disk-path">运维磁盘统计目录</FieldLabel>
              <Input
                id="data-disk-path"
                value={dataDiskPath}
                onChange={(e) => { setDataDiskPath(e.target.value); bump('email') }}
                placeholder="/data"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                数据盘挂载点，运维页磁盘使用率按它统计；留空默认 /data（未挂载回退系统盘 /）
              </p>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-host">邮件服务器</FieldLabel>
                <Input
                  id="smtp-host"
                  value={smtpHost}
                  onChange={(e) => { setSmtpHost(e.target.value); bump('email') }}
                  placeholder="smtp.163.com"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-port">端口</FieldLabel>
                <Input
                  id="smtp-port"
                  value={smtpPort}
                  onChange={(e) => { setSmtpPort(e.target.value); bump('email') }}
                  placeholder="465"
                  inputMode="numeric"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-username">用户名</FieldLabel>
                <Input
                  id="smtp-username"
                  value={smtpUsername}
                  onChange={(e) => { setSmtpUsername(e.target.value); bump('email') }}
                  placeholder="your@email.com"
                  autoComplete="off"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-password">密码 / 授权码</FieldLabel>
                <div className="flex flex-col gap-1.5">
                  <Input
                    id="smtp-password"
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => {
                      setSmtpPassword(e.target.value)
                      if (clearSmtpPassword) setClearSmtpPassword(false)
                      bump('email')
                    }}
                    placeholder={smtpPasswordSet ? '已保存；留空表示不修改' : '邮箱密码或授权码'}
                    autoComplete="new-password"
                  />
                  {smtpPasswordSet && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={clearSmtpPassword}
                      onClick={() => { setSmtpPassword(''); setClearSmtpPassword(true); bump('email') }}
                    >
                      清除已保存密钥
                    </Button>
                  )}
                </div>
              </Field>
            </div>
            <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-from">发件人邮箱</FieldLabel>
                <Input
                  id="smtp-from"
                  value={smtpFrom}
                  onChange={(e) => { setSmtpFrom(e.target.value); bump('email') }}
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
        </CollapsibleCard>

        <CollapsibleCard title="AI 服务" description="日报/周报模型 + 题库分析" footer={<CardSaveButton section="ai" />}>
          <FieldGroup className="gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`inline-block size-2 rounded-full ${
                    agentStatus === 'ok'
                      ? 'bg-green-500'
                      : agentStatus === 'fail'
                        ? 'bg-red-500'
                        : 'bg-muted-foreground/30'
                  }`}
                />
                日报模型：{agentStatus === 'ok' ? '正常' : agentStatus === 'fail' ? '异常' : '未验证'}
                {agentStatusAt > 0 && (
                  <span className="text-muted-foreground">· {formatTime(agentStatusAt)}</span>
                )}
                {agentErrMsg && <span className="text-muted-foreground truncate max-w-40" title={agentErrMsg}>{agentErrMsg}</span>}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`inline-block size-2 rounded-full ${
                    aiStatus === 'ok'
                      ? 'bg-green-500'
                      : aiStatus === 'fail'
                        ? 'bg-red-500'
                        : 'bg-muted-foreground/30'
                  }`}
                />
                题库分析：{aiStatus === 'ok' ? '正常' : aiStatus === 'fail' ? '异常' : '未验证'}
                {aiStatusAt > 0 && (
                  <span className="text-muted-foreground">· {formatTime(aiStatusAt)}</span>
                )}
                {aiErrMsg && <span className="text-muted-foreground truncate max-w-40" title={aiErrMsg}>{aiErrMsg}</span>}
              </span>
            </div>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="agent-endpoint">日报/周报服务地址</FieldLabel>
              <Input
                id="agent-endpoint"
                value={agentEndpoint}
                onChange={(e) => { setAgentEndpoint(e.target.value); bump('ai') }}
                placeholder="https://api.openai.com/v1"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="agent-model">日报/周报模型</FieldLabel>
                <Input
                  id="agent-model"
                  value={agentModel}
                  onChange={(e) => { setAgentModel(e.target.value); bump('ai') }}
                  placeholder="模型名称"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="agent-secret">日报/周报密钥</FieldLabel>
                <div className="flex flex-col gap-1.5">
                  <Input
                    id="agent-secret"
                    type="password"
                    value={agentSecret}
                    onChange={(e) => {
                      setAgentSecret(e.target.value)
                      if (clearAgentSecret) setClearAgentSecret(false)
                      bump('ai')
                    }}
                    placeholder={agentSecretSet ? '已保存；留空表示不修改' : '填密钥'}
                    autoComplete="new-password"
                  />
                  {agentSecretSet && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={clearAgentSecret}
                      onClick={() => { setAgentSecret(''); setClearAgentSecret(true); bump('ai') }}
                    >
                      清除已保存密钥
                    </Button>
                  )}
                </div>
              </Field>
            </div>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="ai-endpoint">题库分析服务地址</FieldLabel>
              <Input
                id="ai-endpoint"
                value={aiEndpoint}
                onChange={(e) => { setAiEndpoint(e.target.value); bump('ai') }}
                placeholder="服务商提供的接口地址"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="ai-model">题库分析模型</FieldLabel>
                <Input
                  id="ai-model"
                  value={aiModel}
                  onChange={(e) => { setAiModel(e.target.value); bump('ai') }}
                  placeholder="模型名称"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="ai-secret">题库分析密钥</FieldLabel>
                <div className="flex flex-col gap-1.5">
                  <Input
                    id="ai-secret"
                    type="password"
                    value={aiSecret}
                    onChange={(e) => {
                      setAiSecret(e.target.value)
                      if (clearAiSecret) setClearAiSecret(false)
                      bump('ai')
                    }}
                    placeholder={aiSecretSet ? '已保存；留空表示不修改' : '填密钥'}
                    autoComplete="new-password"
                  />
                  {aiSecretSet && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={clearAiSecret}
                      onClick={() => { setAiSecret(''); setClearAiSecret(true); bump('ai') }}
                    >
                      清除已保存密钥
                    </Button>
                  )}
                </div>
              </Field>
            </div>
          </FieldGroup>
        </CollapsibleCard>

        <CollapsibleCard title="又拍云图床" description="博客与题解图片上传" footer={<CardSaveButton section="upyun" />}>
          <FieldGroup className="gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="upyun-bucket">服务名称</FieldLabel>
                <Input
                  id="upyun-bucket"
                  value={upyunBucket}
                  onChange={(e) => { setUpyunBucket(e.target.value); bump('upyun') }}
                  placeholder="如 yangcongxueyuan"
                  autoComplete="off"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="upyun-operator">操作员</FieldLabel>
                <Input
                  id="upyun-operator"
                  value={upyunOperator}
                  onChange={(e) => { setUpyunOperator(e.target.value); bump('upyun') }}
                  placeholder="操作员用户名"
                  autoComplete="off"
                />
              </Field>
            </div>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="upyun-password">操作员密码</FieldLabel>
              <div className="flex flex-col gap-1.5">
                <Input
                  id="upyun-password"
                  type="password"
                  value={upyunPassword}
                  onChange={(e) => {
                    setUpyunPassword(e.target.value)
                    if (clearUpyunPassword) setClearUpyunPassword(false)
                    bump('upyun')
                  }}
                  placeholder={upyunPasswordSet ? '已保存；留空表示不修改' : '操作员密码'}
                  autoComplete="new-password"
                />
                {upyunPasswordSet && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={clearUpyunPassword}
                    onClick={() => { setUpyunPassword(''); setClearUpyunPassword(true); bump('upyun') }}
                  >
                    清除已保存密码
                  </Button>
                )}
              </div>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="upyun-domain">访问域名</FieldLabel>
                <Input
                  id="upyun-domain"
                  value={upyunDomain}
                  onChange={(e) => { setUpyunDomain(e.target.value); bump('upyun') }}
                  placeholder="如 zhiyuansofts.cn"
                  autoComplete="off"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="upyun-scheme">协议</FieldLabel>
                <Input
                  id="upyun-scheme"
                  value={upyunScheme}
                  onChange={(e) => { setUpyunScheme(e.target.value); bump('upyun') }}
                  placeholder="http 或 https"
                  autoComplete="off"
                />
              </Field>
            </div>
          </FieldGroup>
        </CollapsibleCard>

        <CollapsibleCard
          title="OJ 爬虫账号"
          description="同步用户提交记录"
          footer={<CardSaveButton section="oj" />}
        >
          <FieldGroup className="gap-2">
            {([
              {
                key: 'luogu',
                label: '洛谷',
                user: ojLuoguUsername,
                setUser: setOjLuoguUsername,
                pass: ojLuoguPassword,
                setPass: setOjLuoguPassword,
                passSet: ojLuoguPasswordSet,
                status: ojLuoguStatus,
                statusAt: ojLuoguStatusAt,
                errMsg: ojLuoguErrMsg,
                platform: 'LuoGu' as const,
              },
              {
                key: 'qoj',
                label: 'QOJ',
                user: ojQojUsername,
                setUser: setOjQojUsername,
                pass: ojQojPassword,
                setPass: setOjQojPassword,
                passSet: ojQojPasswordSet,
                status: ojQojStatus,
                statusAt: ojQojStatusAt,
                errMsg: ojQojErrMsg,
                platform: 'QOJ' as const,
              },
            ]).map((oj) => (
              <Collapsible key={oj.key}>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-sm font-medium cursor-pointer">
                    <span
                      className={`inline-block size-2 shrink-0 rounded-full ${
                        oj.status === 'ok'
                          ? 'bg-green-500'
                          : oj.status === 'fail'
                            ? 'bg-red-500'
                            : oj.status === 'loading'
                              ? 'bg-yellow-500 animate-pulse'
                              : 'bg-muted-foreground/30'
                      }`}
                    />
                    {oj.label}
                    {oj.user && (
                      <span className="text-xs text-muted-foreground">({oj.user})</span>
                    )}
                    <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="space-y-2 border-x border-b px-3 py-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field className="gap-1">
                        <FieldLabel htmlFor={`oj-${oj.key}-username`}>用户名</FieldLabel>
                        <Input
                          id={`oj-${oj.key}-username`}
                          value={oj.user}
                          onChange={(e) => {
                            oj.setUser(e.target.value)
                            bump('oj')
                            if (oj.status !== 'unchecked') {
                              if (oj.key === 'luogu') setOjLuoguStatus('unchecked')
                              else setOjQojStatus('unchecked')
                            }
                          }}
                          placeholder={`${oj.label}用户名`}
                          autoComplete="off"
                        />
                      </Field>
                      <Field className="gap-1">
                        <FieldLabel htmlFor={`oj-${oj.key}-password`}>密码</FieldLabel>
                        <div className="flex flex-col gap-1.5">
                          <Input
                            id={`oj-${oj.key}-password`}
                            type="password"
                            value={oj.pass}
                            onChange={(e) => {
                              oj.setPass(e.target.value)
                              if (oj.key === 'luogu' && clearOjLuoguPassword) setClearOjLuoguPassword(false)
                              if (oj.key === 'qoj' && clearOjQojPassword) setClearOjQojPassword(false)
                              bump('oj')
                              if (oj.status !== 'unchecked') {
                                if (oj.key === 'luogu') setOjLuoguStatus('unchecked')
                                else setOjQojStatus('unchecked')
                              }
                            }}
                            placeholder={oj.passSet ? '已保存；留空表示不修改' : `${oj.label}密码`}
                            autoComplete="new-password"
                          />
                          {oj.passSet && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={oj.key === 'luogu' ? clearOjLuoguPassword : clearOjQojPassword}
                              onClick={() => {
                                if (oj.key === 'luogu') { setOjLuoguPassword(''); setClearOjLuoguPassword(true) }
                                else { setOjQojPassword(''); setClearOjQojPassword(true) }
                                bump('oj')
                              }}
                            >
                              清除已保存密码
                            </Button>
                          )}
                        </div>
                      </Field>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={oj.status === 'loading'}
                        onClick={() => void handleVerifyOj(oj.platform)}
                      >
                        {oj.status === 'loading' && <Spinner data-icon="inline-start" />}
                        验证
                      </Button>
                      {oj.status === 'ok' && (
                        <span className="text-xs text-green-600">
                          登录成功
                          {oj.statusAt > 0 ? ` · ${formatTime(oj.statusAt)}` : ''}
                        </span>
                      )}
                      {oj.status === 'fail' && (
                        <span className="text-xs text-destructive" title={oj.errMsg}>
                          验证失败{oj.errMsg ? `：${oj.errMsg.slice(0, 60)}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </FieldGroup>
        </CollapsibleCard>

        <CollapsibleCard
          title="支付FM（在线支付）"
          description="用户赞助：跳转支付FM完成赞助；赞助费用用于维持基本运维与 AI 需求。未配置完整时「赞助支持」入口不展示"
          defaultOpen={!payfmSecretSet}
          footer={<CardSaveButton section="payment" />}
        >
          <FieldGroup className="gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`inline-block size-2 rounded-full ${
                  siteConfig.payfmConfigured
                    ? 'bg-green-500'
                    : payfmApiBase || payfmMerchantNo || payfmSecretSet
                      ? 'bg-amber-500'
                      : 'bg-muted-foreground/30'
                }`}
              />
              支付状态：
              {siteConfig.payfmConfigured
                ? '已配置（赞助入口已开放）'
                : payfmApiBase || payfmMerchantNo || payfmSecretSet
                  ? '未配置完整（接口根地址 + 商户号 + 接入密钥 缺一不可）'
                  : '未配置'}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="payfm-api-base">接口根地址</FieldLabel>
                <Input
                  id="payfm-api-base"
                  value={payfmApiBase}
                  onChange={(e) => { setPayfmApiBase(e.target.value); bump('payment') }}
                  placeholder="https://…（支付FM后台「用户中心-API开发信息」查看）"
                  autoComplete="off"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="payfm-merchant-no">商户号</FieldLabel>
                <Input
                  id="payfm-merchant-no"
                  value={payfmMerchantNo}
                  onChange={(e) => { setPayfmMerchantNo(e.target.value); bump('payment') }}
                  placeholder="支付FM商户号（用户中心查看）"
                  autoComplete="off"
                />
              </Field>
            </div>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="payfm-secret">接入密钥</FieldLabel>
              <div className="flex flex-col gap-1.5">
                <textarea
                  id="payfm-secret"
                  value={payfmSecret}
                  onChange={(e) => {
                    setPayfmSecret(e.target.value)
                    if (clearPayfmSecret) setClearPayfmSecret(false)
                    bump('payment')
                  }}
                  placeholder={payfmSecretSet ? '已保存；留空表示不修改' : '支付FM接入密钥（用户中心查看）'}
                  rows={3}
                  className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full min-w-0 rounded-md border px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                  autoComplete="off"
                />
                {payfmSecretSet && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={clearPayfmSecret}
                    onClick={() => { setPayfmSecret(''); setClearPayfmSecret(true); bump('payment') }}
                  >
                    清除已保存密钥
                  </Button>
                )}
              </div>
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="payfm-pay-type">支付方式（payType）</FieldLabel>
              <Input
                id="payfm-pay-type"
                value={payfmPayType}
                onChange={(e) => { setPayfmPayType(e.target.value); bump('payment') }}
                placeholder="aloop（默认：支付宝轮循池）；可按文档传值，如 alipay / wechat / alipaysign"
                autoComplete="off"
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              密钥加密存储，仅显示脱敏占位；支付回调固定为
              <span className="font-medium text-foreground">
                {payfmNotifyUrl || 'https://algo.zhiyuansofts.cn/v1/payment/notify'}
              </span>
              （在支付FM创建订单时作为 notifyUrl 传入）。接口根地址 + 商户号 + 接入密钥
              三者齐全后，个人资料页才显示「赞助支持」入口。
            </p>
          </FieldGroup>
        </CollapsibleCard>
        </fieldset>

        <CollapsibleCard
          title="自动灾备"
          description="定时创建整实例加密归档"
          footer={<CardSaveButton section="backup" />}
        >
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldLabel className="flex-1" htmlFor="backup-enabled">启用自动灾备</FieldLabel>
              <Switch
                id="backup-enabled"
                checked={backupEnabled}
                disabled={!canWrite}
                onCheckedChange={(checked) => { setBackupEnabled(checked); bump('backup') }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="backup-time">每日执行时间</FieldLabel>
              <Input
                id="backup-time"
                type="time"
                value={backupTime}
                disabled={!canWrite}
                onChange={(event) => { setBackupTime(event.target.value); bump('backup') }}
              />
            </Field>
            <Field data-invalid={!backupPrefix.trim()}>
              <FieldLabel htmlFor="backup-prefix">存储目录</FieldLabel>
              <Input
                id="backup-prefix"
                value={backupPrefix}
                disabled={!canWrite}
                aria-required="true"
                aria-invalid={!backupPrefix.trim()}
                placeholder="如 goalgo/backup"
                onChange={(event) => { setBackupPrefix(event.target.value); bump('backup') }}
              />
              <FieldDescription>
                归档会保存为目录下的 bak_时间.algobak，仅保留最新一份
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CollapsibleCard>

        {canWrite && (
          <div className="sticky bottom-3 z-10 rounded-lg border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {anyDirty ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block size-1.5 rounded-full bg-amber-500" />
                    有未保存的修改
                  </span>
                ) : (
                  <span>全部已保存</span>
                )}
              </div>
              <Button
                type="button"
                disabled={!canWrite || savingSection !== null || saving || !anyDirty}
                onClick={() => void handleSaveAll()}
              >
                {saving ? <Spinner data-icon="inline-start" /> : null}
                保存全部配置
              </Button>
            </div>
          </div>
        )}
      </div>

      </div>
    </PageShell>
  )
}
