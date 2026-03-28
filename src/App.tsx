import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PartnerGrid } from './PartnerGrid'
import {
  foodAndMoreVendors,
  hotSauceVendors,
  sponsors2026,
} from './partnersData'
import { ScrollScoville } from './ScrollScoville'
import styles from './App.module.css'

/** Replace with Lisa’s ticket URL when ready. */
const TICKET_URL = '#'

const INSTAGRAM_URL = 'https://www.instagram.com/pittsburghs.rivers.of.fire'

const FACEBOOK_URL =
  'https://www.facebook.com/people/Pittsburghs-Rivers-of-Fire/61575970932862/'

/** Served from `/assets` via Vite `publicDir` (see `vite.config.ts`). Filename matches Lisa’s export. */
const RECAP_VIDEO_SRC = '/rivers_of_file_festival_recap_2025.mp4'

const FESTIVAL = {
  name: "Pittsburgh's Rivers of Fire",
  tagline: "Pittsburgh's First Ever Hot Sauce Festival - Year Two",
  venue: 'Velum Fermentation · South Side',
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
      'Friday night is free: browse handmade goods from local crafters. No hot sauce vendor sales this evening - just a relaxed on-ramp to the weekend.',
  },
  {
    icon: '🧠',
    title: 'Trivia',
    description: 'Bring a team (or roll solo) for a pepper-powered trivia throwdown to kick things off.',
  },
  {
    icon: '🚐',
    title: 'Pepper-themed mobile escape room',
    description:
      'A traveling escape experience with a spicy twist - solve your way out before the main event heats up.',
    badge: 'both-days',
  },
  {
    icon: '🗳️',
    title: 'Hot sauce people’s choice',
    description:
      'We may open voting Friday night for favorite sauces, with winners announced Saturday - and polls staying open through about the first two hours of the fest.',
    badge: 'maybe',
  },
]

const SATURDAY_EVENTS: EventDef[] = [
  {
    icon: '🌶️',
    title: 'Hot sauce vendors',
    description:
      'Local and not-so-local small-batch makers pouring samples and selling bottles - same energy as year one, bigger footprint.',
  },
  {
    icon: '🔥',
    title: 'League of Fire pepper contest',
    description: 'The headline eat-off: seasoned chomp champs and brave newcomers face the heat.',
  },
  {
    icon: '🌮',
    title: 'Food vendors',
    description: 'Plates built to pair with serious sauce - from snacks to full-on festival fuel.',
  },
  {
    icon: '🎙️',
    title: 'Pittsburgh Hot Talk',
    description:
      'Our Steel City spin on Hot Ones - local guests, ten sauces, zero chill.',
  },
  {
    icon: '🔍',
    title: 'Scavenger hunt',
    description: 'Hunt clues, hit checkpoints, and chase bragging rights (and perks) across the venue.',
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
      'Cool off in an ice bath or go full fire-then-ice to double the donation - Nervana Health (the crew formerly known as Pittsburgh Tub Club) powers the chill side, supporting Animal Friends for Veterans.',
  },
  {
    icon: '🎮',
    title: 'DJ & games',
    description: 'Pinball loft, pool, air hockey, and a DJ when you need to pace the burn.',
  },
  {
    icon: '🍗',
    title: '10-wing challenge',
    description: 'Ten steps of rising heat - grab the add-on when tickets go live.',
  },
  {
    icon: '✨',
    title: '…and Lisa’s “I’m forgetting something” list',
    description:
      'If it slapped last year, it’s probably back - plus a few surprises we’ll announce as the schedule locks.',
  },
]

function FestivalRecap({ src }: { src: string }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [needsUnmuteHint, setNeedsUnmuteHint] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    const stage = stageRef.current
    if (!video || !stage) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const playWhenVisible = async (visible: boolean) => {
      if (!video) return
      if (!visible) {
        video.pause()
        return
      }
      try {
        video.muted = false
        await video.play()
        setNeedsUnmuteHint(false)
      } catch {
        video.muted = true
        setNeedsUnmuteHint(true)
        try {
          await video.play()
        } catch {
          setNeedsUnmuteHint(true)
        }
      }
    }

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (!e) return
        void playWhenVisible(e.isIntersecting)
      },
      { threshold: 0.32, rootMargin: '0px 0px -10% 0px' },
    )
    obs.observe(stage)
    return () => obs.disconnect()
  }, [])

  const enableSound = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = false
    setNeedsUnmuteHint(false)
    void v.play()
  }

  return (
    <section className={styles.recapSection} aria-labelledby="recap-heading">
      <SectionBgSpecks />
      <div ref={stageRef} className={styles.recapStage}>
        <video
          ref={videoRef}
          className={styles.recapVideoBg}
          src={src}
          playsInline
          preload="metadata"
          controls
          aria-label="2025 Rivers of Fire festival recap video"
        />
        <div className={styles.recapScrim} aria-hidden />
        <div className={styles.recapOverlay}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionKicker}>See it for yourself</p>
            <h2 id="recap-heading" className={styles.sectionTitle}>
              2025 festival recap
            </h2>
          </div>
          <p className={styles.recapCaption}>Highlights from our first year at Velum.</p>
          {needsUnmuteHint ? (
            <button type="button" className={styles.recapUnmute} onClick={enableSound}>
              Turn sound on
            </button>
          ) : null}
        </div>
      </div>
    </section>
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
    </article>
  )
}

export default function App() {
  const [scrollY, setScrollY] = useState(0)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const parallaxOffset = scrollY * 0.38

  return (
    <div className={styles.page}>
      <ScrollScoville />
      <a className={styles.skipLink} href="#main">
        Skip to main content
      </a>

      <div className={styles.parallaxWrap} aria-hidden="true">
        <div
          className={styles.parallaxBg}
          style={{ transform: `translateY(${parallaxOffset}px) scale(1.06)` }}
        />
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
            <p className={styles.eyebrow}>The Steel City turns up the heat</p>
            <h1 className={styles.titleLine}>{FESTIVAL.name}</h1>
            <p className={styles.subtitle}>{FESTIVAL.tagline}</p>
            <div className={styles.meta}>
              <span>{FESTIVAL.weekendRange}</span>
              <span className={styles.metaDot} aria-hidden="true">
                ·
              </span>
              <span>{FESTIVAL.venue}</span>
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
        </header>

        <FestivalRecap src={RECAP_VIDEO_SRC} />

        <main id="main">
          <section className={styles.section} aria-labelledby="events-heading">
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>What’s on deck for 2026</p>
              <h2 id="events-heading" className={styles.sectionTitle}>
                Everything you loved - plus preview night
              </h2>
              <p className={styles.sectionLead}>
                We’re repeating the full 2025 lineup and layering in more: a free Friday kickoff, Nervana
                Health alongside the Fire &amp; Ice challenge, Iron City Circus Arts fire &amp; aerial, the
                scavenger hunt, and a pepper-themed escape room on site both nights.
              </p>
              <p className={styles.sectionLead}>
                <a
                  className={styles.inlineLink}
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Follow us on Instagram for the latest updates
                </a>
                .
              </p>
            </div>

            <div className={styles.dayBlock}>
              <h3 className={styles.dayHeading}>Friday - free preview</h3>
              <p className={styles.daySub}>
                No hot sauce booths selling bottles this night - think crafters, trivia, and the roaming
                escape room as the festival floor opens early.
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
                The pepper escape room stays open, vendors crank up, and contests &amp; entertainment run
                from VIP early access through the close.
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
              <p className={styles.sectionKicker}>On the hot side</p>
              <h2 id="hot-sauce-vendors-heading" className={styles.sectionTitle}>
                Hot sauce vendors
              </h2>
              <p className={styles.sectionLead}>
                Small-batch makers pouring samples and selling bottles - logos and links go live here as Lisa
                locks the 2026 roster.
              </p>
            </div>
            <div className={styles.vendorStrip}>
              <PartnerGrid
                partners={hotSauceVendors}
                emptyMessage="2026 hot sauce lineup coming soon."
              />
            </div>
          </section>

          <section className={styles.sectionNarrow} aria-labelledby="food-more-vendors-heading">
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Fuel the fest</p>
              <h2 id="food-more-vendors-heading" className={styles.sectionTitle}>
                Food, drinks &amp; more
              </h2>
              <p className={styles.sectionLead}>
                Street eats, sweets, sips, and everything else that pairs with heat - same drill: we will plug
                in names, sites, and art as soon as we have them.
              </p>
            </div>
            <div className={styles.vendorStrip}>
              <PartnerGrid
                partners={foodAndMoreVendors}
                emptyMessage="More vendors to be announced."
              />
            </div>
          </section>

          <section className={styles.sectionNarrow} aria-labelledby="sponsors-2026-heading">
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>With thanks</p>
              <h2 id="sponsors-2026-heading" className={styles.sectionTitle}>
                2026 sponsors
              </h2>
              <p className={styles.sectionLead}>
                The brands and businesses helping Rivers of Fire come back hotter - sponsor logos and links
                will appear here.
              </p>
            </div>
            <div className={styles.vendorStrip}>
              <PartnerGrid
                partners={sponsors2026}
                emptyMessage="Sponsors for 2026 coming soon."
              />
            </div>
          </section>

          <section className={styles.sectionNarrow} style={{ paddingBottom: '2rem' }}>
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Ready when you are</h2>
              <p className={styles.sectionLead}>
                Free night Friday, full burn Saturday - round up your crew and we’ll see you at Velum.
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
            Pittsburgh&apos;s Rivers of Fire is organized by the crew at{' '}
            <a href="https://www.hammajack.com/" style={{ color: 'var(--color-gold)' }}>
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
