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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

/** 输出最长边：512px 足够清晰，同时大幅压缩体积 */
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

export function avatarOutputSize(area: Pick<Area, 'width' | 'height'>): {
  width: number
  height: number
} {
  const width = Math.max(1, area.width)
  const height = Math.max(1, area.height)
  if (width >= height) {
    return {
      width: OUTPUT_SIZE,
      height: Math.max(1, Math.round((height / width) * OUTPUT_SIZE)),
    }
  }
  return {
    width: Math.max(1, Math.round((width / height) * OUTPUT_SIZE)),
    height: OUTPUT_SIZE,
  }
}

/** 按裁剪区域原比例缩放并压缩为 JPEG 文件 */
async function cropImageToFile(
  src: string,
  areaPixels: Area,
): Promise<File> {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  const output = avatarOutputSize(areaPixels)
  canvas.width = output.width
  canvas.height = output.height
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
    output.width,
    output.height,
  )
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) throw new Error('图片处理失败，过会儿再试')
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
}

/**
 * 头像裁切弹窗：拖动 + 缩放到满意位置，支持原图、横向、正方形与纵向比例。
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
  const [naturalAspect, setNaturalAspect] = useState(1)
  const [aspectMode, setAspectMode] = useState('original')
  const areaRef = useRef<Area | null>(null)

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      areaRef.current = null
      setNaturalAspect(1)
      setAspectMode('original')
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
            选个比例，再拖动或缩放到满意的位置。
          </DialogDescription>
        </DialogHeader>
        {src ? (
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={
                aspectMode === 'original' ? naturalAspect : Number(aspectMode)
              }
              onMediaLoaded={({ naturalWidth, naturalHeight }) => {
                if (naturalWidth > 0 && naturalHeight > 0) {
                  setNaturalAspect(naturalWidth / naturalHeight)
                }
              }}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          </div>
        ) : null}
        <div className="flex items-center gap-3 px-1">
          <span className="shrink-0 text-xs text-muted-foreground">比例</span>
          <ToggleGroup
            type="single"
            value={aspectMode}
            onValueChange={(value) => {
              if (value) setAspectMode(value)
            }}
            variant="outline"
            size="sm"
            disabled={saving}
          >
            <ToggleGroupItem value="original" aria-label="使用原图比例">
              原图
            </ToggleGroupItem>
            <ToggleGroupItem value="1.3333333333333333" aria-label="使用四比三比例">
              4:3
            </ToggleGroupItem>
            <ToggleGroupItem value="1" aria-label="使用一比一比例">
              1:1
            </ToggleGroupItem>
            <ToggleGroupItem value="0.75" aria-label="使用三比四比例">
              3:4
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
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
