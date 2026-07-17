import { endpoints } from '@shared/api'
import { jwt } from '@/lib/jwt'
import { str, type ApiResult } from '@/lib/http'
import { UX_NETWORK, UX_UPLOAD_FAILED, sanitizeUserMessage } from '@/lib/ux-copy'

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
      return { success: false, message: UX_UPLOAD_FAILED, data: null }
    }
    const code = body.code
    const success = code === 0 || code === '0' || code === true
    const message = str(body.message, success ? 'ok' : UX_UPLOAD_FAILED)
    const url = str(body.url)
    if (!success || !url) {
      return {
        success: false,
        message: sanitizeUserMessage(message || UX_UPLOAD_FAILED, UX_UPLOAD_FAILED),
        data: null,
      }
    }
    return { success: true, message, data: { url }, raw: body }
  } catch (e) {
    return {
      success: false,
      message: sanitizeUserMessage(
        e instanceof Error ? e.message : undefined,
        UX_NETWORK,
      ),
      data: null,
    }
  }
}
