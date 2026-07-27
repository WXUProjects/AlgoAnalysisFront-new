import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  bottomNavStaffLabel,
  canAccessAdminFromPayload,
  isSiteAdminFromPayload,
  OrgRole,
  orgRoleName,
  staffKindFromPayload,
  staffNavLabel,
  STAFF_NAV_FALLBACK_LABEL,
} from '@/lib/roles'

describe('staffKindFromPayload（有序规则表）', () => {
  it('站点管理员（isSiteAdmin）→ siteAdmin', () => {
    assert.equal(staffKindFromPayload({ isSiteAdmin: true }), 'siteAdmin')
  })

  it('旧 token roleId===1 → siteAdmin（兼容）', () => {
    assert.equal(staffKindFromPayload({ roleId: 1 }), 'siteAdmin')
  })

  it('站管优先于组织角色', () => {
    assert.equal(
      staffKindFromPayload({ isSiteAdmin: true, orgRole: OrgRole.OrgAdmin }),
      'siteAdmin',
    )
  })

  it('资源审核员已下线 → 不再是内置身份', () => {
    assert.equal(staffKindFromPayload({ orgRole: OrgRole.Member }), null)
  })

  it('组织角色逐级判定', () => {
    assert.equal(staffKindFromPayload({ orgRole: OrgRole.OrgAdmin }), 'orgAdmin')
    assert.equal(staffKindFromPayload({ orgRole: OrgRole.Coach }), 'coach')
    assert.equal(
      staffKindFromPayload({ orgRole: OrgRole.GroupLeader }),
      'groupLeader',
    )
    assert.equal(staffKindFromPayload({ orgRole: OrgRole.Captain }), 'captain')
  })

  it('无内置角色（成员 / 空 payload / 自定义角色）→ null', () => {
    assert.equal(staffKindFromPayload({ orgRole: OrgRole.Member }), null)
    assert.equal(staffKindFromPayload({}), null)
    assert.equal(staffKindFromPayload(null), null)
    assert.equal(staffKindFromPayload(undefined), null)
  })
})

describe('staffNavLabel（侧栏）', () => {
  it('站点管理员 → 站点管理', () => {
    assert.equal(staffNavLabel({ isSiteAdmin: true }), '站点管理')
    assert.equal(staffNavLabel({ roleId: 1 }), '站点管理')
  })

  it('组织管理员 → 团队管理（侧栏专属文案）', () => {
    assert.equal(staffNavLabel({ orgRole: OrgRole.OrgAdmin }), '团队管理')
  })

  it('教练 / 组长 / 队长', () => {
    assert.equal(staffNavLabel({ orgRole: OrgRole.Coach }), '教练管理')
    assert.equal(staffNavLabel({ orgRole: OrgRole.GroupLeader }), '组长管理')
    assert.equal(staffNavLabel({ orgRole: OrgRole.Captain }), '队长管理')
  })

  it('无内置角色（自定义角色仅有权限）→ 管理中心', () => {
    assert.equal(staffNavLabel({ orgRole: OrgRole.Member }), '管理中心')
    assert.equal(staffNavLabel({}), '管理中心')
    assert.equal(staffNavLabel(null), '管理中心')
    assert.equal(STAFF_NAV_FALLBACK_LABEL, '管理中心')
  })
})

describe('bottomNavStaffLabel（底栏）', () => {
  it('站点管理员 → 站点管理（含旧 token roleId===1）', () => {
    assert.equal(bottomNavStaffLabel({ isSiteAdmin: true }), '站点管理')
    assert.equal(bottomNavStaffLabel({ roleId: 1 }), '站点管理')
  })

  it('站管 + org_admin → 站点管理（站管优先）', () => {
    assert.equal(
      bottomNavStaffLabel({ isSiteAdmin: true, orgRole: OrgRole.OrgAdmin }),
      '站点管理',
    )
  })

  it('团队管理员 → 组织管理（底栏专属文案，与侧栏不同）', () => {
    assert.equal(bottomNavStaffLabel({ orgRole: OrgRole.OrgAdmin }), '组织管理')
  })

  it('教练 / 队长（与侧栏一致）', () => {
    assert.equal(bottomNavStaffLabel({ orgRole: OrgRole.Coach }), '教练管理')
    assert.equal(bottomNavStaffLabel({ orgRole: OrgRole.Captain }), '队长管理')
  })

  it('无内置角色 → 管理中心', () => {
    assert.equal(bottomNavStaffLabel(null), '管理中心')
    assert.equal(bottomNavStaffLabel(undefined), '管理中心')
    assert.equal(bottomNavStaffLabel({}), '管理中心')
    assert.equal(bottomNavStaffLabel({ orgRole: OrgRole.Member }), '管理中心')
  })
})

describe('isSiteAdminFromPayload（旧 token 兼容）', () => {
  it('isSiteAdmin 或 roleId===1 均视为站管', () => {
    assert.equal(isSiteAdminFromPayload({ isSiteAdmin: true }), true)
    assert.equal(isSiteAdminFromPayload({ roleId: 1 }), true)
    assert.equal(isSiteAdminFromPayload({ roleId: 2 }), false)
    assert.equal(isSiteAdminFromPayload({}), false)
    assert.equal(isSiteAdminFromPayload(null), false)
  })
})

describe('canAccessAdminFromPayload', () => {
  it('组织 staff / 站管可进管理端', () => {
    assert.equal(canAccessAdminFromPayload({ isSiteAdmin: true }), true)
    assert.equal(canAccessAdminFromPayload({ orgRole: OrgRole.Coach }), true)
    assert.equal(canAccessAdminFromPayload({ orgRole: OrgRole.Captain }), true)
    assert.equal(canAccessAdminFromPayload({ orgRole: OrgRole.OrgAdmin }), true)
  })

  it('普通成员 / 未登录不可进', () => {
    assert.equal(canAccessAdminFromPayload({ orgRole: OrgRole.Member }), false)
    assert.equal(canAccessAdminFromPayload({}), false)
    assert.equal(canAccessAdminFromPayload(null), false)
  })
})

describe('orgRoleName', () => {
  it('已知角色映射为中文名，未知回退原值', () => {
    assert.equal(orgRoleName(OrgRole.Member), '成员')
    assert.equal(orgRoleName(OrgRole.Captain), '队长')
    assert.equal(orgRoleName(OrgRole.GroupLeader), '组长')
    assert.equal(orgRoleName(OrgRole.Coach), '教练')
    assert.equal(orgRoleName(OrgRole.OrgAdmin), '组织管理员')
    assert.equal(orgRoleName(null), '成员')
    assert.equal(orgRoleName('custom_x'), 'custom_x')
  })
})
