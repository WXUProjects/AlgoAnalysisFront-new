import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { bottomNavStaffLabel, OrgRole } from '@/lib/roles'

describe('bottomNavStaffLabel', () => {
  it('returns 站点管理 for site admin (isSiteAdmin)', () => {
    assert.equal(bottomNavStaffLabel({ isSiteAdmin: true }), '站点管理')
  })

  it('returns 站点管理 for site admin (roleId===1)', () => {
    assert.equal(bottomNavStaffLabel({ roleId: 1 }), '站点管理')
  })

  it('returns 站点管理 when isSiteAdmin + orgRole=org_admin (site admin priority)', () => {
    assert.equal(
      bottomNavStaffLabel({ isSiteAdmin: true, orgRole: OrgRole.OrgAdmin }),
      '站点管理',
    )
  })

  it('returns 组织管理 for org_admin (not site admin)', () => {
    assert.equal(bottomNavStaffLabel({ orgRole: OrgRole.OrgAdmin }), '组织管理')
  })

  it('returns 教练管理 for coach', () => {
    assert.equal(bottomNavStaffLabel({ orgRole: OrgRole.Coach }), '教练管理')
  })

  it('returns 队长管理 for captain', () => {
    assert.equal(bottomNavStaffLabel({ orgRole: OrgRole.Captain }), '队长管理')
  })

  it('returns 管理 for null/undefined', () => {
    assert.equal(bottomNavStaffLabel(null), '管理')
    assert.equal(bottomNavStaffLabel(undefined), '管理')
    assert.equal(bottomNavStaffLabel({}), '管理')
  })

  it('returns 管理 for plain member', () => {
    assert.equal(bottomNavStaffLabel({ orgRole: OrgRole.Member }), '管理')
  })
})
