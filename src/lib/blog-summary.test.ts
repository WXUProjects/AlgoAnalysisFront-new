import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  generateDefaultSummary,
  isDefaultSummary,
  resolveSummaryForSave,
} from './blog-summary.ts'

const sample = `$N$ 最大能到 $10^{500}$，普通的遍历必超时，只能用数位 DP。我们在按位枚举填数时，需要维护状态来判断题目给的三个条件。
条件一是判断 3 的倍数，利用特征只需记录当前各数位之和对 3 的余数（\`rem\`）。
条件二和三涉及具体出现了哪些数字，用一个二进制状态掩码（\`mask\`）来存数字集合最方便。用更多填充文字确保超过默认上限。${'填充'.repeat(80)}`

describe('blog-summary helpers', () => {
  it('generates non-empty default from sample content', () => {
    const got = generateDefaultSummary(sample)
    assert.ok(got.length > 0)
    assert.match(got, /数位 DP/)
  })

  it('isDefault true for generated / empty, false for custom', () => {
    const content = '普通的遍历必超时，只能用数位 DP。'
    const def = generateDefaultSummary(content)
    assert.equal(isDefaultSummary(def, content), true)
    assert.equal(isDefaultSummary('', content), true)
    assert.equal(isDefaultSummary('我手写的摘要', content), false)
  })

  it('edit load: empty field when default; save empty regenerates', () => {
    const content = '只能用数位 DP 维护 rem 与 mask。'
    const def = generateDefaultSummary(content)
    // editor: do not backfill default
    const editorField = isDefaultSummary(def, content) ? '' : def
    assert.equal(editorField, '')
    // save with empty → regenerate
    assert.equal(resolveSummaryForSave(editorField, content), def)
    assert.equal(resolveSummaryForSave('自定义', content), '自定义')
  })

  it('strips fenced code from default summary', () => {
    const got = generateDefaultSummary('前言\n```go\nfmt.Println(1)\n```\n后记')
    assert.doesNotMatch(got, /Println/)
    assert.match(got, /前言/)
    assert.match(got, /后记/)
  })
})
