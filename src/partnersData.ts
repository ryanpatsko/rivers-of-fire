/**
 * Shared `Partner` shape for vendor grids and sponsors.
 * Vendor rosters load from S3 (`vendors.json`); sponsors from `sponsors.json`.
 */
export type Partner = {
  id: string
  name: string
  /** Image URL (e.g. S3 HTTPS URL from admin upload). */
  logoSrc?: string
  /** Full URL including https:// */
  websiteUrl?: string
}
