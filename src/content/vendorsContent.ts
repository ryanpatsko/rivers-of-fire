import defaultDoc from './defaultVendors.json'
import type { Partner } from '../partnersData'

export const VENDOR_TYPES = ['hotSauce', 'other', 'foodTruck'] as const
export type VendorCategory = (typeof VENDOR_TYPES)[number]

export type VendorRecord = {
  id: string
  name: string
  websiteUrl: string
  logoUrl: string
  type: VendorCategory
  sortOrder: number
}

export type VendorsDoc = {
  version: number
  vendors: VendorRecord[]
}

export const DEFAULT_VENDORS_URL =
  'https://rivers-of-fire-cms.s3.us-east-1.amazonaws.com/vendors.json'

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isVendorCategory(v: unknown): v is VendorCategory {
  return typeof v === 'string' && (VENDOR_TYPES as readonly string[]).includes(v)
}

export function createDefaultVendorsDoc(): VendorsDoc {
  return JSON.parse(JSON.stringify(defaultDoc)) as VendorsDoc
}

export function normalizeVendorsDoc(input: unknown): VendorsDoc {
  const def = createDefaultVendorsDoc()
  if (!input || typeof input !== 'object') return def
  const o = input as Record<string, unknown>
  const version = typeof o.version === 'number' ? o.version : def.version
  const rawList = Array.isArray(o.vendors) ? o.vendors : []
  const vendors: VendorRecord[] = []
  for (const row of rawList) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = typeof r.id === 'string' && ID_RE.test(r.id) ? r.id : ''
    if (!id) continue
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    const websiteUrl = typeof r.websiteUrl === 'string' ? r.websiteUrl.trim() : ''
    const logoUrl = typeof r.logoUrl === 'string' ? r.logoUrl.trim() : ''
    const type = isVendorCategory(r.type) ? r.type : 'hotSauce'
    const sortOrder = typeof r.sortOrder === 'number' && Number.isFinite(r.sortOrder) ? r.sortOrder : 0
    vendors.push({ id, name: name || 'Vendor', websiteUrl, logoUrl, type, sortOrder })
  }
  if (vendors.length === 0) return def
  return { version, vendors }
}

export function sanitizeVendorsForSave(input: VendorsDoc): VendorsDoc {
  const version = Number.isFinite(input.version) ? Math.max(1, Math.floor(input.version)) : 1
  const vendors: VendorRecord[] = []
  for (const r of input.vendors) {
    if (!r || typeof r.id !== 'string' || !ID_RE.test(r.id) || r.id.length > 64) continue
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, 200) : ''
    if (!name) continue
    const websiteUrl =
      typeof r.websiteUrl === 'string' ? r.websiteUrl.trim().slice(0, 500) : ''
    let logoUrl = typeof r.logoUrl === 'string' ? r.logoUrl.trim().slice(0, 2048) : ''
    if (logoUrl && !logoUrl.startsWith('https://')) logoUrl = ''
    const type = isVendorCategory(r.type) ? r.type : 'hotSauce'
    const sortOrder =
      typeof r.sortOrder === 'number' && Number.isFinite(r.sortOrder) ? Math.floor(r.sortOrder) : 0
    vendors.push({ id: r.id, name, websiteUrl, logoUrl, type, sortOrder })
  }
  return { version, vendors }
}

export async function loadVendors(): Promise<VendorsDoc> {
  const url = import.meta.env.VITE_VENDORS_URL?.trim() || DEFAULT_VENDORS_URL
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to load vendors (${res.status})`)
  }
  return normalizeVendorsDoc(await res.json())
}

export function vendorsToPartners(list: VendorRecord[], type: VendorCategory): Partner[] {
  return list
    .filter((v) => v.type === type)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((v) => ({
      id: v.id,
      name: v.name,
      ...(v.websiteUrl ? { websiteUrl: v.websiteUrl } : {}),
      ...(v.logoUrl ? { logoSrc: v.logoUrl } : {}),
    }))
}

export const VENDOR_TYPE_LABELS: Record<VendorCategory, string> = {
  hotSauce: 'Hot sauce',
  other: 'Other vendors',
  foodTruck: 'Food trucks',
}
