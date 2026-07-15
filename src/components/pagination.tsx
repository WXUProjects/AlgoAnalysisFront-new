import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({
  page,
  total,
  pageSize,
  onChange,
  disabled,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const canPrev = page > 1
  const canNext = page < totalPages

  const windowPages = (() => {
    const pages: number[] = []
    const start = Math.max(1, page - 1)
    const end = Math.min(totalPages, start + 2)
    for (let i = Math.max(1, end - 2); i <= end; i++) pages.push(i)
    return pages
  })()

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
      <p className="text-sm text-muted-foreground">
        共 {total} 条 · 第 {page}/{totalPages} 页
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canPrev}
          onClick={() => onChange(page - 1)}
        >
          上一页
        </Button>
        {windowPages.map((p) => (
          <Button
            key={p}
            type="button"
            variant={p === page ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canNext}
          onClick={() => onChange(page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  )
}
