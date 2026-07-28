import { endpoints } from '@shared/api'
import { jwt } from '@/lib/jwt'
import { str, type ApiResult } from '@/lib/http'
import { UX_NETWORK, UX_UPLOAD_FAILED, sanitizeUserMessage } from '@/lib/ux-copy'

export type UploadPurpose =
  | 'avatar'
  | 'site'
  | 'bulletin'
  | 'misc'
  /** 博客/题解正文图（又拍云，需授权） */
  | 'blog'
  /** 博客头图（又拍云，需授权） */
  | 'blog_cover'

export type UploadImageOptions = {
  /** 0–100 upload progress (XHR only; fetch path reports 0 then 100). */
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

function parseUploadBody(
  body: Record<string, unknown> | null,
): ApiResult<{ url: string }> {
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
}

export async function uploadImage(
  file: File,
  purpose: UploadPurpose = 'misc',
  opts?: UploadImageOptions,
): Promise<ApiResult<{ url: string }>> {
  const form = new FormData()
  form.append('file', file)
  form.append('purpose', purpose)

  const headers: Record<string, string> = {}
  if (jwt.isValid()) {
    headers.Authorization = `Bearer ${jwt.token}`
  }

  // Prefer XHR when progress is needed (fetch has no reliable upload progress).
  if (opts?.onProgress) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', endpoints.user.upload)
      for (const [k, v] of Object.entries(headers)) {
        xhr.setRequestHeader(k, v)
      }
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return
        const pct = Math.max(0, Math.min(100, Math.round((e.loaded / e.total) * 100)))
        opts.onProgress?.(pct)
      }
      xhr.onload = () => {
        opts.onProgress?.(100)
        try {
          const body = JSON.parse(xhr.responseText) as Record<string, unknown>
          resolve(parseUploadBody(body))
        } catch {
          resolve({ success: false, message: UX_UPLOAD_FAILED, data: null })
        }
      }
      xhr.onerror = () => {
        resolve({
          success: false,
          message: sanitizeUserMessage(undefined, UX_NETWORK),
          data: null,
        })
      }
      xhr.onabort = () => {
        resolve({
          success: false,
          message: '已取消上传',
          data: null,
        })
      }
      if (opts.signal) {
        if (opts.signal.aborted) {
          resolve({ success: false, message: '已取消上传', data: null })
          return
        }
        opts.signal.addEventListener('abort', () => xhr.abort(), { once: true })
      }
      opts.onProgress?.(0)
      xhr.send(form)
    })
  }

  try {
    const res = await fetch(endpoints.user.upload, {
      method: 'POST',
      headers,
      body: form,
      signal: opts?.signal,
    })
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
    return parseUploadBody(body)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { success: false, message: '已取消上传', data: null }
    }
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
