import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateDefaultSummary } from './blog-summary.ts'

const sample = `$N$ 最大能到 $10^{500}$，普通的遍历必超时，只能用数位 DP。我们在按位枚举填数时，需要维护状态来判断题目给的三个条件。
条件一是判断 3 的倍数，利用特征只需记录当前各数位之和对 3 的余数（\`rem\`）。
条件二和三涉及具体出现了哪些数字，用一个二进制状态掩码（\`mask\`）来存数字集合最方便。用更多填充文字确保超过默认上限。${'填充'.repeat(80)}`

describe('blog-summary helpers', () => {
  it('generates non-empty default from sample content', () => {
    const got = generateDefaultSummary(sample)
    assert.ok(got.length > 0)
    assert.match(got, /数位 DP/)
  })

  it('strips fenced code from default summary', () => {
    const got = generateDefaultSummary('前言\n```go\nfmt.Println(1)\n```\n后记')
    assert.doesNotMatch(got, /Println/)
    assert.match(got, /前言/)
    assert.match(got, /后记/)
  })

  it('strips markdown syntax but keeps math delimiters for KaTeX cards', () => {
    const got = generateDefaultSummary(
      '# 标题\n---\n- 列表\n见 [文档](https://x.test)\n$N$ 最大',
    )
    assert.match(got, /标题/)
    assert.match(got, /列表/)
    assert.match(got, /文档/)
    assert.match(got, /\$N\$/)
    assert.doesNotMatch(got, /#|---|\[|\]|\(|https:\/\//)
  })
})
