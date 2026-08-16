import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { requireProfileResult } from './profile-sync'

describe('requireProfileResult', () => {
  it('returns profile data for a successful response', () => {
    const profile = { id: 1 }

    assert.equal(
      requireProfileResult({ success: true, message: 'ok', data: profile }),
      profile,
    )
  })

  it('throws the API message when profile refresh reports failure', () => {
    assert.throws(
      () => requireProfileResult({ success: false, message: 'profile unavailable', data: null }),
      /profile unavailable/,
    )
  })

  it('throws when a successful response has no profile data', () => {
    assert.throws(
      () => requireProfileResult({ success: true, message: 'ok', data: null }),
      /资料刷新失败/,
    )
  })
})
