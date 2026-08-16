import type { SpiderBinding } from '@shared/api'
import { OJ_PLATFORMS, type OjPlatform } from '@/lib/link'

export type OjBindingValues = Record<OjPlatform, string>

export interface OjBindingChange {
  platform: OjPlatform
  username: string
}

export interface OjBindingSaveFailure {
  change: OjBindingChange
  message?: string
}

export interface OjBindingSaveResult {
  saved: OjBindingChange[]
  failed: OjBindingSaveFailure[]
  syncError?: string
}

export function shouldInitializeOjBindings(
  open: boolean,
  wasOpen: boolean,
  lockedPlatform: OjPlatform | '',
  previousLockedPlatform: OjPlatform | '',
): boolean {
  return open && (!wasOpen || lockedPlatform !== previousLockedPlatform)
}

export function shouldCloseOjBindDialog(nextOpen: boolean, saving: boolean): boolean {
  return !nextOpen && !saving
}

export function shouldCloseOjBindDialogAfterSave(
  changeCount: number,
  savedCount: number,
  syncError?: string,
): boolean {
  return savedCount === changeCount && !syncError
}

export function mergeSavedOjBindings(
  initial: OjBindingValues,
  current: OjBindingValues,
  saved: OjBindingChange[],
): { initial: OjBindingValues; current: OjBindingValues } {
  return {
    initial: {
      ...initial,
      ...Object.fromEntries(saved.map(({ platform, username }) => [platform, username])),
    },
    current,
  }
}

export function initializeOjBindings(
  spiders: SpiderBinding[] | undefined,
): OjBindingValues {
  return Object.fromEntries(
    OJ_PLATFORMS.map(({ value }) => [
      value,
      spiders?.find(({ platform }) => platform === value)?.username ?? '',
    ]),
  ) as OjBindingValues
}

export function getOjBindingChanges(
  initial: OjBindingValues,
  current: OjBindingValues,
): OjBindingChange[] {
  return OJ_PLATFORMS.flatMap(({ value: platform }) => {
    const username = current[platform].trim()
    return username && username !== initial[platform].trim()
      ? [{ platform, username }]
      : []
  })
}

export async function saveOjBindings(
  changes: OjBindingChange[],
  save: (change: OjBindingChange) => Promise<{ success: boolean; message?: string }>,
  sync: (opts: { forceProfile: true; requireProfile: true }) => Promise<void>,
): Promise<OjBindingSaveResult> {
  const saved: OjBindingChange[] = []
  const failed: OjBindingSaveFailure[] = []

  for (const change of changes) {
    try {
      const result = await save(change)
      if (result.success) {
        saved.push(change)
      } else {
        failed.push({ change, message: result.message })
      }
    } catch (error) {
      failed.push({
        change,
        message: error instanceof Error ? error.message : undefined,
      })
    }
  }

  let syncError: string | undefined
  if (saved.length > 0) {
    try {
      await sync({ forceProfile: true, requireProfile: true })
    } catch (error) {
      syncError = error instanceof Error ? error.message : '同步失败'
    }
  }
  return { saved, failed, syncError }
}
