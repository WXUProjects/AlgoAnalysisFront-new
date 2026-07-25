import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getSubmitLink, normalizeSubmitId } from './link'

describe('normalizeSubmitId', () => {
  it('strips LuoGu: platform prefix', () => {
    assert.equal(normalizeSubmitId('LuoGu', 'LuoGu:286690434'), '286690434')
  })
  it('keeps plain ids', () => {
    assert.equal(normalizeSubmitId('LuoGu', '286690434'), '286690434')
  })
  it('keeps leetcode synthetic ids', () => {
    assert.equal(normalizeSubmitId('LeetCode', 'lc-prob-1'), 'lc-prob-1')
  })
})

describe('getSubmitLink', () => {
  it('builds luogu record without platform prefix', () => {
    assert.equal(
      getSubmitLink('LuoGu', '', 'LuoGu:286690434'),
      'https://www.luogu.com.cn/record/286690434',
    )
  })
  it('builds plain luogu record', () => {
    assert.equal(
      getSubmitLink('LuoGu', '', '286690434'),
      'https://www.luogu.com.cn/record/286690434',
    )
  })
})
