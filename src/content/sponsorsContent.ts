import defaultDoc from './defaultSponsors.json'
import type { Partner } from '../partnersData'

export type SponsorRecord = {
  id: string
  name: string
  websiteUrl: string
  logoUrl: string
  sortOrder: number
}

export type SponsorsDoc = {
  version: number
  sponsors: SponsorRecord[]
}

export const DEFAULT_SPONSORS_URL =
  'https://rivers-of-fire-cms.s3.us-east-1.amazonaws.com/sponsors.json'

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function createDefaultSponsorsDoc(): SponsorsDoc {
  return JSON.parse(JSON.stringify(defaultDoc)) as SponsorsDoc
}

export function normalizeSponsorsDoc(input: unknown): SponsorsDoc {
  const def = createDefaultSponsorsDoc()
  if (!input || typeof input !== 'object') return def
  const o = input as Record<string, unknown>
  const version = typeof o.version === 'number' ? o.version : def.version
  const rawList = Array.isArray(o.sponsors) ? o.sponsors : []
  const sponsors: SponsorRecord[] = []
  for (const row of rawList) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = typeof r.id === 'string' && ID_RE.test(r.id) ? r.id : ''
    if (!id) continue
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    const websiteUrl = typeof r.websiteUrl === 'string' ? r.websiteUrl.trim() : ''
    const logoUrl = typeof r.logoUrl === 'string' ? r.logoUrl.trim() : ''
    const sortOrder = typeof r.sortOrder === 'number' && Number.isFinite(r.sortOrder) ? r.sortOrder : 0
    sponsors.push({ id, name: name || 'Sponsor', websiteUrl, logoUrl, sortOrder })
  }
  if (sponsors.length === 0) return def
  return { version, sponsors }
}

export function sanitizeSponsorsForSave(input: SponsorsDoc): SponsorsDoc {
  const version = Number.isFinite(input.version) ? Math.max(1, Math.floor(input.version)) : 1
  const sponsors: SponsorRecord[] = []
  for (const r of input.sponsors) {
    if (!r || typeof r.id !== 'string' || !ID_RE.test(r.id) || r.id.length > 64) continue
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, 200) : ''
    if (!name) continue
    const websiteUrl =
      typeof r.websiteUrl === 'string' ? r.websiteUrl.trim().slice(0, 500) : ''
    let logoUrl = typeof r.logoUrl === 'string' ? r.logoUrl.trim().slice(0, 2048) : ''
    if (logoUrl && !logoUrl.startsWith('https://')) logoUrl = ''
    const sortOrder =
      typeof r.sortOrder === 'number' && Number.isFinite(r.sortOrder) ? Math.floor(r.sortOrder) : 0
    sponsors.push({ id: r.id, name, websiteUrl, logoUrl, sortOrder })
  }
  return { version, sponsors }
}

export async function loadSponsors(): Promise<SponsorsDoc> {
  const url = import.meta.env.VITE_SPONSORS_URL?.trim() || DEFAULT_SPONSORS_URL
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to load sponsors (${res.status})`)
  }
  return normalizeSponsorsDoc(await res.json())
}

export function sponsorsToPartners(list: SponsorRecord[]): Partner[] {
  return [...list]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((s) => ({
      id: s.id,
      name: s.name,
      ...(s.websiteUrl ? { websiteUrl: s.websiteUrl } : {}),
      ...(s.logoUrl ? { logoSrc: s.logoUrl } : {}),
    }))
}
