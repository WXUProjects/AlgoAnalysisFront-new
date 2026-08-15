import assert from 'node:assert/strict'
import test from 'node:test'
import { serializeServiceHandoff } from './service-handoff'

test('serializes completed turns in their original order', () => {
  const content = serializeServiceHandoff([
    { question: '第一条问题', answer: '第一条回答' },
    { question: '第二条问题', answer: '第二条回答' },
  ])

  assert.equal(
    content,
    '用户：第一条问题\nQA：第一条回答\n用户：第二条问题\nQA：第二条回答',
  )
})

test('keeps only the latest 15 turns', () => {
  const turns = Array.from({ length: 16 }, (_, index) => ({
    question: `问题${index + 1}`,
    answer: `回答${index + 1}`,
  }))

  const content = serializeServiceHandoff(turns)

  assert.doesNotMatch(content, /用户：问题1\n/)
  assert.match(content, /^用户：问题2\nQA：回答2/)
  assert.match(content, /用户：问题16\nQA：回答16$/)
})

test('drops the oldest complete turns until content fits', () => {
  const content = serializeServiceHandoff(
    [
      { question: '旧问题', answer: '旧回答' },
      { question: '新问题', answer: '新回答' },
    ],
    15,
    15,
  )

  assert.equal(content, '用户：新问题\nQA：新回答')
})

test('returns empty content when the latest turn cannot fit', () => {
  const content = serializeServiceHandoff(
    [{ question: '问题', answer: '回答太长' }],
    15,
    5,
  )

  assert.equal(content, '')
})

test('excludes incomplete turns before applying the recent window', () => {
  const content = serializeServiceHandoff([
    { question: '完整问题', answer: '完整回答' },
    { question: '只有参考资料', answer: '' },
    { question: '', answer: '无问题' },
  ])

  assert.equal(content, '用户：完整问题\nQA：完整回答')
})
