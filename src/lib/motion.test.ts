/**
 * Unit tests for GSAP motion helpers.
 * Run: npx tsx --test src/lib/motion.test.ts
 */
import { describe, it, before, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})

const win = dom.window

// Install browser globals before loading gsap / motion
Object.defineProperty(globalThis, 'window', { value: win, configurable: true })
Object.defineProperty(globalThis, 'document', {
  value: win.document,
  configurable: true,
})
Object.defineProperty(globalThis, 'HTMLElement', {
  value: win.HTMLElement,
  configurable: true,
})
Object.defineProperty(globalThis, 'Element', {
  value: win.Element,
  configurable: true,
})
Object.defineProperty(globalThis, 'Node', {
  value: win.Node,
  configurable: true,
})
Object.defineProperty(globalThis, 'getComputedStyle', {
  value: win.getComputedStyle.bind(win),
  configurable: true,
})
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (cb: FrameRequestCallback) =>
    win.setTimeout(() => cb(performance.now()), 16) as unknown as number,
  configurable: true,
})
Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  value: (id: number) => win.clearTimeout(id),
  configurable: true,
})
// Prefer Node performance — jsdom's can recurse on teardown
Object.defineProperty(globalThis, 'performance', {
  value: globalThis.performance ?? win.performance,
  configurable: true,
})

win.matchMedia = ((query: string) =>
  ({
    // Prefer fine-pointer hover so hover-motion tests exercise the tween path
    matches: query.includes('hover') || query.includes('pointer'),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false
    },
  })) as typeof win.matchMedia

// Dynamic import after globals — same modules the app ships
const { default: gsap } = await import('gsap')
const motion = await import('./motion.ts')

function el(): HTMLElement {
  const node = document.createElement('div')
  document.body.appendChild(node)
  return node as HTMLElement
}

function flush() {
  // Force every active tween to completion
  gsap.globalTimeline.time(gsap.globalTimeline.duration() + 10)
}

before(() => {
  // Sanity: gsap core API present
  assert.equal(typeof gsap.to, 'function')
  assert.equal(typeof gsap.killTweensOf, 'function')
  assert.equal(typeof window.matchMedia, 'function')
})

beforeEach(() => {
  gsap.globalTimeline.clear()
  document.body.innerHTML = ''
})

afterEach(() => {
  gsap.globalTimeline.clear()
  gsap.ticker.sleep()
  document.body.innerHTML = ''
})

describe('routeDepth / resolveDirection / enterOffset', () => {
  it('resolves forward when depth increases', () => {
    assert.equal(
      motion.resolveDirection('/question-bank', '/question-bank/detail/1'),
      'forward',
    )
  })

  it('resolves back when depth decreases', () => {
    assert.equal(motion.resolveDirection('/contest/abc', '/contest'), 'back')
  })

  it('resolves lateral for same depth', () => {
    assert.equal(motion.resolveDirection('/bulletin', '/discover'), 'lateral')
  })

  it('enterOffset is always upward-push (same y) for every direction', () => {
    const y = motion.MOTION.y.lateral
    assert.equal(motion.enterOffset('forward').y, y)
    assert.equal(motion.enterOffset('back').y, y)
    assert.equal(motion.enterOffset('lateral').y, y)
    assert.equal(motion.enterOffset('forward').x, 0)
  })
})

describe('animateEnter / animateStagger / animateTitle', () => {
  it('animateEnter ends at opacity 1, y 0', () => {
    const node = el()
    motion.animateEnter(node, 'forward')
    flush()
    assert.equal(Number(gsap.getProperty(node, 'opacity')), 1)
    assert.equal(Number(gsap.getProperty(node, 'y')), 0)
  })

  it('animateStagger ends all items visible', () => {
    const a = el()
    const b = el()
    motion.animateStagger([a, b], 'lateral')
    flush()
    assert.equal(Number(gsap.getProperty(a, 'opacity')), 1)
    assert.equal(Number(gsap.getProperty(b, 'opacity')), 1)
    assert.equal(Number(gsap.getProperty(a, 'y')), 0)
  })

  it('animateTitle ends at rest', () => {
    const node = el()
    motion.animateTitle(node)
    flush()
    assert.equal(Number(gsap.getProperty(node, 'opacity')), 1)
  })
})

describe('overlay / panel / dialog / popover', () => {
  it('animateOverlayIn ends opacity 1', () => {
    const node = el()
    motion.animateOverlayIn(node)
    flush()
    assert.equal(Number(gsap.getProperty(node, 'opacity')), 1)
  })

  it('animateOverlayOut ends opacity 0', () => {
    const node = el()
    gsap.set(node, { opacity: 1 })
    motion.animateOverlayOut(node)
    flush()
    assert.equal(Number(gsap.getProperty(node, 'opacity')), 0)
  })

  it('animatePanelIn from right ends at 0 offset', () => {
    const node = el()
    motion.animatePanelIn(node, 'right')
    flush()
    assert.equal(Number(gsap.getProperty(node, 'xPercent')), 0)
    assert.equal(Number(gsap.getProperty(node, 'yPercent')), 0)
  })

  it('animatePanelOut to left ends negative xPercent', () => {
    const node = el()
    motion.animatePanelOut(node, 'left')
    flush()
    assert.equal(Number(gsap.getProperty(node, 'xPercent')), -100)
  })

  it('animateDialogIn centers with full opacity/scale', () => {
    const node = el()
    motion.animateDialogIn(node)
    flush()
    assert.equal(Number(gsap.getProperty(node, 'opacity')), 1)
    assert.equal(Number(gsap.getProperty(node, 'scale')), 1)
    assert.equal(Number(gsap.getProperty(node, 'xPercent')), -50)
    assert.equal(Number(gsap.getProperty(node, 'yPercent')), -50)
  })

  it('animateDialogOut shrinks and fades', () => {
    const node = el()
    motion.animateDialogIn(node)
    flush()
    motion.animateDialogOut(node)
    flush()
    assert.equal(Number(gsap.getProperty(node, 'opacity')), 0)
    assert.ok(Number(gsap.getProperty(node, 'scale')) < 1)
  })

  it('animatePopoverIn ends visible', () => {
    const node = el()
    motion.animatePopoverIn(node)
    flush()
    assert.equal(Number(gsap.getProperty(node, 'opacity')), 1)
    assert.equal(Number(gsap.getProperty(node, 'scale')), 1)
  })

  it('animatePopoverOut ends faded', () => {
    const node = el()
    motion.animatePopoverOut(node)
    flush()
    assert.equal(Number(gsap.getProperty(node, 'opacity')), 0)
  })
})

describe('press / hover / switch', () => {
  it('animatePressIn scales down', () => {
    const node = el()
    motion.animatePressIn(node, { scale: 0.97 })
    flush()
    assert.ok(Math.abs(Number(gsap.getProperty(node, 'scale')) - 0.97) < 0.01)
  })

  it('animatePressOut returns to scale 1', () => {
    const node = el()
    motion.animatePressIn(node, { scale: 0.97 })
    flush()
    motion.animatePressOut(node)
    flush()
    assert.ok(Math.abs(Number(gsap.getProperty(node, 'scale')) - 1) < 0.01)
  })

  it('animateHoverLiftIn moves up', () => {
    const node = el()
    motion.animateHoverLiftIn(node, { y: -4 })
    flush()
    assert.equal(Number(gsap.getProperty(node, 'y')), -4)
  })

  it('animateHoverLiftOut returns to 0', () => {
    const node = el()
    motion.animateHoverLiftIn(node, { y: -4 })
    flush()
    motion.animateHoverLiftOut(node)
    flush()
    assert.equal(Number(gsap.getProperty(node, 'y')), 0)
  })

  it('animateSwitchThumb travels when checked', () => {
    const node = el()
    motion.animateSwitchThumb(node, true, 12)
    flush()
    assert.equal(Number(gsap.getProperty(node, 'x')), 12)
    motion.animateSwitchThumb(node, false, 12)
    flush()
    assert.equal(Number(gsap.getProperty(node, 'x')), 0)
  })
})

describe('tab helpers', () => {
  it('animateTabContent ends visible', () => {
    const node = el()
    motion.animateTabContent(node)
    flush()
    assert.equal(Number(gsap.getProperty(node, 'opacity')), 1)
  })

  it('animateTabPill sets geometry', () => {
    const node = el()
    motion.animateTabPill(
      node,
      { x: 10, y: 4, width: 80, height: 28 },
      { instant: true },
    )
    flush()
    assert.equal(Number(gsap.getProperty(node, 'x')), 10)
    assert.equal(Number(gsap.getProperty(node, 'width')), 80)
    assert.equal(Number(gsap.getProperty(node, 'opacity')), 1)
  })

  it('animateTabPill animates x only when not instant', () => {
    const node = el()
    gsap.set(node, { x: 0, y: 0, width: 40, height: 28, opacity: 1 })
    motion.animateTabPill(node, { x: 20, y: 0, width: 80, height: 28 })
    flush()
    assert.equal(Number(gsap.getProperty(node, 'x')), 20)
    assert.equal(Number(gsap.getProperty(node, 'width')), 80)
  })
})

describe('presence helpers', () => {
  it('presenceStyleVars returns duration CSS vars', () => {
    const v = motion.presenceStyleVars('panel')
    assert.ok(v['--gsap-presence-in-ms']?.endsWith('ms'))
    assert.ok(v['--gsap-presence-out-ms']?.endsWith('ms'))
    const tip = motion.presenceStyleVars('tooltip')
    assert.ok(tip['--gsap-presence-out-ms']?.endsWith('ms'))
  })

  it('GSAP_PRESENCE_CLASS is stable', () => {
    assert.equal(motion.GSAP_PRESENCE_CLASS, 'gsap-presence')
  })

  it('MOTION tokens stay within UI budget', () => {
    assert.ok(motion.MOTION.duration.base <= 0.3)
    assert.ok(motion.MOTION.duration.panelIn <= 0.3)
    assert.ok(motion.MOTION.press.scale >= 0.95)
    assert.ok(motion.MOTION.hover.heatScale <= 1.2)
    assert.equal(motion.MOTION.ease.sheetOut, 'power2.out')
    assert.equal(motion.MOTION.ease.pressOut, 'power2.out')
  })
})
