/** 主站路由 → 页面名（与顶栏标题一致） */
const APP_TITLES: Record<string, string> = {
  '/': '首页',
  '/login': '登录',
  '/register': '注册',
  '/forgot-password': '找回密码',
  '/change-password': '修改密码',
  '/profile': '个人资料',
  '/change-profile': '编辑资料',
  '/privacy': '编辑资料',
  '/social': '关注与粉丝',
  '/discover': '发现',
  '/blog-plaza': '博客广场',
  '/all-activities': '提交动态',
  '/bulletin': '公告',
  '/contest': '比赛',
  '/question-bank': '题库',
  '/problemset': '题单',
  '/about': '关于我们',
  '/org': '我的组织',
  '/tools': '工具',
  '/tools/paste': '粘贴板',
  '/tools/code-image': '代码转图片',
}

/** 后台路由 → 页面名 */
const ADMIN_TITLES: Record<string, string> = {
  '/admin': '后台',
  '/admin/statistics': '组织数据统计',
  '/admin/site-statistics': '站点数据统计',
  '/admin/access': '访问统计',
  '/admin/bulletin': '组织公告',
  '/admin/site-bulletin': '站点公告',
  '/admin/emergency': '紧急通知',
  '/admin/problem-progress': '题库识别',
  '/admin/problem-edits': '题库修改审核',
  '/admin/group': '分组管理',
  '/admin/user': '组织成员',
  '/admin/site-users': '站点用户',
  '/admin/site': '站点设置',
  '/admin/ops': '运维',
  '/admin/org': '组织设置',
  '/admin/orgs': '组织管理',
}

const DEFAULT_BRAND = 'GoAlgo'

/**
 * 根据路径解析当前页面名（用于顶栏与浏览器标题）。
 * 未知路径返回空串，由调用方回退到品牌名。
 */
export function resolvePageTitle(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/'

  if (APP_TITLES[path]) return APP_TITLES[path]
  if (ADMIN_TITLES[path]) return ADMIN_TITLES[path]

  // 主站前缀匹配
  if (path.startsWith('/profile/')) return '个人资料'
  if (path.startsWith('/social')) return '关注与粉丝'
  if (path.startsWith('/contest/')) return '比赛详情'
  if (path.includes('/edit-content')) return '编辑题面'
  if (path.includes('/solution/new')) return '写题解'
  if (path.includes('/solution/') && path.endsWith('/edit')) return '编辑题解'
  if (path.includes('/solution/')) return '题解'
  if (path.startsWith('/question-bank/detail/')) return '题目详情'
  if (path.startsWith('/problemset/')) return '题单详情'
  if (path.startsWith('/p/')) return '粘贴板'
  if (path.startsWith('/tools')) return '工具'

  // 博客管理 /blog/:user/manage/*
  if (/^\/blog\/[^/]+\/manage/.test(path)) {
    if (path.endsWith('/manage') || path.endsWith('/manage/')) return '文章管理'
    if (path.includes('/manage/new')) return '写文章'
    if (path.includes('/manage/edit/')) return '编辑文章'
    if (path.includes('/manage/analytics')) return '博客数据'
    if (path.includes('/manage/categories')) return '分类管理'
    if (path.includes('/manage/settings')) return '博客设置'
    return '博客管理'
  }

  // 博客阅读 /blog/:user/*
  if (/^\/blog\/[^/]+/.test(path)) {
    if (/^\/blog\/[^/]+$/.test(path)) return '博客'
    if (path.endsWith('/categories')) return '分类'
    if (path.endsWith('/archives')) return '归档'
    if (path.endsWith('/about')) return '关于'
    return '文章'
  }

  if (path.startsWith('/admin')) return '后台'

  return ''
}

/** 浏览器标签：`页面名 - 站点名`；无页面名时仅站点名 */
export function formatDocumentTitle(
  pageTitle: string,
  brand: string = DEFAULT_BRAND,
): string {
  const page = pageTitle.trim()
  const site = brand.trim() || DEFAULT_BRAND
  if (!page || page === site) return site
  return `${page} - ${site}`
}

export function applyDocumentTitle(
  pageTitle: string,
  brand: string = DEFAULT_BRAND,
): void {
  document.title = formatDocumentTitle(pageTitle, brand)
}
