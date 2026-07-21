import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildMobileMoreAccountLinks,
  buildMobileMoreSectionsFromAuth,
} from '@/components/mobile-more-sheet'
import { OrgRole } from '@/lib/roles'

function sectionTitles(
  sections: ReturnType<typeof buildMobileMoreSectionsFromAuth>,
) {
  return sections.map((s) => s.title).filter(Boolean)
}

function sectionLabels(
  sections: ReturnType<typeof buildMobileMoreSectionsFromAuth>,
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

function allLabels(
  sections: ReturnType<typeof buildMobileMoreSectionsFromAuth>,
) {
  return sections.flatMap((s) => s.items.map((i) => i.label))
}

describe('buildMobileMoreSectionsFromAuth', () => {
  it('guest: browse + about, no manage', () => {
    const sections = buildMobileMoreSectionsFromAuth({
      isLogin: false,
      isMemberLike: true,
      showAbout: true,
      isStaff: false,
      isSiteAdmin: false,
      isOrgAdmin: false,
    })
    assert.deepEqual(sectionTitles(sections), ['浏览', '我的'])
    assert.ok(allLabels(sections).includes('关于我们'))
    assert.ok(!sectionTitles(sections).some((t) => t?.includes('组织管理')))
    assert.ok(!sectionTitles(sections).includes('站点管理'))
  })

  it('member: profile + org, no manage', () => {
    const sections = buildMobileMoreSectionsFromAuth({
      isLogin: true,
      isMemberLike: true,
      username: 'alice',
      showAbout: true,
      isStaff: false,
      isSiteAdmin: false,
      isOrgAdmin: false,
      orgRole: OrgRole.Member,
    })
    const labels = allLabels(sections)
    assert.ok(labels.includes('个人资料'))
    assert.ok(labels.includes('我的组织'))
    assert.ok(!sectionTitles(sections).some((t) => t?.includes('组织管理')))
    assert.ok(!sectionTitles(sections).includes('站点管理'))
  })

  it('coach: 组织管理（教练）+ 组织训练报告, no 站点管理', () => {
    const sections = buildMobileMoreSectionsFromAuth({
      isLogin: true,
      isMemberLike: true,
      username: 'coach1',
      showAbout: false,
      isStaff: true,
      isSiteAdmin: false,
      isOrgAdmin: false,
      orgRole: OrgRole.Coach,
      orgName: '算法队',
    })
    assert.ok(
      sectionTitles(sections).some(
        (t) => t?.includes('组织管理') && t.includes('教练'),
      ),
    )
    const manage = sectionLabels(sections, '组织管理')
    assert.ok(manage.includes('教练工作台'))
    assert.ok(manage.includes('组织数据'))
    assert.ok(manage.includes('组织训练报告'))
    assert.ok(!manage.includes('组织设置'))
    assert.ok(!sectionTitles(sections).includes('站点管理'))
  })

  it('captain: 组织管理（队长）+ 组织训练报告', () => {
    const sections = buildMobileMoreSectionsFromAuth({
      isLogin: true,
      isMemberLike: true,
      username: 'cap1',
      showAbout: false,
      isStaff: true,
      isSiteAdmin: false,
      isOrgAdmin: false,
      orgRole: OrgRole.Captain,
      orgName: '算法队',
    })
    assert.ok(
      sectionTitles(sections).some(
        (t) => t?.includes('组织管理') && t.includes('队长'),
      ),
    )
    const manage = sectionLabels(sections, '组织管理')
    assert.ok(manage.includes('队长工作台'))
    assert.ok(manage.includes('组织训练报告'))
    assert.ok(!manage.includes('组织设置'))
  })

  it('org_admin: 组织管理 + 组织设置, no 站点管理', () => {
    const sections = buildMobileMoreSectionsFromAuth({
      isLogin: true,
      isMemberLike: true,
      username: 'oa1',
      showAbout: false,
      isStaff: true,
      isSiteAdmin: false,
      isOrgAdmin: true,
      orgRole: OrgRole.OrgAdmin,
      orgName: '算法队',
    })
    assert.ok(sectionTitles(sections).some((t) => t?.includes('组织管理')))
    assert.ok(!sectionTitles(sections).includes('站点管理'))
    const manage = sectionLabels(sections, '组织管理')
    assert.ok(manage.includes('组织工作台'))
    assert.ok(manage.includes('组织设置'))
    assert.ok(!manage.includes('组织训练报告'))
  })

  it('site admin: 组织管理与站点管理分区标题分明', () => {
    const sections = buildMobileMoreSectionsFromAuth({
      isLogin: true,
      isMemberLike: true,
      username: 'admin',
      showAbout: true,
      isStaff: true,
      isSiteAdmin: true,
      isOrgAdmin: true,
      orgRole: OrgRole.OrgAdmin,
      orgName: '公共域',
    })
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
    assert.ok(site.includes('全站用户'))
    assert.ok(site.includes('全站组织'))
    assert.ok(site.includes('站点运维'))
    // 站点区不再出现易混淆的「组织管理」条目名
    assert.ok(!site.includes('组织管理'))

    assert.ok(allLabels(sections).includes('博客'))
    assert.ok(allLabels(sections).includes('个人资料'))
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
