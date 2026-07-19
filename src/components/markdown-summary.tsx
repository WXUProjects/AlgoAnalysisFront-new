import { useMemo } from 'react'
import 'katex/dist/katex.min.css'
import { renderSummaryMarkdown } from '@/lib/markdown'
import { cn } from '@/lib/utils'

type MarkdownSummaryProps = {
  /** 文章简述 / 摘要原文（可含 Markdown；公式会渲染为 KaTeX） */
  content: string
  className?: string
}

/**
 * 列表卡片简述：文字剥 MD 标记，**公式用 KaTeX 渲染**。
 *
 * line-clamp 请直接打在本组件 className 上（不要只包一层外 div），
 * 否则内层 inline 子节点会按 max-content 撑满一行，看起来「字够却只有一行」。
 */
export function MarkdownSummary({ content, className }: MarkdownSummaryProps) {
  const html = useMemo(
    () => (content?.trim() ? renderSummaryMarkdown(content) : ''),
    [content],
  )

  if (!html) return null

  return (
    <div
      className={cn(
        'markdown-summary min-w-0 max-w-full [overflow-wrap:anywhere]',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
