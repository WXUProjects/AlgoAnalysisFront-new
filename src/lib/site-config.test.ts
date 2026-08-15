import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  secretUpdate,
  buildSectionPayload,
  sectionDirty,
  type SecretField,
} from './site-config'

function sec(draft: string, alreadySet = false, clearRequested = false): SecretField {
  return { draft, alreadySet, clearRequested }
}

/** 全量 Secret 字段默认空（未设置） */
function allSecs(overrides: Partial<Record<'smtpPassword' | 'agentSecret' | 'aiSecret' | 'upyunPassword' | 'ojLuoguPassword' | 'ojQojPassword' | 'payfmSecret', SecretField>> = {}) {
  const empty = sec('')
  return {
    smtpPassword: empty,
    agentSecret: empty,
    aiSecret: empty,
    upyunPassword: empty,
    ojLuoguPassword: empty,
    ojQojPassword: empty,
    payfmSecret: empty,
    ...overrides,
  }
}

/** 全量标量字段默认空串 */
function allScalars(overrides: Record<string, unknown> = {}) {
  const base: Record<string, string | number> = {
    siteTitle: '', siteLogo: '', favicon: '', footerIcp: '', inactiveDays: '14',
    smtpHost: '', smtpPort: '465', smtpUsername: '', smtpFrom: '',
    adminNotifyEmails: '', opsNotifyEmails: '', dataDiskPath: '',
    agentEndpoint: '', agentModel: '', aiEndpoint: '', aiModel: '',
    upyunBucket: '', upyunOperator: '', upyunDomain: '', upyunScheme: 'http',
    ojLuoguUsername: '', ojQojUsername: '',
    payfmApiBase: '', payfmMerchantNo: '', payfmPayType: '',
    configVersion: 0,
  }
  return { ...base, ...overrides }
}

test('secretUpdate 留空且未请求清除时不修改', () => {
  const r = secretUpdate(sec('', true))
  assert.deepEqual(r, {})
})

test('secretUpdate 留空但请求清除时发送 clear', () => {
  const r = secretUpdate(sec('', true, true))
  assert.deepEqual(r, { clear: true })
})

test('secretUpdate 输入新密钥发送 secret 并取消 clear', () => {
  const r = secretUpdate(sec('new-key', true, true))
  assert.deepEqual(r, { secret: 'new-key' })
})

test('secretUpdate 掩码视为不修改', () => {
  const r = secretUpdate(sec('••••••••', true))
  assert.deepEqual(r, {})
})

test('buildSectionPayload ai 只含 agent+ai 字段', () => {
  const p = buildSectionPayload('ai', {
    ...allScalars({
      agentEndpoint: 'https://api.openai.com/v1',
      agentModel: 'gpt-4.1-mini',
      aiEndpoint: 'https://x.com/v1',
      aiModel: 'm',
      smtpHost: 'smtp.example.com',
      configVersion: 3,
    }),
    agentSecret: sec('', true),
    aiSecret: sec(''),
    ...allSecs(),
  } as any)
  assert.equal(p.section, 'ai')
  assert.equal(p.agentEndpoint, 'https://api.openai.com/v1')
  assert.equal(p.expectedConfigVersion, 3)
  assert.equal('smtpHost' in p, false)
  assert.equal('siteTitle' in p, false)
})

test('buildSectionPayload all 含全部字段', () => {
  const p = buildSectionPayload('all', {
    ...allScalars({
      siteTitle: 'GoAlgo',
      smtpHost: 'smtp.example.com',
      agentEndpoint: 'https://a/v1',
    }),
    ...allSecs(),
  } as any)
  assert.equal(p.section, 'all')
  assert.equal(p.siteTitle, 'GoAlgo')
  assert.equal(p.smtpHost, 'smtp.example.com')
  assert.equal(p.agentEndpoint, 'https://a/v1')
})

test('buildSectionPayload ai 含显式清除 agentSecret', () => {
  const p = buildSectionPayload('ai', {
    ...allSecs({ agentSecret: sec('', true, true) }),
    aiSecret: sec(''),
    ...allScalars({
      agentEndpoint: 'https://a/v1',
      agentModel: 'm',
      configVersion: 1,
    }),
  } as any)
  assert.equal(p.clearAgentSecret, true)
  assert.equal('agentSecret' in p, false)
})

test('sectionDirty ai 检测 endpoint 变化', () => {
  const base: any = { agentEndpoint: 'https://a/v1' }
  const cur: any = { agentEndpoint: 'https://b/v1' }
  assert.equal(sectionDirty('ai', cur, base), true)
  assert.equal(sectionDirty('ai', base, base), false)
})
