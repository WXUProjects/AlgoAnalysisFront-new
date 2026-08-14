import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { avatarOutputSize } from './avatar-crop-dialog'

describe('avatarOutputSize', () => {
  it('keeps a landscape crop ratio within the longest-edge limit', () => {
    assert.deepEqual(avatarOutputSize({ width: 1600, height: 900 }), {
      width: 512,
      height: 288,
    })
  })

  it('keeps a portrait crop ratio within the longest-edge limit', () => {
    assert.deepEqual(avatarOutputSize({ width: 900, height: 1600 }), {
      width: 288,
      height: 512,
    })
  })

  it('keeps square crops square', () => {
    assert.deepEqual(avatarOutputSize({ width: 500, height: 500 }), {
      width: 512,
      height: 512,
    })
  })
})
