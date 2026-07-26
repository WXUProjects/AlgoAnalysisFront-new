/**
 * localStorage / sessionStorage 安全包装。
 * 隐私模式、配额满、被禁用等场景下 Web Storage 会直接抛错，
 * 统一 try-catch 后返回兜底值，避免整页崩溃。
 */

function safeGet(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}

function safeSet(storage: () => Storage, key: string, value: string): void {
  try {
    storage().setItem(key, value)
  } catch {
    /* ignore quota / private mode */
  }
}

function safeRemove(storage: () => Storage, key: string): void {
  try {
    storage().removeItem(key)
  } catch {
    /* ignore */
  }
}

export const safeLocalStorage = {
  get: (key: string) => safeGet(() => localStorage, key),
  set: (key: string, value: string) => safeSet(() => localStorage, key, value),
  remove: (key: string) => safeRemove(() => localStorage, key),
}

export const safeSessionStorage = {
  get: (key: string) => safeGet(() => sessionStorage, key),
  set: (key: string, value: string) => safeSet(() => sessionStorage, key, value),
  remove: (key: string) => safeRemove(() => sessionStorage, key),
}
