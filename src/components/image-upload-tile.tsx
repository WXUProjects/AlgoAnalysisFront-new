import { useId, useRef } from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'

export function ImageUploadTile({
  label,
  value,
  uploading,
  sizeClass,
  onFile,
  hint = 'jpg / png / webp / svg，点击预览区即可上传',
}: {
  label: string
  value: string
  uploading: boolean
  sizeClass: string
  onFile: (file: File | null) => void
  hint?: string
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <label
        htmlFor={inputId}
        className={cn(
          'group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/30 transition-colors',
          'hover:border-primary/50 hover:bg-muted/50',
          'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          sizeClass,
          uploading && 'pointer-events-none',
        )}
      >
        {value ? (
          <img
            src={value}
            alt=""
            className="max-h-full max-w-full object-contain p-2 transition-transform duration-200 group-hover:scale-[0.98]"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground transition-opacity group-hover:text-foreground">
            <ImageIcon className="size-6 opacity-70" />
            <span className="text-xs">点击上传</span>
          </div>
        )}

        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]',
            'opacity-0 transition-opacity duration-200',
            'group-hover:opacity-100 group-focus-within:opacity-100',
            uploading && 'opacity-100',
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-foreground" />
          ) : (
            <span className="rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm">
              {value ? '更换图片' : '选择图片'}
            </span>
          )}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/x-icon"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0] || null
            e.target.value = ''
            onFile(file)
          }}
        />
      </label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
