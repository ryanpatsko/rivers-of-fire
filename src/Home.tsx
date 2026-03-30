import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createDefaultSiteContent, loadSiteContent } from './content/siteContent'
import {
  createDefaultVendorsDoc,
  loadVendors,
  vendorsToPartners,
} from './content/vendorsContent'
import { PartnerGrid } from './PartnerGrid'
import { sponsors2026 } from './partnersData'
import { ScrollScoville } from './ScrollScoville'
import styles from './App.module.css'

/** Floating embers across the full viewport, behind `.content` (same stack as parallax). */
const PAGE_EMBER_SLOTS = Array.from({ length: 22 }, (_, i) => ({
  left: 2 + (i * 96) / 21,
  dur: 8.2 + (i % 7) * 0.55,
  delay: (i * 0.41) % 5.2,
  drift: i % 2 === 0 ? 26 : -22,
}))

function CmsHtml({ html, className }: { html: string; className: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

type EventIconKey =
  | 'shop'
  | 'question'
  | 'puzzle'
  | 'vote'
  | 'pepper'
  | 'flame'
  | 'taco'
  | 'mic'
  | 'search'
  | 'spark'
  | 'snowflake'
  | 'gamepad'
  | 'wing'

type EventDef = {
  icon: EventIconKey
  title: string
  description: string
  badge?: 'maybe' | 'both-days'
  /** In-page section id (no `#`) for smooth scroll from the card */
  jumpToSectionId?: string
  jumpLinkLabel?: string
}

function SectionBgSpecks({ count = 16 }: { count?: number }) {
  return (
    <div className={styles.sectionBgSpecks} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={styles.contentSpeck} />
      ))}
    </div>
  )
}

function EventIcon({ icon }: { icon: EventIconKey }) {
  // Outline-only icons so the event cards feel consistent and not "emoji-cheesy".
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (icon) {
    case 'shop':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...common} d="M4 10V20h16V10" />
          <path {...common} d="M3 10l2-5h14l2 5" />
          <path {...common} d="M10 20v-6h4v6" />
        </svg>
      )
    case 'question':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle {...common} cx="12" cy="12" r="9" />
          <path
            {...common}
            d="M9.5 9.5a2.5 2.5 0 1 1 4.2 1.8c-.8.7-1.7 1-1.7 2.2"
          />
          <path {...common} d="M12 17h.01" />
        </svg>
      )
    case 'puzzle':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            {...common}
            d="M8 3h3a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v3h-3a2 2 0 0 0-2 2v3H8v-3a2 2 0 0 1 2-2h1v-2H10a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
          />
        </svg>
      )
    case 'vote':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...common} d="M7 3h10l2 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6l2-3Z" />
          <path {...common} d="M9 12l2 2 4-6" />
        </svg>
      )
    case 'pepper':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...common} d="M12 3c2 2 4 4 4 7 0 3-2 5-4 11-2-6-4-8-4-11 0-3 2-5 4-7Z" />
          <path {...common} d="M15 6c1-1 2-2 3-2" />
        </svg>
      )
    case 'flame':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {/* More recognizable outline flame (stroke-only). */}
          <path
            {...common}
            d="M12 2s4 4 4 8-2 7-4 7-4-3-4-7 4-8 4-8Z"
          />
          <path {...common} d="M12 9s-2 2-2 4 2 3 2 3 2-1 2-3-2-4-2-4Z" />
        </svg>
      )
    case 'taco':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...common} d="M4 11c0 6 16 6 16 0 0-2-2-6-8-6s-8 4-8 6Z" />
          <path {...common} d="M5 11l1 7c0 1 1 2 2 2h8c1 0 2-1 2-2l1-7" />
        </svg>
      )
    case 'mic':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...common} d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
          <path {...common} d="M19 11a7 7 0 0 1-14 0" />
          <path {...common} d="M12 18v3" />
        </svg>
      )
    case 'search':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle {...common} cx="11" cy="11" r="7" />
          <path {...common} d="M20 20l-3.5-3.5" />
        </svg>
      )
    case 'spark':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...common} d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2Z" />
          <path {...common} d="M20 2l.8 2.4L23 5l-2.2.6L20 8l-.8-2.4L17 5l2.2-.6L20 2Z" />
        </svg>
      )
    case 'snowflake':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...common} d="M12 2v20" />
          <path {...common} d="M4.9 6.2l14.2 11.6" />
          <path {...common} d="M19.1 6.2L4.9 17.8" />
          <path {...common} d="M2 12h20" />
          <path {...common} d="M7 4.5l1.5 3M17 4.5l-1.5 3M7 19.5l1.5-3M17 19.5l-1.5-3" />
        </svg>
      )
    case 'gamepad':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...common} d="M8 10h8a4 4 0 0 1 4 4v2H4v-2a4 4 0 0 1 4-4Z" />
          <path {...common} d="M7 16l-2 2" />
          <path {...common} d="M17 16l2 2" />
          <circle {...common} cx="9.5" cy="14" r="1" />
          <circle {...common} cx="14.5" cy="14" r="1" />
          <path {...common} d="M10 14h4" />
        </svg>
      )
    case 'wing':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...common} d="M20 4c-6 1-11 4-13 7-2 3-1 7 2 9 3 2 7 1 9-2 3-2 6-7 2-14Z" />
          <path {...common} d="M7 15c2-1 4-2 7-3" />
          <path {...common} d="M9 18c2-1 4-2 6-3" />
        </svg>
      )
    default:
      return null
  }
}

const FRIDAY_EVENTS: EventDef[] = [
  {
    icon: 'shop',
    title: 'Crafters & makers',
    description:
      'Friday night is free. Browse handmade goods from local makers. Hot sauce vendors are not selling bottles this evening.',
  },
  {
    icon: 'question',
    title: 'Trivia',
    description: 'Team or solo trivia on the festival floor—details and timing to be announced.',
  },
  {
    icon: 'puzzle',
    title: 'Pepper-themed mobile escape room',
    description:
      'A traveling escape room with a pepper theme, on site Friday and Saturday.',
    badge: 'both-days',
  },
  {
    icon: 'vote',
    title: 'Hot sauce people’s choice',
    description:
      'Voting may open Friday night for favorite sauces, with winners announced Saturday. If it runs, polls would stay open through roughly the first two hours Saturday.',
    badge: 'maybe',
  },
]

const SATURDAY_EVENTS: EventDef[] = [
  {
    icon: 'pepper',
    title: 'Hot sauce vendors',
    description:
      'Small-batch makers sampling and selling bottles—local and visiting brands, larger layout than year one.',
    jumpToSectionId: 'hot-sauce-vendors-heading',
    jumpLinkLabel: 'View hot sauce vendors',
  },
  {
    icon: 'flame',
    title: 'League of Fire pepper contest',
    description: 'The main eating competition: experienced competitors and newcomers take on the League of Fire format.',
  },
  {
    icon: 'taco',
    title: 'Food vendors',
    description: 'Food trucks and stands with snacks and full plates—see the roster below.',
    jumpToSectionId: 'food-trucks-heading',
    jumpLinkLabel: 'View food trucks and other vendors',
  },
  {
    icon: 'mic',
    title: 'Pittsburgh Hot Talk',
    description:
      'A Hot Ones–style interview: Pittsburgh guests and a lineup of sauces, hosted at the fest.',
  },
  {
    icon: 'search',
    title: 'Scavenger hunt',
    description: 'Clues and checkpoints around the venue; finish for prizes or perks (details at the event).',
  },
  {
    icon: 'spark',
    title: 'Fire & aerial show',
    description:
      'Iron City Circus Arts returns with fire performance and aerial work designed to light up the night.',
  },
  {
    icon: 'snowflake',
    title: 'Fire & ice challenge with Nervana',
    description:
      'Optional ice bath or a fire-then-ice sequence to increase the donation. Run with Nervana Health (formerly Pittsburgh Tub Club); proceeds support Animal Friends for Veterans.',
  },
  {
    icon: 'gamepad',
    title: 'DJ & games',
    description: 'Pinball loft, pool, air hockey, and a DJ on the schedule.',
  },
  {
    icon: 'wing',
    title: '10-wing challenge',
    description: 'Ten wings, increasing heat—available as a ticket add-on when sales open.',
  },
]

/** Muted loop behind the hero; omitted when the user prefers reduced motion. */
function HeroBackdropVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    const v = videoRef.current
    if (!v) return
    const tryPlay = () => {
      void v.play().catch(() => {})
    }
    if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) tryPlay()
    else v.addEventListener('canplay', tryPlay, { once: true })
    return () => v.removeEventListener('canplay', tryPlay)
  }, [reduceMotion, src])

  if (reduceMotion) return null

  return (
    <div className={styles.heroVideoLayer} aria-hidden="true">
      <video
        ref={videoRef}
        className={styles.heroVideo}
        src={src}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className={styles.heroVideoScrim} />
    </div>
  )
}

function EventCard({
  event,
  flipFromRight = false,
  flipStaggerMs = 0,
}: {
  event: EventDef
  flipFromRight?: boolean
  flipStaggerMs?: number
}) {
  const ref = useRef<HTMLElement>(null)
  const [entered, setEntered] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (e?.isIntersecting) {
          setEntered(true)
          obs.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <article
      ref={ref}
      className={`${styles.eventCard} ${entered ? styles.eventCardEntered : ''} ${flipFromRight ? styles.eventCardFlipFromRight : styles.eventCardFlipFromLeft}`}
      style={{ ['--event-flip-delay' as string]: `${flipStaggerMs}ms` }}
    >
      <div className={styles.eventHead}>
        <div className={styles.eventIcon} aria-hidden="true">
          <EventIcon icon={event.icon} />
        </div>
        <h3 className={styles.eventTitle}>{event.title}</h3>
      </div>
      {(event.badge === 'maybe' || event.badge === 'both-days') && (
        <div className={styles.eventBadgeRow}>
          {event.badge === 'both-days' && (
            <span className={styles.eventBadge}>Fri & Sat</span>
          )}
          {event.badge === 'maybe' && (
            <span className={`${styles.eventBadge} ${styles.eventBadgeMaybe}`}>Maybe</span>
          )}
        </div>
      )}
      <p className={styles.eventBody}>{event.description}</p>
      {event.jumpToSectionId && event.jumpLinkLabel ? (
        <p className={styles.eventJump}>
          <a className={styles.inlineLink} href={`#${event.jumpToSectionId}`}>
            {event.jumpLinkLabel}
          </a>
        </p>
      ) : null}
    </article>
  )
}

export default function Home() {
  const [site, setSite] = useState(createDefaultSiteContent)
  const [vendorsDoc, setVendorsDoc] = useState(createDefaultVendorsDoc)

  useEffect(() => {
    void loadSiteContent().then(setSite).catch(() => {})
  }, [])

  useEffect(() => {
    void loadVendors().then(setVendorsDoc).catch(() => {})
  }, [])

  const hotSauceVendors = vendorsToPartners(vendorsDoc.vendors, 'hotSauce')
  const otherVendors = vendorsToPartners(vendorsDoc.vendors, 'other')
  const foodTruckVendors = vendorsToPartners(vendorsDoc.vendors, 'foodTruck')

  const g = site.general

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className={styles.page}>
      <ScrollScoville />
      <a className={styles.skipLink} href="#main">
        {g.skipLinkText}
      </a>

      <div className={styles.parallaxWrap} aria-hidden="true">
        <div className={styles.parallaxBg} />
        <div className={styles.parallaxOverlay} />
        <div className={styles.pageEmbers}>
          {PAGE_EMBER_SLOTS.map((s, i) => (
            <span
              key={`page-ember-${i}`}
              className={styles.pageEmber}
              style={
                {
                  left: `${s.left}%`,
                  animationDuration: `${s.dur}s`,
                  animationDelay: `${s.delay}s`,
                  '--ember-drift': `${s.drift}`,
                  '--ember-reduce-stagger': i,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>

      <div className={styles.pageSideSpecks} aria-hidden="true">
        <div className={styles.sideSpecksStripLeft}>
          {Array.from({ length: 11 }, (_, i) => (
            <span key={`sl-${i}`} className={styles.sideSpeck} />
          ))}
        </div>
        <div className={styles.sideSpecksStripRight}>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={`sr-${i}`} className={styles.sideSpeck} />
          ))}
        </div>
      </div>

      <div className={styles.content}>
        <header className={styles.hero}>
          <HeroBackdropVideo src={g.recapVideoPath} />
          <div className={styles.heroEmbers} aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className={styles.heroEmber} />
            ))}
          </div>
          <div className={styles.heroEmbersHigh} aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={`h-${i}`} className={styles.heroEmberHigh} />
            ))}
          </div>
          <div className={styles.heroForeground}>
            <img
              className={styles.logo}
              src="/Rivers-of-Fire-logo-transparent-background.png"
              alt={g.festivalName}
              width={464}
              height={700}
              decoding="async"
            />
            <div className={styles.heroPanel}>
              <p className={styles.eyebrow}>{g.weekendRange}</p>
              <h1 className={styles.titleLine}>{g.festivalName}</h1>
              <p className={styles.subtitle}>{g.tagline}</p>
              <div className={styles.meta}>
                <span>
                  <a
                    className={styles.inlineLink}
                    href={g.venueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {g.venueName}
                  </a>
                  <span aria-hidden="true"> · </span>
                  <span>{g.venueArea}</span>
                </span>
              </div>
              <p className={styles.meta} style={{ marginTop: '0.5rem' }}>
                <span>{g.fridayWhen}</span>
              </p>
              <p className={styles.meta} style={{ marginTop: '0.35rem' }}>
                <span>{g.saturdayWhen}</span>
              </p>

              <div className={styles.ctaRow}>
                <a className={styles.ctaPrimary} href={g.ticketUrl}>
                  <span className={styles.ctaLabel}>{g.buyTicketsLabel}</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        <main id="main">
          <section className={styles.section} aria-labelledby="events-heading">
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>{g.scheduleKicker}</p>
              <h2 id="events-heading" className={styles.sectionTitle}>
                {g.scheduleTitle}
              </h2>
              <CmsHtml html={g.scheduleLeadHtml} className="siteContentHtmlSectionLead" />
              <CmsHtml html={g.scheduleFollowHtml} className="siteContentHtmlSectionLead" />
            </div>

            <div className={styles.dayBlock}>
              <h3 className={styles.dayHeading}>{g.dayFridayHeading}</h3>
              <CmsHtml html={g.dayFridaySubHtml} className="siteContentHtmlDaySub" />
              <div className={styles.eventsGrid}>
                {FRIDAY_EVENTS.map((event, i) => (
                  <EventCard
                    key={event.title}
                    event={event}
                    flipFromRight={i % 2 === 1}
                    flipStaggerMs={i * 55}
                  />
                ))}
              </div>
            </div>

            <div className={styles.dayBlock}>
              <h3 className={styles.dayHeading}>{g.daySaturdayHeading}</h3>
              <CmsHtml html={g.daySaturdaySubHtml} className="siteContentHtmlDaySub" />
              <div className={styles.eventsGrid}>
                {SATURDAY_EVENTS.map((event, i) => (
                  <EventCard
                    key={event.title}
                    event={event}
                    flipFromRight={i % 2 === 1}
                    flipStaggerMs={i * 48}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className={styles.sectionNarrow} aria-labelledby="hot-sauce-vendors-heading">
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>{g.hotSauceKicker}</p>
              <h2
                id="hot-sauce-vendors-heading"
                className={`${styles.sectionTitle} ${styles.sectionScrollTarget}`}
              >
                {g.hotSauceTitle}
              </h2>
              <CmsHtml html={g.hotSauceLeadHtml} className="siteContentHtmlSectionLead" />
            </div>
            <div className={styles.vendorStrip}>
              <PartnerGrid partners={hotSauceVendors} emptyMessage={g.hotSauceEmptyMessage} />
            </div>
          </section>

          <section className={styles.sectionNarrow} aria-labelledby="food-more-vendors-heading">
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>{g.foodKicker}</p>
              <h2 id="food-more-vendors-heading" className={styles.sectionTitle}>
                {g.foodTitle}
              </h2>
              <CmsHtml html={g.foodLeadHtml} className="siteContentHtmlSectionLead" />
            </div>
            <div className={styles.vendorStrip}>
              <h3 className={styles.vendorSubgroupTitle}>{g.foodOtherVendorsHeading}</h3>
              <PartnerGrid partners={otherVendors} emptyMessage={g.foodOtherEmpty} />
              <h3
                id="food-trucks-heading"
                className={`${styles.vendorSubgroupTitle} ${styles.sectionScrollTarget}`}
              >
                {g.foodTrucksHeading}
              </h3>
              <PartnerGrid partners={foodTruckVendors} emptyMessage={g.foodTrucksEmpty} />
            </div>
          </section>

          <section className={styles.sectionNarrow} aria-labelledby="sponsors-2026-heading">
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>{g.sponsorsKicker}</p>
              <h2 id="sponsors-2026-heading" className={styles.sectionTitle}>
                {g.sponsorsTitle}
              </h2>
              <CmsHtml html={g.sponsorsLeadHtml} className="siteContentHtmlSectionLead" />
            </div>
            <div className={styles.vendorStrip}>
              <PartnerGrid partners={sponsors2026} emptyMessage={g.sponsorsEmpty} />
            </div>
          </section>

          <section className={styles.sectionNarrow} style={{ paddingBottom: '2rem' }}>
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{g.ticketsTitle}</h2>
              <CmsHtml html={g.ticketsLeadHtml} className="siteContentHtmlSectionLead" />
            </div>
            <div className={styles.ctaRow}>
              <a className={styles.ctaPrimary} href={g.ticketUrl}>
                <span className={styles.ctaLabel}>{g.buyTicketsLabel}</span>
              </a>
            </div>
          </section>
        </main>

        <footer className={styles.footer}>
          <SectionBgSpecks count={12} />
          <img
            className={styles.footerLogo}
            src="/Rivers-of-Fire-logo-transparent-background.png"
            alt=""
            decoding="async"
          />
          <CmsHtml html={g.footerOrganizerHtml} className={`${styles.footerCopy} siteContentHtmlFooter`} />
          <div className={styles.footerSocial}>
            <a
              className={styles.footerSocialLink}
              href={g.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Pittsburgh’s Rivers of Fire on Instagram"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                className={styles.footerSocialIcon}
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a
              className={styles.footerSocialLink}
              href={g.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Pittsburgh’s Rivers of Fire on Facebook"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                className={styles.footerSocialIcon}
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>
          <p className={styles.footerCopy} style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
            © {new Date().getFullYear()} {g.festivalName}
          </p>
        </footer>
      </div>
    </div>
  )
}
