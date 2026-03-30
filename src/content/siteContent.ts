import defaultDoc from './defaultSiteContent.json'

export type SiteGeneralContent = (typeof defaultDoc)['general']
export type SiteContent = typeof defaultDoc

export const DEFAULT_SITE_CONTENT_URL =
  'https://rivers-of-fire-cms.s3.us-east-1.amazonaws.com/site-content.json'

const GENERAL_KEYS = Object.keys(defaultDoc.general) as (keyof SiteGeneralContent)[]

export function createDefaultSiteContent(): SiteContent {
  return JSON.parse(JSON.stringify(defaultDoc)) as SiteContent
}

export function normalizeSiteContent(input: unknown): SiteContent {
  const def = createDefaultSiteContent()
  if (!input || typeof input !== 'object') return def
  const o = input as Record<string, unknown>
  const version = typeof o.version === 'number' ? o.version : def.version
  const rawGeneral =
    o.general && typeof o.general === 'object' ? (o.general as Record<string, unknown>) : {}
  const general = { ...def.general }
  for (const key of GENERAL_KEYS) {
    const v = rawGeneral[key as string]
    if (typeof v === 'string') (general as Record<string, string>)[key as string] = v
  }
  return { version, general }
}

export function sanitizeSiteContentForSave(input: SiteContent): SiteContent {
  const general = { ...createDefaultSiteContent().general }
  const g = input.general as Record<string, string>
  for (const key of GENERAL_KEYS) {
    if (typeof g[key as string] === 'string')
      (general as Record<string, string>)[key as string] = g[key as string]
  }
  const version = Number.isFinite(input.version) ? Math.max(1, Math.floor(input.version)) : 1
  return { version, general }
}

export async function loadSiteContent(): Promise<SiteContent> {
  const url =
    import.meta.env.VITE_SITE_CONTENT_URL?.trim() || DEFAULT_SITE_CONTENT_URL
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to load site content (${res.status})`)
  }
  return normalizeSiteContent(await res.json())
}
