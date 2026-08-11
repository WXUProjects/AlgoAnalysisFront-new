import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  appointableRoles,
  bottomNavStaffLabel,
  canAccessAdminFromPayload,
  canGrantOrgRole,
  canRemoveOrgRole,
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

describe('appointableRoles', () => {
  it('组织管理员可任命全部五档（含 org_admin）', () => {
    assert.deepEqual(appointableRoles(OrgRole.OrgAdmin), [
      OrgRole.Member,
      OrgRole.Captain,
      OrgRole.GroupLeader,
      OrgRole.Coach,
      OrgRole.OrgAdmin,
    ])
  })

  it('站管可任命全部五档', () => {
    assert.deepEqual(appointableRoles(OrgRole.Member, { isSiteAdmin: true }), [
      OrgRole.Member,
      OrgRole.Captain,
      OrgRole.GroupLeader,
      OrgRole.Coach,
      OrgRole.OrgAdmin,
    ])
  })

  it('教练可任命自己同级及以下（含教练）', () => {
    assert.deepEqual(appointableRoles(OrgRole.Coach), [
      OrgRole.Member,
      OrgRole.Captain,
      OrgRole.GroupLeader,
      OrgRole.Coach,
    ])
  })

  it('组长可任命自己同级及以下（含组长）', () => {
    assert.deepEqual(appointableRoles(OrgRole.GroupLeader), [
      OrgRole.Member,
      OrgRole.Captain,
      OrgRole.GroupLeader,
    ])
  })

  it('队长及以下无任命权', () => {
    assert.deepEqual(appointableRoles(OrgRole.Captain), [])
    assert.deepEqual(appointableRoles(OrgRole.Member), [])
  })
})

describe('canGrantOrgRole（同级别不可降，高可动低，不可动更高）', () => {
  it('组织管理员统一受限：不可降同级组织管理员', () => {
    assert.equal(
      canGrantOrgRole(OrgRole.OrgAdmin, OrgRole.OrgAdmin, OrgRole.Member),
      false,
    )
    assert.equal(
      canGrantOrgRole(OrgRole.OrgAdmin, OrgRole.Member, OrgRole.OrgAdmin),
      true,
    )
    assert.equal(
      canGrantOrgRole(OrgRole.OrgAdmin, OrgRole.Member, OrgRole.Coach),
      true,
    )
  })

  it('教练可动低级别（提/降），不可降同级教练，不可动组织管理员', () => {
    assert.equal(
      canGrantOrgRole(OrgRole.Coach, OrgRole.Member, OrgRole.Coach),
      true,
    )
    assert.equal(
      canGrantOrgRole(OrgRole.Coach, OrgRole.Member, OrgRole.GroupLeader),
      true,
    )
    assert.equal(
      canGrantOrgRole(OrgRole.Coach, OrgRole.GroupLeader, OrgRole.Member),
      true,
    )
    assert.equal(
      canGrantOrgRole(OrgRole.Coach, OrgRole.Coach, OrgRole.Member),
      false,
    )
    assert.equal(
      canGrantOrgRole(OrgRole.Coach, OrgRole.OrgAdmin, OrgRole.Member),
      false,
    )
    assert.equal(
      canGrantOrgRole(OrgRole.Coach, OrgRole.Member, OrgRole.OrgAdmin),
      false,
    )
  })

  it('组长可动队长/成员，不可降同级组长', () => {
    assert.equal(
      canGrantOrgRole(OrgRole.GroupLeader, OrgRole.Member, OrgRole.GroupLeader),
      true,
    )
    assert.equal(
      canGrantOrgRole(OrgRole.GroupLeader, OrgRole.Captain, OrgRole.Member),
      true,
    )
    assert.equal(
      canGrantOrgRole(OrgRole.GroupLeader, OrgRole.GroupLeader, OrgRole.Member),
      false,
    )
  })

  it('站管可任命全部', () => {
    assert.equal(
      canGrantOrgRole(OrgRole.Member, OrgRole.Member, OrgRole.OrgAdmin, {
        isSiteAdmin: true,
      }),
      true,
    )
  })
})

describe('canRemoveOrgRole（只能移除严格低于自己，站管除外）', () => {
  it('组织管理员不能移除同级组织管理员', () => {
    assert.equal(canRemoveOrgRole(OrgRole.OrgAdmin, OrgRole.OrgAdmin), false)
    assert.equal(canRemoveOrgRole(OrgRole.OrgAdmin, OrgRole.Coach), true)
  })

  it('教练不能移除教练/更高，可移除更低', () => {
    assert.equal(canRemoveOrgRole(OrgRole.Coach, OrgRole.Coach), false)
    assert.equal(canRemoveOrgRole(OrgRole.Coach, OrgRole.OrgAdmin), false)
    assert.equal(canRemoveOrgRole(OrgRole.Coach, OrgRole.Member), true)
  })

  it('站管可移除任何人', () => {
    assert.equal(
      canRemoveOrgRole(OrgRole.Member, OrgRole.OrgAdmin, { isSiteAdmin: true }),
      true,
    )
  })
})
