/** Client-side document meta (title / description / OG / Twitter). */

const DEFAULT_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : 'https://algo.zhiyuansofts.cn'

export type DocumentMetaInput = {
  title: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'article' | 'profile'
  siteName?: string
  noIndex?: boolean
}

function absUrl(pathOrUrl?: string): string {
  const v = (pathOrUrl || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  const origin =
    typeof window !== 'undefined' ? window.location.origin : DEFAULT_ORIGIN
  return v.startsWith('/') ? `${origin}${v}` : `${origin}/${v}`
}

function setMeta(
  attr: 'name' | 'property',
  key: string,
  content: string | undefined,
) {
  if (typeof document === 'undefined') return
  const sel = `meta[${attr}="${key}"]`
  let el = document.head.querySelector<HTMLMetaElement>(sel)
  const val = (content || '').trim()
  if (!val) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = val
}

function setLink(rel: string, href: string | undefined) {
  if (typeof document === 'undefined') return
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  const val = (href || '').trim()
  if (!val) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = val
}

/** Apply full page SEO meta (SPA navigation). */
export function applyDocumentMeta(input: DocumentMetaInput) {
  if (typeof document === 'undefined') return
  const title = (input.title || '').trim() || 'GoAlgo'
  document.title = title

  const desc = (input.description || '').trim()
  const image = absUrl(input.image)
  const url =
    absUrl(input.url) ||
    (typeof window !== 'undefined' ? window.location.href.split('#')[0] : '')
  const type = input.type || 'website'
  const site = (input.siteName || 'GoAlgo').trim() || 'GoAlgo'

  setMeta('name', 'description', desc)
  setMeta('name', 'robots', input.noIndex ? 'noindex,nofollow' : 'index,follow')
  setLink('canonical', url)

  setMeta('property', 'og:site_name', site)
  setMeta('property', 'og:type', type)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', desc)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', image)

  setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', desc)
  setMeta('name', 'twitter:image', image)
}

export function clipMetaText(s: string, max = 160): string {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  if ([...t].length <= max) return t
  return [...t].slice(0, max - 1).join('') + '…'
}

export function siteOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : DEFAULT_ORIGIN
}
