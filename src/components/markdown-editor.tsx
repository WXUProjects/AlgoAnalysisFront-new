import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type UIEvent,
} from 'react'
import {
  BoldIcon,
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
  PanelLeftIcon,
  QuoteIcon,
  SquareCodeIcon,
  SigmaIcon,
  StrikethroughIcon,
} from 'lucide-react'
import { MarkdownBody } from '@/components/markdown-body'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  placeholder = '在此编写 Markdown…\n\n支持标题、列表、代码块、表格与 $公式$',
  previewMode = 'markdown',
  minHeight = 320,
}: MarkdownEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const [pane, setPane] = useState<PaneMode>('split')
  const editorId = useId()

  const wrapSelection = useCallback(
    (before: string, after = before, placeholderText = '文本') => {
      const el = taRef.current
      if (!el || disabled) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const selected = value.slice(start, end) || placeholderText
      const next = value.slice(0, start) + before + selected + after + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        el.focus()
        const s = start + before.length
        const e = s + selected.length
        el.setSelectionRange(s, e)
      })
    },
    [value, onChange, disabled],
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
      onChange(next)
      requestAnimationFrame(() => {
        el.focus()
        const base = start + prefix.length
        const pos =
          cursorOffset !== undefined ? base + cursorOffset : base + block.length
        el.setSelectionRange(pos, pos)
      })
    },
    [value, onChange, disabled],
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
          return line.startsWith(prefix) ? line : prefix + line
        })
        .join('\n')
      const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd)
      onChange(next)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(lineStart, lineStart + nextBlock.length)
      })
    },
    [value, onChange, disabled],
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (disabled) return
      const mod = e.metaKey || e.ctrlKey
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
      if (e.key === 'Tab') {
        e.preventDefault()
        const el = e.currentTarget
        const start = el.selectionStart
        const end = el.selectionEnd
        const next = value.slice(0, start) + '  ' + value.slice(end)
        onChange(next)
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 2
        })
      }
    },
    [disabled, wrapSelection, value, onChange],
  )

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
        {/* 工具栏 */}
        <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b bg-muted/30 px-1.5 py-1">
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
          <ToolSep />
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
            onClick={() =>
              insertBlock('```\ncode\n```', 4)
            }
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
            title="图片"
            disabled={disabled}
            onClick={() => wrapSelection('![', '](https://)')}
          >
            <ImageIcon />
          </ToolBtn>
          <ToolBtn
            title="行内公式"
            disabled={disabled}
            onClick={() => wrapSelection('$', '$', 'x^2')}
          >
            <SigmaIcon />
          </ToolBtn>
          <ToolSep />
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
          </div>
        </div>

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
              <PaneLabel htmlFor={editorId}>Markdown</PaneLabel>
              <textarea
                id={editorId}
                ref={taRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onScroll={handleEditorScroll}
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
                aria-label="Markdown 源码"
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
                />
              </div>
            </div>
          )}
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
