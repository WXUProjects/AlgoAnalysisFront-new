import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type UIEvent,
} from 'react'
import { cn } from '@/lib/utils'
import {
  CODE_TEXT_STYLE,
  escapeHtml,
  highlightWith,
  loadHljs,
  mapHljsLang,
} from '@/lib/code-hl'

const PAD_PX = 12

/** pre / textarea 共用盒模型与字体，避免光标与高亮层错位 */
const layerStyle: CSSProperties = {
  ...CODE_TEXT_STYLE,
  margin: 0,
  padding: PAD_PX,
  border: 'none',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
  height: '100%',
  overflow: 'auto',
  overscrollBehavior: 'none',
  scrollbarGutter: 'stable',
}

export function CodeEditor({
  value,
  onChange,
  language = 'text',
  placeholder = '在此粘贴代码或文本',
  className,
  minHeight = 280,
}: {
  value: string
  onChange: (value: string) => void
  language?: string
  placeholder?: string
  className?: string
  minHeight?: number
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const [html, setHtml] = useState('')
  const lang = mapHljsLang(language)

  useEffect(() => {
    let cancelled = false
    const t = window.setTimeout(() => {
      void loadHljs().then((hljs) => {
        if (cancelled) return
        let body = highlightWith(hljs, value, language)
        // 末尾换行时 pre 高度会塌一行，补一个零宽空格占位
        if (value.endsWith('\n')) body += '\n\u200b'
        setHtml(body || '\u200b')
      })
    }, 40)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [value, language])

  // 高亮更新后跟一次滚动，避免异步渲染后错位
  useEffect(() => {
    const ta = textareaRef.current
    const pre = preRef.current
    if (!ta || !pre) return
    pre.scrollTop = ta.scrollTop
    pre.scrollLeft = ta.scrollLeft
  }, [html])

  const syncScroll = useCallback((e: UIEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    const pre = preRef.current
    if (!pre) return
    pre.scrollTop = el.scrollTop
    pre.scrollLeft = el.scrollLeft
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Tab') return
      e.preventDefault()
      const el = e.currentTarget
      const start = el.selectionStart
      const end = el.selectionEnd
      const next = value.slice(0, start) + '  ' + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2
      })
    },
    [value, onChange],
  )

  const empty = !value

  return (
    <div
      className={cn(
        'code-hl relative w-full overflow-hidden rounded-md border',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        className,
      )}
      style={{ minHeight }}
    >
      {/* 高亮层：绝对铺满，与 textarea 同尺寸、同 padding、同字体 */}
      <pre
        ref={preRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 m-0"
        style={layerStyle}
      >
        {empty ? (
          <span className="opacity-45" style={CODE_TEXT_STYLE}>
            {placeholder}
          </span>
        ) : (
          <code
            className={`hljs language-${lang}`}
            style={{
              ...CODE_TEXT_STYLE,
              display: 'block',
              padding: 0,
              margin: 0,
              background: 'transparent',
            }}
            dangerouslySetInnerHTML={{
              __html: html || escapeHtml(value) || '\u200b',
            }}
          />
        )}
      </pre>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        className="code-editor-input relative z-10 block w-full resize-y"
        style={{
          ...layerStyle,
          minHeight,
          // 透明字 + 可见光标；颜色由 CSS 随主题变
          color: 'transparent',
          caretColor: 'var(--code-caret)',
          background: 'transparent',
          resize: 'vertical',
          // 消除 iOS / WebKit 填充色干扰
          WebkitTextFillColor: 'transparent',
        }}
        aria-label="代码编辑"
      />
    </div>
  )
}
