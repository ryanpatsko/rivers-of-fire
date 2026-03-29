import type { CSSProperties } from 'react'
import type { Partner } from './partnersData'
import styles from './PartnerGrid.module.css'

type Props = {
  partners: Partner[]
  emptyMessage: string
}

function PartnerCard({ p, flairIndex }: { p: Partner; flairIndex: number }) {
  const flairStyle = {
    ['--vendor-border-dur' as string]: `${4.1 + (flairIndex % 9) * 0.34}s`,
    ['--vendor-border-delay' as string]: `${((flairIndex * 0.41) % 4.2) + (flairIndex % 5) * 0.15}s`,
  } as CSSProperties

  const inner = (
    <>
      <div className={styles.logoWrap}>
        {p.logoSrc ? (
          <img className={styles.logo} src={p.logoSrc} alt={p.name} decoding="async" />
        ) : (
          <span className={styles.logoPlaceholder}>Logo soon</span>
        )}
      </div>
      <span className={styles.name}>{p.name}</span>
    </>
  )

  if (p.websiteUrl) {
    return (
      <a
        className={styles.card}
        href={p.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={flairStyle}
      >
        {inner}
      </a>
    )
  }

  return (
    <div className={styles.cardStatic} style={flairStyle}>
      {inner}
    </div>
  )
}

export function PartnerGrid({ partners, emptyMessage }: Props) {
  if (partners.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  return (
    <div className={styles.grid}>
      {partners.map((p, flairIndex) => (
        <PartnerCard key={p.id} p={p} flairIndex={flairIndex} />
      ))}
    </div>
  )
}
