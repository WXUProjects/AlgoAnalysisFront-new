import {
  BarChart3Icon,
  Building2Icon,
  ClipboardCheckIcon,
  FlagIcon,
  MegaphoneIcon,
  NewspaperIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
  UsersRoundIcon,
  WorkflowIcon,
  WrenchIcon,
  type LucideIcon,
} from 'lucide-react'
import { Perm } from '@/lib/permissions'

/**
 * 管理后台导航唯一注册表：PC 侧栏（admin-sidebar-nav）与移动端「更多」
 * （mobile-more-sheet）都从这里取条目，避免两份手工同步的表漂移。
 *
 * 三分区：
 * - org     组织管理（当前组织范围）
 * - content 内容审核（题库/博客等全站内容治理，按内容审核权限点开放）
 * - site    站点管理（全站数据/用户/组织/触达/配置/运维）
 *
 * 条目显隐由权限驱动，anyOf 必须与 src/router.tsx 的 RequirePerm 守卫一致。
 */
export type AdminNavSection = 'org' | 'content' | 'site'

export type AdminNavEntry = {
  to: string
  label: string
  icon: LucideIcon
  /** 命中任一权限即显示（与路由守卫保持一致） */
  anyOf: string[]
  section: AdminNavSection
  isActive: (pathname: string) => boolean
}

export const ADMIN_SECTION_TITLES: Record<AdminNavSection, string> = {
  org: '组织管理',
  content: '内容审核',
  site: '站点管理',
}

function pathActive(
  pathname: string,
  to: string,
  opts?: { excludePrefix?: string },
): boolean {
  if (opts?.excludePrefix && pathname.startsWith(opts.excludePrefix)) {
    return false
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

/** 按权限过滤后的管理导航条目（顺序即展示顺序） */
export function adminNavEntries(can: (code: string) => boolean): AdminNavEntry[] {
  // 训练报告挂在「组织数据」页（#training-report），不再与「组织设置」共用 /admin/org
  const entries: AdminNavEntry[] = [
    // —— 组织管理（当前组织范围） ——
    {
      to: '/admin/statistics',
      label: '组织数据',
      icon: BarChart3Icon,
      anyOf: [Perm.OrgReportView],
      section: 'org',
      isActive: (p) => pathActive(p, '/admin/statistics'),
    },
    {
      to: '/admin/user',
      label: '成员与分组',
      icon: UsersIcon,
      anyOf: [
        Perm.OrgReportView,
        Perm.OrgGroupManage,
        Perm.OrgMemberRole,
        Perm.OrgMemberRemove,
        Perm.OrgRoleManage,
        Perm.OrgJoinReview,
      ],
      section: 'org',
      isActive: (p) => pathActive(p, '/admin/user'),
    },
    {
      to: '/admin/bulletin',
      label: '组织公告',
      icon: MegaphoneIcon,
      anyOf: [Perm.OrgBulletinManage],
      section: 'org',
      isActive: (p) => pathActive(p, '/admin/bulletin'),
    },
    {
      to: '/admin/org',
      label: '组织设置',
      icon: SettingsIcon,
      anyOf: [Perm.OrgInfoWrite, Perm.OrgPolicyToggle],
      section: 'org',
      isActive: (p) =>
        pathActive(p, '/admin/org', { excludePrefix: '/admin/orgs' }),
    },
    // —— 内容审核（全站内容治理） ——
    {
      to: '/admin/problem-edits',
      label: '题库审查',
      icon: ClipboardCheckIcon,
      anyOf: [Perm.ContentProblemReview],
      section: 'content',
      isActive: (p) => pathActive(p, '/admin/problem-edits'),
    },
    {
      to: '/admin/blog',
      label: '博客管理',
      icon: NewspaperIcon,
      anyOf: [Perm.ContentBlogModerate, Perm.SiteBlogBoard],
      section: 'content',
      isActive: (p) => pathActive(p, '/admin/blog'),
    },
    {
      to: '/admin/reports',
      label: '用户举报',
      icon: FlagIcon,
      anyOf: [Perm.ContentReportHandle],
      section: 'content',
      isActive: (p) => pathActive(p, '/admin/reports'),
    },
    {
      to: '/admin/paste-review',
      label: '粘贴板审查',
      icon: ClipboardCheckIcon,
      anyOf: [Perm.ContentCommunityMod, Perm.ContentReportHandle],
      section: 'content',
      isActive: (p) => pathActive(p, '/admin/paste-review'),
    },
    // —— 站点管理（全站范围）：数据 → 用户/组织/权限 → 触达 → 流水线 → 配置/运维 ——
    {
      to: '/admin/site-statistics',
      label: '站点数据',
      icon: BarChart3Icon,
      anyOf: [Perm.SiteStatsRead],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/site-statistics'),
    },
    {
      to: '/admin/site-users',
      label: '全站用户',
      icon: UsersRoundIcon,
      anyOf: [Perm.SiteUserList],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/site-users'),
    },
    {
      to: '/admin/orgs',
      label: '全站组织',
      icon: Building2Icon,
      anyOf: [Perm.SiteOrgList],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/orgs'),
    },
    {
      to: '/admin/roles',
      label: '角色权限',
      icon: ShieldCheckIcon,
      anyOf: [Perm.SiteRoleManage],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/roles'),
    },
    {
      to: '/admin/site-bulletin',
      label: '通知与公告',
      icon: MegaphoneIcon,
      anyOf: [Perm.SiteBulletin, Perm.SiteEmergency],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/site-bulletin'),
    },
    {
      to: '/admin/problem-progress',
      label: '题面处理',
      icon: WorkflowIcon,
      anyOf: [Perm.OrgReportView, Perm.SiteProblemOps],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/problem-progress'),
    },
    {
      to: '/admin/site',
      label: '站点设置',
      icon: SettingsIcon,
      anyOf: [Perm.SiteConfigRead, Perm.SiteConfigWrite],
      section: 'site',
      isActive: (p) => p === '/admin/site' || p.startsWith('/admin/site/'),
    },
    {
      to: '/admin/ops',
      label: '运维',
      icon: WrenchIcon,
      anyOf: [
        Perm.SiteSpiderOps,
        Perm.SiteProblemOps,
        Perm.SiteBackup,
        Perm.SiteConfigWrite,
      ],
      section: 'site',
      isActive: (p) => pathActive(p, '/admin/ops'),
    },
  ]
  return entries.filter((e) => e.anyOf.some(can))
}
