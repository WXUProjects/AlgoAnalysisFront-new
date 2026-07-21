import { getProblem } from '@/api/problem'

const PLATFORM_LABEL: Record<string, string> = {
  NowCoder: '牛客',
  AtCoder: 'AtCoder',
  CodeForces: 'Codeforces',
  LuoGu: '洛谷',
  LeetCode: '力扣',
  QOJ: 'QOJ',
  Manual: '手动',
}

export type RecognizedProblem = {
  id: number
  platform: string
  title: string
  externalId: string
}

export function platformDisplayName(platform: string): string {
  return PLATFORM_LABEL[platform] || platform || '未知平台'
}

/** 是否像占位标题（仅 external_id / 题号），尚无真题名 */
export function isPlaceholderTitle(title: string, externalId?: string): boolean {
  const t = title.trim()
  if (!t) return true
  if (externalId && t === externalId.trim()) return true
  // 纯数字 / 纯字母数字短 id
  if (/^[\dA-Za-z_-]{1,24}$/.test(t) && !/[\u4e00-\u9fff]/.test(t) && t.length <= 20) {
    // 允许 CF 的 1791A 仍算占位，等真题名
    return true
  }
  return false
}

export function formatRecognizedProblemLine(p: {
  platform?: string
  title?: string
  externalId?: string
}): string {
  const plat = platformDisplayName(p.platform || '')
  const title = (p.title || '').trim()
  const ext = (p.externalId || '').trim()
  if (title && !isPlaceholderTitle(title, ext)) {
    return `${plat} · ${title}`
  }
  if (title) return `${plat} · ${title}`
  if (ext) return `${plat} · ${ext}`
  return plat
}

/**
 * 加题后在 deadlineMs 内轮询题面/标题是否就绪。
 * 就绪则返回识别摘要，超时返回 null（调用方走后台提示）。
 */
export async function waitForProblemRecognized(
  problemId: number,
  opts?: {
    deadlineMs?: number
    intervalMs?: number
    seed?: { platform?: string; title?: string; externalId?: string }
  },
): Promise<RecognizedProblem | null> {
  const deadlineMs = opts?.deadlineMs ?? 5000
  const intervalMs = opts?.intervalMs ?? 400
  const seed = opts?.seed
  const start = Date.now()

  const seedReady =
    Boolean(seed?.platform) &&
    Boolean(seed?.title) &&
    !isPlaceholderTitle(seed!.title!, seed?.externalId)

  const fromSeed = (): RecognizedProblem => ({
    id: problemId,
    platform: seed!.platform!,
    title: seed!.title!,
    externalId: seed?.externalId || '',
  })

  while (Date.now() - start < deadlineMs) {
    const res = await getProblem(problemId)
    if (res.success && res.data) {
      const p = res.data
      const hasRealTitle = !isPlaceholderTitle(p.title, p.externalId)
      const hasContent = Boolean(p.contentMd && p.contentMd.trim())
      if (hasRealTitle || hasContent) {
        return {
          id: p.id || problemId,
          platform: p.platform || seed?.platform || '',
          title: p.title || seed?.title || '',
          externalId: p.externalId || seed?.externalId || '',
        }
      }
      // 库内仍是占位标题，但加题时已解析到真名（如牛客 problem-list）
      if (seedReady) {
        return {
          id: p.id || problemId,
          platform: seed!.platform || p.platform,
          title: seed!.title!,
          externalId: seed!.externalId || p.externalId || '',
        }
      }
    } else if (seedReady) {
      return fromSeed()
    }
    const left = deadlineMs - (Date.now() - start)
    if (left <= 0) break
    await sleep(Math.min(intervalMs, left))
  }
  // 超时但 seed 已有真名：仍弹出确认
  if (seedReady) return fromSeed()
  return null
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
