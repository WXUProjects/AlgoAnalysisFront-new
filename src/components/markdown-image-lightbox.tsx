import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Lightbox from 'yet-another-react-lightbox'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'

export type MarkdownLightboxSlide = {
  src: string
  alt?: string
}

type Props = {
  /** All article images for gallery navigation */
  slides: MarkdownLightboxSlide[]
  /** Currently focused image src */
  src: string | null
  alt?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Portal-based multi-image lightbox so shell/sidebar stay mounted.
 * Uses yet-another-react-lightbox.
 */
export function MarkdownImageLightbox({
  slides,
  src,
  alt = '',
  open,
  onOpenChange,
}: Props) {
  const [index, setIndex] = useState(0)

  const resolvedSlides = useMemo(() => {
    if (slides.length > 0) {
      return slides.map((s) => ({
        src: s.src,
        alt: s.alt || '',
        description: s.alt || undefined,
      }))
    }
    if (src) {
      return [{ src, alt: alt || '', description: alt || undefined }]
    }
    return []
  }, [slides, src, alt])

  useEffect(() => {
    if (!open || !src) return
    const i = resolvedSlides.findIndex((s) => s.src === src)
    setIndex(i >= 0 ? i : 0)
  }, [open, src, resolvedSlides])

  if (typeof document === 'undefined') return null

  return createPortal(
    <Lightbox
      open={open && resolvedSlides.length > 0}
      close={() => onOpenChange(false)}
      index={index}
      slides={resolvedSlides}
      on={{ view: ({ index: i }) => setIndex(i) }}
      controller={{ closeOnBackdropClick: true }}
      plugins={[Zoom, Fullscreen]}
      zoom={{
        scrollToZoom: true,
        maxZoomPixelRatio: 3,
        wheelZoomDistanceFactor: 0.12,
      }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.92)' },
      }}
    />,
    document.body,
  )
}
