export interface ScrollPosition {
  container: number
  window: number
}

export interface ScrollPositionStore {
  get(key: string): ScrollPosition | undefined
  set(key: string, position: ScrollPosition): void
}

export function createScrollPositionStore(): ScrollPositionStore {
  const positions = new Map<string, ScrollPosition>()

  return {
    get: (key) => positions.get(key),
    set: (key, position) => positions.set(key, position),
  }
}

export function getScrollAction(
  navigationType: string,
  position?: ScrollPosition,
): 'restore' | 'top' {
  return navigationType === 'POP' && position ? 'restore' : 'top'
}
