import type { EventsDoc } from '../content/eventsContent'
import type { SiteContent } from '../content/siteContent'
import { normalizeSponsorsDoc, type SponsorsDoc } from '../content/sponsorsContent'
import type { VendorsDoc } from '../content/vendorsContent'
import { getAdminAuthBaseUrl } from './adminAuth'

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const text = await res.text()
    if (text) {
      const parsed = JSON.parse(text) as { error?: string }
      if (typeof parsed.error === 'string') return `: ${parsed.error}`
    }
  } catch {
    /* ignore */
  }
  return ''
}

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
    const detail = await readErrorDetail(res)
    return { ok: false, message: `Save failed (HTTP ${res.status}${detail}).` }
  }
  return { ok: true }
}

export async function saveVendorsContent(
  token: string,
  doc: VendorsDoc,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const base = getAdminAuthBaseUrl()
  if (!base) {
    return { ok: false, message: 'Admin API is not configured.' }
  }
  let res: Response
  try {
    res = await fetch(`${base}/vendors`, {
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
      message: 'Network error saving vendors. Check CORS and the Function URL.',
    }
  }
  if (!res.ok) {
    const detail = await readErrorDetail(res)
    return { ok: false, message: `Save failed (HTTP ${res.status}${detail}).` }
  }
  return { ok: true }
}

/**
 * Same `sponsors.json` the Lambda PUT writes (CMS_S3_BUCKET + CMS_S3_SPONSORS_KEY).
 * The public `VITE_SPONSORS_URL` may point elsewhere; admin must use this so edits match saves.
 */
export async function fetchSponsorsForAdmin(
  token: string,
): Promise<{ ok: true; doc: SponsorsDoc } | { ok: false; message: string; notFound?: boolean }> {
  const base = getAdminAuthBaseUrl()
  if (!base) {
    return { ok: false, message: 'Admin API is not configured.' }
  }
  let res: Response
  try {
    res = await fetch(`${base}/sponsors`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  } catch {
    return { ok: false, message: 'Network error loading sponsors from the CMS.' }
  }
  if (res.status === 404) {
    return { ok: false, message: 'No sponsors.json in the CMS bucket yet.', notFound: true }
  }
  if (!res.ok) {
    const detail = await readErrorDetail(res)
    return { ok: false, message: `Could not load sponsors (HTTP ${res.status}${detail}).` }
  }
  let raw: unknown
  try {
    raw = await res.json()
  } catch {
    return { ok: false, message: 'Invalid JSON in sponsors response.' }
  }
  return { ok: true, doc: normalizeSponsorsDoc(raw) }
}

export async function saveSponsorsContent(
  token: string,
  doc: SponsorsDoc,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const base = getAdminAuthBaseUrl()
  if (!base) {
    return { ok: false, message: 'Admin API is not configured.' }
  }
  let res: Response
  try {
    res = await fetch(`${base}/sponsors`, {
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
      message: 'Network error saving sponsors. Check CORS and the Function URL.',
    }
  }
  if (!res.ok) {
    const detail = await readErrorDetail(res)
    return { ok: false, message: `Save failed (HTTP ${res.status}${detail}).` }
  }
  return { ok: true }
}

export async function saveEventsContent(
  token: string,
  doc: EventsDoc,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const base = getAdminAuthBaseUrl()
  if (!base) {
    return { ok: false, message: 'Admin API is not configured.' }
  }
  let res: Response
  try {
    res = await fetch(`${base}/events`, {
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
      message: 'Network error saving events. Check CORS and the Function URL.',
    }
  }
  if (!res.ok) {
    const detail = await readErrorDetail(res)
    return { ok: false, message: `Save failed (HTTP ${res.status}${detail}).` }
  }
  return { ok: true }
}

const MAX_LOGO_UPLOAD_BYTES = 4.5 * 1024 * 1024

async function uploadLogoToPath(
  token: string,
  file: File,
  path: 'vendor-logo' | 'sponsor-logo' | 'event-logo',
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const base = getAdminAuthBaseUrl()
  if (!base) {
    return { ok: false, message: 'Admin API is not configured.' }
  }
  if (file.size > MAX_LOGO_UPLOAD_BYTES) {
    return { ok: false, message: 'Image must be under 4.5 MB.' }
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('read failed'))
    r.readAsDataURL(file)
  })
  const comma = dataUrl.indexOf(',')
  const dataBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const contentType = file.type || 'image/png'
  let res: Response
  try {
    res = await fetch(`${base}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        contentType,
        filename: file.name || 'logo.png',
        dataBase64,
      }),
    })
  } catch {
    return { ok: false, message: 'Network error uploading logo.' }
  }
  if (!res.ok) {
    const detail = await readErrorDetail(res)
    return { ok: false, message: `Upload failed (HTTP ${res.status}${detail}).` }
  }
  let parsed: { publicUrl?: string }
  try {
    parsed = (await res.json()) as { publicUrl?: string }
  } catch {
    return { ok: false, message: 'Invalid response after upload.' }
  }
  if (typeof parsed.publicUrl !== 'string' || !parsed.publicUrl.startsWith('https://')) {
    return { ok: false, message: 'Server did not return a logo URL.' }
  }
  return { ok: true, publicUrl: parsed.publicUrl }
}

export async function uploadVendorLogo(
  token: string,
  file: File,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  return uploadLogoToPath(token, file, 'vendor-logo')
}

export async function uploadSponsorLogo(
  token: string,
  file: File,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  return uploadLogoToPath(token, file, 'sponsor-logo')
}

export async function uploadEventLogo(
  token: string,
  file: File,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  return uploadLogoToPath(token, file, 'event-logo')
}
