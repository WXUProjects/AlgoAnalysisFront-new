export type ObsidianFootnote = {
  id: string
  index: number
  content: string
  references: number
}

export type ObsidianMarkdownResult = {
  markdown: string
  footnotes: ObsidianFootnote[]
}

const LEADING_FRONTMATTER = /^\uFEFF?---[\t ]*\r?\n[\s\S]*?\r?\n---[\t ]*(?:\r?\n|$)/

export function stripObsidianFrontmatter(markdown: string): string {
  return (markdown ?? '').replace(LEADING_FRONTMATTER, '')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeMarkdownText(value: string): string {
  return value.replace(/([\\`*_[\]<>])/g, '\\$1')
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  return slug || 'section'
}

type Fence = { marker: '`' | '~'; length: number } | null

function fenceAt(line: string): { marker: '`' | '~'; length: number } | null {
  const match = /^\s*(`{3,}|~{3,})/.exec(line)
  if (!match) return null
  const run = match[1]
  return {
    marker: run[0] as '`' | '~',
    length: run.length,
  }
}

function isFenceClose(line: string, fence: NonNullable<Fence>): boolean {
  const trimmed = line.trimStart()
  const expression = new RegExp(`^\\${fence.marker}{${fence.length},}\\s*$`)
  return expression.test(trimmed)
}

function mapOutsideFences(
  source: string,
  transform: (line: string) => string,
): string {
  const lines = source.split('\n')
  let fence: Fence = null
  return lines
    .map((line) => {
      if (fence) {
        if (isFenceClose(line, fence)) fence = null
        return line
      }
      const nextFence = fenceAt(line)
      if (nextFence) {
        fence = nextFence
        return line
      }
      return transform(line)
    })
    .join('\n')
}

function protectInlineCode(
  line: string,
  transform: (text: string) => string,
): string {
  const snippets: string[] = []
  const protectedLine = line.replace(/(`+)([^`]*?)\1/g, (raw) => {
    const index = snippets.push(raw) - 1
    return `\uE000${index}\uE001`
  })
  return transform(protectedLine).replace(/\uE000(\d+)\uE001/g, (_, index: string) => {
    return snippets[Number(index)] ?? ''
  })
}

function stripComments(source: string): string {
  let inComment = false
  return mapOutsideFences(source, (line) => {
    return protectInlineCode(line, (text) => {
      let cursor = 0
      let output = ''
      while (cursor < text.length) {
        const marker = text.indexOf('%%', cursor)
        if (marker < 0) {
          if (!inComment) output += text.slice(cursor)
          break
        }
        if (!inComment) output += text.slice(cursor, marker)
        inComment = !inComment
        cursor = marker + 2
      }
      return output
    })
  })
}

function extractFootnoteDefinitions(source: string): {
  markdown: string
  definitions: Map<string, string>
} {
  const lines = source.split('\n')
  const output: string[] = []
  const definitions = new Map<string, string>()
  let fence: Fence = null

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (fence) {
      output.push(line)
      if (isFenceClose(line, fence)) fence = null
      continue
    }
    const nextFence = fenceAt(line)
    if (nextFence) {
      fence = nextFence
      output.push(line)
      continue
    }

    const definition = /^\[\^([^\]]+)\]:[\t ]*(.*)$/.exec(line)
    if (!definition) {
      output.push(line)
      continue
    }

    const content = [definition[2]]
    let next = index + 1
    while (next < lines.length) {
      const continuation = /^(?: {2,}|\t)(.*)$/.exec(lines[next])
      if (continuation) {
        content.push(continuation[1])
        next++
        continue
      }
      if (
        lines[next].trim() === '' &&
        next + 1 < lines.length &&
        /^(?: {2,}|\t)/.test(lines[next + 1])
      ) {
        content.push('')
        next++
        continue
      }
      break
    }
    definitions.set(definition[1], content.join('\n').trim())
    output.push('')
    index = next - 1
  }

  return { markdown: output.join('\n'), definitions }
}

function splitWikiValue(raw: string): { target: string; display: string } {
  const parts = raw.split(/(?<!\\)\|/).map((part) =>
    part.replace(/\\\|/g, '|').trim(),
  )
  const target = parts[0] || ''
  let display = parts.length > 1 ? parts.slice(1).join('|') : target
  if (/^\d+(?:x\d+)?$/i.test(display)) display = target
  return { target, display: display || target }
}

function embedKind(target: string): '图片' | '附件' | '引用' {
  const clean = target.split('#')[0].toLocaleLowerCase()
  if (/\.(?:avif|gif|jpe?g|png|svg|webp|bmp)$/.test(clean)) return '图片'
  if (/\.[a-z0-9]{1,8}$/.test(clean)) return '附件'
  return '引用'
}

function renderEmbed(raw: string): string {
  const { target, display } = splitWikiValue(raw)
  const kind = embedKind(target)
  const label = `${kind}：${display}`
  return `<span class="obsidian-embed obsidian-embed-${kind === '图片' ? 'image' : kind === '附件' ? 'file' : 'note'}" aria-label="${escapeHtml(label)}">${escapeHtml(label)}</span>`
}

function renderWikiLink(raw: string): string {
  const { target, display } = splitWikiValue(raw)
  if (target.startsWith('#^')) {
    return `[${escapeMarkdownText(display)}](#block-${slugify(target.slice(2))})`
  }
  if (target.startsWith('#')) {
    return `[${escapeMarkdownText(display)}](#${slugify(target.replace(/^#+/, ''))})`
  }
  return escapeMarkdownText(display)
}

export function preprocessObsidianMarkdown(markdown: string): ObsidianMarkdownResult {
  const withoutFrontmatter = stripObsidianFrontmatter(markdown).replace(/\r\n/g, '\n')
  const withoutComments = stripComments(withoutFrontmatter)
  const extracted = extractFootnoteDefinitions(withoutComments)
  const footnotes: ObsidianFootnote[] = []
  const byId = new Map<string, ObsidianFootnote>()
  let inlineIndex = 0

  const reference = (id: string, content: string | undefined): string | null => {
    if (content == null) return null
    let item = byId.get(id)
    if (!item) {
      item = {
        id,
        index: footnotes.length + 1,
        content,
        references: 0,
      }
      byId.set(id, item)
      footnotes.push(item)
    }
    item.references++
    return `@@OBSIDIAN_FOOTNOTE_REF_${item.index}_${item.references}@@`
  }

  const transformed = mapOutsideFences(extracted.markdown, (line) => {
    return protectInlineCode(line, (text) => {
      let result = text
      result = result.replace(
        /\^\[([^\]\n]+)\]|\[\^([^\]]+)\]/g,
        (raw, inlineContent: string | undefined, namedId: string | undefined) => {
          if (inlineContent != null) {
            const id = `inline-${++inlineIndex}`
            return reference(id, inlineContent.trim()) ?? ''
          }
          if (namedId != null) {
            return reference(namedId, extracted.definitions.get(namedId)) ?? raw
          }
          return raw
        },
      )
      result = result.replace(/!\[\[([^\]]+)\]\]/g, (_, value: string) => {
        return renderEmbed(value)
      })
      result = result.replace(/\[\[([^\]]+)\]\]/g, (_, value: string) => {
        return renderWikiLink(value)
      })
      result = result.replace(/==([^=\n]+)==/g, (_, value: string) => {
        return `<mark>${escapeHtml(value)}</mark>`
      })
      result = result.replace(
        /(?:^|\s)\^([A-Za-z0-9-]+)\s*$/,
        (_, id: string) =>
          ` <span class="obsidian-block-anchor" id="block-${slugify(id)}"></span>`,
      )
      result = result.replace(
        /^(\s*[-*+]\s+)\[([^\] xX])\]\s+/,
        (_, prefix: string, state: string) =>
          `${prefix}<span class="obsidian-task-state" aria-label="任务状态 ${escapeHtml(state)}">${escapeHtml(state)}</span> `,
      )
      return result
    })
  })

  return { markdown: transformed, footnotes }
}
