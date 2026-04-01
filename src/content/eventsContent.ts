import defaultDoc from './defaultEvents.json'

/** Where the card appears: Saturday list is only `saturday`. `both` shows under Friday with a Fri & Sat ribbon. */
export const EVENT_DAYS = ['friday', 'saturday', 'both'] as const
export type EventDay = (typeof EVENT_DAYS)[number]

export const EVENT_ICON_KEYS = [
  'none',
  'shop',
  'brain',
  'van',
  'vote',
  'pepper',
  'flame',
  'taco',
  'mic',
  'search',
  'circus',
  'snowflake',
  'gamepad',
  'wing',
] as const
export type EventIconKey = (typeof EVENT_ICON_KEYS)[number]

export const EVENT_ICON_LABELS: Record<EventIconKey, string> = {
  none: 'No icon',
  shop: 'Shopping / makers',
  brain: 'Brain / trivia',
  van: 'Van / mobile room',
  vote: 'Ballot / vote',
  pepper: 'Hot pepper',
  flame: 'Flame / heat',
  taco: 'Taco / food',
  mic: 'Microphone / talk',
  search: 'Magnifying glass / hunt',
  circus: 'Circus tent / show',
  snowflake: 'Snowflake / ice',
  gamepad: 'Games / controller',
  wing: 'Chicken wing',
}

/** Emoji shown when there is no card logo. `none` is empty. */
export const EVENT_ICON_EMOJI: Record<EventIconKey, string> = {
  none: '',
  shop: '🛍️',
  brain: '🧠',
  van: '🚐',
  vote: '🗳️',
  pepper: '🌶️',
  flame: '🔥',
  taco: '🌮',
  mic: '🎙️',
  search: '🔍',
  circus: '🎪',
  snowflake: '❄️',
  gamepad: '🎮',
  wing: '🍗',
}

export type EventRecord = {
  id: string
  day: EventDay
  sortOrder: number
  title: string
  description: string
  iconKey: EventIconKey
  /** If set (HTTPS), shown instead of the emoji icon. */
  logoUrl: string
  /** When `logoUrl` is set, optional partner site opened in a new tab when the logo is clicked. */
  logoLinkUrl: string
  /** Optional “Maybe” ribbon (e.g. voting TBD). */
  badge?: 'maybe'
  jumpToSectionId: string
  jumpLinkLabel: string
}

export type EventsDoc = {
  version: number
  events: EventRecord[]
}

export const DEFAULT_EVENTS_URL =
  'https://rivers-of-fire-cms.s3.us-east-1.amazonaws.com/events.json'

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SECTION_ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/

function isEventDay(v: unknown): v is EventDay {
  return typeof v === 'string' && (EVENT_DAYS as readonly string[]).includes(v)
}

function isEventIconKey(v: unknown): v is EventIconKey {
  return typeof v === 'string' && (EVENT_ICON_KEYS as readonly string[]).includes(v)
}

export function createDefaultEventsDoc(): EventsDoc {
  return JSON.parse(JSON.stringify(defaultDoc)) as EventsDoc
}

function normalizeJumpId(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  return SECTION_ID_RE.test(s) ? s : ''
}

/** Only allowed when a card image exists; must be HTTPS. */
function normalizeEventLogoLinkUrl(logoUrl: string, raw: unknown): string {
  if (!logoUrl) return ''
  const s = typeof raw === 'string' ? raw.trim().slice(0, 2048) : ''
  return s.startsWith('https://') ? s : ''
}

export function normalizeEventsDoc(input: unknown): EventsDoc {
  const def = createDefaultEventsDoc()
  if (!input || typeof input !== 'object') return def
  const o = input as Record<string, unknown>
  const version = typeof o.version === 'number' ? o.version : def.version
  const rawList = Array.isArray(o.events) ? o.events : []
  const events: EventRecord[] = []
  for (const row of rawList) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = typeof r.id === 'string' && ID_RE.test(r.id) ? r.id : ''
    if (!id) continue
    const day = isEventDay(r.day) ? r.day : 'friday'
    const sortOrder = typeof r.sortOrder === 'number' && Number.isFinite(r.sortOrder) ? r.sortOrder : 0
    const title = typeof r.title === 'string' ? r.title.trim() : ''
    const description = typeof r.description === 'string' ? r.description.trim() : ''
    const iconKey = isEventIconKey(r.iconKey) ? r.iconKey : 'none'
    const logoUrl = typeof r.logoUrl === 'string' ? r.logoUrl.trim() : ''
    const safeLogo = logoUrl.startsWith('https://') ? logoUrl : ''
    const logoLinkUrl = normalizeEventLogoLinkUrl(safeLogo, r.logoLinkUrl)
    const badge = r.badge === 'maybe' ? 'maybe' : undefined
    let jumpToSectionId =
      typeof r.jumpToSectionId === 'string' ? normalizeJumpId(r.jumpToSectionId) : ''
    let jumpLinkLabel =
      typeof r.jumpLinkLabel === 'string' ? r.jumpLinkLabel.trim().slice(0, 200) : ''
    if (!jumpToSectionId || !jumpLinkLabel) {
      jumpToSectionId = ''
      jumpLinkLabel = ''
    }
    events.push({
      id,
      day,
      sortOrder,
      title: title || 'Event',
      description,
      iconKey,
      logoUrl: safeLogo,
      logoLinkUrl,
      badge,
      jumpToSectionId,
      jumpLinkLabel,
    })
  }
  if (events.length === 0) return def
  return { version, events }
}

export function sanitizeEventsForSave(input: EventsDoc): EventsDoc {
  const version = Number.isFinite(input.version) ? Math.max(1, Math.floor(input.version)) : 1
  const events: EventRecord[] = []
  for (const r of input.events) {
    if (!r || typeof r.id !== 'string' || !ID_RE.test(r.id) || r.id.length > 64) continue
    const title = typeof r.title === 'string' ? r.title.trim().slice(0, 300) : ''
    if (!title) continue
    const description =
      typeof r.description === 'string' ? r.description.trim().slice(0, 4000) : ''
    const day = isEventDay(r.day) ? r.day : 'friday'
    const sortOrder =
      typeof r.sortOrder === 'number' && Number.isFinite(r.sortOrder) ? Math.floor(r.sortOrder) : 0
    const iconKey = isEventIconKey(r.iconKey) ? r.iconKey : 'none'
    let logoUrl = typeof r.logoUrl === 'string' ? r.logoUrl.trim().slice(0, 2048) : ''
    if (logoUrl && !logoUrl.startsWith('https://')) logoUrl = ''
    const logoLinkUrl = normalizeEventLogoLinkUrl(logoUrl, r.logoLinkUrl)
    const badge = r.badge === 'maybe' ? 'maybe' : undefined
    let jumpToSectionId =
      typeof r.jumpToSectionId === 'string' ? normalizeJumpId(r.jumpToSectionId) : ''
    let jumpLinkLabel =
      typeof r.jumpLinkLabel === 'string' ? r.jumpLinkLabel.trim().slice(0, 200) : ''
    if (!jumpToSectionId || !jumpLinkLabel) {
      jumpToSectionId = ''
      jumpLinkLabel = ''
    }
    events.push({
      id: r.id,
      day,
      sortOrder,
      title,
      description,
      iconKey,
      logoUrl,
      logoLinkUrl,
      badge,
      jumpToSectionId,
      jumpLinkLabel,
    })
  }
  return { version, events }
}

export async function loadEvents(): Promise<EventsDoc> {
  const url = import.meta.env.VITE_EVENTS_URL?.trim() || DEFAULT_EVENTS_URL
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to load events (${res.status})`)
  }
  return normalizeEventsDoc(await res.json())
}

/** Friday block: `friday` + `both` (shared sortOrder ordering with “both” cards in the list). */
export function eventsForFriday(list: EventRecord[]): EventRecord[] {
  return list
    .filter((e) => e.day === 'friday' || e.day === 'both')
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

/** Saturday block: Saturday-only events. */
export function eventsForSaturday(list: EventRecord[]): EventRecord[] {
  return list
    .filter((e) => e.day === 'saturday')
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

/** Admin table: Friday column events first, then Saturday, each group by sortOrder. */
export function sortEventsForAdminTable(list: EventRecord[]): EventRecord[] {
  return [...list].sort((a, b) => {
    const aFri = a.day === 'friday' || a.day === 'both'
    const bFri = b.day === 'friday' || b.day === 'both'
    if (aFri !== bFri) return aFri ? -1 : 1
    return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
  })
}

export type EventCardModel = {
  id: string
  title: string
  description: string
  logoUrl: string
  /** Opens in new tab when the card logo is clicked. */
  logoLinkUrl?: string
  iconEmoji: string
  showBothDaysBadge: boolean
  badge?: 'maybe'
  jumpToSectionId?: string
  jumpLinkLabel?: string
}

export function toEventCardModel(r: EventRecord): EventCardModel {
  const logoUrl = r.logoUrl.trim()
  const link = (r.logoLinkUrl ?? '').trim()
  const logoLinkUrl =
    logoUrl && link.startsWith('https://') ? link : undefined
  const iconEmoji = logoUrl ? '' : EVENT_ICON_EMOJI[r.iconKey] ?? ''
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    logoUrl,
    ...(logoLinkUrl ? { logoLinkUrl } : {}),
    iconEmoji,
    showBothDaysBadge: r.day === 'both',
    badge: r.badge,
    jumpToSectionId: r.jumpToSectionId || undefined,
    jumpLinkLabel: r.jumpLinkLabel || undefined,
  }
}

export const EVENT_DAY_LABELS: Record<EventDay, string> = {
  friday: 'Friday',
  saturday: 'Saturday',
  both: 'Both days (listed under Friday)',
}
