import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isMobileNavRoot, resolveParentPath } from '@/lib/nav-back'

describe('nav-back', () => {
  it('marks main tabs as root', () => {
    assert.equal(isMobileNavRoot('/'), true)
    assert.equal(isMobileNavRoot('/discover'), true)
    assert.equal(isMobileNavRoot('/contest'), true)
    assert.equal(isMobileNavRoot('/admin'), true)
    assert.equal(isMobileNavRoot('/profile'), true)
  })

  it('nested pages are not root', () => {
    assert.equal(isMobileNavRoot('/contest/12'), false)
    assert.equal(isMobileNavRoot('/question-bank/detail/1'), false)
    assert.equal(isMobileNavRoot('/admin/user'), false)
    assert.equal(isMobileNavRoot('/profile/alice'), false)
  })

  it('resolves logical parents', () => {
    assert.equal(resolveParentPath('/contest/99'), '/contest')
    assert.equal(resolveParentPath('/question-bank/detail/3'), '/question-bank')
    assert.equal(
      resolveParentPath('/question-bank/detail/3/solution/9'),
      '/question-bank/detail/3',
    )
    assert.equal(resolveParentPath('/admin/org'), '/admin')
    assert.equal(resolveParentPath('/tools/paste'), '/tools')
    assert.equal(resolveParentPath('/change-profile'), '/profile')
    assert.equal(resolveParentPath('/blog/alice/hello'), '/blog/alice')
    assert.equal(resolveParentPath('/blog/alice'), '/blog-plaza')
  })
})
