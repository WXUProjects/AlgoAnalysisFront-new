import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import React, { StrictMode, act, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  type Location,
} from 'react-router-dom'
import { createScrollPositionStore, type ScrollPositionStore } from '@/lib/route-scroll-restoration'
import { RouteScrollRestoration } from './route-scroll-restoration'

let root: Root | undefined
let dom: JSDOM | undefined
let frames: FrameRequestCallback[] = []
let resizeCallbacks: ResizeObserverCallback[] = []

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  root = undefined
  dom?.window.close()
  dom = undefined
  frames = []
  resizeCallbacks = []
})

function installDom() {
  dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost' })
  let windowY = 0
  Object.assign(globalThis, {
    React,
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallbacks.push(callback)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  })
  Object.defineProperty(dom.window, 'scrollY', { configurable: true, get: () => windowY })
  dom.window.scrollTo = ((_x: number, y: number) => { windowY = y }) as typeof dom.window.scrollTo
  dom.window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  }) as typeof dom.window.requestAnimationFrame
  dom.window.cancelAnimationFrame = ((id: number) => {
    frames[id - 1] = () => undefined
  }) as typeof dom.window.cancelAnimationFrame
  return dom.window.document.getElementById('root') as HTMLDivElement
}

async function flushFrames() {
  await act(async () => {
    const pending = frames
    frames = []
    pending.forEach((callback) => callback(0))
  })
}

async function flushAllFrames() {
  while (frames.length > 0) await flushFrames()
}

interface HarnessProps {
  onLocation(location: Location): void
}

function Harness({ onLocation }: HarnessProps) {
  const location = useLocation()
  const navigate = useNavigate()

  useLayoutEffect(() => {
    onLocation(location)
    if (location.pathname === '/detail') {
      const scroller = document.querySelector<HTMLElement>('[data-app-scroll-container]')!
      scroller.scrollTop = 125
    }
  }, [location, onLocation])

  return (
    <main data-app-scroll-container="">
      <button type="button" onClick={() => navigate('/detail')}>detail</button>
      <button type="button" onClick={() => navigate(-1)}>back</button>
    </main>
  )
}

async function renderRouter(store: ScrollPositionStore) {
  const container = installDom()
  const locations: Location[] = []
  const TestableRestoration = RouteScrollRestoration as React.ComponentType<{
    store: ScrollPositionStore
  }>
  root = createRoot(container)
  await act(async () => {
    root?.render(
      <StrictMode>
        <MemoryRouter initialEntries={[{ pathname: '/list', key: 'list' }]}>
          <TestableRestoration store={store} />
          <Harness onLocation={(location) => locations.push(location)} />
        </MemoryRouter>
      </StrictMode>,
    )
  })
  await flushFrames()
  await flushFrames()
  return { container, locations }
}

test('StrictMode initial POP without a saved position returns a nonzero scroller to the top', async () => {
  const store = createScrollPositionStore()
  const container = installDom()
  const scroller = document.createElement('main')
  scroller.dataset.appScrollContainer = ''
  scroller.scrollTop = 480
  document.body.append(scroller)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <StrictMode>
        <MemoryRouter initialEntries={[{ pathname: '/list', key: 'fresh-pop' }]}>
          <RouteScrollRestoration store={store} />
        </MemoryRouter>
      </StrictMode>,
    )
  })
  await flushAllFrames()

  assert.equal(scroller.scrollTop, 0)
  assert.equal(store.get('fresh-pop'), undefined)
})

test('PUSH returns the shared scroller to the top', async () => {
  const store = createScrollPositionStore()
  const { container } = await renderRouter(store)
  const scroller = container.querySelector<HTMLElement>('[data-app-scroll-container]')!
  scroller.scrollTop = 640
  scroller.dispatchEvent(new window.Event('scroll'))

  await act(async () => container.querySelector<HTMLButtonElement>('button')?.click())
  await flushAllFrames()

  assert.equal(scroller.scrollTop, 0)
})

test('a queued scroll from the previous entry cannot write the new PUSH key', async () => {
  const store = createScrollPositionStore()
  const { container, locations } = await renderRouter(store)
  const scroller = container.querySelector<HTMLElement>('[data-app-scroll-container]')!
  scroller.scrollTop = 640
  scroller.dispatchEvent(new window.Event('scroll'))

  await act(async () => {
    container.querySelector<HTMLButtonElement>('button')?.click()
  })

  const detailKey = locations.at(-1)!.key
  scroller.dispatchEvent(new window.Event('scroll'))
  assert.deepEqual(store.get('list'), { container: 640, window: 0 })
  assert.equal(store.get(detailKey), undefined)
})

test('navigate(-1) restores the previous list position after a PUSH', async () => {
  const store = createScrollPositionStore()
  const { container } = await renderRouter(store)
  const scroller = container.querySelector<HTMLElement>('[data-app-scroll-container]')!
  scroller.scrollTop = 640
  scroller.dispatchEvent(new window.Event('scroll'))

  await act(async () => container.querySelectorAll<HTMLButtonElement>('button')[0].click())
  await flushAllFrames()
  await act(async () => container.querySelectorAll<HTMLButtonElement>('button')[1].click())
  await flushAllFrames()

  assert.equal(scroller.scrollTop, 640)
})

async function renderPendingRestore(store: ScrollPositionStore) {
  const container = installDom()
  const scroller = document.createElement('main')
  scroller.dataset.appScrollContainer = ''
  document.body.append(scroller)
  let position = 0
  let maximum = 100
  Object.defineProperty(scroller, 'scrollTop', {
    configurable: true,
    get: () => position,
    set: (value: number) => {
      position = Math.min(value, maximum)
    },
  })
  store.set('pending-pop', { container: 640, window: 0 })
  root = createRoot(container)
  await act(async () => {
    root?.render(
      <MemoryRouter initialEntries={[{ pathname: '/list', key: 'pending-pop' }]}>
        <RouteScrollRestoration store={store} />
      </MemoryRouter>,
    )
  })
  await flushFrames()
  return {
    scroller,
    allowFullRestore: () => {
      maximum = 1000
    },
    notifyContentResize: async () => {
      await act(async () => {
        resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver))
      })
    },
  }
}

test('user wheel intent cancels a pending restore and saves the user position', async () => {
  const store = createScrollPositionStore()
  const { scroller } = await renderPendingRestore(store)
  assert.equal(scroller.scrollTop, 100)

  scroller.dispatchEvent(new window.Event('wheel'))
  scroller.scrollTop = 55
  scroller.dispatchEvent(new window.Event('scroll'))
  await flushAllFrames()

  assert.equal(scroller.scrollTop, 55)
  assert.deepEqual(store.get('pending-pop'), { container: 55, window: 0 })
})

test('pending restore continues when there is no user scroll intent', async () => {
  const store = createScrollPositionStore()
  const { scroller, allowFullRestore } = await renderPendingRestore(store)
  assert.equal(scroller.scrollTop, 100)

  allowFullRestore()
  await flushAllFrames()

  assert.equal(scroller.scrollTop, 640)
})

test('content growth resumes a restore after the initial frame budget is exhausted', async () => {
  const store = createScrollPositionStore()
  const { scroller, allowFullRestore, notifyContentResize } = await renderPendingRestore(store)

  await flushAllFrames()
  assert.equal(scroller.scrollTop, 100)

  allowFullRestore()
  await notifyContentResize()
  await flushAllFrames()

  assert.equal(scroller.scrollTop, 640)
})

test('StrictMode removes every scroll listener and restores browser history mode', async () => {
  const store = createScrollPositionStore()
  const container = installDom()
  const scroller = document.createElement('main')
  scroller.dataset.appScrollContainer = ''
  document.body.append(scroller)
  const added: string[] = []
  const removed: string[] = []
  const add = scroller.addEventListener.bind(scroller)
  const remove = scroller.removeEventListener.bind(scroller)
  scroller.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    added.push(type)
    add(type, listener, options)
  }) as typeof scroller.addEventListener
  scroller.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
    removed.push(type)
    remove(type, listener, options)
  }) as typeof scroller.removeEventListener
  window.history.scrollRestoration = 'auto'
  const TestableRestoration = RouteScrollRestoration as React.ComponentType<{ store: ScrollPositionStore }>
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <StrictMode>
        <MemoryRouter initialEntries={[{ pathname: '/list', key: 'strict-list' }]}>
          <TestableRestoration store={store} />
        </MemoryRouter>
      </StrictMode>,
    )
  })
  await act(() => root?.unmount())
  root = undefined

  assert.equal(added.filter((type) => type === 'scroll').length, 2)
  assert.equal(removed.filter((type) => type === 'scroll').length, 2)
  assert.equal(window.history.scrollRestoration, 'auto')
})
