/**
 * Markdown image interactions: click-to-zoom + preview drag-resize.
 * Pure DOM helpers used by MarkdownBody / MarkdownEditor.
 */

const HANDLE_CLASS = 'md-img-resize-handle'
const WRAP_CLASS = 'md-img-resize-wrap'
const BADGE_CLASS = 'md-img-resize-badge'
const ZOOMABLE_CLASS = 'md-img-zoomable'

/**
 * Mark images as zoomable and bind click → onOpen(src, alt).
 * Skips clicks on resize handles.
 */
export function bindMarkdownImageLightbox(
  root: HTMLElement,
  onOpen: (src: string, alt: string) => void,
): () => void {
  const imgs = root.querySelectorAll('img')
  imgs.forEach((img) => {
    if (!(img instanceof HTMLImageElement)) return
    if (!img.getAttribute('src')) return
    img.classList.add(ZOOMABLE_CLASS)
    if (!img.getAttribute('title')) {
      img.setAttribute('title', '点击放大')
    }
  })

  const onClick = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest(`.${HANDLE_CLASS}`)) return
    const img = target.closest('img')
    if (!img || !(img instanceof HTMLImageElement) || !root.contains(img)) return
    const src = (img.currentSrc || img.src || '').trim()
    if (!src) return
    event.preventDefault()
    event.stopPropagation()
    onOpen(src, img.alt || '')
  }

  root.addEventListener('click', onClick)
  return () => {
    root.removeEventListener('click', onClick)
    root.querySelectorAll(`img.${ZOOMABLE_CLASS}`).forEach((el) => {
      el.classList.remove(ZOOMABLE_CLASS)
    })
  }
}

export type ImageResizeBindOptions = {
  /** Called when user finishes a resize drag (commit width into markdown). */
  onWidthChange: (src: string, width: number) => void
  minWidth?: number
  maxWidth?: number
}

/**
 * Wrap each img with a SE resize handle. Live style updates while dragging;
 * onWidthChange fires on pointerup.
 */
export function bindMarkdownImageResize(
  root: HTMLElement,
  opts: ImageResizeBindOptions,
): () => void {
  const minW = opts.minWidth ?? 80
  const maxW = opts.maxWidth ?? 1600
  const cleanups: Array<() => void> = []

  const imgs = Array.from(root.querySelectorAll('img')).filter(
    (el): el is HTMLImageElement => el instanceof HTMLImageElement && !!el.src,
  )

  for (const img of imgs) {
    // Skip if already wrapped (rebind after re-render)
    if (img.parentElement?.classList.contains(WRAP_CLASS)) continue

    const wrap = document.createElement('span')
    wrap.className = WRAP_CLASS
    wrap.setAttribute('data-md-img-resize', '1')

    const parent = img.parentNode
    if (!parent) continue
    parent.insertBefore(wrap, img)
    wrap.appendChild(img)

    const badge = document.createElement('span')
    badge.className = BADGE_CLASS
    badge.setAttribute('aria-hidden', 'true')
    wrap.appendChild(badge)

    const handle = document.createElement('button')
    handle.type = 'button'
    handle.className = HANDLE_CLASS
    handle.setAttribute('aria-label', '拖动调整图片宽度')
    handle.tabIndex = 0
    wrap.appendChild(handle)

    const syncBadge = (w: number) => {
      badge.textContent = `${Math.round(w)}px`
    }

    const naturalOrCurrent = () => {
      const attrW = Number(img.getAttribute('width'))
      if (Number.isFinite(attrW) && attrW > 0) return attrW
      const styleW = parseFloat(img.style.width)
      if (Number.isFinite(styleW) && styleW > 0) return styleW
      return img.clientWidth || img.naturalWidth || 400
    }
    syncBadge(naturalOrCurrent())

    let dragging = false
    let startX = 0
    let startW = 0
    let lastW = 0

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - startX
      // Drag right edge outward increases width
      let next = Math.round(startW + dx)
      next = Math.max(minW, Math.min(maxW, next))
      // Also cap by container
      const containerW = root.clientWidth || maxW
      next = Math.min(next, containerW)
      lastW = next
      img.style.width = `${next}px`
      img.style.height = 'auto'
      img.setAttribute('width', String(next))
      syncBadge(next)
    }

    const endDrag = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      wrap.removeAttribute('data-resizing')
      try {
        handle.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      const src = (img.getAttribute('src') || img.src || '').trim()
      if (src && lastW > 0) {
        opts.onWidthChange(src, lastW)
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      e.preventDefault()
      e.stopPropagation()
      dragging = true
      startX = e.clientX
      startW = naturalOrCurrent()
      lastW = startW
      wrap.setAttribute('data-resizing', 'true')
      handle.setPointerCapture(e.pointerId)
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', endDrag)
      window.addEventListener('pointercancel', endDrag)
    }

    handle.addEventListener('pointerdown', onPointerDown)
    cleanups.push(() => {
      handle.removeEventListener('pointerdown', onPointerDown)
      // unwrap
      if (wrap.parentNode) {
        wrap.parentNode.insertBefore(img, wrap)
        wrap.remove()
      }
    })
  }

  return () => {
    for (const c of cleanups) c()
  }
}
