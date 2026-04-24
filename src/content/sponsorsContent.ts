import defaultDoc from './defaultSponsors.json'
import type { Partner } from '../partnersData'

/** Highest → lowest display order. */
export const SPONSOR_TIER_ORDER = [
  'carolinaReaper',
  'ghostPepper',
  'habanero',
  'cayenne',
  'poblano',
] as const
export type SponsorTierId = (typeof SPONSOR_TIER_ORDER)[number]

export const SPONSOR_TIER_LABELS: Record<SponsorTierId, string> = {
  carolinaReaper: 'Carolina Reaper',
  ghostPepper: 'Ghost Pepper',
  habanero: 'Habanero',
  cayenne: 'Cayenne',
  poblano: 'Poblano',
}

export const DEFAULT_SPONSOR_TIER: SponsorTierId = 'poblano'

/** Same emoji as Events cards with icon key `pepper`. */
export const SPONSOR_TIER_DEFAULT_ICON_EMOJI = '\u{1F336}\uFE0F'

export type SponsorTierImages = Partial<Record<SponsorTierId, string>>

/** Display name per tier (editable in admin). Always fully populated after `normalizeSponsorsDoc`. */
export type SponsorTierLabels = Record<SponsorTierId, string>

export type SponsorRecord = {
  id: string
  name: string
  websiteUrl: string
  logoUrl: string
  sortOrder: number
  tier: SponsorTierId
}

export type SponsorsDoc = {
  version: number
  tierLabels: SponsorTierLabels
  /** Optional image per tier (HTTPS URL). If unset, the pepper emoji is used on the public site. */
  tierImages: SponsorTierImages
  sponsors: SponsorRecord[]
}

export const DEFAULT_SPONSORS_URL =
  'https://rivers-of-fire-cms.s3.us-east-1.amazonaws.com/sponsors.json'

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const TIER_SET = new Set<string>(SPONSOR_TIER_ORDER)

function lettersOnly(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * Resolves a tier from JSON. Unknown strings fall back to the default tier (Poblano),
 * which is why hand-edited or legacy values (wrong case, display labels) must be recognized here.
 */
function parseTier(raw: unknown): SponsorTierId {
  if (raw === undefined || raw === null) return DEFAULT_SPONSOR_TIER
  if (typeof raw !== 'string') return DEFAULT_SPONSOR_TIER
  const t = raw.trim()
  if (!t) return DEFAULT_SPONSOR_TIER
  if (TIER_SET.has(t)) return t as SponsorTierId
  if (t.includes('_')) {
    const camel = t
      .split(/_+/)
      .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
      .join('')
    if (TIER_SET.has(camel)) return camel as SponsorTierId
  }
  const n = lettersOnly(t)
  for (const id of SPONSOR_TIER_ORDER) {
    if (lettersOnly(id) === n) return id
    if (lettersOnly(SPONSOR_TIER_LABELS[id]) === n) return id
  }
  return DEFAULT_SPONSOR_TIER
}

function defaultTierLabels(): SponsorTierLabels {
  return { ...SPONSOR_TIER_LABELS }
}

function normalizeTierLabels(raw: unknown): SponsorTierLabels {
  const out = defaultTierLabels()
  if (!raw || typeof raw !== 'object') return out
  const o = raw as Record<string, unknown>
  for (const tier of SPONSOR_TIER_ORDER) {
    const v = o[tier]
    if (typeof v !== 'string') continue
    const s = v.trim().slice(0, 100)
    if (s) out[tier] = s
  }
  return out
}

function normalizeTierImages(raw: unknown): SponsorTierImages {
  const out: SponsorTierImages = {}
  if (!raw || typeof raw !== 'object') return out
  const o = raw as Record<string, unknown>
  for (const tier of SPONSOR_TIER_ORDER) {
    const v = o[tier]
    if (typeof v !== 'string') continue
    const u = v.trim()
    if (u && u.startsWith('https://')) out[tier] = u
  }
  return out
}

export function createDefaultSponsorsDoc(): SponsorsDoc {
  return normalizeSponsorsDoc(JSON.parse(JSON.stringify(defaultDoc)), 0)
}

export function normalizeSponsorsDoc(input: unknown, depth = 0): SponsorsDoc {
  const base = JSON.parse(JSON.stringify(defaultDoc)) as Record<string, unknown>
  if (depth > 4) {
    return { version: 1, tierLabels: defaultTierLabels(), tierImages: {}, sponsors: [] }
  }
  if (!input || typeof input !== 'object') {
    return normalizeSponsorsDoc(base, depth + 1)
  }
  const o = input as Record<string, unknown>
  const version = typeof o.version === 'number' ? o.version : Number(base.version) || 1
  const tierLabels = normalizeTierLabels(o.tierLabels)
  const tierImages = normalizeTierImages(o.tierImages)
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
    const tier = parseTier(r.tier)
    sponsors.push({ id, name: name || 'Sponsor', websiteUrl, logoUrl, sortOrder, tier })
  }
  if (sponsors.length === 0) {
    return normalizeSponsorsDoc(base, depth + 1)
  }
  return { version, tierLabels, tierImages, sponsors }
}

export function sanitizeSponsorsForSave(input: SponsorsDoc): SponsorsDoc {
  const version = Number.isFinite(input.version) ? Math.max(1, Math.floor(input.version)) : 1
  const tierLabels = normalizeTierLabels(input.tierLabels)
  const tierImages = normalizeTierImages(input.tierImages)
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
    const tier = parseTier(r.tier)
    sponsors.push({ id: r.id, name, websiteUrl, logoUrl, sortOrder, tier })
  }
  return { version, tierLabels, tierImages, sponsors }
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

export type SponsorTierGroup = {
  tier: SponsorTierId
  partners: Partner[]
}

/** Public site: tiers with at least one sponsor, highest tier first. */
export function sponsorsGroupedByTier(doc: SponsorsDoc): SponsorTierGroup[] {
  const byTier = new Map<SponsorTierId, SponsorRecord[]>()
  for (const t of SPONSOR_TIER_ORDER) byTier.set(t, [])
  for (const s of doc.sponsors) {
    const tier = parseTier(s.tier)
    byTier.get(tier)!.push(s)
  }
  const out: SponsorTierGroup[] = []
  for (const t of SPONSOR_TIER_ORDER) {
    const list = byTier.get(t)!
    if (list.length === 0) continue
    out.push({ tier: t, partners: sponsorsToPartners(list) })
  }
  return out
}

export function tierImageOrEmoji(
  tierImages: SponsorTierImages,
  tier: SponsorTierId,
): { imageUrl: string | null; emoji: string } {
  const url = tierImages[tier]?.trim()
  if (url && url.startsWith('https://')) return { imageUrl: url, emoji: '' }
  return { imageUrl: null, emoji: SPONSOR_TIER_DEFAULT_ICON_EMOJI }
}
