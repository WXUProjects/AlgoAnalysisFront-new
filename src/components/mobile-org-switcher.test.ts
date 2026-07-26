import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatOrgSwitchLabel,
  orgRoleShortLabel,
} from '@/components/mobile-org-switcher'
import { OrgRole, OrgRoleLabel } from '@/lib/roles'

describe('formatOrgSwitchLabel', () => {
  it('org_admin → "无锡学院 · 管理"', () => {
    assert.equal(
      formatOrgSwitchLabel('无锡学院', OrgRole.OrgAdmin),
      '无锡学院 · 管理',
    )
  })

  it('coach → org name only (same as sidebar)', () => {
    assert.equal(formatOrgSwitchLabel('无锡学院', OrgRole.Coach), '无锡学院')
  })

  it('captain → org name only', () => {
    assert.equal(formatOrgSwitchLabel('无锡学院', OrgRole.Captain), '无锡学院')
  })

  it('member → org name only', () => {
    assert.equal(formatOrgSwitchLabel('无锡学院', OrgRole.Member), '无锡学院')
  })

  it('null role → org name only', () => {
    assert.equal(formatOrgSwitchLabel('公共域', null), '公共域')
  })
})

describe('orgRoleShortLabel', () => {
  it('returns 管理 for org_admin', () => {
    assert.equal(orgRoleShortLabel(OrgRole.OrgAdmin), '管理')
  })

  it('returns empty for coach/captain/member', () => {
    assert.equal(orgRoleShortLabel(OrgRole.Coach), '')
    assert.equal(orgRoleShortLabel(OrgRole.Captain), '')
    assert.equal(orgRoleShortLabel(OrgRole.Member), '')
    assert.equal(orgRoleShortLabel(null), '')
  })
})

describe('角色全称统一走 roles.ts 常量', () => {
  it('OrgRoleLabel 提供切换器所需的全部中文角色名', () => {
    assert.equal(OrgRoleLabel[OrgRole.Member], '成员')
    assert.equal(OrgRoleLabel[OrgRole.Captain], '队长')
    assert.equal(OrgRoleLabel[OrgRole.Coach], '教练')
    assert.equal(OrgRoleLabel[OrgRole.OrgAdmin], '团队管理员')
  })
})
