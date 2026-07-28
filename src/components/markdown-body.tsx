import { useEffect, useRef, useState } from 'react'
import 'katex/dist/katex.min.css'
import { MarkdownImageLightbox } from '@/components/markdown-image-lightbox'
import { cn } from '@/lib/utils'
import { bindMarkdownCodeCopy } from '@/lib/markdown-code-copy'
import {
  bindMarkdownImageLightbox,
  bindMarkdownImageResize,
} from '@/lib/markdown-img-interact'
import {
  prepareMarkdownHighlight,
  renderContentAsync,
  renderMarkdownAsync,
  sanitizeHtml,
} from '@/lib/markdown'

type Mode = 'markdown' | 'auto' | 'html'

type MarkdownBodyProps = {
  /** Markdown 或 HTML 原文 */
  content: string
  /**
   * markdown：强制 MD；html：仅消毒；auto：像 HTML 则消毒，否则 MD
   * @default 'markdown'
   */
  mode?: Mode
  className?: string
  /** 空内容时的占位文案 */
  emptyText?: string
  /** 点击图片放大（博客正文默认开） */
  enableLightbox?: boolean
  /**
   * 预览区拖拽调整图片宽度（写入 Markdown `![alt|W](url)`）。
   * 传入时启用右下角拖拽手柄。
   */
  onImageWidthChange?: (src: string, widthPx: number) => void
}

/**
 * 公共 Markdown / 富文本展示（GFM + 代码高亮 + KaTeX）。
 * 围栏代码块右上角提供「复制」。
 */
export function MarkdownBody({
  content,
  mode = 'markdown',
  className,
  emptyText = '暂无内容',
  enableLightbox = false,
  onImageWidthChange,
}: MarkdownBodyProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  // 首帧留空占位，仅在 effect 中渲染一次，避免挂载时同步+异步双重解析
  const [html, setHtml] = useState('')
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [lightboxAlt, setLightboxAlt] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    if (!content) {
      setHtml('')
      return
    }
    let cancelled = false
    void (async () => {
      if (mode === 'html') {
        setHtml(sanitizeHtml(content))
        return
      }
      await prepareMarkdownHighlight()
      if (cancelled) return
      if (mode === 'auto') {
        setHtml(await renderContentAsync(content))
        return
      }
      setHtml(await renderMarkdownAsync(content))
    })()
    return () => {
      cancelled = true
    }
  }, [content, mode])

  // 事件委托：复制按钮在 HTML 字符串里，不依赖 React 重挂载
  useEffect(() => {
    const root = rootRef.current
    if (!root || !html) return
    return bindMarkdownCodeCopy(root)
  }, [html])

  // 点击放大
  useEffect(() => {
    const root = rootRef.current
    if (!root || !html || !enableLightbox) return
    return bindMarkdownImageLightbox(root, (src, alt) => {
      setLightboxSrc(src)
      setLightboxAlt(alt)
      setLightboxOpen(true)
    })
  }, [html, enableLightbox])

  // 预览拖拽改宽
  useEffect(() => {
    const root = rootRef.current
    if (!root || !html || !onImageWidthChange) return
    return bindMarkdownImageResize(root, {
      onWidthChange: onImageWidthChange,
    })
  }, [html, onImageWidthChange])

  if (!content?.trim()) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>{emptyText}</p>
    )
  }

  return (
    <>
      <div
        ref={rootRef}
        className={cn(
          'markdown-body content-md min-w-0 max-w-full',
          className,
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {enableLightbox ? (
        <MarkdownImageLightbox
          src={lightboxSrc}
          alt={lightboxAlt}
          open={lightboxOpen}
          onOpenChange={(o) => {
            setLightboxOpen(o)
            if (!o) setLightboxSrc(null)
          }}
        />
      ) : null}
    </>
  )
}
