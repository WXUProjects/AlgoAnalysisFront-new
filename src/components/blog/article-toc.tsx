import { useEffect, useState } from 'react'
import {
  ensureOutlineAnchors,
  type TocItem,
} from '@/lib/blog-nav'
import { cn } from '@/lib/utils'

/** Topbar 3rem + gap — match sticky panel offset */
const SCROLL_OFFSET_PX = 3 * 16 + 12 + 8

type Props = {
  toc: TocItem[]
  getBody: () => HTMLElement | null
  variant?: 'chirpy' | 'mizuki'
}

/**
 * Article outline with scrollspy: highlights the section currently in view.
 */
export function ArticleToc({ toc, getBody, variant = 'chirpy' }: Props) {
  const [activeId, setActiveId] = useState(
    () => toc[0]?.id || 'article-top',
  )

  useEffect(() => {
    if (toc.length === 0) return

    const resolveActive = () => {
      ensureOutlineAnchors(getBody(), toc)
      let current = toc[0]?.id || 'article-top'
      for (const item of toc) {
        if (item.id === 'article-top') continue
        const el = document.getElementById(item.id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= SCROLL_OFFSET_PX) {
          current = item.id
        }
      }
      // near page bottom: pin last section
      const doc = document.documentElement
      if (
        window.innerHeight + window.scrollY >=
        doc.scrollHeight - 48
      ) {
        const last = [...toc].reverse().find((t) => t.id !== 'article-top')
        if (last) current = last.id
      }
      setActiveId((prev) => (prev === current ? prev : current))
    }

    resolveActive()
    window.addEventListener('scroll', resolveActive, { passive: true })
    window.addEventListener('resize', resolveActive)
    // MD async re-render may add heading ids late
    const t1 = window.setTimeout(resolveActive, 150)
    const t2 = window.setTimeout(resolveActive, 500)
    return () => {
      window.removeEventListener('scroll', resolveActive)
      window.removeEventListener('resize', resolveActive)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [toc, getBody])

  // Keep active item visible inside the sticky panel
  useEffect(() => {
    const link = document.querySelector<HTMLElement>(
      `[data-toc-id="${CSS.escape(activeId)}"]`,
    )
    link?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  function scrollTo(item: TocItem) {
    if (item.id === 'article-top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      history.replaceState(null, '', location.pathname)
      setActiveId('article-top')
      return
    }
    ensureOutlineAnchors(getBody(), toc)
    const el = document.getElementById(item.id)
    if (el) {
      const y =
        window.scrollY + el.getBoundingClientRect().top - SCROLL_OFFSET_PX + 4
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
      history.replaceState(null, '', `#${item.id}`)
      setActiveId(item.id)
    } else {
      getBody()?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (variant === 'mizuki') {
    return (
      <div className="mz-widget" id="toc-wrapper" aria-label="文章内容">
        <h2 className="mz-widget-title">文章内容</h2>
        <ul className="mz-panel-list">
          {toc.map((item) => (
            <li
              key={item.id}
              style={{
                paddingLeft: `${Math.max(0, item.level - 1) * 0.55}rem`,
              }}
            >
              <a
                href={item.id === 'article-top' ? '#' : `#${item.id}`}
                data-toc-id={item.id}
                className={cn(activeId === item.id && 'is-active')}
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo(item)
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <section
      className="mb-6 chirpy-toc"
      id="toc-wrapper"
      aria-label="文章内容"
    >
      <h2 className="chirpy-panel-heading">文章内容</h2>
      <nav className="mt-2">
        <ul className="chirpy-toc-list">
          {toc.map((item) => (
            <li
              key={item.id}
              className="chirpy-toc-item"
              data-level={item.level}
              style={{
                paddingLeft: `${Math.max(0, item.level - 1) * 0.7}rem`,
              }}
            >
              <a
                href={item.id === 'article-top' ? '#' : `#${item.id}`}
                data-toc-id={item.id}
                className={cn(
                  'chirpy-toc-link',
                  activeId === item.id && 'is-active',
                )}
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo(item)
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  )
}
