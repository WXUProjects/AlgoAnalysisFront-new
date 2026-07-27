import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildMobileMoreAccountLinks,
  buildMobileMoreSections,
} from '@/components/mobile-more-sheet'
import { hasAnyAdminPerm, Perm, permsFromPayload } from '@/lib/permissions'
import { canAccessAdminFromPayload, OrgRole } from '@/lib/roles'

type Payload = {
  isSiteAdmin?: boolean
  orgRole?: string
  roleId?: number | null
  pm?: string
}

/** 与 AuthContext 相同口径：payload → perms/can/canAccessAdmin */
function authOpts(
  payload: Payload | null,
  extra?: {
    isLogin?: boolean
    username?: string
    showAbout?: boolean
    orgName?: string | null
    /** 覆盖 payload 推导（模拟仅有自定义角色权限的用户） */
    perms?: Set<string>
  },
) {
  const perms = extra?.perms ?? permsFromPayload(payload)
  return {
    isLogin: extra?.isLogin ?? Boolean(payload),
    isMemberLike: true,
    username: extra?.username,
    showAbout: extra?.showAbout ?? false,
    canAccessAdmin: canAccessAdminFromPayload(payload) || hasAnyAdminPerm(perms),
    can: (code: string) => perms.has(code),
    orgName: extra?.orgName,
    user: payload,
  }
}

function sectionTitles(sections: ReturnType<typeof buildMobileMoreSections>) {
  return sections.map((s) => s.title).filter(Boolean)
}

function sectionLabels(
  sections: ReturnType<typeof buildMobileMoreSections>,
  titleMatch: string | RegExp,
) {
  const sec = sections.find((s) => {
    if (!s.title) return false
    if (typeof titleMatch === 'string') {
      return s.title === titleMatch || s.title.includes(titleMatch)
    }
    return titleMatch.test(s.title)
  })
  return sec?.items.map((i) => i.label) ?? []
}

function allLabels(sections: ReturnType<typeof buildMobileMoreSections>) {
  return sections.flatMap((s) => s.items.map((i) => i.label))
}

describe('buildMobileMoreSections（权限驱动）', () => {
  it('未登录：浏览 + 关于，无管理分区', () => {
    const sections = buildMobileMoreSections(
      authOpts(null, { isLogin: false, showAbout: true }),
    )
    assert.deepEqual(sectionTitles(sections), ['浏览', '我的'])
    assert.ok(allLabels(sections).includes('关于我们'))
  })

  it('普通成员：个人资料 + 我的组织，无管理分区', () => {
    const sections = buildMobileMoreSections(
      authOpts(
        { orgRole: OrgRole.Member },
        { username: 'alice', showAbout: true },
      ),
    )
    const labels = allLabels(sections)
    assert.ok(labels.includes('个人资料'))
    assert.ok(labels.includes('我的组织'))
    assert.ok(!sectionTitles(sections).some((t) => t?.includes('组织管理')))
    assert.ok(!sectionTitles(sections).includes('站点管理'))
    assert.ok(!sectionTitles(sections).includes('内容审核'))
  })

  it('教练：组织管理（教练）含组织数据，无组织设置；训练报告在组织数据页', () => {
    const sections = buildMobileMoreSections(
      authOpts(
        { orgRole: OrgRole.Coach },
        { username: 'coach1', orgName: '算法队' },
      ),
    )
    assert.ok(
      sectionTitles(sections).some(
        (t) => t?.includes('组织管理') && t.includes('教练'),
      ),
    )
    const manage = sectionLabels(sections, '组织管理')
    assert.ok(manage.includes('教练工作台'))
    assert.ok(manage.includes('组织数据'))
    assert.ok(manage.includes('组织公告'))
    assert.ok(manage.includes('成员与分组'))
    assert.ok(!manage.includes('组织设置'))
    assert.ok(!manage.includes('训练报告'))
    assert.ok(!manage.includes('组织训练报告'))
    // 持 OrgReportView → 题库识别入口可见（与路由守卫一致），其余站点条目不可见
    const site = sectionLabels(sections, /^站点管理$/)
    assert.deepEqual(site, ['题库识别'])
    assert.ok(!allLabels(sections).includes('站点数据'))
    assert.ok(!allLabels(sections).includes('站点设置'))
  })

  it('队长：组织管理（队长）含组织数据，无组织设置', () => {
    const sections = buildMobileMoreSections(
      authOpts(
        { orgRole: OrgRole.Captain },
        { username: 'cap1', orgName: '算法队' },
      ),
    )
    assert.ok(
      sectionTitles(sections).some(
        (t) => t?.includes('组织管理') && t.includes('队长'),
      ),
    )
    const manage = sectionLabels(sections, '组织管理')
    assert.ok(manage.includes('队长工作台'))
    assert.ok(manage.includes('组织数据'))
    assert.ok(!manage.includes('组织设置'))
    assert.ok(!manage.includes('训练报告'))
    assert.ok(!manage.includes('组织训练报告'))
  })

  it('团队管理员：组织设置可见，训练报告不单独占导航', () => {
    const sections = buildMobileMoreSections(
      authOpts(
        { orgRole: OrgRole.OrgAdmin },
        { username: 'oa1', orgName: '算法队' },
      ),
    )
    assert.ok(
      sectionTitles(sections).some(
        (t) => t?.includes('组织管理') && t.includes('团队管理员'),
      ),
    )
    const manage = sectionLabels(sections, '组织管理')
    assert.ok(manage.includes('组织工作台'))
    assert.ok(manage.includes('组织设置'))
    assert.ok(manage.includes('组织数据'))
    assert.ok(!manage.includes('组织训练报告'))
    assert.ok(!manage.includes('训练报告'))
    assert.ok(!allLabels(sections).includes('全站用户'))
    assert.ok(!allLabels(sections).includes('站点设置'))
    assert.ok(!allLabels(sections).includes('角色权限'))
  })

  it('站点管理员：组织管理与站点管理分区标题分明，站点条目齐全', () => {
    const sections = buildMobileMoreSections(
      authOpts(
        { isSiteAdmin: true },
        { username: 'admin', showAbout: true, orgName: '公共域' },
      ),
    )
    const titles = sectionTitles(sections)
    assert.ok(titles.some((t) => t?.startsWith('组织管理')))
    assert.ok(titles.includes('站点管理'))
    // 组织区不得再用「站点管理」当标题
    assert.ok(!titles.some((t) => t?.startsWith('站点管理 ·')))

    const org = sectionLabels(sections, '组织管理')
    assert.ok(org.includes('组织工作台'))
    assert.ok(org.includes('组织数据'))
    assert.ok(org.includes('组织设置'))

    const site = sectionLabels(sections, /^站点管理$/)
    assert.ok(site.includes('站点数据'))
    assert.ok(site.includes('站点访问'))
    assert.ok(site.includes('全站用户'))
    assert.ok(site.includes('全站组织'))
    assert.ok(site.includes('题库识别'))
    assert.ok(site.includes('题库审查'))
    assert.ok(site.includes('博客管理'))
    assert.ok(site.includes('角色权限'))
    assert.ok(site.includes('站点运维'))
    // 站点区不再出现易混淆的「组织管理」条目名
    assert.ok(!site.includes('组织管理'))

    assert.ok(allLabels(sections).includes('博客'))
    assert.ok(allLabels(sections).includes('个人资料'))
  })

  it('仅持内容审核权限（站点自定义角色）：仅「内容审核」分区，无组织管理', () => {
    const sections = buildMobileMoreSections(
      authOpts(
        {},
        {
          username: 'rev1',
          perms: new Set<string>([
            Perm.ContentProblemReview,
            Perm.ContentBlogModerate,
          ]),
        },
      ),
    )
    const titles = sectionTitles(sections)
    assert.ok(!titles.some((t) => t?.includes('组织管理')))
    assert.ok(!titles.includes('站点管理'))
    assert.ok(titles.includes('内容审核'))
    const review = sectionLabels(sections, '内容审核')
    assert.deepEqual(review, ['题库审查', '博客管理'])
  })

  it('自定义角色（仅组织公告权限）：组织管理分区只含工作台 + 组织公告', () => {
    const sections = buildMobileMoreSections(
      authOpts(
        { orgRole: OrgRole.Member },
        {
          username: 'helper',
          orgName: '算法队',
          perms: new Set<string>([Perm.OrgBulletinManage]),
        },
      ),
    )
    const manage = sectionLabels(sections, '组织管理')
    assert.deepEqual(manage, ['组织工作台', '组织公告'])
    // 无内置角色 → 标题不带角色括注
    assert.ok(sectionTitles(sections).includes('组织管理 · 算法队'))
    assert.ok(!sectionTitles(sections).includes('站点管理'))
  })

  it('自定义角色（仅站点数据权限）：无组织分区，站点分区只含数据类条目', () => {
    const sections = buildMobileMoreSections(
      authOpts(
        { orgRole: OrgRole.Member },
        { username: 'ops1', perms: new Set<string>([Perm.SiteStatsRead]) },
      ),
    )
    assert.ok(!sectionTitles(sections).some((t) => t?.includes('组织管理')))
    const site = sectionLabels(sections, /^站点管理$/)
    assert.deepEqual(site, ['站点数据', '站点访问'])
  })
})

describe('buildMobileMoreAccountLinks', () => {
  it('empty when logged out', () => {
    assert.deepEqual(buildMobileMoreAccountLinks(false), [])
  })

  it('change password when logged in', () => {
    const links = buildMobileMoreAccountLinks(true)
    assert.equal(links.length, 1)
    assert.equal(links[0]?.to, '/change-password')
  })
})
