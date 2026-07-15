import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  CODE_TEXT_STYLE,
  highlightWith,
  loadHljs,
  mapHljsLang,
} from '@/lib/code-hl'

export function CodeHighlight({
  code,
  language,
  className,
}: {
  code: string
  language?: string
  className?: string
}) {
  const [html, setHtml] = useState<string | null>(null)
  const lang = mapHljsLang(language || 'text')
  const plain = useMemo(() => code ?? '', [code])

  useEffect(() => {
    let cancelled = false
    void loadHljs().then((hljs) => {
      if (cancelled) return
      setHtml(highlightWith(hljs, plain, language))
    })
    return () => {
      cancelled = true
    }
  }, [plain, language])

  return (
    <pre
      className={cn(
        'code-hl overflow-x-auto rounded-lg border p-3',
        className,
      )}
      style={CODE_TEXT_STYLE}
    >
      {html ? (
        <code
          className={`hljs language-${lang}`}
          style={CODE_TEXT_STYLE}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <code style={CODE_TEXT_STYLE} className="whitespace-pre">
          {plain}
        </code>
      )}
    </pre>
  )
}
