import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  eventsForFriday,
  eventsForSaturday,
  loadEvents,
  toEventCardModel,
  type EventCardModel,
  type EventsDoc,
} from './content/eventsContent'
import { loadSiteContent, type SiteContent } from './content/siteContent'
import {
  featuredCarolinaReaperSponsors,
  loadSponsors,
  sponsorsGroupedByTier,
  tierImageOrEmoji,
  type SponsorsDoc,
} from './content/sponsorsContent'
import type { Partner } from './partnersData'
import {
  loadVendors,
  vendorsToPartners,
  type VendorsDoc,
} from './content/vendorsContent'
import { PartnerGrid } from './PartnerGrid'
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

function SectionBgSpecks({ count = 16 }: { count?: number }) {
  return (
    <div className={styles.sectionBgSpecks} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={styles.contentSpeck} />
      ))}
    </div>
  )
}

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
  event: EventCardModel
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
        {event.logoUrl || event.iconEmoji ? (
          <div className={styles.eventHeadVisual} aria-hidden="true">
            {event.logoUrl ? (
              <div className={styles.eventCardLogoWrap}>
                {event.logoLinkUrl ? (
                  <a
                    className={styles.eventCardLogoLink}
                    href={event.logoLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${event.title} — visit partner site (opens in new tab)`}
                  >
                    <img
                      className={styles.eventCardLogo}
                      src={event.logoUrl}
                      alt=""
                      decoding="async"
                    />
                  </a>
                ) : (
                  <img
                    className={styles.eventCardLogo}
                    src={event.logoUrl}
                    alt=""
                    decoding="async"
                  />
                )}
              </div>
            ) : (
              <div className={styles.eventIcon}>{event.iconEmoji}</div>
            )}
          </div>
        ) : null}
        <h3 className={styles.eventTitle}>{event.title}</h3>
      </div>
      {(event.showBothDaysBadge || event.badge === 'maybe') && (
        <div className={styles.eventBadgeRow}>
          {event.showBothDaysBadge ? (
            <span className={styles.eventBadge}>Fri & Sat</span>
          ) : null}
          {event.badge === 'maybe' ? (
            <span className={`${styles.eventBadge} ${styles.eventBadgeMaybe}`}>Maybe</span>
          ) : null}
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

function FeaturedSponsorRail({ sponsor }: { sponsor: Partner }) {
  const inner = (
    <div className={styles.featuredSponsorCard}>
      <p className={styles.featuredSponsorBadge}>Featured Sponsor</p>
      {sponsor.logoSrc ? (
        <img
          className={styles.featuredSponsorLogo}
          src={sponsor.logoSrc}
          alt=""
          decoding="async"
        />
      ) : null}
      <p className={styles.featuredSponsorName}>{sponsor.name}</p>
    </div>
  )
  if (sponsor.websiteUrl) {
    return (
      <a
        className={styles.featuredSponsorLink}
        href={sponsor.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${sponsor.name} — visit website (opens in new tab)`}
      >
        {inner}
      </a>
    )
  }
  return <div className={styles.featuredSponsorLink}>{inner}</div>
}

export default function Home() {
  const [site, setSite] = useState<SiteContent | null>(null)
  const [vendorsDoc, setVendorsDoc] = useState<VendorsDoc | null>(null)
  const [sponsorsDoc, setSponsorsDoc] = useState<SponsorsDoc | null>(null)
  const [eventsDoc, setEventsDoc] = useState<EventsDoc | null>(null)

  useEffect(() => {
    void loadSiteContent().then(setSite).catch(() => {})
  }, [])

  useEffect(() => {
    void loadVendors().then(setVendorsDoc).catch(() => {})
  }, [])

  useEffect(() => {
    void loadSponsors().then(setSponsorsDoc).catch(() => {})
  }, [])

  useEffect(() => {
    void loadEvents().then(setEventsDoc).catch(() => {})
  }, [])

  const fridayEvents = eventsDoc ? eventsForFriday(eventsDoc.events).map(toEventCardModel) : []
  const saturdayEvents = eventsDoc ? eventsForSaturday(eventsDoc.events).map(toEventCardModel) : []

  const hotSauceVendors = vendorsDoc ? vendorsToPartners(vendorsDoc.vendors, 'hotSauce') : []
  const otherVendors = vendorsDoc ? vendorsToPartners(vendorsDoc.vendors, 'other') : []
  const foodTruckVendors = vendorsDoc ? vendorsToPartners(vendorsDoc.vendors, 'foodTruck') : []
  const sponsorGroups = sponsorsDoc ? sponsorsGroupedByTier(sponsorsDoc) : []
  const featuredSponsors = sponsorsDoc ? featuredCarolinaReaperSponsors(sponsorsDoc) : []
  const featuredLeft = featuredSponsors.filter((_, i) => i % 2 === 0)
  const featuredRight = featuredSponsors.filter((_, i) => i % 2 === 1)

  const g = site?.general

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className={styles.page}>
      <ScrollScoville />
      {g && (
        <a className={styles.skipLink} href="#main">
          {g.skipLinkText}
        </a>
      )}

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

      {g && (
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
            <div className={styles.heroVideoCredit}>
              <span className={styles.heroVideoCreditLabel}>Video production</span>
              <img
                className={styles.heroVideoCreditLogo}
                src="/studiome-logo.png"
                alt="Studio ME"
                width={200}
                height={48}
                decoding="async"
              />
            </div>
          </div>
        </header>

        <main id="main">
          <section className={styles.section} aria-labelledby="events-heading">
            <SectionBgSpecks />
            <div className={`${styles.sectionHeader} ${styles.sectionHeaderTitleOnly}`}>
              <p className={styles.sectionKicker}>{g.scheduleKicker}</p>
              <h2 id="events-heading" className={styles.sectionTitle}>
                {g.scheduleTitle}
              </h2>
            </div>
            <div className={featuredSponsors.length > 0 ? styles.scheduleRailLayout : undefined}>
              {featuredLeft.length > 0 && (
                <div className={styles.scheduleRailLeft}>
                  {featuredLeft.map((s) => (
                    <FeaturedSponsorRail key={s.id} sponsor={s} />
                  ))}
                </div>
              )}
              <div>
                <CmsHtml html={g.scheduleLeadHtml} className="siteContentHtmlSectionLead" />
                <CmsHtml html={g.scheduleFollowHtml} className="siteContentHtmlSectionLead" />
                <div className={styles.dayBlock}>
                  <h3 className={styles.dayHeading}>{g.dayFridayHeading}</h3>
                  <CmsHtml html={g.dayFridaySubHtml} className="siteContentHtmlDaySub" />
                  <div className={styles.eventsGrid}>
                    {fridayEvents.map((event, i) => (
                      <EventCard
                        key={event.id}
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
                    {saturdayEvents.map((event, i) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        flipFromRight={i % 2 === 1}
                        flipStaggerMs={i * 48}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {featuredLeft.length > 0 && (
                <div className={styles.scheduleRailRight}>
                  {featuredRight.map((s) => (
                    <FeaturedSponsorRail key={s.id} sponsor={s} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className={styles.sectionPartner} aria-labelledby="hot-sauce-vendors-heading">
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

          <section className={styles.sectionPartner} aria-labelledby="food-more-vendors-heading">
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

          <section className={styles.sectionPartner} aria-labelledby="sponsors-2026-heading">
            <SectionBgSpecks />
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>{g.sponsorsKicker}</p>
              <h2 id="sponsors-2026-heading" className={styles.sectionTitle}>
                {g.sponsorsTitle}
              </h2>
              <CmsHtml html={g.sponsorsLeadHtml} className="siteContentHtmlSectionLead" />
            </div>
            <div className={`${styles.vendorStrip} ${styles.vendorStripSponsors}`}>
              {sponsorGroups.length === 0 ? (
                <p className={styles.sponsorsEmpty}>{g.sponsorsEmpty}</p>
              ) : (
                sponsorGroups.map(({ tier, partners }) => {
                  const { imageUrl, emoji } = tierImageOrEmoji(sponsorsDoc.tierImages, tier)
                  return (
                    <div key={tier}>
                      <h3 className={styles.sponsorTierHeading}>
                        <span className={styles.sponsorTierHeadingVisual}>
                          {imageUrl ? (
                            <img
                              className={styles.sponsorTierHeadingImg}
                              src={imageUrl}
                              alt=""
                              decoding="async"
                            />
                          ) : (
                            <span className={styles.sponsorTierHeadingEmoji} aria-hidden>
                              {emoji}
                            </span>
                          )}
                        </span>
                        <span className={styles.sponsorTierHeadingTitle}>
                          {sponsorsDoc.tierLabels[tier]}
                        </span>
                      </h3>
                      <PartnerGrid
                        partners={partners}
                        emptyMessage={g.sponsorsEmpty}
                        showMissingLogoPlaceholder={false}
                        centerIfSparse
                      />
                    </div>
                  )
                })
              )}
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
      )}
    </div>
  )
}
