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
  if (/^[\dA-Za-z_-]{1,24}$/.test(t) && !/[\u4e00-\u9fff]/.test(t) && t.length <= 20) {
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
  if (title) return `${plat} · ${title}`
  if (ext) return `${plat} · ${ext}`
  return plat
}

function seedReady(seed?: {
  platform?: string
  title?: string
  externalId?: string
}): boolean {
  return (
    Boolean(seed?.platform) &&
    Boolean(seed?.title) &&
    !isPlaceholderTitle(seed!.title!, seed?.externalId)
  )
}

function fromSeed(
  problemId: number,
  seed: { platform?: string; title?: string; externalId?: string },
): RecognizedProblem {
  return {
    id: problemId,
    platform: seed.platform || '',
    title: seed.title || '',
    externalId: seed.externalId || '',
  }
}

/**
 * 在 deadlineMs 内轮询：真标题 / 题面 / seed 真名 → 识别成功。
 * 超时返回 null（不把 seed 当超时成功，由调用方关窗后后台继续）。
 */
export async function waitForProblemRecognized(
  problemId: number,
  opts?: {
    deadlineMs?: number
    intervalMs?: number
    seed?: { platform?: string; title?: string; externalId?: string }
    signal?: AbortSignal
  },
): Promise<RecognizedProblem | null> {
  const deadlineMs = opts?.deadlineMs ?? 5000
  const intervalMs = opts?.intervalMs ?? 400
  const seed = opts?.seed
  const start = Date.now()
  const ready = seedReady(seed)

  while (Date.now() - start < deadlineMs) {
    if (opts?.signal?.aborted) return null
    const res = await getProblem(problemId)
    if (res.success && res.data) {
      const p = res.data
      const hasRealTitle = !isPlaceholderTitle(p.title, p.externalId)
      const hasContent = Boolean(p.contentMd && p.contentMd.trim())
      if (hasRealTitle || hasContent) {
        return {
          id: p.id || problemId,
          platform: p.platform || seed?.platform || '',
          title: hasRealTitle ? p.title : seed?.title || p.title,
          externalId: p.externalId || seed?.externalId || '',
        }
      }
      // 库内占位，但加题接口已带回真名（如牛客 problem-list）
      if (ready) return fromSeed(p.id || problemId, seed!)
    } else if (ready) {
      return fromSeed(problemId, seed!)
    }
    const left = deadlineMs - (Date.now() - start)
    if (left <= 0) break
    await sleep(Math.min(intervalMs, left), opts?.signal)
  }
  return null
}

/**
 * 关窗后后台继续等识别结果。
 * success → onSuccess；失败态或总超时 → onFail。
 */
export function watchProblemInBackground(
  problemId: number,
  opts: {
    seed?: { platform?: string; title?: string; externalId?: string }
    maxMs?: number
    intervalMs?: number
    onSuccess: (p: RecognizedProblem) => void
    onFail: (reason: string) => void
  },
): () => void {
  const maxMs = opts.maxMs ?? 120_000
  const intervalMs = opts.intervalMs ?? 2000
  const start = Date.now()
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const tick = async () => {
    if (cancelled) return
    if (Date.now() - start >= maxMs) {
      opts.onFail('识别超时')
      return
    }
    try {
      const res = await getProblem(problemId)
      if (cancelled) return
      if (res.success && res.data) {
        const p = res.data
        const st = (p.status || '').toUpperCase()
        const hasRealTitle = !isPlaceholderTitle(p.title, p.externalId)
        const hasContent = Boolean(p.contentMd && p.contentMd.trim())
        if (hasRealTitle || hasContent) {
          opts.onSuccess({
            id: p.id || problemId,
            platform: p.platform || opts.seed?.platform || '',
            title: hasRealTitle ? p.title : opts.seed?.title || p.title,
            externalId: p.externalId || opts.seed?.externalId || '',
          })
          return
        }
        if (
          st.includes('FAILED') ||
          st === 'SKIPPED' ||
          st === 'FAILED_PERM'
        ) {
          opts.onFail(p.errorMsg || '题面拉取失败')
          return
        }
      }
    } catch {
      /* 网络抖动继续 */
    }
    if (cancelled) return
    timer = setTimeout(() => void tick(), intervalMs)
  }

  void tick()
  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('aborted', 'AbortError'))
      return
    }
    const t = setTimeout(() => resolve(), ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('aborted', 'AbortError'))
      },
      { once: true },
    )
  }).catch(() => undefined)
}
