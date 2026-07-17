import { useCallback, useEffect, useRef, useState } from 'react'
import { searchUsers } from '@/api/social'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Candidate = { userId: number; username: string; name: string }

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  rows?: number
  maxLength?: number
}

/**
 * 普通评论编辑器：支持输入 @ 后弹出用户搜索选择。
 */
export function MentionTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  rows = 3,
  maxLength,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Candidate[]>([])
  const [active, setActive] = useState(0)
  const [atStart, setAtStart] = useState(-1)

  const detectMention = useCallback((text: string, caret: number) => {
    const before = text.slice(0, caret)
    const m = before.match(/(^|[\s\n])@([A-Za-z0-9_]{0,32})$/)
    if (!m) {
      setOpen(false)
      setAtStart(-1)
      return
    }
    const query = m[2] ?? ''
    const start = caret - query.length - 1
    setAtStart(start)
    setQ(query)
    setOpen(true)
    setActive(0)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const t = window.setTimeout(() => {
      void searchUsers(q || 'a', 1, 8).then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          setItems(
            res.data.list.map((u) => ({
              userId: u.userId,
              username: u.username,
              name: u.name,
            })),
          )
        } else setItems([])
      })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [open, q])

  function insertUser(u: Candidate) {
    if (atStart < 0) return
    const el = taRef.current
    const caret = el?.selectionStart ?? value.length
    const next = value.slice(0, atStart) + '@' + u.username + ' ' + value.slice(caret)
    onChange(next)
    setOpen(false)
    setAtStart(-1)
    requestAnimationFrame(() => {
      if (!el) return
      const pos = atStart + u.username.length + 2
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="relative">
      <Textarea
        ref={taRef}
        value={value}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className={cn('min-h-[80px] resize-y', className)}
        onChange={(e) => {
          const v = e.target.value
          onChange(v)
          detectMention(v, e.target.selectionStart)
        }}
        onKeyDown={(e) => {
          if (!open || items.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => (i + 1) % items.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => (i - 1 + items.length) % items.length)
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault()
            insertUser(items[active]!)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        onBlur={() => {
          // 延迟关闭以便点击选项
          window.setTimeout(() => setOpen(false), 150)
        }}
      />
      {open && items.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {items.map((u, i) => (
            <button
              key={u.userId}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                i === active ? 'bg-accent' : 'hover:bg-muted',
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                insertUser(u)
              }}
            >
              <span className="font-medium">@{u.username}</span>
              <span className="text-muted-foreground truncate">{u.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
