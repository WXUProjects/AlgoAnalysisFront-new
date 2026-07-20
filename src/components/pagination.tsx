import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50]

interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  /** 传入后显示「每页条数」选择器 */
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  disabled?: boolean
}

/** 生成页码序列：含首尾、当前附近窗口与省略号（null） */
function buildPageItems(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 1) return [1]
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const set = new Set<number>()
  set.add(1)
  set.add(totalPages)
  // 当前页附近约 5 个
  for (let p = page - 2; p <= page + 2; p++) {
    if (p >= 1 && p <= totalPages) set.add(p)
  }
  // 开头多露几页（用户期望 1 2 3 4 5 6 … end）
  if (page <= 4) {
    for (let p = 1; p <= Math.min(6, totalPages); p++) set.add(p)
  }
  if (page >= totalPages - 3) {
    for (let p = Math.max(1, totalPages - 5); p <= totalPages; p++) set.add(p)
  }

  const sorted = Array.from(set).sort((a, b) => a - b)
  const items: (number | null)[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) items.push(null)
    items.push(sorted[i]!)
  }
  return items
}

export function Pagination({
  page,
  total,
  pageSize,
  onChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  disabled,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const canPrev = safePage > 1
  const canNext = safePage < totalPages
  const pageItems = buildPageItems(safePage, totalPages)

  const [jumpInput, setJumpInput] = useState(String(safePage))
  const [jumpError, setJumpError] = useState('')

  useEffect(() => {
    setJumpInput(String(safePage))
    setJumpError('')
  }, [safePage])

  function handleJump() {
    const n = Number.parseInt(jumpInput.trim(), 10)
    if (!Number.isFinite(n) || n < 1 || n > totalPages) {
      setJumpError(`请输入 1 到 ${totalPages} 之间的页码`)
      return
    }
    setJumpError('')
    if (n !== safePage) onChange(n)
  }

  const sizeOptions = (() => {
    const set = new Set(pageSizeOptions)
    set.add(pageSize)
    return Array.from(set).sort((a, b) => a - b)
  })()

  return (
    <nav className="flex flex-col gap-2 pt-2" aria-label="分页导航">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            共 {total} 条 · 第 {safePage}/{totalPages}
          </span>
          <div className="hidden sm:flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={jumpInput}
              disabled={disabled}
              onChange={(e) => setJumpInput(e.target.value)}
              onInput={() => setJumpError('')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleJump()
                }
              }}
              className="h-8 w-16 px-2 text-center"
              aria-label="跳转页码"
              aria-invalid={Boolean(jumpError)}
              aria-describedby={jumpError ? 'pagination-jump-error' : undefined}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={handleJump}
            >
              跳转
            </Button>
          </div>
          {onPageSizeChange ? (
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap">每页</span>
              <Select
                value={String(pageSize)}
                disabled={disabled}
                onValueChange={(v) => {
                  const n = Number(v)
                  if (n > 0 && n !== pageSize) onPageSizeChange(n)
                }}
              >
                <SelectTrigger size="sm" className="w-[4.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {sizeOptions.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <span className="whitespace-nowrap">条</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !canPrev}
            onClick={() => onChange(safePage - 1)}
            aria-label={`上一页，第 ${safePage - 1} 页`}
          >
            上一页
          </Button>
          {pageItems.map((item, idx) =>
            item === null ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1 text-sm text-muted-foreground"
                aria-hidden
              >
                …
              </span>
            ) : (
              <Button
                key={item}
                type="button"
                variant={item === safePage ? 'default' : 'outline'}
                size="sm"
                disabled={disabled}
                onClick={() => onChange(item)}
                aria-label={`第 ${item} 页`}
                aria-current={item === safePage ? 'page' : undefined}
              >
                {item}
              </Button>
            ),
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !canNext}
            onClick={() => onChange(safePage + 1)}
            aria-label={`下一页，第 ${safePage + 1} 页`}
          >
            下一页
          </Button>
        </div>
      </div>
      {jumpError ? (
        <p id="pagination-jump-error" className="text-sm text-destructive" role="alert">
          {jumpError}
        </p>
      ) : null}
    </nav>
  )
}
