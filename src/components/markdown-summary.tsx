import { useMemo } from 'react'
import { plainTextFromMarkdown } from '@/lib/markdown'
import { cn } from '@/lib/utils'

type MarkdownSummaryProps = {
  /** 文章简述 / 摘要原文（可含 Markdown，展示时剥标记为纯文本） */
  content: string
  className?: string
}

/**
 * 列表卡片简述：纯文本，不渲染加粗/公式/代码等。
 *
 * line-clamp 请直接打在本组件 className 上（不要只包一层外 div），
 * 否则内层 inline 子节点会按 max-content 撑满一行，看起来「字够却只有一行」。
 */
export function MarkdownSummary({ content, className }: MarkdownSummaryProps) {
  const text = useMemo(
    () => (content?.trim() ? plainTextFromMarkdown(content) : ''),
    [content],
  )

  if (!text) return null

  return (
    <div
      className={cn(
        'markdown-summary min-w-0 max-w-full [overflow-wrap:anywhere]',
        className,
      )}
    >
      {text}
    </div>
  )
}
