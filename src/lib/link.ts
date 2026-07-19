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
    case 'LeetCode':
      // 力扣公开「最近通过」无提交代码页，不提供查看源码链接
      return ''
    default:
      return ''
  }
}

export const OJ_PLATFORMS: { value: OjPlatform; label: string }[] = [
  { value: 'AtCoder', label: 'AtCoder' },
  // 绑定仍是一个 NowCoder 账号；画像饼图统一展示 NowCoder
  { value: 'NowCoder', label: '牛客' },
  { value: 'CodeForces', label: 'Codeforces' },
  { value: 'LuoGu', label: '洛谷' },
  { value: 'LeetCode', label: '力扣' },
  { value: 'QOJ', label: 'QOJ' },
]

/** 绑定 OJ 时的填写引导（按平台） */
export const OJ_BIND_GUIDES: Record<
  OjPlatform,
  { fieldLabel: string; placeholder: string; tip: string; example?: string }
> = {
  AtCoder: {
    fieldLabel: '用户名',
    placeholder: '例如 AoralsFout',
    tip: '填写 AtCoder 用户名（主页 URL 最后一段）。',
    example: 'https://atcoder.jp/users/AoralsFout → AoralsFout',
  },
  LuoGu: {
    fieldLabel: '用户名',
    placeholder: '填写洛谷用户名',
    tip: '填写洛谷用户名，不要填用户编号。',
  },
  NowCoder: {
    fieldLabel: '用户 ID',
    placeholder: '例如 978880410',
    tip: '填写牛客用户 ID（主页 URL 末尾数字），不是昵称。',
    example: 'https://ac.nowcoder.com/acm/contest/profile/978880410 → 978880410',
  },
  CodeForces: {
    fieldLabel: '用户名',
    placeholder: '例如 tourist',
    tip: '填写 Codeforces 用户名（主页 URL 最后一段）。',
    example: 'https://codeforces.com/profile/tourist → tourist',
  },
  QOJ: {
    fieldLabel: '用户名',
    placeholder: '例如 sanenchen',
    tip: '填写 QOJ 用户名（主页 URL 最后一段）。',
    example: 'https://qoj.ac/user/profile/sanenchen → sanenchen',
  },
  LeetCode: {
    fieldLabel: '用户名',
    placeholder: '例如 sanenchen-o',
    tip: '填写力扣个人主页 /u/ 后面那一段。计入热力/做题数；「最近通过」会进题库、动态与提交历史（默认 AC，无代码）。',
    example: 'https://leetcode.cn/u/sanenchen-o/ → sanenchen-o',
  },
}

export function getOjBindGuide(platform: OjPlatform) {
  return OJ_BIND_GUIDES[platform]
}

export function normalizeOjQuery(oj?: string | null): OjPlatform | '' {
  if (!oj) return ''
  if (oj.toLowerCase() === 'luogu') return 'LuoGu'
  const hit = OJ_PLATFORMS.find(
    (p) => p.value.toLowerCase() === oj.toLowerCase() || p.label === oj,
  )
  return hit?.value ?? ''
}
