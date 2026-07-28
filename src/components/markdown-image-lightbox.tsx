import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  src: string | null
  alt?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Full-viewport image viewer for blog / markdown bodies. */
export function MarkdownImageLightbox({
  src,
  alt = '',
  open,
  onOpenChange,
}: Props) {
  return (
    <Dialog open={open && !!src} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(96vh,56rem)] max-w-[min(96vw,72rem)] gap-0 overflow-hidden border-none bg-transparent p-0 shadow-none sm:max-w-[min(96vw,72rem)]"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{alt || '图片预览'}</DialogTitle>
        {src ? (
          <div className="flex max-h-[min(92vh,54rem)] items-center justify-center overflow-auto rounded-lg bg-black/90 p-2 sm:p-4">
            <img
              src={src}
              alt={alt || '图片预览'}
              className="max-h-[min(88vh,52rem)] max-w-full object-contain"
              draggable={false}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
