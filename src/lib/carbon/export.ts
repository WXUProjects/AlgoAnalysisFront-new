/** Rasterize a Carbon-style frame DOM node to PNG data URL. */

function waitForFonts(primaryFont?: string, fontSize = 14): Promise<void> {
  return (async () => {
    try {
      if (document.fonts?.ready) await document.fonts.ready
      if (primaryFont && document.fonts?.load) {
        await document.fonts.load(`${fontSize}px ${quoteCssFont(primaryFont)}`)
      }
    } catch {
      /* ignore */
    }
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    )
  })()
}

function quoteCssFont(name: string): string {
  const t = name.trim()
  if (!t) return 'monospace'
  if (/^(monospace|serif|sans-serif)$/i.test(t)) return t
  return `'${t.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function paintTextNodes(
  ctx: CanvasRenderingContext2D,
  root: Element,
  frameRect: DOMRect,
  fallbackColor: string,
  fallbackFontSize: number,
  fallbackFontFamily: string,
) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node.nodeValue
    if (text == null || text === '') continue
    const parent = node.parentElement
    if (!parent) continue
    const cs = window.getComputedStyle(parent)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue

    const color = cs.color || fallbackColor
    const fontSize = cs.fontSize || `${fallbackFontSize}px`
    const fontFamily = cs.fontFamily || fallbackFontFamily
    const font =
      (cs.fontStyle && cs.fontStyle !== 'normal' ? `${cs.fontStyle} ` : '') +
      (cs.fontWeight && cs.fontWeight !== '400' && cs.fontWeight !== 'normal'
        ? `${cs.fontWeight} `
        : '') +
      `${fontSize} ${fontFamily}`
    ctx.fillStyle = color
    ctx.font = font
    ctx.textBaseline = 'alphabetic'

    let baselineOffset = parseFloat(fontSize) * 0.8
    try {
      const metrics = ctx.measureText('Mg')
      if (typeof metrics.fontBoundingBoxAscent === 'number') {
        baselineOffset = metrics.fontBoundingBoxAscent
      } else if (typeof metrics.actualBoundingBoxAscent === 'number') {
        baselineOffset = metrics.actualBoundingBoxAscent
      }
    } catch {
      /* ignore */
    }

    const range = document.createRange()
    range.selectNodeContents(node)
    const rects = range.getClientRects()
    if (rects.length === 0) continue

    if (rects.length === 1 || !text.includes('\n')) {
      // Single rect or continuous run: paint whole text at first rect
      // Multi-rect without newlines = wrapping; paint per-rect by slicing
      if (rects.length === 1) {
        const r = rects[0]
        const x = r.left - frameRect.left
        const y = r.top - frameRect.top + baselineOffset
        ctx.fillText(text, x, y)
      } else {
        // Approximate wrap: measure cumulative width
        let offset = 0
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i]
          const x = r.left - frameRect.left
          const y = r.top - frameRect.top + baselineOffset
          let end = offset
          let slice = ''
          while (end < text.length) {
            const next = text.slice(offset, end + 1)
            if (ctx.measureText(next).width > r.width + 1 && end > offset) break
            slice = next
            end++
          }
          if (!slice && offset < text.length) {
            slice = text[offset]
            end = offset + 1
          }
          if (slice) ctx.fillText(slice, x, y)
          offset = end
        }
      }
    } else {
      // Multi-line text node: split by newline and paint line by line
      const lines = text.split('\n')
      for (let i = 0; i < lines.length && i < rects.length; i++) {
        const r = rects[i]
        const x = r.left - frameRect.left
        const y = r.top - frameRect.top + baselineOffset
        if (lines[i]) ctx.fillText(lines[i], x, y)
      }
    }
  }
}

async function renderFrameToPng(
  frame: HTMLElement,
  width: number,
  height: number,
  scale: number,
  opts: {
    dropShadow: boolean
    backgroundColor: string
    codeBg: string
    textColor: string
    fontSize: number
    fontFamily: string
  },
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(width * scale))
  canvas.height = Math.max(1, Math.floor(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.scale(scale, scale)

  const frameRect = frame.getBoundingClientRect()
  const frameBg =
    window.getComputedStyle(frame).backgroundColor || opts.backgroundColor
  ctx.fillStyle = frameBg
  ctx.fillRect(0, 0, width, height)

  const win = frame.querySelector('.carbon-window') as HTMLElement | null
  if (win) {
    const wr = win.getBoundingClientRect()
    const x = wr.left - frameRect.left
    const y = wr.top - frameRect.top
    const w = wr.width
    const h = wr.height
    const wcs = window.getComputedStyle(win)
    const radius = parseFloat(wcs.borderRadius) || 0

    if (opts.dropShadow) {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.55)'
      ctx.shadowBlur = 68
      ctx.shadowOffsetY = 20
      ctx.fillStyle = wcs.backgroundColor || opts.codeBg
      roundRectPath(ctx, x, y, w, h, radius)
      ctx.fill()
      ctx.restore()
    } else {
      ctx.fillStyle = wcs.backgroundColor || opts.codeBg
      roundRectPath(ctx, x, y, w, h, radius)
      ctx.fill()
    }

    if (wcs.borderTopWidth && parseFloat(wcs.borderTopWidth) > 0) {
      ctx.strokeStyle = wcs.borderTopColor || '#fff'
      ctx.lineWidth = parseFloat(wcs.borderTopWidth) || 2
      roundRectPath(ctx, x, y, w, h, radius)
      ctx.stroke()
    }
  }

  frame.querySelectorAll('.carbon-dot').forEach((dot) => {
    const r = (dot as HTMLElement).getBoundingClientRect()
    const cs = window.getComputedStyle(dot)
    const cx = r.left - frameRect.left + r.width / 2
    const cy = r.top - frameRect.top + r.height / 2
    ctx.beginPath()
    ctx.fillStyle = cs.backgroundColor || '#888'
    ctx.arc(cx, cy, r.width / 2, 0, Math.PI * 2)
    ctx.fill()
  })

  const codeArea = frame.querySelector('.carbon-code') || frame
  paintTextNodes(
    ctx,
    codeArea,
    frameRect,
    opts.textColor,
    opts.fontSize,
    opts.fontFamily,
  )

  return canvas.toDataURL('image/png')
}

function cloneWithInlineStyles(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement
  const srcNodes = [source, ...Array.from(source.querySelectorAll('*'))]
  const dstNodes = [clone, ...Array.from(clone.querySelectorAll('*'))]
  const props = [
    'display',
    'position',
    'box-sizing',
    'width',
    'height',
    'min-width',
    'max-width',
    'min-height',
    'margin',
    'padding',
    'background',
    'background-color',
    'color',
    'opacity',
    'border',
    'border-radius',
    'box-shadow',
    'font',
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'line-height',
    'letter-spacing',
    'white-space',
    'tab-size',
    'text-align',
    'overflow',
    'flex-direction',
    'align-items',
    'justify-content',
    'gap',
  ]

  for (let i = 0; i < srcNodes.length; i++) {
    const src = srcNodes[i] as HTMLElement
    const dst = dstNodes[i] as HTMLElement
    if (!src || !dst || src.nodeType !== 1) continue
    const cs = window.getComputedStyle(src)
    let cssText = ''
    for (const p of props) {
      const v = cs.getPropertyValue(p)
      if (v) cssText += `${p}:${v};`
    }
    const existing = dst.getAttribute('style') || ''
    dst.setAttribute('style', cssText + existing)
    dst.removeAttribute('class')
  }
  clone.style.width = `${source.scrollWidth}px`
  clone.style.height = `${source.scrollHeight}px`
  clone.style.margin = '0'
  return clone
}

async function exportViaSvg(
  frame: HTMLElement,
  width: number,
  height: number,
  scale: number,
): Promise<string> {
  const clone = cloneWithInlineStyles(frame)
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  const serializer = new XMLSerializer()
  let xhtml = serializer.serializeToString(clone)
  if (!/xmlns=/.test(xhtml)) {
    xhtml = xhtml.replace(
      /^<([a-zA-Z0-9-]+)/,
      '<$1 xmlns="http://www.w3.org/1999/xhtml"',
    )
  }
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject></svg>`
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('svg image load failed'))
    el.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(width * scale))
  canvas.height = Math.max(1, Math.floor(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.drawImage(img, 0, 0)
  return canvas.toDataURL('image/png')
}

export type ExportPngOptions = {
  scale?: number
  dropShadow?: boolean
  backgroundColor?: string
  codeBg?: string
  textColor?: string
  fontSize?: number
  fontFamily?: string
  primaryFont?: string
}

export async function exportCarbonPng(
  frame: HTMLElement,
  options: ExportPngOptions = {},
): Promise<string> {
  const scale = options.scale ?? 2
  const fontSize = options.fontSize ?? 14
  const fontFamily = options.fontFamily ?? 'monospace'
  await waitForFonts(options.primaryFont, fontSize)

  const width = Math.ceil(frame.scrollWidth)
  const height = Math.ceil(frame.scrollHeight)

  try {
    return await renderFrameToPng(frame, width, height, scale, {
      dropShadow: options.dropShadow ?? true,
      backgroundColor: options.backgroundColor ?? 'rgba(171, 184, 195, 1)',
      codeBg: options.codeBg ?? '#1F1F1F',
      textColor: options.textColor ?? '#D4D4D4',
      fontSize,
      fontFamily,
    })
  } catch {
    return exportViaSvg(frame, width, height, scale)
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function copyDataUrlToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || 'image/png']: blob }),
      ])
      return true
    }
  } catch {
    /* fallthrough */
  }
  return false
}
