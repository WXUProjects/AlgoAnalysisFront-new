import { useEffect } from 'react'
import {
  applyDocumentMeta,
  type DocumentMetaInput,
} from '@/lib/document-meta'

/** Sync title + description + OG/Twitter on SPA route/data change. */
export function useDocumentMeta(meta: DocumentMetaInput | null | undefined) {
  const title = meta?.title
  const description = meta?.description
  const image = meta?.image
  const url = meta?.url
  const type = meta?.type
  const siteName = meta?.siteName
  const noIndex = meta?.noIndex

  useEffect(() => {
    if (!title) return
    applyDocumentMeta({
      title,
      description,
      image,
      url,
      type,
      siteName,
      noIndex,
    })
  }, [title, description, image, url, type, siteName, noIndex])
}
