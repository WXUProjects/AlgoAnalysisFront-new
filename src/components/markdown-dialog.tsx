import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MarkdownBody } from '@/components/markdown-body'
import { cn } from '@/lib/utils'

type MarkdownDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  content: string
  /** @default 'auto' — 公告等可能是 HTML */
  mode?: 'markdown' | 'auto' | 'html'
  className?: string
  bodyClassName?: string
}

/**
 * 全屏级弹窗阅读 Markdown / 富文本（替代列表内向下展开）。
 */
export function MarkdownDialog({
  open,
  onOpenChange,
  title,
  description,
  content,
  mode = 'auto',
  className,
  bodyClassName,
}: MarkdownDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(90vh,880px)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl md:max-w-3xl',
          className,
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-base leading-snug sm:text-lg">
            {title || '详情'}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-xs sm:text-sm">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <MarkdownBody
            content={content}
            mode={mode}
            className={cn('text-sm', bodyClassName)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
