/**
 * Vendor roster — add `websiteUrl` when ready. Logos live in `assets/vendor-logos/`
 * (served as `/vendor-logos/...` — see `vite.config.ts` publicDir).
 *
 * Unmapped files in `vendor-logos/` (no matching row yet): League of Fire logo.png,
 * PositivelyPitsburgh-logo-square - color.png
 *
 * `Masterminds Entertainment logo.jpg` is wired to **Masterdon** — confirm with Lisa.
 */
export type Partner = {
  id: string
  name: string
  /** Public URL under `/vendor-logos/` */
  logoSrc?: string
  /** Full URL including https:// */
  websiteUrl?: string
}

const P = (id: string, name: string): Partner => ({ id, name })

/** File name exactly as in `assets/vendor-logos/` (spaces OK — path is encoded). */
const L = (id: string, name: string, logoFile: string): Partner => ({
  id,
  name,
  logoSrc: `/vendor-logos/${encodeURIComponent(logoFile)}`,
})

export const hotSauceVendors: Partner[] = [
  L('hammajack', 'Hammajack', 'hammajack-logo.jpg'),
  L('maestros', "Maestro's", 'maestros_logo.png'),
  P('scorch-garden', 'Scorch Garden'),
  L('two-ugly-mugs', 'Two Ugly Mugs', '2UglyMugs logo.jpg'),
  L('ajuanas-gourmet-hot-sauce', "Ajuana's Gourmet Hot Sauce", 'Ajuanas logo.png'),
  P('pepper-boy-pepper-co', 'Pepper Boy Pepper Co.'),
  P('uncle-jammies', 'Uncle Jammies'),
  P('sonny-rose-ranch', 'Sonny Rose Ranch'),
  P('apoidea-apiary', 'Apoidea Apiary'),
  L('is-it-spicy', 'Is It Spicy?', 'Is It Spicy Logo.jpg'),
  P('tinkertown-provisions', 'Tinkertown Provisions'),
  L('masterdon', 'Masterdon', 'Masterminds Entertainment logo.jpg'),
  P('tannenbaum-hot-sauce', 'Tannenbaum Hot Sauce'),
  L('m-m-pickles', 'M&M Pickles', 'mm-pickle-logo.jpg'),
  P('lendoras-hot-sauce', "Lendora's Hot Sauce"),
  P('black-eyed-susan-spice-company', 'Black Eyed Susan Spice Company'),
  P('backroads-pepper-co', 'Backroads Pepper Co'),
  P('sizzle', 'Sizzle'),
  P('lees-homemade', "Lee's Homemade"),
  L('revolutionary-hot-sauce', 'Revolutionary Hot Sauce', 'Revolutionary Hot Sauce logo.jpeg'),
  P('beast-spice', 'Beast Spice'),
  P('beans-hot-sauce-co', 'Beans Hot Sauce Co.'),
]

export const otherVendors: Partner[] = [
  L('elfinwild-farms-beef-jerky', 'Elfinwild Farms Beef Jerky', 'Jerky logo.jpg'),
  P('jackworth-gingerbeer', 'Jackworth Gingerbeer'),
  L('michaels-manna', "Michael's Manna (seasoning)", 'Michaels Manna logo.png'),
  P('parkside-creamery', 'Parkside Creamery'),
  L('baked-true-north', 'Baked True North', 'Baked True NorthLogo Stacked GF.jpg'),
  L('pgh-dumplingz', 'Pgh Dumplingz', 'PGHDumplingz.jpeg'),
  P('forge-fried', 'Forge Fried'),
  P('scratch-bone-treat-co', 'Scratch & Bone Treat Co'),
]

/** Pgh Dumplings also appears under other vendors as Pgh Dumplingz (Lisa’s list); same logo on both until confirmed. */
export const foodTruckVendors: Partner[] = [
  L('cold-friends-kitchen', 'Cold Friends Kitchen', 'Cold Friends logo_black.svg'),
  L('pgh-dumplings', 'Pgh Dumplings', 'PGHDumplingz.jpeg'),
]

export const sponsors2026: Partner[] = []
