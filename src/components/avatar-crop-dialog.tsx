import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Spinner } from '@/components/ui/spinner'

/** 输出尺寸：512×512 正方形头像足够清晰，同时大幅压缩体积 */
const OUTPUT_SIZE = 512
/** JPEG 画质 0.85：在观感与体积间取平衡 */
const JPEG_QUALITY = 0.85

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败，换一张试试'))
    img.src = src
  })
}

/** 按裁剪区域画出正方形头像并压缩为 JPEG 文件 */
async function cropImageToFile(
  src: string,
  areaPixels: Area,
): Promise<File> {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持图片处理')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    image,
    areaPixels.x,
    areaPixels.y,
    areaPixels.width,
    areaPixels.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  )
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) throw new Error('图片处理失败，过会儿再试')
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
}

/**
 * 头像裁切弹窗：拖动 + 缩放到满意位置后确认，输出固定 1:1 压缩后的 JPEG。
 */
export function AvatarCropDialog({
  open,
  src,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  /** 待裁切图片的 object URL */
  src: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: (file: File) => Promise<void> | void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [saving, setSaving] = useState(false)
  const areaRef = useRef<Area | null>(null)

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      areaRef.current = null
    }
  }, [open])

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      areaRef.current = croppedAreaPixels
    },
    [],
  )

  async function handleConfirm() {
    if (!src || !areaRef.current) return
    setSaving(true)
    try {
      const file = await cropImageToFile(src, areaRef.current)
      await onConfirm(file)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '裁切失败，过会儿再试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>裁剪头像</DialogTitle>
          <DialogDescription>
            拖动或缩放，把头像调到满意的位置；保存后会自动压缩画质。
          </DialogDescription>
        </DialogHeader>
        {src ? (
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropSize={{ width: 220, height: 220 }}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          </div>
        ) : null}
        <div className="flex items-center gap-3 px-1">
          <span className="shrink-0 text-xs text-muted-foreground">缩放</span>
          <Slider
            min={1}
            max={3}
            step={0.01}
            value={[zoom]}
            onValueChange={(v) => setZoom(Number(v[0]) || 1)}
            disabled={saving}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            disabled={saving || !src}
            onClick={() => void handleConfirm()}
          >
            {saving ? <Spinner data-icon="inline-start" /> : null}
            {saving ? '处理中…' : '确定'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
