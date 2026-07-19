import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildDomainSharePath,
  findOrgByDomainHint,
  normalizeDomainHint,
} from '@/lib/domain-hint'

describe('domain-hint', () => {
  it('normalize trims', () => {
    assert.equal(normalizeDomainHint('  public  '), 'public')
  })

  it('finds by slug case-insensitive', () => {
    const list = [
      { id: 1, slug: 'public' },
      { id: 11, slug: 'org-91216c871527' },
    ]
    assert.equal(findOrgByDomainHint(list, 'PUBLIC')?.id, 1)
    assert.equal(findOrgByDomainHint(list, 'org-91216c871527')?.id, 11)
  })

  it('finds by numeric id', () => {
    const list = [
      { id: 1, slug: 'public' },
      { id: 11, slug: 'org-x' },
    ]
    assert.equal(findOrgByDomainHint(list, '11')?.id, 11)
    assert.equal(findOrgByDomainHint(list, '99'), undefined)
  })

  it('non-member hint returns undefined', () => {
    const list = [{ id: 1, slug: 'public' }]
    assert.equal(findOrgByDomainHint(list, 'other-team'), undefined)
  })

  it('buildDomainSharePath encodes domain', () => {
    assert.equal(buildDomainSharePath('public'), '/?domain=public')
    assert.equal(
      buildDomainSharePath('org-91216c871527'),
      '/?domain=org-91216c871527',
    )
  })
})
