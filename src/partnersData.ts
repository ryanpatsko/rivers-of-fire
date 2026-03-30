/**
 * Shared `Partner` shape for vendor grids and sponsors.
 * Vendor rosters load from S3 (`vendors.json`); see `content/vendorsContent.ts`.
 */
export type Partner = {
  id: string
  name: string
  /** Image URL (e.g. S3 HTTPS URL from admin upload). */
  logoSrc?: string
  /** Full URL including https:// */
  websiteUrl?: string
}

export const sponsors2026: Partner[] = []
