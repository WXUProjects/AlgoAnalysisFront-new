import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  GUEST_HOME_PATH,
  MEMBER_HOME_PATH,
  getHomePath,
} from '@/lib/home-path'

describe('getHomePath', () => {
  it('sends guests to /about (no flash via /)', () => {
    assert.equal(getHomePath(false), GUEST_HOME_PATH)
    assert.equal(getHomePath(false), '/about')
  })

  it('sends logged-in members to /', () => {
    assert.equal(getHomePath(true), MEMBER_HOME_PATH)
    assert.equal(getHomePath(true), '/')
  })
})
