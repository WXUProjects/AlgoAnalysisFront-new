/**
 * 用户可见中文文案（对齐 ~/.grok/skills/ux-copy）。
 * 公式：状态 + 影响（可选）+ 行动（可选）。
 * 默认句式：发生了什么 + 请稍后重试 / 请检查…后重试。
 */

/** 通用失败：请求未完成 */
export const UX_REQUEST_FAILED = '请求未完成，请稍后重试'

/** 网络异常 */
export const UX_NETWORK = '网络连接异常，请检查网络设置后重试'

/** 请求超时 */
export const UX_TIMEOUT = '请求超时，请稍后重试'

/** 无权限（403） */
export const UX_FORBIDDEN = '暂无权限执行此操作'

/** 登录失效（401 业务提示；清会话由 http 拦截器处理） */
export const UX_UNAUTHORIZED = '登录已失效，请重新登录'

/** 接口/页面资源不可用 */
export const UX_SERVICE_UNAVAILABLE = '服务暂时不可用，请稍后重试'

/** 需登录 */
export const UX_LOGIN_REQUIRED = '请先登录后再继续'

export const UX_LOAD_FAILED = '加载失败，请稍后重试'
export const UX_SAVE_FAILED = '保存失败，请稍后重试'
export const UX_DELETE_FAILED = '删除失败，请稍后重试'
export const UX_SUBMIT_FAILED = '提交失败，请稍后重试'
export const UX_UPLOAD_FAILED = '上传失败，请稍后重试'
export const UX_DOWNLOAD_FAILED = '下载失败，请稍后重试'
export const UX_SEND_FAILED = '发送失败，请稍后重试'
export const UX_UPDATE_FAILED = '更新失败，请稍后重试'
export const UX_CREATE_FAILED = '创建失败，请稍后重试'
export const UX_SEARCH_FAILED = '搜索失败，请稍后重试'
export const UX_SYNC_FAILED = '同步失败，请稍后重试'
export const UX_ACTION_FAILED = '操作未完成，请稍后重试'
export const UX_SWITCH_FAILED = '切换失败，请稍后重试'
export const UX_JOIN_FAILED = '加入失败，请稍后重试'
export const UX_LEAVE_FAILED = '退出失败，请稍后重试'
export const UX_PUBLISH_FAILED = '发布失败，请稍后重试'
export const UX_BIND_FAILED = '绑定失败，请稍后重试'
export const UX_LOGIN_FAILED = '登录失败，请检查账号密码后重试'
export const UX_REGISTER_FAILED = '注册失败，请稍后重试'
export const UX_RESET_FAILED = '密码重置失败，请稍后重试'
export const UX_PASSWORD_CHANGE_FAILED = '密码修改失败，请稍后重试'
export const UX_SETTING_FAILED = '设置失败，请稍后重试'
export const UX_TASK_FAILED = '任务失败，请稍后重试'
export const UX_CANCEL_FAILED = '取消失败，请稍后重试'
export const UX_SUBSCRIBE_FAILED = '订阅失败，请稍后重试'
export const UX_EXPORT_FAILED = '导出失败，请稍后重试'
export const UX_IMPORT_FAILED = '导入失败，请稍后重试'
export const UX_COPY_FAILED = '复制失败，请稍后重试'

/** 「某某加载失败，请稍后重试」 */
export function loadFailed(what: string): string {
  return `${what}加载失败，请稍后重试`
}

/** 「某某保存失败，请稍后重试」 */
export function saveFailed(what: string): string {
  return `${what}保存失败，请稍后重试`
}

/**
 * 清洗可能泄漏给用户的底层错误（axios Network Error、超时文案等）。
 * 已是可读中文的业务 message 原样返回。
 */
export function sanitizeUserMessage(
  raw: string | undefined | null,
  fallback: string = UX_REQUEST_FAILED,
): string {
  if (raw == null) return fallback
  const s = String(raw).trim()
  if (!s || s === 'ok' || s === 'OK') return fallback

  if (/^network error$/i.test(s)) return UX_NETWORK
  if (/timeout/i.test(s) || /timed?\s*out/i.test(s)) return UX_TIMEOUT
  if (/ECONNREFUSED|ENOTFOUND|ECONNRESET|ERR_NETWORK|Failed to fetch/i.test(s)) {
    return UX_NETWORK
  }
  // axios 默认英文
  if (/^Request failed with status code \d+$/i.test(s)) {
    return UX_REQUEST_FAILED
  }

  // 历史短句 / 后端粗文案 → 用户可读
  const legacy: Record<string, string> = {
    请求失败: UX_REQUEST_FAILED,
    权限不足: UX_FORBIDDEN,
    网络错误: UX_NETWORK,
    '网络错误，请稍后重试': UX_NETWORK,
    操作失败: UX_ACTION_FAILED,
    加载失败: UX_LOAD_FAILED,
    保存失败: UX_SAVE_FAILED,
    删除失败: UX_DELETE_FAILED,
    上传失败: UX_UPLOAD_FAILED,
    下载失败: UX_DOWNLOAD_FAILED,
    发送失败: UX_SEND_FAILED,
    更新失败: UX_UPDATE_FAILED,
    创建失败: UX_CREATE_FAILED,
    搜索失败: UX_SEARCH_FAILED,
    同步失败: UX_SYNC_FAILED,
    提交失败: UX_SUBMIT_FAILED,
    切换失败: UX_SWITCH_FAILED,
    加入失败: UX_JOIN_FAILED,
    退出失败: UX_LEAVE_FAILED,
    发布失败: UX_PUBLISH_FAILED,
    绑定失败: UX_BIND_FAILED,
    登录失败: UX_LOGIN_FAILED,
    注册失败: UX_REGISTER_FAILED,
    重置失败: UX_RESET_FAILED,
    修改失败: UX_PASSWORD_CHANGE_FAILED,
    设置失败: UX_SETTING_FAILED,
    任务失败: UX_TASK_FAILED,
    取消失败: UX_CANCEL_FAILED,
    订阅失败: UX_SUBSCRIBE_FAILED,
    导出失败: UX_EXPORT_FAILED,
    导入失败: UX_IMPORT_FAILED,
    复制失败: UX_COPY_FAILED,
    获取失败: UX_LOAD_FAILED,
    刷新失败: UX_LOAD_FAILED,
    用户不存在: '找不到该用户',
    '接口不存在或尚未部署，请确认后端已更新': UX_SERVICE_UNAVAILABLE,
  }
  if (legacy[s]) return legacy[s]

  return s
}
