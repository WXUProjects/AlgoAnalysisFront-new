import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  preprocessObsidianMarkdown,
  stripObsidianFrontmatter,
} from './obsidian-markdown.ts'

describe('stripObsidianFrontmatter', () => {
  it('removes only standard properties at the beginning', () => {
    const source = [
      '---',
      'title: 前缀和与差分',
      'date: 2026-07-27',
      'tags: [前缀和, 差分, LeetCode, Java, 算法模板]',
      'categories: [算法, 模板]',
      'author: sanyinchen',
      '---',
      '# 正文',
    ].join('\n')
    assert.equal(stripObsidianFrontmatter(source), '# 正文')
    assert.equal(
      stripObsidianFrontmatter('title: 这是正文\n下一行'),
      'title: 这是正文\n下一行',
    )
  })
})

describe('preprocessObsidianMarkdown', () => {
  it('normalizes core syntax while protecting inline and fenced code', () => {
    const result = preprocessObsidianMarkdown([
      '---',
      'title: 前缀和与差分',
      '---',
      '[[#矩阵|跳到矩阵]] [[另一篇|别名]] ==重点== %%不公开%%',
      '`%%代码%% ==代码高亮标记== [[代码链接]]`',
      '```md',
      '%%围栏代码%% ==原样== [[原样]]',
      '```',
      '段落 ^matrix-block',
    ].join('\n'))

    assert.doesNotMatch(result.markdown, /title: 前缀和与差分|不公开/)
    assert.match(result.markdown, /\[跳到矩阵\]\(#矩阵\)/)
    assert.match(result.markdown, /别名/)
    assert.match(result.markdown, /<mark>重点<\/mark>/)
    assert.match(result.markdown, /`%%代码%% ==代码高亮标记== \[\[代码链接\]\]`/)
    assert.match(result.markdown, /%%围栏代码%% ==原样== \[\[原样\]\]/)
    assert.match(result.markdown, /class="obsidian-block-anchor" id="block-matrix-block"/)
  })

  it('turns embeds into readable placeholders and keeps current anchors usable', () => {
    const result = preprocessObsidianMarkdown(
      '![[附件.pdf]] ![[另一篇笔记]] [[#^matrix-block|矩阵块]]',
    )
    assert.match(result.markdown, /obsidian-embed/)
    assert.match(result.markdown, /附件：附件\.pdf/)
    assert.match(result.markdown, /引用：另一篇笔记/)
    assert.match(result.markdown, /\[矩阵块\]\(#block-matrix-block\)/)
  })

  it('collects named, multiline and inline footnotes by first reference', () => {
    const result = preprocessObsidianMarkdown(
      '正文[^note] 和 ^[行内说明]，再引用[^note]。\n\n[^note]: 第一行\n  第二行',
    )
    assert.equal(result.footnotes.length, 2)
    assert.deepEqual(
      result.footnotes.map((item) => ({
        index: item.index,
        content: item.content,
        references: item.references,
      })),
      [
        { index: 1, content: '第一行\n第二行', references: 2 },
        { index: 2, content: '行内说明', references: 1 },
      ],
    )
    assert.match(result.markdown, /@@OBSIDIAN_FOOTNOTE_REF_1_1@@/)
    assert.match(result.markdown, /@@OBSIDIAN_FOOTNOTE_REF_1_2@@/)
    assert.match(result.markdown, /@@OBSIDIAN_FOOTNOTE_REF_2_1@@/)
    assert.doesNotMatch(result.markdown, /\[\^note\]:/)
  })

  it('keeps standard tasks and converts custom task states to read-only markers', () => {
    const result = preprocessObsidianMarkdown(
      '- [ ] 未完成\n- [x] 完成\n- [?] 待确认\n- [-] 取消',
    )
    assert.match(result.markdown, /- \[ \] 未完成/)
    assert.match(result.markdown, /- \[x\] 完成/)
    assert.match(result.markdown, /obsidian-task-state/)
    assert.match(result.markdown, />\?</)
    assert.match(result.markdown, />-</)
  })
})
