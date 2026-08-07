/** 动态流题目标题清洗 / 展示 */

const UUID_PREFIX = /^[0-9a-f]{32}\s+/i
const NUMERIC_ID_PREFIX = /^\d{4,}\s+/
/** 力扣常规 titleSlug：two-sum / daily-temperatures */
const LC_KEBAB_SLUG_PREFIX = /^[a-z0-9]+(?:-[a-z0-9]+)+\s+/
/**
 * 力扣 LCR / 剑指 Offer II 的 titleSlug：iIQa4I、8Zf90G（含大写、无连字符）。
 * 去掉后展示「LCR 038. 每日温度」或「每日温度」，避免动态里满是乱码。
 */
const LC_LCR_SLUG_PREFIX = /^[A-Za-z0-9]*[A-Z][A-Za-z0-9]{3,}\s+/

/** 去掉题库 title 里爬进来的 Editorial 等噪声 */
export function cleanBankTitle(title: string): string {
  let t = title.replace(/\s+/g, ' ').trim()
  // AtCoder 题目标题常带 "\n\t\t\tEditorial"
  t = t.replace(/\s*Editorial\s*$/i, '').trim()
  return t
}

/**
 * 清洗 submit_log.problem 原始串：
 * - 牛客主站：`uuid 标题` → 标题
 * - 牛客/洛谷数字 id：`316506 小红的排序` → 标题（保留 CF 的 `B-Nikita and Books`）
 * - 力扣：`two-sum 1. 两数之和` / `iIQa4I LCR 038. 每日温度` → 去掉 slug 前缀
 */
export function cleanSubmitProblem(problem: string): string {
  let p = problem.trim()
  if (!p) return ''

  if (UUID_PREFIX.test(p)) {
    p = p.replace(UUID_PREFIX, '').trim()
  } else if (NUMERIC_ID_PREFIX.test(p)) {
    p = p.replace(NUMERIC_ID_PREFIX, '').trim()
  } else if (LC_LCR_SLUG_PREFIX.test(p)) {
    p = p.replace(LC_LCR_SLUG_PREFIX, '').trim()
  } else if (LC_KEBAB_SLUG_PREFIX.test(p)) {
    p = p.replace(LC_KEBAB_SLUG_PREFIX, '').trim()
  }

  return cleanBankTitle(p)
}

/**
 * 优先用题库 title；否则清洗 submit 原始 problem。
 */
export function formatActivityProblemTitle(
  problem: string,
  bankTitle?: string | null,
  contest?: string,
): string {
  if (bankTitle) {
    const t = cleanBankTitle(bankTitle)
    if (t) return t
  }
  const cleaned = cleanSubmitProblem(problem)
  if (cleaned) return cleaned
  if (contest) return contest
  return '未知题目'
}