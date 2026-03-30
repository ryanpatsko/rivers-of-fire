import type { SiteContent } from '../content/siteContent'
import { getAdminAuthBaseUrl } from './adminAuth'

export async function saveSiteContent(
  token: string,
  doc: SiteContent,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const base = getAdminAuthBaseUrl()
  if (!base) {
    return { ok: false, message: 'Admin API is not configured.' }
  }
  let res: Response
  try {
    res = await fetch(`${base}/site-content`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(doc),
    })
  } catch {
    return {
      ok: false,
      message: 'Network error saving to server. Check CORS and the Function URL.',
    }
  }
  if (!res.ok) {
    let detail = ''
    try {
      const text = await res.text()
      if (text) {
        const parsed = JSON.parse(text) as { error?: string }
        if (typeof parsed.error === 'string') detail = `: ${parsed.error}`
      }
    } catch {
      /* ignore */
    }
    return { ok: false, message: `Save failed (HTTP ${res.status}${detail}).` }
  }
  return { ok: true }
}
