import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatOrgSwitchLabel,
  buildOrgTriggerText,
  orgRoleShortLabel,
  orgRoleFullName,
  siteAdminRoleName,
} from '@/components/mobile-org-switcher'

describe('formatOrgSwitchLabel', () => {
  it('org_admin → "无锡学院 · 管理"', () => {
    assert.equal(formatOrgSwitchLabel('无锡学院', 'org_admin'), '无锡学院 · 管理')
  })

  it('coach → org name only (same as sidebar)', () => {
    assert.equal(formatOrgSwitchLabel('无锡学院', 'coach'), '无锡学院')
  })

  it('captain → org name only', () => {
    assert.equal(formatOrgSwitchLabel('无锡学院', 'captain'), '无锡学院')
  })

  it('member → org name only', () => {
    assert.equal(formatOrgSwitchLabel('无锡学院', 'member'), '无锡学院')
  })

  it('null role → org name only', () => {
    assert.equal(formatOrgSwitchLabel('公共域', null), '公共域')
  })
})

describe('buildOrgTriggerText (compat)', () => {
  it('matches formatOrgSwitchLabel; ignores isSiteAdmin', () => {
    assert.equal(buildOrgTriggerText('无锡学院', 'org_admin', true), '无锡学院 · 管理')
    assert.equal(buildOrgTriggerText('公共域', 'member', true), '公共域')
    assert.equal(buildOrgTriggerText('无锡学院', 'coach', false), '无锡学院')
  })
})

describe('orgRoleShortLabel', () => {
  it('returns 管理 for org_admin', () => {
    assert.equal(orgRoleShortLabel('org_admin'), '管理')
  })

  it('returns empty for coach/captain/member', () => {
    assert.equal(orgRoleShortLabel('coach'), '')
    assert.equal(orgRoleShortLabel('captain'), '')
    assert.equal(orgRoleShortLabel('member'), '')
    assert.equal(orgRoleShortLabel(null), '')
  })
})

describe('orgRoleFullName', () => {
  it('maps known roles', () => {
    assert.equal(orgRoleFullName(null), '成员')
    assert.equal(orgRoleFullName('org_admin'), '团队管理员')
    assert.equal(orgRoleFullName('coach'), '教练')
    assert.equal(orgRoleFullName('captain'), '队长')
  })
})

describe('siteAdminRoleName', () => {
  it('returns 站点管理员', () => {
    assert.equal(siteAdminRoleName(), '站点管理员')
  })
})
