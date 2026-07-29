import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export type PromptDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  label?: string
  defaultValue?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 确认时回传当前输入；返回 false 可阻止关闭（如校验失败） */
  onConfirm: (value: string) => void | boolean | Promise<void | boolean>
  loading?: boolean
}

/**
 * 单行文本输入弹窗（替代 window.prompt）。
 */
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label = '内容',
  defaultValue = '',
  placeholder,
  confirmLabel = '确认',
  cancelLabel = '取消',
  onConfirm,
  loading = false,
}: PromptDialogProps) {
  const inputId = useId()
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    if (open) setValue(defaultValue)
  }, [open, defaultValue])

  async function handleConfirm() {
    const result = await onConfirm(value)
    if (result === false) return
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
            <Input
              id={inputId}
              value={value}
              placeholder={placeholder}
              disabled={loading}
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleConfirm()
                }
              }}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button type="button" disabled={loading} onClick={() => void handleConfirm()}>
            {loading ? '处理中…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
