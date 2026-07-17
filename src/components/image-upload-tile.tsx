import { useId, useRef } from 'react'
import gsap from 'gsap'
import { ImageIcon, Loader2 } from 'lucide-react'
import { FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import {
  animateHoverTransformIn,
  animateHoverTransformOut,
  killTweens,
  MOTION,
  prefersReducedMotion,
} from '@/lib/motion'

export function ImageUploadTile({
  label,
  value,
  uploading,
  sizeClass,
  onFile,
  hint = '支持 jpg / png / webp / svg，点击预览区即可上传',
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
  const imgRef = useRef<HTMLImageElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const setOverlay = (show: boolean) => {
    const el = overlayRef.current
    if (!el || uploading) return
    killTweens(el)
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: show ? 1 : 0 })
      return
    }
    gsap.to(el, {
      opacity: show ? 1 : 0,
      duration: MOTION.duration.hover,
      overwrite: true,
    })
  }

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
        onPointerEnter={() => {
          if (imgRef.current) {
            animateHoverTransformIn(imgRef.current, {
              scale: MOTION.hover.imageScale,
            })
          }
          setOverlay(true)
        }}
        onPointerLeave={() => {
          if (imgRef.current) animateHoverTransformOut(imgRef.current)
          setOverlay(false)
        }}
      >
        {value ? (
          <img
            ref={imgRef}
            src={value}
            alt=""
            className="max-h-full max-w-full object-contain p-2 will-change-transform"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground group-hover:text-foreground">
            <ImageIcon className="size-6 opacity-70" />
            <span className="text-xs">点击上传</span>
          </div>
        )}

        <div
          ref={overlayRef}
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]',
            uploading && 'opacity-100',
          )}
          style={uploading ? undefined : { opacity: 0 }}
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
