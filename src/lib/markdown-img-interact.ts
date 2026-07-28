/**
 * Markdown image interactions: click-to-zoom + preview hover layout toolbar.
 */

import type { ImageLayoutPatch } from '@/lib/blog-image'
import type { MarkdownImageAlign } from '@/lib/markdown'

const HANDLE_CLASS = 'md-img-resize-handle'
const WRAP_CLASS = 'md-img-resize-wrap'
const TOOLBAR_CLASS = 'md-img-toolbar'
const BADGE_CLASS = 'md-img-resize-badge'
const ZOOMABLE_CLASS = 'md-img-zoomable'
const BLOCK_CLASS = 'md-img-block'

/**
 * Mark images as zoomable and bind click → onOpen(src, alt).
 * Skips clicks on resize handles / toolbar.
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
    if (target.closest(`.${TOOLBAR_CLASS}`)) return
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

export type ImageLayoutBindOptions = {
  /** 提交布局变更到 Markdown 源码 */
  onLayoutChange: (src: string, patch: ImageLayoutPatch) => void
  minWidth?: number
  maxWidth?: number
}

type ReadLayout = {
  align: MarkdownImageAlign
  widthPx?: number
  widthPercent?: number
}

function readLayout(img: HTMLImageElement, wrap: HTMLElement): ReadLayout {
  const alignAttr = (
    img.getAttribute('data-md-align') ||
    wrap.getAttribute('data-md-align') ||
    ''
  ).toLowerCase()
  let align: MarkdownImageAlign = 'left'
  if (alignAttr === 'center' || wrap.classList.contains('md-img-align-center')) {
    align = 'center'
  } else if (
    alignAttr === 'right' ||
    wrap.classList.contains('md-img-align-right')
  ) {
    align = 'right'
  }

  const pctAttr = Number(img.getAttribute('data-md-wpct'))
  if (Number.isFinite(pctAttr) && pctAttr > 0) {
    return { align, widthPercent: pctAttr }
  }
  const style = img.style.width || ''
  const pctStyle = /^([\d.]+)%$/.exec(style.trim())
  if (pctStyle) {
    return { align, widthPercent: Number(pctStyle[1]) }
  }
  const pxAttr = Number(img.getAttribute('data-md-w') || img.getAttribute('width'))
  if (Number.isFinite(pxAttr) && pxAttr > 0) {
    return { align, widthPx: pxAttr }
  }
  const pxStyle = /^([\d.]+)px$/.exec(style.trim())
  if (pxStyle) {
    return { align, widthPx: Number(pxStyle[1]) }
  }
  return { align }
}

function applyAlignClass(wrap: HTMLElement, align: MarkdownImageAlign) {
  wrap.classList.remove(
    'md-img-align-left',
    'md-img-align-center',
    'md-img-align-right',
  )
  wrap.classList.add(`md-img-align-${align}`)
  if (align === 'left') wrap.removeAttribute('data-md-align')
  else wrap.setAttribute('data-md-align', align)
}

function applyLiveSize(
  img: HTMLImageElement,
  opts: { widthPx?: number; widthPercent?: number },
) {
  if (opts.widthPercent != null && opts.widthPercent > 0) {
    const p = Math.min(100, Math.round(opts.widthPercent))
    img.style.width = `${p}%`
    img.style.height = 'auto'
    img.style.maxWidth = '100%'
    img.removeAttribute('width')
    img.removeAttribute('height')
    img.setAttribute('data-md-wpct', String(p))
    img.removeAttribute('data-md-w')
    return
  }
  if (opts.widthPx != null && opts.widthPx > 0) {
    const w = Math.round(opts.widthPx)
    img.style.width = `${w}px`
    img.style.height = 'auto'
    img.setAttribute('width', String(w))
    img.setAttribute('data-md-w', String(w))
    img.removeAttribute('data-md-wpct')
  }
}

/**
 * 预览区：悬停显示对齐 / 百分比 / 拖拽改宽工具条。
 */
export function bindMarkdownImageResize(
  root: HTMLElement,
  opts: ImageLayoutBindOptions,
): () => void {
  const minW = opts.minWidth ?? 80
  const maxW = opts.maxWidth ?? 1600
  const cleanups: Array<() => void> = []

  const imgs = Array.from(root.querySelectorAll('img')).filter(
    (el): el is HTMLImageElement => el instanceof HTMLImageElement && !!el.src,
  )

  for (const img of imgs) {
    // 已有工具条包装则跳过
    if (img.closest(`.${WRAP_CLASS}`)) continue

    // 优先用渲染器输出的 md-img-block
    let host: HTMLElement
    const block = img.closest(`.${BLOCK_CLASS}`)
    if (block instanceof HTMLElement) {
      host = block
      host.classList.add(WRAP_CLASS)
    } else {
      host = document.createElement('span')
      host.className = `${WRAP_CLASS} ${BLOCK_CLASS} md-img-align-left`
      host.setAttribute('data-md-img', '1')
      const parent = img.parentNode
      if (!parent) continue
      parent.insertBefore(host, img)
      host.appendChild(img)
    }

    const layout0 = readLayout(img, host)
    applyAlignClass(host, layout0.align)

    const toolbar = document.createElement('div')
    toolbar.className = TOOLBAR_CLASS
    toolbar.setAttribute('role', 'toolbar')
    toolbar.setAttribute('aria-label', '图片布局')

    const mkBtn = (
      label: string,
      title: string,
      attrs: Record<string, string>,
    ) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'md-img-tb-btn'
      b.textContent = label
      b.title = title
      b.setAttribute('aria-label', title)
      for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v)
      return b
    }

    const alignGroup = document.createElement('div')
    alignGroup.className = 'md-img-tb-group'
    alignGroup.append(
      mkBtn('左', '靠左', { 'data-act': 'align', 'data-val': 'left' }),
      mkBtn('中', '居中', { 'data-act': 'align', 'data-val': 'center' }),
      mkBtn('右', '靠右', { 'data-act': 'align', 'data-val': 'right' }),
    )

    const pctGroup = document.createElement('div')
    pctGroup.className = 'md-img-tb-group'
    for (const p of [25, 50, 75, 100]) {
      pctGroup.append(
        mkBtn(`${p}%`, `宽度 ${p}%`, {
          'data-act': 'pct',
          'data-val': String(p),
        }),
      )
    }

    const extraGroup = document.createElement('div')
    extraGroup.className = 'md-img-tb-group'
    extraGroup.append(
      mkBtn('自定义%', '输入百分比宽度', { 'data-act': 'pct-custom' }),
      mkBtn('原图', '清除尺寸（自适应）', { 'data-act': 'size-clear' }),
    )

    const badge = document.createElement('span')
    badge.className = BADGE_CLASS
    badge.setAttribute('aria-hidden', 'true')

    toolbar.append(alignGroup, pctGroup, extraGroup)
    host.appendChild(toolbar)
    host.appendChild(badge)

    const handle = document.createElement('button')
    handle.type = 'button'
    handle.className = HANDLE_CLASS
    handle.setAttribute('aria-label', '拖动调整图片宽度')
    handle.tabIndex = 0
    host.appendChild(handle)

    const syncBadge = () => {
      const L = readLayout(img, host)
      if (L.widthPercent != null) badge.textContent = `${L.widthPercent}%`
      else if (L.widthPx != null) badge.textContent = `${Math.round(L.widthPx)}px`
      else badge.textContent = '自适应'
    }
    syncBadge()

    const syncActive = () => {
      const L = readLayout(img, host)
      toolbar.querySelectorAll('[data-act="align"]').forEach((el) => {
        const on = el.getAttribute('data-val') === L.align
        el.classList.toggle('is-active', on)
      })
      toolbar.querySelectorAll('[data-act="pct"]').forEach((el) => {
        const on =
          L.widthPercent != null &&
          String(L.widthPercent) === el.getAttribute('data-val')
        el.classList.toggle('is-active', on)
      })
    }
    syncActive()

    const commit = (patch: ImageLayoutPatch) => {
      const src = (img.getAttribute('src') || img.src || '').trim()
      if (!src) return
      opts.onLayoutChange(src, patch)
    }

    const onToolbarClick = (e: Event) => {
      const t = e.target
      if (!(t instanceof Element)) return
      const btn = t.closest('button[data-act]')
      if (!btn || !toolbar.contains(btn)) return
      e.preventDefault()
      e.stopPropagation()
      const act = btn.getAttribute('data-act')
      const val = btn.getAttribute('data-val') || ''

      if (act === 'align') {
        const align = (val as MarkdownImageAlign) || 'left'
        applyAlignClass(host, align)
        if (align !== 'left') img.setAttribute('data-md-align', align)
        else img.removeAttribute('data-md-align')
        syncActive()
        commit({ align })
        return
      }
      if (act === 'pct') {
        const p = Number(val)
        if (!Number.isFinite(p) || p <= 0) return
        applyLiveSize(img, { widthPercent: p })
        syncBadge()
        syncActive()
        commit({ widthPercent: p })
        return
      }
      if (act === 'pct-custom') {
        const cur = readLayout(img, host).widthPercent ?? 50
        const raw = window.prompt('图片宽度（相对正文，1–100%）', String(cur))
        if (raw == null) return
        const p = Math.round(Number(String(raw).replace(/%/g, '').trim()))
        if (!Number.isFinite(p) || p < 1 || p > 100) {
          return
        }
        applyLiveSize(img, { widthPercent: p })
        syncBadge()
        syncActive()
        commit({ widthPercent: p })
        return
      }
      if (act === 'size-clear') {
        img.style.width = ''
        img.style.height = ''
        img.style.maxWidth = ''
        img.removeAttribute('width')
        img.removeAttribute('height')
        img.removeAttribute('data-md-w')
        img.removeAttribute('data-md-wpct')
        syncBadge()
        syncActive()
        commit({ widthPx: null, widthPercent: null })
      }
    }
    toolbar.addEventListener('click', onToolbarClick)

    let dragging = false
    let startX = 0
    let startW = 0
    let lastW = 0
    let containerW = 0

    const naturalOrCurrent = () => {
      const L = readLayout(img, host)
      if (L.widthPercent != null && containerW > 0) {
        return (L.widthPercent / 100) * containerW
      }
      if (L.widthPx != null) return L.widthPx
      return img.clientWidth || img.naturalWidth || 400
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - startX
      let next = Math.round(startW + dx)
      next = Math.max(minW, Math.min(maxW, next, containerW || maxW))
      lastW = next
      // 拖拽时用百分比，便于响应式
      const pct =
        containerW > 0
          ? Math.max(1, Math.min(100, Math.round((next / containerW) * 100)))
          : 0
      if (pct > 0) {
        applyLiveSize(img, { widthPercent: pct })
        badge.textContent = `${pct}%`
      } else {
        applyLiveSize(img, { widthPx: next })
        badge.textContent = `${next}px`
      }
    }

    const endDrag = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      host.removeAttribute('data-resizing')
      try {
        handle.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      const src = (img.getAttribute('src') || img.src || '').trim()
      if (!src || lastW <= 0) return
      if (containerW > 0) {
        const pct = Math.max(
          1,
          Math.min(100, Math.round((lastW / containerW) * 100)),
        )
        commit({ widthPercent: pct })
      } else {
        commit({ widthPx: lastW })
      }
      syncActive()
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      e.preventDefault()
      e.stopPropagation()
      dragging = true
      containerW = host.parentElement?.clientWidth || root.clientWidth || 0
      startX = e.clientX
      startW = naturalOrCurrent()
      lastW = startW
      host.setAttribute('data-resizing', 'true')
      handle.setPointerCapture(e.pointerId)
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', endDrag)
      window.addEventListener('pointercancel', endDrag)
    }

    handle.addEventListener('pointerdown', onPointerDown)
    cleanups.push(() => {
      toolbar.removeEventListener('click', onToolbarClick)
      handle.removeEventListener('pointerdown', onPointerDown)
      toolbar.remove()
      badge.remove()
      handle.remove()
      host.classList.remove(WRAP_CLASS)
      // 若是我们新建的 host（无原 block），拆回
      if (
        host.parentNode &&
        !host.classList.contains(BLOCK_CLASS) === false &&
        host.getAttribute('data-md-img') === '1' &&
        !img.getAttribute('data-from-render')
      ) {
        // keep md-img-block from renderer; only remove toolbar chrome
      }
    })
  }

  return () => {
    for (const c of cleanups) c()
  }
}
