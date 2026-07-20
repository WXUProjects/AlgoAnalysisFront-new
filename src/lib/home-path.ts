/**
 * 全站「首页 / 主站 / 返回首页」目标路径。
 * 访客业务首页为 /about（/ 会被 AppLayout 强制跳转，硬编码 / 会造成闪跳）。
 */

export const GUEST_HOME_PATH = '/about'
export const MEMBER_HOME_PATH = '/'

/** 按登录态解析回家路径：已登录 → `/`，访客 → `/about` */
export function getHomePath(isLogin: boolean): string {
  return isLogin ? MEMBER_HOME_PATH : GUEST_HOME_PATH
}
