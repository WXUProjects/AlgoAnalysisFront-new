import { useMemo } from 'react'
import 'katex/dist/katex.min.css'
import { renderSummaryMarkdown } from '@/lib/markdown'
import { cn } from '@/lib/utils'

type MarkdownSummaryProps = {
  /** 文章简述 / 摘要原文（可含 LaTeX、加粗等） */
  content: string
  className?: string
}

/**
 * 列表卡片用的轻量 Markdown：公式 + 加粗 + 行内代码。
 * 不渲染链接/标题等，避免卡片里套链或出现「文章头」级标题。
 */
export function MarkdownSummary({ content, className }: MarkdownSummaryProps) {
  const html = useMemo(
    () => (content?.trim() ? renderSummaryMarkdown(content) : ''),
    [content],
  )

  if (!html) return null

  return (
    <span
      className={cn('markdown-summary', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
