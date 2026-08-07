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
    case 'LOJ':
      return `https://loj.ac/u/${username}`
    case 'UOJ':
      return `https://uoj.ac/user/profile/${username}`
    case 'POJ':
      return `http://poj.org/userstatus?user_id=${encodeURIComponent(username)}`
    default:
      return ''
  }
}

/**
 * 去掉误入库的「平台:」前缀（如 LuoGu:286690434 → 286690434）。
 * 力扣合成 id（lc-*）保持不变。
 */
export function normalizeSubmitId(
  platform: string,
  submitId: string,
): string {
  const id = (submitId || '').trim()
  if (!id) return id
  if (platform === 'LeetCode' && id.startsWith('lc-')) return id
  // LOJ / UOJ 自带前缀的 submit_id 保持原样（链接侧再剥）
  if (platform === 'LOJ' && id.startsWith('loj-')) return id
  if (platform === 'UOJ' && id.startsWith('uoj-ac-')) return id
  const plat = (platform || '').trim()
  if (plat) {
    const pref = `${plat}:`
    if (id.startsWith(pref)) return id.slice(pref.length).trim()
  }
  const m = id.match(
    /^(LuoGu|Luogu|CodeForces|Codeforces|CF|AtCoder|Atcoder|NowCoder|Nowcoder|LeetCode|Leetcode|QOJ|Qoj|LOJ|Loj|UOJ|Uoj|POJ|Poj):(.+)$/i,
  )
  if (m) return m[2].trim()
  return id
}

export function getSubmitLink(
  platform: string,
  contest: string,
  submitId: string,
): string {
  const sid = normalizeSubmitId(platform, submitId)
  if (!sid) return ''
  switch (platform) {
    case 'AtCoder':
      return `https://atcoder.jp/contests/${contest}/submissions/${sid}`
    case 'NowCoder':
      if (contest.startsWith('main|')) {
        return `https://www.nowcoder.com/profile/${contest.split('|')[1]}/codeBookDetail?submissionId=${sid}`
      }
      return `https://ac.nowcoder.com/acm/contest/view-submission?submissionId=${sid}`
    case 'LuoGu':
      return `https://www.luogu.com.cn/record/${sid}`
    case 'CodeForces':
      return `https://codeforces.com/contest/${contest}/submission/${sid}`
    case 'QOJ':
      return `https://qoj.ac/submission/${sid}`
    case 'LOJ': {
      const num = sid.startsWith('loj-') ? sid.slice(4) : sid
      return num ? `https://loj.ac/s/${num}` : ''
    }
    case 'UOJ': {
      // 合成 AC：uoj-ac-{userId}-{problemId} → 题目页（无源码）
      const m = sid.match(/^uoj-ac-\d+-(\d+)$/)
      if (m) return `https://uoj.ac/problem/${m[1]}`
      if (/^\d+$/.test(sid)) return `https://uoj.ac/submission/${sid}`
      return ''
    }
    case 'POJ':
      // 源码页（他人源码可能需登录；Run ID 为数字）
      return /^\d+$/.test(sid)
        ? `http://poj.org/showsource?solution_id=${sid}`
        : ''
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
  { value: 'LOJ', label: 'LOJ' },
  { value: 'UOJ', label: 'UOJ' },
  { value: 'POJ', label: 'POJ' },
]

/** 绑定 OJ 时的填写引导（按平台） */
export const OJ_BIND_GUIDES: Record<
  OjPlatform,
  { fieldLabel: string; placeholder: string; tip: string; example?: string }
> = {
  AtCoder: {
    fieldLabel: '用户名',
    placeholder: '例如 AoralsFout',
    tip: '复制主页链接最后一段名字就行～',
    example: 'https://atcoder.jp/users/AoralsFout → AoralsFout',
  },
  LuoGu: {
    fieldLabel: '用户编号',
    placeholder: '例如 983446',
    tip: '填洛谷「用户编号」（纯数字），不是昵称，主页链接末尾能看到。',
    example: 'https://www.luogu.com.cn/user/983446 → 983446',
  },
  NowCoder: {
    fieldLabel: '用户 ID',
    placeholder: '例如 978880410',
    tip: '填牛客主页链接末尾的数字 ID，不是昵称哦。',
    example: 'https://ac.nowcoder.com/acm/contest/profile/978880410 → 978880410',
  },
  CodeForces: {
    fieldLabel: '用户名',
    placeholder: '例如 tourist',
    tip: '复制主页链接最后一段名字就行～',
    example: 'https://codeforces.com/profile/tourist → tourist',
  },
  QOJ: {
    fieldLabel: '用户名',
    placeholder: '例如 sanenchen',
    tip: '复制主页链接最后一段名字就行～',
    example: 'https://qoj.ac/user/profile/sanenchen → sanenchen',
  },
  LOJ: {
    fieldLabel: '用户名',
    placeholder: '例如 supy',
    tip: '填 LibreOJ（loj.ac）主页链接里的名字就行～',
    example: 'https://loj.ac/u/supy → supy',
  },
  UOJ: {
    fieldLabel: '用户名',
    placeholder: '例如 lgvc',
    tip: '复制主页链接最后一段名字就行～目前只同步通过的题和评分。',
    example: 'https://uoj.ac/user/profile/lgvc → lgvc',
  },
  POJ: {
    fieldLabel: 'User ID',
    placeholder: '例如 sanenchen',
    tip: '填 POJ 的 User ID（注册时的用户名，区分大小写）。',
    example: 'http://poj.org/userstatus?user_id=sanenchen → sanenchen',
  },
  LeetCode: {
    fieldLabel: '用户名',
    placeholder: '例如 sanenchen-o',
    tip: '填力扣个人主页 /u/ 后面那段就行～',
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
