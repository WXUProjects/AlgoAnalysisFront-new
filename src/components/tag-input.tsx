import { useMemo, useRef, useState } from 'react'
import { XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type TagSuggestion = { tag: string; count?: number }

type TagInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: TagSuggestion[]
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  /** 最多展示的联想条数 */
  maxSuggestions?: number
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = '搜索或新建标签，回车确认',
  disabled,
  className,
  id,
  maxSuggestions = 12,
}: TagInputProps) {
  const [input, setInput] = useState('')
  const [composing, setComposing] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedSet = useMemo(
    () => new Set(value.map((t) => t.toLowerCase())),
    [value],
  )

  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase()
    const list = suggestions.filter((s) => {
      if (selectedSet.has(s.tag.toLowerCase())) return false
      if (!q) return true
      return s.tag.toLowerCase().includes(q)
    })
    return list.slice(0, maxSuggestions)
  }, [suggestions, input, selectedSet, maxSuggestions])

  const canCreate =
    Boolean(input.trim()) &&
    !selectedSet.has(input.trim().toLowerCase()) &&
    !suggestions.some(
      (s) => s.tag.toLowerCase() === input.trim().toLowerCase(),
    )

  function addTag(raw: string) {
    const t = raw.trim()
    if (!t) return
    if (selectedSet.has(t.toLowerCase())) {
      setInput('')
      return
    }
    onChange([...value, t])
    setInput('')
    setHighlight(0)
    inputRef.current?.focus()
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (composing || e.nativeEvent.isComposing) return
      e.preventDefault()
      if (open && filtered.length > 0 && highlight >= 0 && highlight < filtered.length) {
        addTag(filtered[highlight]!.tag)
        return
      }
      if (input.trim()) addTag(input)
      return
    }
    if (e.key === 'Backspace' && !input && value.length) {
      removeTag(value[value.length - 1]!)
      return
    }
    if (e.key === 'ArrowDown' && open && filtered.length) {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, filtered.length - 1 + (canCreate ? 1 : 0)))
      return
    }
    if (e.key === 'ArrowUp' && open && filtered.length) {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown =
    open && !disabled && (filtered.length > 0 || canCreate)

  return (
    <div ref={wrapRef} className={cn('relative flex flex-col gap-2', className)}>
      <div
        className={cn(
          'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs transition-[color,box-shadow]',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          disabled && 'pointer-events-none opacity-50',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((t) => (
          <Badge
            key={t}
            variant="secondary"
            className="h-6 gap-1 pr-1 font-normal"
          >
            {t}
            <button
              type="button"
              className="rounded-sm p-0.5 opacity-70 hover:bg-muted hover:opacity-100"
              aria-label={`移除 ${t}`}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation()
                removeTag(t)
              }}
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          id={id}
          value={input}
          disabled={disabled}
          placeholder={value.length ? '' : placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-7 min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0"
          onChange={(e) => {
            setInput(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // 延迟关闭，让点击联想项先触发
            window.setTimeout(() => setOpen(false), 150)
          }}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(e) => {
            setComposing(false)
            setInput((e.target as HTMLInputElement).value)
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {showDropdown && (
        <ul
          className="absolute top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          role="listbox"
        >
          {filtered.map((s, i) => (
            <li key={s.tag} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm',
                  i === highlight
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/60',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => addTag(s.tag)}
              >
                <span>{s.tag}</span>
                {s.count !== undefined && (
                  <span className="text-xs text-muted-foreground">{s.count}</span>
                )}
              </button>
            </li>
          ))}
          {canCreate && (
            <li role="option" aria-selected={highlight === filtered.length}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-1 rounded-sm px-2 py-1.5 text-left text-sm',
                  highlight === filtered.length
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/60',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(filtered.length)}
                onClick={() => addTag(input)}
              >
                新建「{input.trim()}」
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
