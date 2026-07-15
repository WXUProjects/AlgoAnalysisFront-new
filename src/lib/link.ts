import type { Platform } from '@shared/api'

export type OjPlatform = Platform

export function getPlatformHomeLink(platform: string, username: string): string {
  switch (platform) {
    case 'AtCoder':
      return `https://atcoder.jp/users/${username}`
    case 'NowCoder':
      return `https://ac.nowcoder.com/acm/contest/profile/${username}`
    case 'LeetCode':
      return `https://leetcode.cn/u/${username}`
    case 'LuoGu':
      return `https://www.luogu.com.cn/user/${username}`
    case 'CodeForces':
      return `https://codeforces.com/profile/${username}`
    case 'QOJ':
      return `https://qoj.ac/user/profile/${username}`
    default:
      return ''
  }
}

export function getSubmitLink(
  platform: string,
  contest: string,
  submitId: string,
): string {
  switch (platform) {
    case 'AtCoder':
      return `https://atcoder.jp/contests/${contest}/submissions/${submitId}`
    case 'NowCoder':
      if (contest.startsWith('main|')) {
        return `https://www.nowcoder.com/profile/${contest.split('|')[1]}/codeBookDetail?submissionId=${submitId}`
      }
      return `https://ac.nowcoder.com/acm/contest/view-submission?submissionId=${submitId}`
    case 'LuoGu':
      return `https://www.luogu.com.cn/record/${submitId}`
    case 'CodeForces':
      return `https://codeforces.com/contest/${contest}/submission/${submitId}`
    case 'QOJ':
      return `https://qoj.ac/submission/${submitId}`
    default:
      return ''
  }
}

export const OJ_PLATFORMS: { value: OjPlatform; label: string }[] = [
  { value: 'AtCoder', label: 'AtCoder' },
  { value: 'NowCoder', label: '牛客' },
  { value: 'CodeForces', label: 'Codeforces' },
  { value: 'LuoGu', label: '洛谷' },
  { value: 'LeetCode', label: '力扣' },
  { value: 'QOJ', label: 'QOJ' },
]

export function normalizeOjQuery(oj?: string | null): OjPlatform | '' {
  if (!oj) return ''
  if (oj.toLowerCase() === 'luogu') return 'LuoGu'
  const hit = OJ_PLATFORMS.find(
    (p) => p.value.toLowerCase() === oj.toLowerCase() || p.label === oj,
  )
  return hit?.value ?? ''
}
