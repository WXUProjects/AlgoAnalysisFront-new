export type RadarInput = {
  tag: string
  score: number
  acCount: number
}

export type RadarChartData = {
  subject: string
  fullName: string
  score: number
  acCount: number
}

function isJunkLabel(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return true

  const upper = trimmed.toUpperCase()
  return (
    upper === 'UNKNOWN' ||
    upper === 'NULL' ||
    upper === 'NONE' ||
    trimmed === '未知' ||
    trimmed === '未标注'
  )
}

function shortLabel(name: string, max: number): string {
  return name.length <= max ? name : `${name.slice(0, max)}…`
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, finiteOrZero(value)))
}

function normalizeAcCount(value: number): number {
  return Math.max(0, finiteOrZero(value))
}

function compareText(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/**
 * Prepare a deterministic, display-safe top-eight dataset for the ability radar.
 * Scores are normalized before sorting so out-of-range values cannot change rank.
 */
export function buildRadarChartData(items: RadarInput[]): RadarChartData[] {
  return items
    .map((item) => {
      const fullName = typeof item.tag === 'string' ? item.tag.trim() : ''
      return {
        fullName,
        score: clampScore(item.score),
        acCount: normalizeAcCount(item.acCount),
      }
    })
    .filter((item) => !isJunkLabel(item.fullName))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.acCount - a.acCount ||
        compareText(a.fullName, b.fullName),
    )
    .slice(0, 8)
    .map(({ fullName, score, acCount }) => ({
      subject: shortLabel(fullName, 6),
      fullName,
      score,
      acCount,
    }))
}
