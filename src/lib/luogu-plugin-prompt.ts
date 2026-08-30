export type LuoguPromptInput = {
  previousUid: string
  currentUid: string
  savedPlatforms: string[]
  authorizedUids: string[]
  promptedUid?: string
}

export function shouldShowLuoguInstallPrompt(input: LuoguPromptInput): boolean {
  return input.savedPlatforms.includes('LuoGu') && input.currentUid !== input.previousUid && Boolean(input.currentUid) && !input.authorizedUids.includes(input.currentUid) && input.promptedUid !== input.currentUid
}
