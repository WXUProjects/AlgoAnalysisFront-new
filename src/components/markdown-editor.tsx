import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  type UIEvent,
} from 'react'
import {
  BoldIcon,
  CheckSquareIcon,
  CodeIcon,
  Columns2Icon,
  EyeIcon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  Maximize2Icon,
  Minimize2Icon,
  PanelLeftIcon,
  QuoteIcon,
  Redo2Icon,
  SquareCodeIcon,
  SigmaIcon,
  StrikethroughIcon,
  TableIcon,
  MinusIcon,
  Undo2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadImage } from '@/api/upload'
import type { UploadProgressItem } from '@/components/blog-image-panel'
import { MarkdownBody } from '@/components/markdown-body'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  blogImageToolbarAction,
  markdownImageSnippet,
  rejectBlogImageUpload,
  updateMarkdownImageLayout,
  type BlogSessionImage,
  type ImageLayoutPatch,
} from '@/lib/blog-image'
import { cn } from '@/lib/utils'

type PaneMode = 'split' | 'edit' | 'preview'

export type MarkdownEditorProps = {
  value: string
  onChange: (markdown: string) => void
  className?: string
  disabled?: boolean
  /** 全页铺满：工具栏固定，左右分栏各自滚动 */
  fullPage?: boolean
  placeholder?: string
  /** 预览模式：markdown 强制 MD；auto 兼容历史 HTML */
  previewMode?: 'markdown' | 'auto'
  /** 非全页时的固定高度（内容在编辑器内滚动，不撑开父容器） */
  minHeight?: number
  /**
   * 博客等场景：禁止图片上传，工具栏图片仅插入链接并提示用户。
   * 默认 false（主站题解等仍可插入 markdown 图片语法，同样无上传）。
   * 若同时 `imageUploadEnabled`，则允许选图/粘贴上传。
   */
  linkOnlyImages?: boolean
  /**
   * 又拍云图片上传已授权：工具栏选图 + 粘贴图片走 `purpose=blog`。
   */
  imageUploadEnabled?: boolean
  /** 预览区可拖拽改图宽（写入 ![alt|W](url)） */
  resizableImages?: boolean
  /** 预览图点击放大 */
  previewLightbox?: boolean
  /** 工具栏显示「全屏」切换（由外层控制时也可用） */
  showFullscreenToggle?: boolean
  fullscreen?: boolean
  onFullscreenChange?: (full: boolean) => void
  /** 上传成功时回调（用于文章图片库） */
  onImageUploaded?: (image: BlogSessionImage) => void
  /** 多图上传进度（外层可同步到图片库） */
  onUploadProgressChange?: (items: UploadProgressItem[]) => void
  /** 暴露插入 markdown 的方法给外层（通过 ref 不便，用 callback 注册） */
  onRegisterInsert?: (insert: (text: string) => void) => void
}

/**
 * 按比例把源码区滚动同步到预览区。
 * 预览异步渲染后高度可能变化，故在 value 变化后也会再同步一次。
 */
function syncPreviewScroll(
  source: HTMLElement | null,
  target: HTMLElement | null,
) {
  if (!source || !target) return
  const srcMax = source.scrollHeight - source.clientHeight
  const tgtMax = target.scrollHeight - target.clientHeight
  if (tgtMax <= 0) {
    target.scrollTop = 0
    return
  }
  if (srcMax <= 0) {
    target.scrollTop = 0
    return
  }
  target.scrollTop = (source.scrollTop / srcMax) * tgtMax
}

let uploadSeq = 0

/**
 * 正式 Markdown 编辑器：左侧源码 · 右侧实时预览（GFM / 代码高亮 / KaTeX）。
 * 文字在编辑器内滚动，不依赖父容器；预览按比例跟随编辑区滚动。
 */
export function MarkdownEditor({
  value,
  onChange,
  className,
  disabled,
  fullPage,
  placeholder = '开始写作…',
  previewMode = 'markdown',
  minHeight = 320,
  linkOnlyImages = false,
  imageUploadEnabled = false,
  resizableImages = false,
  previewLightbox = false,
  showFullscreenToggle = false,
  fullscreen = false,
  onFullscreenChange,
  onImageUploaded,
  onUploadProgressChange,
  onRegisterInsert,
}: MarkdownEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pane, setPane] = useState<PaneMode>('split')
  const [uploads, setUploads] = useState<UploadProgressItem[]>([])
  const editorId = useId()
  const canUpload = imageUploadEnabled
  const uploading = uploads.some((u) => u.status === 'uploading')

  const historyRef = useRef<{ stack: string[]; index: number }>({
    stack: [value],
    index: 0,
  })
  const applyingHistoryRef = useRef(false)
  const historyTimerRef = useRef<number | null>(null)
  const [historyTick, setHistoryTick] = useState(0)

  const pushHistory = useCallback((next: string) => {
    const hist = historyRef.current
    if (hist.stack[hist.index] === next) return
    hist.stack = hist.stack.slice(0, hist.index + 1)
    hist.stack.push(next)
    if (hist.stack.length > 100) hist.stack.shift()
    hist.index = hist.stack.length - 1
    setHistoryTick((t) => t + 1)
  }, [])

  /** 工具栏等结构化编辑：立即记入历史 */
  const commitValue = useCallback(
    (next: string) => {
      if (!applyingHistoryRef.current) {
        if (historyTimerRef.current != null) {
          window.clearTimeout(historyTimerRef.current)
          historyTimerRef.current = null
        }
        pushHistory(next)
      }
      onChange(next)
    },
    [onChange, pushHistory],
  )

  // 连续输入：防抖合并为一条历史
  useEffect(() => {
    if (applyingHistoryRef.current) {
      applyingHistoryRef.current = false
      return
    }
    const hist = historyRef.current
    if (hist.stack[hist.index] === value) return
    if (historyTimerRef.current != null) {
      window.clearTimeout(historyTimerRef.current)
    }
    historyTimerRef.current = window.setTimeout(() => {
      historyTimerRef.current = null
      pushHistory(value)
    }, 400)
    return () => {
      if (historyTimerRef.current != null) {
        window.clearTimeout(historyTimerRef.current)
        historyTimerRef.current = null
      }
    }
  }, [value, pushHistory])

  const canUndo = historyRef.current.index > 0
  const canRedo =
    historyRef.current.index < historyRef.current.stack.length - 1
  void historyTick

  const undo = useCallback(() => {
    const hist = historyRef.current
    if (historyTimerRef.current != null) {
      window.clearTimeout(historyTimerRef.current)
      historyTimerRef.current = null
      // 先把未入库的当前值压入，再撤销
      if (hist.stack[hist.index] !== value) pushHistory(value)
    }
    if (hist.index <= 0) return
    hist.index -= 1
    applyingHistoryRef.current = true
    onChange(hist.stack[hist.index] ?? '')
    setHistoryTick((t) => t + 1)
  }, [onChange, pushHistory, value])

  const redo = useCallback(() => {
    const hist = historyRef.current
    if (hist.index >= hist.stack.length - 1) return
    hist.index += 1
    applyingHistoryRef.current = true
    onChange(hist.stack[hist.index] ?? '')
    setHistoryTick((t) => t + 1)
  }, [onChange])

  const patchUploads = useCallback(
    (updater: (prev: UploadProgressItem[]) => UploadProgressItem[]) => {
      setUploads((prev) => {
        const next = updater(prev)
        onUploadProgressChange?.(next)
        return next
      })
    },
    [onUploadProgressChange],
  )

  const insertAtCursor = useCallback(
    (text: string) => {
      const el = taRef.current
      if (!el || disabled) {
        commitValue(value + text)
        return
      }
      const start = el.selectionStart
      const end = el.selectionEnd
      const before = value.slice(0, start)
      const after = value.slice(end)
      const needNl =
        before.length > 0 && !before.endsWith('\n') ? '\n' : ''
      const inserted = needNl + text
      const next = before + inserted + after
      commitValue(next)
      requestAnimationFrame(() => {
        el.focus()
        const pos = start + inserted.length
        el.setSelectionRange(pos, pos)
      })
    },
    [value, commitValue, disabled],
  )

  useEffect(() => {
    onRegisterInsert?.(insertAtCursor)
  }, [onRegisterInsert, insertAtCursor])

  const uploadOne = useCallback(
    async (file: File, autoInsert: boolean) => {
      const gate = rejectBlogImageUpload(file, { uploadEnabled: canUpload })
      if (!gate.ok) {
        toast.message(gate.message)
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('先选图片文件')
        return
      }
      const id = `up-${++uploadSeq}`
      const name = file.name || '图片'
      patchUploads((prev) => [
        ...prev,
        { id, name, percent: 0, status: 'uploading' },
      ])
      const res = await uploadImage(file, 'blog', {
        onProgress: (percent) => {
          patchUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, percent } : u)),
          )
        },
      })
      if (!res.success || !res.data?.url) {
        patchUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  status: 'error',
                  error: res.message || '上传失败',
                  percent: u.percent,
                }
              : u,
          ),
        )
        toast.error(res.message || '图片没传上去，稍后重试')
        return
      }
      patchUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, percent: 100, status: 'done' } : u,
        ),
      )
      const url = res.data.url
      const hash = res.data.hash
      onImageUploaded?.({
        id: `img-${uploadSeq}-${Date.now()}`,
        url,
        name: name.replace(/\.[^.]+$/, '') || '图片',
        fromUpload: true,
        ...(hash ? { hash } : {}),
      })
      if (autoInsert) {
        insertAtCursor(markdownImageSnippet(url, '图片'))
      }
      // 清理完成条目（稍留片刻）
      window.setTimeout(() => {
        patchUploads((prev) => prev.filter((u) => u.id !== id))
      }, 1200)
    },
    [canUpload, insertAtCursor, onImageUploaded, patchUploads],
  )

  const uploadMany = useCallback(
    async (files: FileList | File[]) => {
      if (disabled) return
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (!list.length) {
        toast.error('先选图片文件')
        return
      }
      // 多图：都进库；第一张插入正文，其余仅入库（可从图片库插入）
      for (let i = 0; i < list.length; i++) {
        await uploadOne(list[i]!, i === 0)
      }
      if (list.length > 1) {
        toast.success(`已上传 ${list.length} 张，可在下方图片库插入`)
      } else if (list.length === 1) {
        toast.success('图片已插入')
      }
    },
    [disabled, uploadOne],
  )

  const handleImageLayoutChange = useCallback(
    (src: string, patch: ImageLayoutPatch) => {
      const next = updateMarkdownImageLayout(value, src, patch)
      if (next !== value) commitValue(next)
    },
    [value, commitValue],
  )

  const wrapSelection = useCallback(
    (before: string, after = before, placeholderText = '文本') => {
      const el = taRef.current
      if (!el || disabled) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const selected = value.slice(start, end) || placeholderText
      const next = value.slice(0, start) + before + selected + after + value.slice(end)
      commitValue(next)
      requestAnimationFrame(() => {
        el.focus()
        const s = start + before.length
        const e = s + selected.length
        el.setSelectionRange(s, e)
      })
    },
    [value, commitValue, disabled],
  )

  const insertBlock = useCallback(
    (block: string, cursorOffset?: number) => {
      const el = taRef.current
      if (!el || disabled) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const before = value.slice(0, start)
      const after = value.slice(end)
      const needNlBefore = before.length > 0 && !before.endsWith('\n')
      const needNlAfter = after.length > 0 && !after.startsWith('\n')
      const prefix = needNlBefore ? '\n\n' : before.endsWith('\n\n') || before === '' ? '' : '\n'
      const suffix = needNlAfter ? '\n\n' : ''
      const inserted = prefix + block + suffix
      const next = before + inserted + after
      commitValue(next)
      requestAnimationFrame(() => {
        el.focus()
        const base = start + prefix.length
        const pos =
          cursorOffset !== undefined ? base + cursorOffset : base + block.length
        el.setSelectionRange(pos, pos)
      })
    },
    [value, commitValue, disabled],
  )

  const prefixLines = useCallback(
    (prefix: string) => {
      const el = taRef.current
      if (!el || disabled) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineEndRaw = value.indexOf('\n', end)
      const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw
      const block = value.slice(lineStart, lineEnd)
      const lines = block.split('\n')
      const nextBlock = lines
        .map((line, i) => {
          if (prefix === '1. ') {
            return /^\d+\.\s/.test(line) ? line : `${i + 1}. ${line}`
          }
          if (prefix === '- [ ] ') {
            if (/^-\s\[[ xX]\]\s/.test(line)) return line
            if (line.startsWith('- ')) return `- [ ] ${line.slice(2)}`
            return `- [ ] ${line}`
          }
          return line.startsWith(prefix) ? line : prefix + line
        })
        .join('\n')
      const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd)
      commitValue(next)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(lineStart, lineStart + nextBlock.length)
      })
    },
    [value, commitValue, disabled],
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (disabled) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }
      if (mod && e.key === 'b') {
        e.preventDefault()
        wrapSelection('**')
        return
      }
      if (mod && e.key === 'i') {
        e.preventDefault()
        wrapSelection('*')
        return
      }
      if (mod && e.key === 'e') {
        e.preventDefault()
        wrapSelection('`')
        return
      }
      if (mod && e.key === 'k') {
        e.preventDefault()
        wrapSelection('[', '](https://)')
        return
      }
      if (e.key === 'Escape' && fullscreen && onFullscreenChange) {
        e.preventDefault()
        onFullscreenChange(false)
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const el = e.currentTarget
        const start = el.selectionStart
        const end = el.selectionEnd
        const next = value.slice(0, start) + '  ' + value.slice(end)
        commitValue(next)
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 2
        })
      }
    },
    [
      disabled,
      wrapSelection,
      value,
      commitValue,
      fullscreen,
      onFullscreenChange,
      undo,
      redo,
    ],
  )

  const onPaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      if (disabled) return

      if (canUpload && !uploading) {
        const items = e.clipboardData?.items
        if (items) {
          const files: File[] = []
          for (const item of Array.from(items)) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
              const file = item.getAsFile()
              if (file) files.push(file)
            }
          }
          if (files.length) {
            e.preventDefault()
            void uploadMany(files)
            return
          }
        }
      }

      const el = taRef.current
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      if (start === end) return
      const text = (e.clipboardData?.getData('text/plain') || '').trim()
      if (!text || /\s/.test(text)) return
      try {
        const u = new URL(text)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return
      } catch {
        return
      }
      e.preventDefault()
      const selected = value.slice(start, end)
      const next =
        value.slice(0, start) + `[${selected}](${text})` + value.slice(end)
      commitValue(next)
      requestAnimationFrame(() => {
        el.focus()
        const pos = start + selected.length + text.length + 4
        el.setSelectionRange(pos, pos)
      })
    },
    [disabled, canUpload, uploading, uploadMany, value, commitValue],
  )

  const stats = useMemo(() => {
    const text = value.replace(/\s+/g, '')
    const chars = text.length
    const words = value.trim()
      ? value
          .trim()
          .split(/\s+/)
          .filter(Boolean).length
      : 0
    return { chars, words }
  }, [value])

  const paneLabel =
    pane === 'edit' ? '仅编辑' : pane === 'preview' ? '仅预览' : '分栏'

  const showEdit = pane === 'split' || pane === 'edit'
  const showPreview = pane === 'split' || pane === 'preview'

  const handleEditorScroll = useCallback((e: UIEvent<HTMLTextAreaElement>) => {
    syncPreviewScroll(e.currentTarget, previewScrollRef.current)
  }, [])

  // 内容 / 分栏变化或预览异步渲染后，按当前编辑区比例同步预览滚动
  useEffect(() => {
    if (!showEdit || !showPreview) return
    const preview = previewScrollRef.current
    if (!preview) return

    const sync = () => syncPreviewScroll(taRef.current, preview)
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(preview)
    const child = preview.firstElementChild
    if (child) ro.observe(child)
    return () => ro.disconnect()
  }, [value, pane, showEdit, showPreview])

  // Esc 退出全屏（全局，因焦点可能不在 textarea）
  useEffect(() => {
    if (!fullscreen || !onFullscreenChange) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onFullscreenChange(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen, onFullscreenChange])

  const overallProgress =
    uploads.length === 0
      ? 0
      : Math.round(
          uploads.reduce((s, u) => s + (u.status === 'done' ? 100 : u.percent), 0) /
            uploads.length,
        )

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex min-h-0 flex-col overflow-hidden rounded-md border bg-background',
          // fullPage：填满父级剩余高度，内容在编辑器内滚动
          fullPage && 'h-full min-h-0 flex-1',
          className,
        )}
        style={!fullPage ? { height: minHeight, maxHeight: minHeight } : undefined}
      >
        {/* 工具栏：历史 · 文字 · 结构 · 插入 · 视图 */}
        <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b bg-muted/30 px-1.5 py-1">
          <ToolBtn
            title="撤销 ⌘Z"
            disabled={disabled || !canUndo}
            onClick={undo}
          >
            <Undo2Icon />
          </ToolBtn>
          <ToolBtn
            title="重做 ⌘⇧Z"
            disabled={disabled || !canRedo}
            onClick={redo}
          >
            <Redo2Icon />
          </ToolBtn>
          <ToolSep />
          <ToolBtn
            title="粗体 ⌘B"
            disabled={disabled}
            onClick={() => wrapSelection('**')}
          >
            <BoldIcon />
          </ToolBtn>
          <ToolBtn
            title="斜体 ⌘I"
            disabled={disabled}
            onClick={() => wrapSelection('*')}
          >
            <ItalicIcon />
          </ToolBtn>
          <ToolBtn
            title="删除线"
            disabled={disabled}
            onClick={() => wrapSelection('~~')}
          >
            <StrikethroughIcon />
          </ToolBtn>
          <ToolSep />
          <ToolBtn
            title="二级标题"
            disabled={disabled}
            onClick={() => prefixLines('## ')}
          >
            <Heading2Icon />
          </ToolBtn>
          <ToolBtn
            title="三级标题"
            disabled={disabled}
            onClick={() => prefixLines('### ')}
          >
            <Heading3Icon />
          </ToolBtn>
          <ToolBtn
            title="无序列表"
            disabled={disabled}
            onClick={() => prefixLines('- ')}
          >
            <ListIcon />
          </ToolBtn>
          <ToolBtn
            title="有序列表"
            disabled={disabled}
            onClick={() => prefixLines('1. ')}
          >
            <ListOrderedIcon />
          </ToolBtn>
          <ToolBtn
            title="任务列表"
            disabled={disabled}
            onClick={() => prefixLines('- [ ] ')}
          >
            <CheckSquareIcon />
          </ToolBtn>
          <ToolBtn
            title="引用"
            disabled={disabled}
            onClick={() => prefixLines('> ')}
          >
            <QuoteIcon />
          </ToolBtn>
          <ToolSep />
          <ToolBtn
            title="行内代码 ⌘E"
            disabled={disabled}
            onClick={() => wrapSelection('`')}
          >
            <CodeIcon />
          </ToolBtn>
          <ToolBtn
            title="代码块"
            disabled={disabled}
            onClick={() => insertBlock('```\ncode\n```', 4)}
          >
            <SquareCodeIcon />
          </ToolBtn>
          <ToolBtn
            title="链接 ⌘K"
            disabled={disabled}
            onClick={() => wrapSelection('[', '](https://)')}
          >
            <LinkIcon />
          </ToolBtn>
          <ToolBtn
            title={
              canUpload
                ? uploading
                  ? '上传中…'
                  : '上传图片'
                : linkOnlyImages
                  ? '插入图片链接'
                  : '图片'
            }
            disabled={disabled || uploading}
            onClick={() => {
              if (canUpload) {
                fileInputRef.current?.click()
                return
              }
              if (linkOnlyImages) {
                const action = blogImageToolbarAction({
                  uploadEnabled: false,
                })
                wrapSelection(
                  action.markdownSnippet.before,
                  action.markdownSnippet.after,
                  action.markdownSnippet.placeholder,
                )
                toast.message(action.toastMessage)
                return
              }
              wrapSelection('![', '](https://)')
            }}
          >
            <ImageIcon />
          </ToolBtn>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files
              e.target.value = ''
              if (files?.length) void uploadMany(files)
            }}
          />
          <ToolBtn
            title="行内公式"
            disabled={disabled}
            onClick={() => wrapSelection('$', '$', 'x^2')}
          >
            <SigmaIcon />
          </ToolBtn>
          <ToolBtn
            title="表格"
            disabled={disabled}
            onClick={() =>
              insertBlock('| 列1 | 列2 |\n| --- | --- |\n|  |  |', 2)
            }
          >
            <TableIcon />
          </ToolBtn>
          <ToolBtn
            title="分隔线"
            disabled={disabled}
            onClick={() => insertBlock('---')}
          >
            <MinusIcon />
          </ToolBtn>
          <div className="ml-auto flex items-center gap-0.5">
            <ToolBtn
              title="仅编辑"
              active={pane === 'edit'}
              onClick={() => setPane('edit')}
            >
              <PanelLeftIcon />
            </ToolBtn>
            <ToolBtn
              title="分栏"
              active={pane === 'split'}
              onClick={() => setPane('split')}
            >
              <Columns2Icon />
            </ToolBtn>
            <ToolBtn
              title="仅预览"
              active={pane === 'preview'}
              onClick={() => setPane('preview')}
            >
              <EyeIcon />
            </ToolBtn>
            {showFullscreenToggle && onFullscreenChange ? (
              <ToolBtn
                title={fullscreen ? '退出全屏 Esc' : '全屏编辑'}
                active={fullscreen}
                onClick={() => onFullscreenChange(!fullscreen)}
              >
                {fullscreen ? <Minimize2Icon /> : <Maximize2Icon />}
              </ToolBtn>
            ) : null}
          </div>
        </div>

        {uploading ? (
          <div className="flex shrink-0 items-center gap-2 border-b bg-muted/20 px-3 py-1.5">
            <Progress value={overallProgress} className="h-1.5 flex-1" />
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              上传 {overallProgress}%
            </span>
          </div>
        ) : null}

        {/* 分栏主体：高度锁死，内部各自滚动 */}
        <div
          className={cn(
            'grid min-h-0 flex-1 overflow-hidden',
            pane === 'split' &&
              'grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1',
            pane !== 'split' && 'grid-cols-1 grid-rows-1',
          )}
        >
          {showEdit && (
            <div
              className={cn(
                'flex min-h-0 flex-col overflow-hidden',
                showPreview &&
                  pane === 'split' &&
                  'border-b md:border-b-0 md:border-r',
              )}
            >
              <PaneLabel htmlFor={editorId}>正文</PaneLabel>
              <textarea
                id={editorId}
                ref={taRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onScroll={handleEditorScroll}
                onPaste={onPaste}
                disabled={disabled}
                placeholder={placeholder}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                className={cn(
                  // h-0 + flex-1：在 flex 列中强制占满剩余高度并内部滚动
                  'h-0 min-h-0 w-full flex-1 resize-none overflow-y-auto overscroll-contain bg-transparent px-3 py-2.5',
                  'font-mono text-[13px] leading-relaxed text-foreground',
                  'placeholder:text-muted-foreground/60',
                  'outline-none focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
                aria-label="正文"
              />
            </div>
          )}

          {showPreview && (
            <div className="flex min-h-0 flex-col overflow-hidden bg-muted/15">
              <PaneLabel>预览</PaneLabel>
              <div
                ref={previewScrollRef}
                className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5"
              >
                <MarkdownBody
                  content={value}
                  mode={previewMode}
                  emptyText="预览将显示在这里"
                  className="text-sm"
                  enableLightbox={previewLightbox}
                  onImageLayoutChange={
                    resizableImages ? handleImageLayoutChange : undefined
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {stats.chars > 0
              ? `${stats.chars} 字 · 约 ${stats.words} 词`
              : '还没开始写'}
          </span>
          <span>{paneLabel}</span>
        </div>
      </div>
    </TooltipProvider>
  )
}

function PaneLabel({
  children,
  htmlFor,
}: {
  children: ReactNode
  htmlFor?: string
}) {
  const Comp = htmlFor ? 'label' : 'div'
  return (
    <Comp
      htmlFor={htmlFor}
      className="shrink-0 border-b bg-muted/40 px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
    >
      {children}
    </Comp>
  )
}

function ToolSep() {
  return <Separator orientation="vertical" className="mx-0.5 h-5 self-center" />
}

function ToolBtn({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant={active ? 'secondary' : 'ghost'}
          disabled={disabled}
          onClick={onClick}
          aria-label={title}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  )
}

/** 供外部在打开编辑时把 HTML/MD 统一成源码 */
export { toMarkdownSource } from '@/lib/markdown'
