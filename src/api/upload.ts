import { endpoints } from '@shared/api'
import { jwt } from '@/lib/jwt'
import { str, type ApiResult } from '@/lib/http'

export type UploadPurpose = 'avatar' | 'site' | 'bulletin' | 'misc'

export async function uploadImage(
  file: File,
  purpose: UploadPurpose = 'misc',
): Promise<ApiResult<{ url: string }>> {
  const form = new FormData()
  form.append('file', file)
  form.append('purpose', purpose)

  try {
    const headers: Record<string, string> = {}
    if (jwt.isValid()) {
      headers.Authorization = `Bearer ${jwt.token}`
    }
    const res = await fetch(endpoints.user.upload, {
      method: 'POST',
      headers,
      body: form,
    })
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') {
      return { success: false, message: '上传响应异常', data: null }
    }
    const code = body.code
    const success = code === 0 || code === '0' || code === true
    const message = str(body.message, success ? 'ok' : '上传失败')
    const url = str(body.url)
    if (!success || !url) {
      return { success: false, message: message || '上传失败', data: null }
    }
    return { success: true, message, data: { url }, raw: body }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : '网络错误',
      data: null,
    }
  }
}
