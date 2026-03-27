import { useEffect, useState } from 'react'
import { ScrollScoville } from './ScrollScoville'
import styles from './App.module.css'

/** Replace with Lisa’s ticket URL when ready. */
const TICKET_URL = '#'

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

const VENDOR_PLACEHOLDER_COUNT = 12

function EventCard({ event }: { event: EventDef }) {
  return (
    <article className={styles.eventCard}>
      <div className={styles.eventIcon} aria-hidden="true">
        {event.icon}
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
      <h3 className={styles.eventTitle}>{event.title}</h3>
      <p className={styles.eventBody}>{event.description}</p>
    </article>
  )
}

export default function App() {
  const [scrollY, setScrollY] = useState(0)

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

      <div className={styles.content}>
        <header className={styles.hero}>
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
              Buy tickets
            </a>
          </div>
        </header>

        <section className={styles.recapSection} aria-labelledby="recap-heading">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionKicker}>See it for yourself</p>
            <h2 id="recap-heading" className={styles.sectionTitle}>
              2025 festival recap
            </h2>
          </div>
          <figure className={styles.recapFigure}>
            <video
              className={styles.recapVideo}
              controls
              playsInline
              preload="metadata"
              src={RECAP_VIDEO_SRC}
            />
            <figcaption className={styles.recapCaption}>
              Highlights from our first year at Velum.
            </figcaption>
          </figure>
        </section>

        <main id="main">
          <section className={styles.section} aria-labelledby="events-heading">
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>What’s on deck for 2026</p>
              <h2 id="events-heading" className={styles.sectionTitle}>
                Everything you loved - plus preview night
              </h2>
              <p className={styles.sectionLead}>
                We’re repeating the full 2025 lineup and layering in more: a free Friday kickoff, Nervana
                Health alongside the Fire &amp; Ice challenge, Iron City Circus Arts fire &amp; aerial, the
                scavenger hunt, and a pepper-themed escape room on site both nights. Details and times will
                firm up as we get closer - follow Hammajack for drops.
              </p>
            </div>

            <div className={styles.dayBlock}>
              <h3 className={styles.dayHeading}>Friday - free preview</h3>
              <p className={styles.daySub}>
                No hot sauce booths selling bottles this night - think crafters, trivia, and the roaming
                escape room as the festival floor opens early.
              </p>
              <div className={styles.eventsGrid}>
                {FRIDAY_EVENTS.map((event) => (
                  <EventCard key={event.title} event={event} />
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
                {SATURDAY_EVENTS.map((event) => (
                  <EventCard key={event.title} event={event} />
                ))}
              </div>
            </div>
          </section>

          <section className={styles.sectionNarrow} aria-labelledby="vendors-heading">
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Makers & friends</p>
              <h2 id="vendors-heading" className={styles.sectionTitle}>
                Vendors & food partners
              </h2>
              <p className={styles.sectionLead}>
                Sauce slingers, street eats, and Pittsburgh favorites - names and logos coming soon as we
                confirm this year’s roster.
              </p>
            </div>
            <div className={styles.vendorStrip}>
              <div className={styles.vendorGrid}>
                {Array.from({ length: VENDOR_PLACEHOLDER_COUNT }, (_, i) => (
                  <div key={i} className={styles.vendorSlot}>
                    Logo {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.sectionNarrow} style={{ paddingBottom: '2rem' }}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Ready when you are</h2>
              <p className={styles.sectionLead}>
                Free night Friday, full burn Saturday - round up your crew and we’ll see you at Velum.
              </p>
            </div>
            <div className={styles.ctaRow}>
              <a className={styles.ctaPrimary} href={TICKET_URL}>
                Buy tickets
              </a>
            </div>
          </section>
        </main>

        <footer className={styles.footer}>
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
          <p className={styles.footerCopy} style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
            © {new Date().getFullYear()} Pittsburgh&apos;s Rivers of Fire
          </p>
        </footer>
      </div>
    </div>
  )
}
