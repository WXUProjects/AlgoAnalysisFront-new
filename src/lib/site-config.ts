import type { SiteConfigSection } from '@shared/api'

export const SECRET_PLACEHOLDER = '••••••••'

export type SecretField = {
  draft: string
  alreadySet: boolean
  clearRequested: boolean
}

export type SecretUpdate = { secret?: string; clear?: boolean }

export function secretUpdate(s: SecretField): SecretUpdate {
  const v = s.draft.trim()
  if (v !== '' && v !== SECRET_PLACEHOLDER) return { secret: v }
  if (s.clearRequested) return { clear: true }
  return {}
}

export type SiteFormState = {
  siteTitle: string
  siteLogo: string
  favicon: string
  footerIcp: string
  inactiveDays: string
  smtpHost: string
  smtpPort: string
  smtpUsername: string
  smtpFrom: string
  adminNotifyEmails: string
  opsNotifyEmails: string
  dataDiskPath: string
  agentEndpoint: string
  agentModel: string
  aiEndpoint: string
  aiModel: string
  upyunBucket: string
  upyunOperator: string
  upyunDomain: string
  upyunScheme: string
  ojLuoguUsername: string
  ojQojUsername: string
  payfmApiBase: string
  payfmMerchantNo: string
  payfmPayType: string
  backupEnabled: boolean
  backupTime: string
  backupPrefix: string
  configVersion: number
} & {
  smtpPassword: SecretField
  agentSecret: SecretField
  aiSecret: SecretField
  upyunPassword: SecretField
  ojLuoguPassword: SecretField
  ojQojPassword: SecretField
  payfmSecret: SecretField
}

export type SingleSection = Exclude<SiteConfigSection, 'all'>

export function buildSectionPayload(
  section: SiteConfigSection,
  s: SiteFormState,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    section,
    expectedConfigVersion: s.configVersion,
  }
  const smtpPw = secretUpdate(s.smtpPassword)
  const agentSec = secretUpdate(s.agentSecret)
  const aiSec = secretUpdate(s.aiSecret)
  const upyunPw = secretUpdate(s.upyunPassword)
  const ojLgPw = secretUpdate(s.ojLuoguPassword)
  const ojQojPw = secretUpdate(s.ojQojPassword)
  const payfmSec = secretUpdate(s.payfmSecret)

  const basic = (): void => {
    out.siteTitle = s.siteTitle.trim()
    out.siteLogo = s.siteLogo.trim()
    out.favicon = s.favicon.trim()
    out.footerIcp = s.footerIcp.trim()
    out.inactiveDays = Math.max(1, Math.min(365, Number(s.inactiveDays) || 14))
    out.setInactiveDays = true
  }
  const email = (): void => {
    out.smtpHost = s.smtpHost.trim()
    out.smtpPort = Number(s.smtpPort) || 465
    out.smtpUsername = s.smtpUsername.trim()
    out.smtpFrom = s.smtpFrom.trim()
    out.adminNotifyEmails = s.adminNotifyEmails.trim()
    out.opsNotifyEmails = s.opsNotifyEmails.trim()
    out.dataDiskPath = s.dataDiskPath.trim()
    if (smtpPw.secret) out.smtpPassword = smtpPw.secret
    if (smtpPw.clear) out.clearSmtpPassword = true
  }
  const ai = (): void => {
    out.agentEndpoint = s.agentEndpoint.trim()
    out.agentModel = s.agentModel.trim()
    out.aiAnalyzeEndpoint = s.aiEndpoint.trim()
    out.aiAnalyzeModel = s.aiModel.trim()
    if (agentSec.secret) out.agentSecret = agentSec.secret
    if (agentSec.clear) out.clearAgentSecret = true
    if (aiSec.secret) out.aiAnalyzeSecret = aiSec.secret
    if (aiSec.clear) out.clearAiAnalyzeSecret = true
  }
  const upyun = (): void => {
    out.upyunBucket = s.upyunBucket.trim()
    out.upyunOperator = s.upyunOperator.trim()
    out.upyunDomain = s.upyunDomain.trim()
    out.upyunScheme = s.upyunScheme.trim() || 'http'
    if (upyunPw.secret) out.upyunPassword = upyunPw.secret
    if (upyunPw.clear) out.clearUpyunPassword = true
  }
  const oj = (): void => {
    out.ojLuoguUsername = s.ojLuoguUsername.trim()
    out.ojQojUsername = s.ojQojUsername.trim()
    if (ojLgPw.secret) out.ojLuoguPassword = ojLgPw.secret
    if (ojLgPw.clear) out.clearOjLuoguPassword = true
    if (ojQojPw.secret) out.ojQojPassword = ojQojPw.secret
    if (ojQojPw.clear) out.clearOjQojPassword = true
  }
  const payment = (): void => {
    out.payfmApiBase = s.payfmApiBase.trim()
    out.payfmMerchantNo = s.payfmMerchantNo.trim()
    out.payfmPayType = s.payfmPayType.trim()
    if (payfmSec.secret) out.payfmSecret = payfmSec.secret
    if (payfmSec.clear) out.clearPayfmSecret = true
  }
  const backup = (): void => {
    out.backupEnabled = s.backupEnabled
    out.backupTime = s.backupTime
    out.backupPrefix = s.backupPrefix.trim().replace(/^\/+|\/+$/g, '')
  }

  if (section === 'all') {
    basic(); email(); ai(); upyun(); oj(); payment(); backup()
    return out
  }
  const fns: Record<SingleSection, () => void> = {
    basic, email, ai, upyun, oj, payment, backup,
  }
  fns[section]()
  return out
}

const AI_FIELDS = [
  'agentEndpoint', 'agentModel', 'aiEndpoint', 'aiModel',
  'agentSecret', 'aiSecret',
] as const

export function sectionDirty(
  section: SingleSection,
  s: SiteFormState,
  base: SiteFormState,
): boolean {
  switch (section) {
    case 'basic':
      return s.siteTitle !== base.siteTitle || s.siteLogo !== base.siteLogo ||
        s.favicon !== base.favicon || s.footerIcp !== base.footerIcp ||
        s.inactiveDays !== base.inactiveDays
    case 'email':
      return s.smtpHost !== base.smtpHost || s.smtpPort !== base.smtpPort ||
        s.smtpUsername !== base.smtpUsername || s.smtpFrom !== base.smtpFrom ||
        s.adminNotifyEmails !== base.adminNotifyEmails ||
        s.opsNotifyEmails !== base.opsNotifyEmails ||
        s.dataDiskPath !== base.dataDiskPath || s.smtpPassword.draft !== base.smtpPassword.draft
    case 'ai':
      return AI_FIELDS.some((f) => (s as unknown as Record<string, unknown>)[f] !== (base as unknown as Record<string, unknown>)[f])
    case 'upyun':
      return s.upyunBucket !== base.upyunBucket || s.upyunOperator !== base.upyunOperator ||
        s.upyunDomain !== base.upyunDomain || s.upyunScheme !== base.upyunScheme ||
        s.upyunPassword.draft !== base.upyunPassword.draft
    case 'oj':
      return s.ojLuoguUsername !== base.ojLuoguUsername ||
        s.ojQojUsername !== base.ojQojUsername ||
        s.ojLuoguPassword.draft !== base.ojLuoguPassword.draft ||
        s.ojQojPassword.draft !== base.ojQojPassword.draft
    case 'payment':
      return s.payfmApiBase !== base.payfmApiBase ||
        s.payfmMerchantNo !== base.payfmMerchantNo ||
        s.payfmPayType !== base.payfmPayType ||
        s.payfmSecret.draft !== base.payfmSecret.draft
    case 'backup':
      return s.backupEnabled !== base.backupEnabled || s.backupTime !== base.backupTime ||
        s.backupPrefix !== base.backupPrefix
    default:
      return false
  }
}
