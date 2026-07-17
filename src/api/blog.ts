import {
  endpoints,
  type BlogAnalytics,
  type BlogArticle,
  type BlogArticleWriteReq,
  type BlogAuthor,
  type BlogCategory,
  type BlogComment,
  type BlogPlazaAuthor,
  type BlogPlazaSort,
} from '@shared/api'
import { get, post, num, str, type ApiResult } from '@/lib/http'

function authorOf(raw: Record<string, unknown> | undefined): BlogAuthor | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const id = num(raw.id)
  if (!id) return undefined
  return {
    id,
    username: str(raw.username),
    name: str(raw.name),
    avatar: str(raw.avatar) || undefined,
  }
}

function normalizeArticle(raw: Record<string, unknown>): BlogArticle {
  const cat = raw.categoryId
  const orgIdsRaw = raw.orgIds
  return {
    id: num(raw.id),
    slug: str(raw.slug),
    title: str(raw.title),
    summary: str(raw.summary) || undefined,
    content: raw.content !== undefined ? str(raw.content) : undefined,
    coverUrl: str(raw.coverUrl) || undefined,
    visibility: str(raw.visibility, 'public'),
    recommend: Boolean(raw.recommend),
    syncToMainProfile: Boolean(raw.syncToMainProfile),
    categoryId:
      cat === null || cat === undefined || cat === '' ? null : num(cat as number),
    sourceSolutionId: num(raw.sourceSolutionId) || undefined,
    viewCount: num(raw.viewCount),
    likeCount: num(raw.likeCount),
    commentCount: num(raw.commentCount),
    liked: Boolean(raw.liked),
    requiresPassword: Boolean(raw.requiresPassword),
    canSeeBody: raw.canSeeBody !== false,
    unlockToken: str(raw.unlockToken) || undefined,
    orgIds: Array.isArray(orgIdsRaw)
      ? (orgIdsRaw as unknown[]).map((x) => num(x as number)).filter(Boolean)
      : undefined,
    userId: num(raw.userId) || undefined,
    username: str(raw.username) || undefined,
    author: authorOf(raw.author as Record<string, unknown>),
    createdAt: num(raw.createdAt),
    updatedAt: num(raw.updatedAt) || undefined,
    publishedAt: num(raw.publishedAt) || undefined,
  }
}

function wrapData<T>(
  res: ApiResult<Record<string, unknown>>,
  map: (raw: Record<string, unknown>) => T | null,
): ApiResult<T> {
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const data = (raw.data ?? raw) as Record<string, unknown>
  if (!res.success && res.status && res.status >= 400) {
    return {
      success: false,
      message: res.message || str(raw.message, '请求失败'),
      data: null,
      status: res.status,
      raw: res.raw,
    }
  }
  const mapped = map(data)
  if (mapped === null) {
    return {
      success: false,
      message: res.message || str(raw.message, '加载失败'),
      data: null,
      status: res.status,
      raw: res.raw,
    }
  }
  return {
    success: true,
    message: res.message || 'ok',
    data: mapped,
    raw: res.raw,
    status: res.status,
  }
}

export async function listBlogByUsername(params: {
  username: string
  page?: number
  pageSize?: number
  categoryId?: number
  keyword?: string
}): Promise<
  ApiResult<{
    author: BlogAuthor
    list: BlogArticle[]
    total: number
    page: number
    pageSize: number
    themeEnabled: boolean
    isOwner: boolean
  }>
> {
  const res = await get<Record<string, unknown>>(endpoints.user.blog.byUsername, {
    username: params.username,
    page: params.page,
    pageSize: params.pageSize,
    categoryId: params.categoryId,
    keyword: params.keyword,
  })
  return wrapData(res, (data) => {
    const listRaw = (Array.isArray(data.list) ? data.list : []) as Record<
      string,
      unknown
    >[]
    const author = authorOf(data.author as Record<string, unknown>)
    if (!author) return null
    return {
      author,
      list: listRaw.map(normalizeArticle),
      total: num(data.total),
      page: num(data.page, 1),
      pageSize: num(data.pageSize, 20),
      themeEnabled: Boolean(data.themeEnabled),
      isOwner: Boolean(data.isOwner),
    }
  })
}

export async function getBlogArticle(params: {
  id?: number
  username?: string
  slug?: string
  password?: string
  unlockToken?: string
}): Promise<ApiResult<BlogArticle>> {
  const res = await get<Record<string, unknown>>(endpoints.user.blog.articleGet, {
    id: params.id,
    username: params.username,
    slug: params.slug,
    password: params.password,
    unlockToken: params.unlockToken,
  })
  return wrapData(res, (data) => {
    if (!num(data.id)) return null
    return normalizeArticle(data)
  })
}

export async function unlockBlogArticle(
  id: number,
  password: string,
): Promise<ApiResult<BlogArticle>> {
  const res = await post<Record<string, unknown>>(
    endpoints.user.blog.articleUnlock,
    { id, password },
  )
  return wrapData(res, (data) => {
    if (!num(data.id)) return null
    return normalizeArticle(data)
  })
}

export async function createBlogArticle(
  body: BlogArticleWriteReq,
): Promise<ApiResult<BlogArticle>> {
  const res = await post<Record<string, unknown>>(
    endpoints.user.blog.articleCreate,
    body,
  )
  return wrapData(res, (data) => {
    if (!num(data.id)) return null
    return normalizeArticle(data)
  })
}

export async function updateBlogArticle(
  body: BlogArticleWriteReq & { id: number },
): Promise<ApiResult<BlogArticle>> {
  const res = await post<Record<string, unknown>>(
    endpoints.user.blog.articleUpdate,
    body,
  )
  return wrapData(res, (data) => {
    if (!num(data.id)) return null
    return normalizeArticle(data)
  })
}

export async function deleteBlogArticle(id: number): Promise<ApiResult<unknown>> {
  return post(endpoints.user.blog.articleDelete, { id })
}

export async function listMyBlogArticles(params?: {
  page?: number
  pageSize?: number
  keyword?: string
}): Promise<
  ApiResult<{ list: BlogArticle[]; total: number; page: number; pageSize: number }>
> {
  const res = await get<Record<string, unknown>>(endpoints.user.blog.articleMine, {
    page: params?.page,
    pageSize: params?.pageSize,
    keyword: params?.keyword,
  })
  return wrapData(res, (data) => {
    const listRaw = (Array.isArray(data.list) ? data.list : []) as Record<
      string,
      unknown
    >[]
    return {
      list: listRaw.map(normalizeArticle),
      total: num(data.total),
      page: num(data.page, 1),
      pageSize: num(data.pageSize, 20),
    }
  })
}

export async function listBlogRecommend(params?: {
  page?: number
  pageSize?: number
}): Promise<
  ApiResult<{ list: BlogArticle[]; total: number; page: number; pageSize: number }>
> {
  const res = await get<Record<string, unknown>>(endpoints.user.blog.recommend, {
    page: params?.page,
    pageSize: params?.pageSize,
  })
  return wrapData(res, (data) => {
    const listRaw = (Array.isArray(data.list) ? data.list : []) as Record<
      string,
      unknown
    >[]
    return {
      list: listRaw.map(normalizeArticle),
      total: num(data.total),
      page: num(data.page, 1),
      pageSize: num(data.pageSize, 20),
    }
  })
}

function normalizePlazaAuthor(raw: Record<string, unknown>): BlogPlazaAuthor {
  return {
    id: num(raw.id),
    username: str(raw.username),
    name: str(raw.name),
    avatar: str(raw.avatar) || undefined,
    articleCount: num(raw.articleCount),
    lastPublishedAt: num(raw.lastPublishedAt) || undefined,
    latestTitle: str(raw.latestTitle) || undefined,
  }
}

/** 主站博客广场：公开文章流 */
export async function listBlogPlaza(params?: {
  page?: number
  pageSize?: number
  keyword?: string
  sort?: BlogPlazaSort | string
}): Promise<
  ApiResult<{ list: BlogArticle[]; total: number; page: number; pageSize: number }>
> {
  const res = await get<Record<string, unknown>>(endpoints.user.blog.plaza, {
    page: params?.page,
    pageSize: params?.pageSize,
    keyword: params?.keyword,
    sort: params?.sort,
  })
  return wrapData(res, (data) => {
    const listRaw = (Array.isArray(data.list) ? data.list : []) as Record<
      string,
      unknown
    >[]
    return {
      list: listRaw.map(normalizeArticle),
      total: num(data.total),
      page: num(data.page, 1),
      pageSize: num(data.pageSize, 12),
    }
  })
}

/** 主站博客广场：最近有公开文的作者 */
export async function listBlogAuthors(params?: {
  page?: number
  pageSize?: number
  keyword?: string
}): Promise<
  ApiResult<{
    list: BlogPlazaAuthor[]
    total: number
    page: number
    pageSize: number
  }>
> {
  const res = await get<Record<string, unknown>>(endpoints.user.blog.authors, {
    page: params?.page,
    pageSize: params?.pageSize,
    keyword: params?.keyword,
  })
  return wrapData(res, (data) => {
    const listRaw = (Array.isArray(data.list) ? data.list : []) as Record<
      string,
      unknown
    >[]
    return {
      list: listRaw.map(normalizePlazaAuthor),
      total: num(data.total),
      page: num(data.page, 1),
      pageSize: num(data.pageSize, 12),
    }
  })
}

export async function getBlogAnalytics(): Promise<ApiResult<BlogAnalytics>> {
  const res = await get<Record<string, unknown>>(endpoints.user.blog.analytics)
  return wrapData(res, (data) => ({
    totalArticles: num(data.totalArticles),
    totalViews: num(data.totalViews),
    totalLikes: num(data.totalLikes),
    totalComments: num(data.totalComments),
    topArticles: (Array.isArray(data.topArticles)
      ? data.topArticles
      : []) as BlogAnalytics['topArticles'],
  }))
}

export async function listBlogCategories(
  username: string,
): Promise<ApiResult<BlogCategory[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.blog.categories, {
    username,
  })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = (
    Array.isArray(raw.list) ? raw.list : Array.isArray(raw.data) ? raw.data : []
  ) as Record<string, unknown>[]
  if (!res.success && listRaw.length === 0) {
    return { success: false, message: res.message || '加载失败', data: null }
  }
  return {
    success: true,
    message: 'ok',
    data: listRaw.map((c) => ({
      id: num(c.id),
      name: str(c.name),
      sortOrder: num(c.sortOrder),
      articleCount: num(c.articleCount),
      isDefault: Boolean(c.isDefault),
    })),
  }
}

export async function listMyBlogCategories(): Promise<ApiResult<BlogCategory[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.blog.categoryMine)
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = (Array.isArray(raw.list) ? raw.list : []) as Record<
    string,
    unknown
  >[]
  if (!res.success && listRaw.length === 0) {
    return { success: false, message: res.message || '加载失败', data: null }
  }
  return {
    success: true,
    message: 'ok',
    data: listRaw.map((c) => ({
      id: num(c.id),
      name: str(c.name),
      sortOrder: num(c.sortOrder),
      articleCount: num(c.articleCount),
      isDefault: Boolean(c.isDefault),
    })),
  }
}

export async function createBlogCategory(
  name: string,
  sortOrder = 0,
): Promise<ApiResult<BlogCategory>> {
  const res = await post<Record<string, unknown>>(
    endpoints.user.blog.categoryCreate,
    { name, sortOrder },
  )
  return wrapData(res, (data) => {
    if (!num(data.id)) return null
    return {
      id: num(data.id),
      name: str(data.name),
      sortOrder: num(data.sortOrder),
      isDefault: Boolean(data.isDefault),
    }
  })
}

export async function updateBlogCategory(body: {
  id: number
  name?: string
  sortOrder?: number
}): Promise<ApiResult<BlogCategory>> {
  const res = await post<Record<string, unknown>>(
    endpoints.user.blog.categoryUpdate,
    body,
  )
  return wrapData(res, (data) => {
    if (!num(data.id)) return null
    return {
      id: num(data.id),
      name: str(data.name),
      sortOrder: num(data.sortOrder),
      isDefault: Boolean(data.isDefault),
    }
  })
}

export async function deleteBlogCategory(id: number): Promise<ApiResult<unknown>> {
  return post(endpoints.user.blog.categoryDelete, { id })
}

export async function listBlogComments(params: {
  articleId: number
  page?: number
  pageSize?: number
}): Promise<
  ApiResult<{ list: BlogComment[]; total: number; page: number; pageSize: number }>
> {
  const res = await get<Record<string, unknown>>(endpoints.user.blog.commentList, {
    articleId: params.articleId,
    page: params.page,
    pageSize: params.pageSize,
  })
  return wrapData(res, (data) => {
    const listRaw = (Array.isArray(data.list) ? data.list : []) as Record<
      string,
      unknown
    >[]
    return {
      list: listRaw.map((c) => ({
        id: num(c.id),
        articleId: num(c.articleId),
        parentId: num(c.parentId),
        content: str(c.content),
        userId: num(c.userId),
        author: authorOf(c.author as Record<string, unknown>),
        createdAt: num(c.createdAt),
      })),
      total: num(data.total),
      page: num(data.page, 1),
      pageSize: num(data.pageSize, 20),
    }
  })
}

export async function createBlogComment(body: {
  articleId: number
  content: string
  parentId?: number
}): Promise<ApiResult<BlogComment>> {
  const res = await post<Record<string, unknown>>(
    endpoints.user.blog.commentCreate,
    body,
  )
  return wrapData(res, (data) => {
    if (!num(data.id)) return null
    return {
      id: num(data.id),
      articleId: num(data.articleId),
      parentId: num(data.parentId),
      content: str(data.content),
      userId: num(data.userId),
      createdAt: num(data.createdAt),
    }
  })
}

export async function deleteBlogComment(id: number): Promise<ApiResult<unknown>> {
  return post(endpoints.user.blog.commentDelete, { id })
}

export async function toggleBlogLike(
  articleId: number,
): Promise<ApiResult<{ liked: boolean; likeCount: number }>> {
  const res = await post<Record<string, unknown>>(endpoints.user.blog.like, {
    articleId,
  })
  return wrapData(res, (data) => ({
    liked: Boolean(data.liked),
    likeCount: num(data.likeCount),
  }))
}

export async function getBlogThemeStatus(username?: string): Promise<
  ApiResult<{ enabled: boolean; customTheme: unknown }>
> {
  const res = await get<Record<string, unknown>>(endpoints.user.blog.themeStatus, {
    username,
  })
  return wrapData(res, (data) => ({
    enabled: Boolean(data.enabled),
    customTheme: data.customTheme ?? null,
  }))
}
