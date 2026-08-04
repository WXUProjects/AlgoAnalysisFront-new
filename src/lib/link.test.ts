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
  it('keeps loj and uoj prefixed ids', () => {
    assert.equal(normalizeSubmitId('LOJ', 'loj-1041663'), 'loj-1041663')
    assert.equal(normalizeSubmitId('UOJ', 'uoj-ac-1-42'), 'uoj-ac-1-42')
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
  it('builds loj submission link', () => {
    assert.equal(getSubmitLink('LOJ', '', 'loj-1041663'), 'https://loj.ac/s/1041663')
  })
  it('builds uoj problem link from synthetic ac id', () => {
    assert.equal(
      getSubmitLink('UOJ', '', 'uoj-ac-42-1'),
      'https://uoj.ac/problem/1',
    )
  })
  it('builds poj showsource link', () => {
    assert.equal(
      getSubmitLink('POJ', '', '25194151'),
      'http://poj.org/showsource?solution_id=25194151',
    )
  })
})
