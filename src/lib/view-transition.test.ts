/**
 * Unit tests for View Transition helpers (shipped module).
 * Run: npx tsx --test src/lib/view-transition.test.ts
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})

const win = dom.window

Object.defineProperty(globalThis, 'window', { value: win, configurable: true })
Object.defineProperty(globalThis, 'document', {
  value: win.document,
  configurable: true,
})
Object.defineProperty(globalThis, 'HTMLElement', {
  value: win.HTMLElement,
  configurable: true,
})

let reducedMotion = false

win.matchMedia = ((query: string) =>
  ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
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

const vt = await import('./view-transition.ts')

beforeEach(() => {
  reducedMotion = false
  delete (win.document as Document & { startViewTransition?: unknown })
    .startViewTransition
  win.document.documentElement.removeAttribute(vt.VT_DIRECTION_ATTR)
  win.document.documentElement.removeAttribute(vt.VT_ACTIVE_ATTR)
  win.document.documentElement.className = ''
  vt.clearSharedElement()
})

afterEach(() => {
  vt.clearSharedElement()
  vt.clearVtDirection(win.document)
})

describe('supportsViewTransition / shouldUseViewTransition', () => {
  it('returns false when startViewTransition is missing', () => {
    assert.equal(vt.supportsViewTransition(win.document), false)
    assert.equal(vt.shouldUseViewTransition(win.document), false)
  })

  it('returns true when API exists and motion is allowed', () => {
    ;(
      win.document as Document & {
        startViewTransition: (cb: () => void) => {
          finished: Promise<void>
          ready: Promise<void>
          updateCallbackDone: Promise<void>
          skipTransition: () => void
        }
      }
    ).startViewTransition = (cb) => {
      void cb()
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      }
    }
    assert.equal(vt.supportsViewTransition(win.document), true)
    assert.equal(vt.shouldUseViewTransition(win.document), true)
  })

  it('short-circuits on prefers-reduced-motion', () => {
    ;(
      win.document as Document & {
        startViewTransition: (cb: () => void) => unknown
      }
    ).startViewTransition = (cb) => {
      void cb()
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      }
    }
    reducedMotion = true
    assert.equal(vt.supportsViewTransition(win.document), true)
    assert.equal(vt.shouldUseViewTransition(win.document), false)
  })
})

describe('runViewTransition', () => {
  it('always runs the update callback when VT API is missing', () => {
    let ran = 0
    const result = vt.runViewTransition(() => {
      ran += 1
    }, win.document)
    assert.equal(ran, 1)
    assert.equal(result, null)
  })

  it('calls document.startViewTransition when allowed', () => {
    let updateViaVt = 0
    let startCalls = 0
    ;(
      win.document as Document & {
        startViewTransition: (cb: () => void) => {
          finished: Promise<void>
          ready: Promise<void>
          updateCallbackDone: Promise<void>
          skipTransition: () => void
        }
      }
    ).startViewTransition = (cb) => {
      startCalls += 1
      cb()
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      }
    }
    const result = vt.runViewTransition(() => {
      updateViaVt += 1
    }, win.document)
    assert.equal(startCalls, 1)
    assert.equal(updateViaVt, 1)
    assert.ok(result)
    assert.equal(typeof result!.skipTransition, 'function')
  })

  it('still runs update under reduced motion without starting VT', () => {
    let ran = 0
    let startCalls = 0
    ;(
      win.document as Document & {
        startViewTransition: (cb: () => void) => unknown
      }
    ).startViewTransition = (cb) => {
      startCalls += 1
      void cb()
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      }
    }
    reducedMotion = true
    const result = vt.runViewTransition(() => {
      ran += 1
    }, win.document)
    assert.equal(ran, 1)
    assert.equal(startCalls, 0)
    assert.equal(result, null)
  })
})

describe('direction mapping', () => {
  it('maps directions to CSS class names', () => {
    assert.equal(vt.VT_DIRECTION_CLASS.forward, 'vt-forward')
    assert.equal(vt.VT_DIRECTION_CLASS.back, 'vt-back')
    assert.equal(vt.VT_DIRECTION_CLASS.lateral, 'vt-lateral')
  })

  it('setVtDirection writes data attr and class on <html>', () => {
    vt.setVtDirection('forward', win.document)
    assert.equal(
      win.document.documentElement.getAttribute(vt.VT_DIRECTION_ATTR),
      'forward',
    )
    assert.ok(
      win.document.documentElement.classList.contains(
        vt.VT_DIRECTION_CLASS.forward,
      ),
    )
    vt.setVtDirection('back', win.document)
    assert.equal(
      win.document.documentElement.getAttribute(vt.VT_DIRECTION_ATTR),
      'back',
    )
    assert.ok(
      !win.document.documentElement.classList.contains(
        vt.VT_DIRECTION_CLASS.forward,
      ),
    )
    assert.ok(
      win.document.documentElement.classList.contains(vt.VT_DIRECTION_CLASS.back),
    )
  })

  it('clearVtDirection removes attrs and classes', () => {
    vt.setVtDirection('lateral', win.document)
    vt.setVtActive(true, win.document)
    vt.clearVtDirection(win.document)
    assert.equal(
      win.document.documentElement.getAttribute(vt.VT_DIRECTION_ATTR),
      null,
    )
    assert.equal(
      win.document.documentElement.getAttribute(vt.VT_ACTIVE_ATTR),
      null,
    )
  })
})

describe('shared-name pairing / clear', () => {
  it('builds stable paired names for list and detail', () => {
    const listName = vt.sharedElementName('contest', 'abc-1')
    const detailName = vt.sharedElementName('contest', 'abc-1')
    assert.equal(listName, detailName)
    assert.equal(listName, 'vt-contest-abc-1')
    assert.equal(vt.sharedElementName('problem', 42), 'vt-problem-42')
    assert.equal(vt.sharedElementName('user', 'alice'), 'vt-user-alice')
    assert.ok(vt.sharedElementName('blog', 'u/s').startsWith('vt-blog-'))
  })

  it('prepare / isActive / clear lifecycle', () => {
    const name = vt.prepareSharedElement('problem', 7)
    assert.equal(name, 'vt-problem-7')
    assert.equal(vt.getActiveSharedName('problem'), name)
    assert.equal(vt.isActiveShared('problem', 7), true)
    assert.equal(vt.isActiveShared('problem', 8), false)
    vt.clearSharedElement('problem')
    assert.equal(vt.getActiveSharedName('problem'), null)
  })

  it('sharedElementStyle returns viewTransitionName when VT allowed', () => {
    ;(
      win.document as Document & {
        startViewTransition: (cb: () => void) => unknown
      }
    ).startViewTransition = (cb) => {
      void cb()
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      }
    }
    const style = vt.sharedElementStyle('user', 'bob')
    assert.deepEqual(style, { viewTransitionName: 'vt-user-bob' })

    vt.prepareSharedElement('contest', 'c1')
    assert.deepEqual(vt.sharedElementStyle('contest', 'c1', { activeOnly: true }), {
      viewTransitionName: 'vt-contest-c1',
    })
    assert.equal(
      vt.sharedElementStyle('contest', 'c2', { activeOnly: true }),
      undefined,
    )
  })

  it('sharedElementStyle is undefined when VT not available', () => {
    assert.equal(vt.sharedElementStyle('user', 'x'), undefined)
  })
})

describe('withViewTransition / wrapNavigateWithViewTransition', () => {
  it('defaults viewTransition from capability', () => {
    assert.equal(vt.withViewTransition().viewTransition, false)
    ;(
      win.document as Document & {
        startViewTransition: (cb: () => void) => unknown
      }
    ).startViewTransition = (cb) => {
      void cb()
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      }
    }
    assert.equal(vt.withViewTransition().viewTransition, true)
    assert.equal(vt.withViewTransition({ viewTransition: false }).viewTransition, false)
  })

  it('wrapNavigateWithViewTransition injects flag on string navigations', () => {
    const calls: Array<{ to: unknown; opts: unknown }> = []
    const navigate = (to: unknown, opts?: unknown) => {
      calls.push({ to, opts })
      return Promise.resolve()
    }
    ;(
      win.document as Document & {
        startViewTransition: (cb: () => void) => unknown
      }
    ).startViewTransition = (cb) => {
      void cb()
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      }
    }
    const wrapped = vt.wrapNavigateWithViewTransition(navigate)
    void wrapped('/contest/1')
    void wrapped('/x', { replace: true })
    void wrapped(-1)
    assert.equal(calls.length, 3)
    assert.deepEqual(calls[0].opts, { viewTransition: true })
    assert.equal(
      (calls[1].opts as { viewTransition: boolean; replace: boolean }).replace,
      true,
    )
    assert.equal(
      (calls[1].opts as { viewTransition: boolean }).viewTransition,
      true,
    )
    // numeric history go is not force-wrapped
    assert.equal(calls[2].opts, undefined)
  })
})
