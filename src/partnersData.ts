/**
 * Add partners once Lisa sends names, sites, and logo files.
 *
 * Logos: put PNG/SVG/WebP under `assets/vendors/` (see `vite.config.ts` publicDir)
 * and reference them as `/vendors/your-file.png`.
 *
 * Title for non-hot-sauce rows is "Food, drinks & more" in the UI; other options
 * you might swap in: "Street eats & sips", "Beyond the bottle", "Festival food hall".
 */
export type Partner = {
  /** Stable key for React lists */
  id: string
  name: string
  /** Public URL, e.g. `/vendors/acme.png` */
  logoSrc: string
  /** Full URL including https:// */
  websiteUrl: string
}

export const hotSauceVendors: Partner[] = []

export const foodAndMoreVendors: Partner[] = []

export const sponsors2026: Partner[] = []
