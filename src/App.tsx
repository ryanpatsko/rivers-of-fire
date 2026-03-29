import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PartnerGrid } from './PartnerGrid'
import {
  foodTruckVendors,
  hotSauceVendors,
  otherVendors,
  sponsors2026,
} from './partnersData'
import { ScrollScoville } from './ScrollScoville'
import styles from './App.module.css'

/** Replace with Lisa’s ticket URL when ready. */
const TICKET_URL = '#'

const INSTAGRAM_URL = 'https://www.instagram.com/pittsburghs.rivers.of.fire'

const FACEBOOK_URL =
  'https://www.facebook.com/people/Pittsburghs-Rivers-of-Fire/61575970932862/'

const VELUM_MAPS_URL =
  'https://www.google.com/maps/place/Velum+Fermentation/@40.4265323,-79.9757429,733m/data=!3m2!1e3!4b1!4m6!3m5!1s0x8834f19fe6a3938f:0x34e23bf02f4ee44b!8m2!3d40.4265323!4d-79.9757429!16s%2Fg%2F11sb0v_d3f'

/** Served from `/assets` via Vite `publicDir` (see `vite.config.ts`). Filename matches Lisa’s export. */
const RECAP_VIDEO_SRC = '/rivers_of_file_festival_recap_2025.mp4'

const FESTIVAL = {
  name: "Pittsburgh's Rivers of Fire",
  tagline: 'Second annual hot sauce festival',
  venueArea: 'South Side',
  /** Friday before first Saturday in Oct (mirrors 2025 weekend). */
  weekendRange: 'October 2-3, 2026',
  fridayWhen: 'Friday, October 2 - free preview · evening · time TBD',
  saturdayWhen: 'Saturday, October 3 - 12:30 - 6 pm · VIP early access 11 am',
}

type EventDef = {
  icon: string
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

const FRIDAY_EVENTS: EventDef[] = [
  {
    icon: '🛍️',
    title: 'Crafters & makers',
    description:
      'Friday night is free. Browse handmade goods from local makers. Hot sauce vendors are not selling bottles this evening.',
  },
  {
    icon: '🧠',
    title: 'Trivia',
    description: 'Team or solo trivia on the festival floor—details and timing to be announced.',
  },
  {
    icon: '🚐',
    title: 'Pepper-themed mobile escape room',
    description:
      'A traveling escape room with a pepper theme, on site Friday and Saturday.',
    badge: 'both-days',
  },
  {
    icon: '🗳️',
    title: 'Hot sauce people’s choice',
    description:
      'Voting may open Friday night for favorite sauces, with winners announced Saturday. If it runs, polls would stay open through roughly the first two hours Saturday.',
    badge: 'maybe',
  },
]

const SATURDAY_EVENTS: EventDef[] = [
  {
    icon: '🌶️',
    title: 'Hot sauce vendors',
    description:
      'Small-batch makers sampling and selling bottles—local and visiting brands, larger layout than year one.',
    jumpToSectionId: 'hot-sauce-vendors-heading',
    jumpLinkLabel: 'View hot sauce vendors',
  },
  {
    icon: '🔥',
    title: 'League of Fire pepper contest',
    description: 'The main eating competition: experienced competitors and newcomers take on the League of Fire format.',
  },
  {
    icon: '🌮',
    title: 'Food vendors',
    description: 'Food trucks and stands with snacks and full plates—see the roster below.',
    jumpToSectionId: 'food-trucks-heading',
    jumpLinkLabel: 'View food trucks and other vendors',
  },
  {
    icon: '🎙️',
    title: 'Pittsburgh Hot Talk',
    description:
      'A Hot Ones–style interview: Pittsburgh guests and a lineup of sauces, hosted at the fest.',
  },
  {
    icon: '🔍',
    title: 'Scavenger hunt',
    description: 'Clues and checkpoints around the venue; finish for prizes or perks (details at the event).',
  },
  {
    icon: '🎪',
    title: 'Fire & aerial show',
    description:
      'Iron City Circus Arts returns with fire performance and aerial work designed to light up the night.',
  },
  {
    icon: '❄️',
    title: 'Fire & ice challenge with Nervana',
    description:
      'Optional ice bath or a fire-then-ice sequence to increase the donation. Run with Nervana Health (formerly Pittsburgh Tub Club); proceeds support Animal Friends for Veterans.',
  },
  {
    icon: '🎮',
    title: 'DJ & games',
    description: 'Pinball loft, pool, air hockey, and a DJ on the schedule.',
  },
  {
    icon: '🍗',
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
          {event.icon}
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

export default function App() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className={styles.page}>
      <ScrollScoville />
      <a className={styles.skipLink} href="#main">
        Skip to main content
      </a>

      <div className={styles.parallaxWrap} aria-hidden="true">
        <div className={styles.parallaxBg} />
        <div className={styles.parallaxOverlay} />
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
          <HeroBackdropVideo src={RECAP_VIDEO_SRC} />
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
              alt="Pittsburgh's Rivers of Fire"
              width={464}
              height={700}
              decoding="async"
            />
            <div className={styles.heroPanel}>
              <p className={styles.eyebrow}>{FESTIVAL.weekendRange}</p>
              <h1 className={styles.titleLine}>{FESTIVAL.name}</h1>
              <p className={styles.subtitle}>{FESTIVAL.tagline}</p>
              <div className={styles.meta}>
                <span>
                  <a
                    className={styles.inlineLink}
                    href={VELUM_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Velum Fermentation
                  </a>
                  <span aria-hidden="true"> · </span>
                  <span>{FESTIVAL.venueArea}</span>
                </span>
              </div>
              <p className={styles.meta} style={{ marginTop: '0.5rem' }}>
                <span>{FESTIVAL.fridayWhen}</span>
              </p>
              <p className={styles.meta} style={{ marginTop: '0.35rem' }}>
                <span>{FESTIVAL.saturdayWhen}</span>
              </p>

              <div className={styles.ctaRow}>
                <a className={styles.ctaPrimary} href={TICKET_URL}>
                  <span className={styles.ctaLabel}>Buy tickets</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        <main id="main">
          <section className={styles.section} aria-labelledby="events-heading">
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>2026 schedule</p>
              <h2 id="events-heading" className={styles.sectionTitle}>
                2025 lineup returns, plus Friday preview
              </h2>
              <p className={styles.sectionLead}>
                The 2025 program is back with additions: a free Friday preview, Nervana Health with the
                fire-and-ice challenge, Iron City Circus Arts (fire and aerial), the scavenger hunt, and a
                pepper-themed escape room on both nights.
              </p>
              <p className={styles.sectionLead}>
                <a
                  className={styles.inlineLink}
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Schedule and announcements on Instagram
                </a>
                .
              </p>
            </div>

            <div className={styles.dayBlock}>
              <h3 className={styles.dayHeading}>Friday - free preview</h3>
              <p className={styles.daySub}>
                No hot sauce bottle sales this night. Expect crafters, trivia, and the mobile escape room
                while the floor opens for the weekend.
              </p>
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
              <h3 className={styles.dayHeading}>Saturday - main event</h3>
              <p className={styles.daySub}>
                The escape room stays open, vendors sell and sample, and contests and entertainment run from
                VIP early access through closing.
              </p>
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
              <p className={styles.sectionKicker}>Hot sauce</p>
              <h2
                id="hot-sauce-vendors-heading"
                className={`${styles.sectionTitle} ${styles.sectionScrollTarget}`}
              >
                Hot sauce vendors
              </h2>
              <p className={styles.sectionLead}>
                Small-batch makers sampling and selling bottles.
              </p>
            </div>
            <div className={styles.vendorStrip}>
              <PartnerGrid
                partners={hotSauceVendors}
                emptyMessage="Hot sauce vendor list not published yet."
              />
            </div>
          </section>

          <section className={styles.sectionNarrow} aria-labelledby="food-more-vendors-heading">
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Food and drink</p>
              <h2 id="food-more-vendors-heading" className={styles.sectionTitle}>
                Food, drinks &amp; more
              </h2>
              <p className={styles.sectionLead}>
                Food trucks, snacks, drinks, and other vendors.
              </p>
            </div>
            <div className={styles.vendorStrip}>
              <h3 className={styles.vendorSubgroupTitle}>Other vendors</h3>
              <PartnerGrid partners={otherVendors} emptyMessage="Vendor list not published yet." />
              <h3
                id="food-trucks-heading"
                className={`${styles.vendorSubgroupTitle} ${styles.sectionScrollTarget}`}
              >
                Food trucks
              </h3>
              <PartnerGrid partners={foodTruckVendors} emptyMessage="Food truck list not published yet." />
            </div>
          </section>

          <section className={styles.sectionNarrow} aria-labelledby="sponsors-2026-heading">
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Sponsors</p>
              <h2 id="sponsors-2026-heading" className={styles.sectionTitle}>
                2026 sponsors
              </h2>
              <p className={styles.sectionLead}>Businesses supporting the 2026 festival.</p>
            </div>
            <div className={styles.vendorStrip}>
              <PartnerGrid
                partners={sponsors2026}
                emptyMessage="2026 sponsors not listed yet."
              />
            </div>
          </section>

          <section className={styles.sectionNarrow} style={{ paddingBottom: '2rem' }}>
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Tickets</h2>
              <p className={styles.sectionLead}>
                Friday preview is free; Saturday is ticketed. Ticket link and pricing will be posted when
                sales open.
              </p>
            </div>
            <div className={styles.ctaRow}>
              <a className={styles.ctaPrimary} href={TICKET_URL}>
                <span className={styles.ctaLabel}>Buy tickets</span>
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
          <p className={styles.footerCopy}>
            Pittsburgh&apos;s Rivers of Fire is organized by{' '}
            <a href="https://www.hammajack.com/" style={{ color: 'var(--color-gold-bright)' }}>
              Hammajack Heat Co.
            </a>
            .
          </p>
          <div className={styles.footerSocial}>
            <a
              className={styles.footerSocialLink}
              href={INSTAGRAM_URL}
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
              href={FACEBOOK_URL}
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
            © {new Date().getFullYear()} Pittsburgh&apos;s Rivers of Fire
          </p>
        </footer>
      </div>
    </div>
  )
}
