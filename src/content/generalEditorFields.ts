import type { SiteGeneralContent } from './siteContent'

/** Every key in `general` appears exactly once, in editor order. */
export const GENERAL_EDITOR_GROUPS: {
  title: string
  keys: (keyof SiteGeneralContent)[]
}[] = [
  {
    title: 'Hero & festival',
    keys: [
      'festivalName',
      'tagline',
      'weekendRange',
      'fridayWhen',
      'saturdayWhen',
      'recapVideoPath',
      'ticketUrl',
      'buyTicketsLabel',
      'skipLinkText',
    ],
  },
  {
    title: 'Venue',
    keys: ['venueName', 'venueUrl', 'venueArea'],
  },
  {
    title: 'Social links',
    keys: ['instagramUrl', 'facebookUrl'],
  },
  {
    title: 'Schedule section',
    keys: ['scheduleKicker', 'scheduleTitle', 'scheduleLeadHtml', 'scheduleFollowHtml'],
  },
  {
    title: 'Day intros',
    keys: [
      'dayFridayHeading',
      'dayFridaySubHtml',
      'daySaturdayHeading',
      'daySaturdaySubHtml',
    ],
  },
  {
    title: 'Hot sauce section',
    keys: ['hotSauceKicker', 'hotSauceTitle', 'hotSauceLeadHtml', 'hotSauceEmptyMessage'],
  },
  {
    title: 'Food & vendors section',
    keys: [
      'foodKicker',
      'foodTitle',
      'foodLeadHtml',
      'foodOtherVendorsHeading',
      'foodTrucksHeading',
      'foodOtherEmpty',
      'foodTrucksEmpty',
    ],
  },
  {
    title: 'Sponsors section',
    keys: ['sponsorsKicker', 'sponsorsTitle', 'sponsorsLeadHtml', 'sponsorsEmpty'],
  },
  {
    title: 'Tickets section',
    keys: ['ticketsTitle', 'ticketsLeadHtml'],
  },
  {
    title: 'Footer',
    keys: ['footerOrganizerHtml'],
  },
]

const LABELS: Partial<Record<keyof SiteGeneralContent, string>> = {
  festivalName: 'Festival name',
  tagline: 'Tagline',
  venueName: 'Venue name (link text)',
  venueUrl: 'Venue map URL',
  venueArea: 'Venue area / neighborhood',
  weekendRange: 'Weekend date range (hero eyebrow)',
  fridayWhen: 'Friday when / details',
  saturdayWhen: 'Saturday when / details',
  ticketUrl: 'Ticket / buy URL',
  recapVideoPath: 'Recap video path (e.g. /video.mp4)',
  instagramUrl: 'Instagram URL',
  facebookUrl: 'Facebook URL',
  scheduleKicker: 'Schedule section kicker',
  scheduleTitle: 'Schedule section title',
  scheduleLeadHtml: 'Schedule lead (HTML)',
  scheduleFollowHtml: 'Schedule follow-up (HTML, e.g. Instagram)',
  dayFridayHeading: 'Friday block heading',
  dayFridaySubHtml: 'Friday intro (HTML)',
  daySaturdayHeading: 'Saturday block heading',
  daySaturdaySubHtml: 'Saturday intro (HTML)',
  hotSauceKicker: 'Hot sauce kicker',
  hotSauceTitle: 'Hot sauce title',
  hotSauceLeadHtml: 'Hot sauce lead (HTML)',
  hotSauceEmptyMessage: 'Hot sauce empty list message',
  foodKicker: 'Food section kicker',
  foodTitle: 'Food section title',
  foodLeadHtml: 'Food section lead (HTML)',
  foodOtherVendorsHeading: 'Other vendors heading',
  foodTrucksHeading: 'Food trucks heading',
  foodOtherEmpty: 'Other vendors empty message',
  foodTrucksEmpty: 'Food trucks empty message',
  sponsorsKicker: 'Sponsors kicker',
  sponsorsTitle: 'Sponsors title',
  sponsorsLeadHtml: 'Sponsors lead (HTML)',
  sponsorsEmpty: 'Sponsors empty message',
  ticketsTitle: 'Tickets title',
  ticketsLeadHtml: 'Tickets lead (HTML)',
  buyTicketsLabel: 'Buy tickets button label',
  footerOrganizerHtml: 'Footer organizer (HTML)',
  skipLinkText: 'Skip link text',
}

export function fieldLabel(key: keyof SiteGeneralContent): string {
  return LABELS[key] ?? String(key)
}

export function fieldIsMultiline(key: keyof SiteGeneralContent): boolean {
  return String(key).endsWith('Html')
}
