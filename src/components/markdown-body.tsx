import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import 'katex/dist/katex.min.css'
import { MarkdownImageLightbox } from '@/components/markdown-image-lightbox'
import { PromptDialog } from '@/components/prompt-dialog'
import type { ImageLayoutPatch } from '@/lib/blog-image'
import { cn } from '@/lib/utils'
import { bindMarkdownCodeCopy } from '@/lib/markdown-code-copy'
import {
  bindMarkdownImageLightbox,
  bindMarkdownImageResize,
  type CustomSizePromptRequest,
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
   * 预览区悬停工具条：对齐 / 百分比 / 拖拽改宽。
   * 写入 Markdown `![alt|50%|center](url)` 等。
   */
  onImageLayoutChange?: (src: string, patch: ImageLayoutPatch) => void
  /** @deprecated 使用 onImageLayoutChange */
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
  onImageLayoutChange,
  onImageWidthChange,
}: MarkdownBodyProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  // 首帧留空占位，仅在 effect 中渲染一次，避免挂载时同步+异步双重解析
  const [html, setHtml] = useState('')
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [lightboxAlt, setLightboxAlt] = useState('')
  const [lightboxSlides, setLightboxSlides] = useState<
    Array<{ src: string; alt: string }>
  >([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [sizePrompt, setSizePrompt] = useState<CustomSizePromptRequest | null>(
    null,
  )
  const sizePromptResolveRef = useRef<
    ((value: string | null) => void) | null
  >(null)

  const handleLayout = useCallback(
    (src: string, patch: ImageLayoutPatch) => {
      if (onImageLayoutChange) {
        onImageLayoutChange(src, patch)
        return
      }
      if (onImageWidthChange && patch.widthPx != null && patch.widthPx > 0) {
        onImageWidthChange(src, patch.widthPx)
      }
    },
    [onImageLayoutChange, onImageWidthChange],
  )

  const promptCustomSize = useCallback((req: CustomSizePromptRequest) => {
    sizePromptResolveRef.current?.(null)
    return new Promise<string | null>((resolve) => {
      sizePromptResolveRef.current = resolve
      setSizePrompt(req)
    })
  }, [])

  const closeSizePrompt = useCallback((value: string | null) => {
    const resolve = sizePromptResolveRef.current
    sizePromptResolveRef.current = null
    setSizePrompt(null)
    resolve?.(value)
  }, [])

  const layoutEnabled = Boolean(onImageLayoutChange || onImageWidthChange)

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

  // 点击放大（多图画廊）
  useEffect(() => {
    const root = rootRef.current
    if (!root || !html || !enableLightbox) return
    return bindMarkdownImageLightbox(root, ({ src, alt, slides }) => {
      setLightboxSrc(src)
      setLightboxAlt(alt)
      setLightboxSlides(slides)
      setLightboxOpen(true)
    })
  }, [html, enableLightbox])

  // 预览布局工具条
  useEffect(() => {
    const root = rootRef.current
    if (!root || !html || !layoutEnabled) return
    return bindMarkdownImageResize(root, {
      onLayoutChange: handleLayout,
      promptCustomSize,
    })
  }, [html, layoutEnabled, handleLayout, promptCustomSize])

  useEffect(() => {
    return () => {
      sizePromptResolveRef.current?.(null)
      sizePromptResolveRef.current = null
    }
  }, [])

  if (!content?.trim()) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>{emptyText}</p>
    )
  }

  const sizePromptOpen = sizePrompt != null
  const sizeIsPercent = sizePrompt?.mode === 'percent'

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
          slides={lightboxSlides}
          src={lightboxSrc}
          alt={lightboxAlt}
          open={lightboxOpen}
          onOpenChange={(o) => {
            setLightboxOpen(o)
            if (!o) {
              setLightboxSrc(null)
              setLightboxSlides([])
            }
          }}
        />
      ) : null}
      <PromptDialog
        open={sizePromptOpen}
        onOpenChange={(open) => {
          if (!open) closeSizePrompt(null)
        }}
        title={sizeIsPercent ? '自定义图片宽度' : '自定义图片宽度'}
        description={
          sizeIsPercent
            ? '相对正文宽度，范围 1–100%'
            : `像素宽度，范围 ${sizePrompt?.minPx ?? 80}–${sizePrompt?.maxPx ?? 1600}`
        }
        label={sizeIsPercent ? '宽度（%）' : '宽度（px）'}
        defaultValue={
          sizePrompt != null ? String(sizePrompt.current) : ''
        }
        placeholder={sizeIsPercent ? '例如 50' : '例如 400'}
        confirmLabel="应用"
        onConfirm={(raw) => {
          if (!sizePrompt) return false
          if (sizePrompt.mode === 'percent') {
            const p = Math.round(
              Number(String(raw).replace(/%/g, '').trim()),
            )
            if (!Number.isFinite(p) || p < 1 || p > 100) {
              toast.error('请输入 1–100 的百分比')
              return false
            }
            closeSizePrompt(String(p))
            return
          }
          const w = Math.round(
            Number(String(raw).replace(/px/gi, '').trim()),
          )
          if (
            !Number.isFinite(w) ||
            w < sizePrompt.minPx ||
            w > sizePrompt.maxPx
          ) {
            toast.error(
              `请输入 ${sizePrompt.minPx}–${sizePrompt.maxPx} 的像素值`,
            )
            return false
          }
          closeSizePrompt(String(w))
        }}
      />
    </>
  )
}
