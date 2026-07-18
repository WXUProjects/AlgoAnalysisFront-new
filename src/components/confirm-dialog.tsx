import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export type ConfirmDialogProps = {
  /** 受控开关；不传时用 Trigger 子节点自行开合 */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  loading?: boolean
  disabled?: boolean
  /** 确认按钮用破坏性样式（删除/移除等） */
  destructive?: boolean
  /** 触发元素；受控模式下可不传 */
  children?: ReactNode
}

/**
 * 危险操作二次确认（基于 AlertDialog）。
 * - 列表项：包一层 Trigger 按钮
 * - 受控：传 open / onOpenChange
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  onConfirm,
  loading = false,
  disabled = false,
  destructive = false,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children != null ? (
        <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      ) : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {typeof description === 'string' ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : (
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">{description}</div>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={loading || disabled}
            onClick={onConfirm}
          >
            {loading ? '处理中…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
