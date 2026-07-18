import { Navigate } from 'react-router-dom'

/** 隐私设置已并入「编辑个人资料」，保留路由兼容旧链接 */
export function PrivacySettings() {
  return <Navigate to="/change-profile#privacy" replace />
}
