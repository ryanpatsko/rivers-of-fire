import type { Partner } from './partnersData'
import styles from './PartnerGrid.module.css'

type Props = {
  partners: Partner[]
  emptyMessage: string
}

function PartnerCard({ p }: { p: Partner }) {
  const inner = (
    <>
      <div className={styles.logoWrap}>
        {p.logoSrc ? (
          <img className={styles.logo} src={p.logoSrc} alt={p.name} decoding="async" />
        ) : (
          <span className={styles.logoPlaceholder}>Logo to come</span>
        )}
      </div>
      <span className={styles.name}>{p.name}</span>
    </>
  )

  if (p.websiteUrl) {
    return (
      <a className={styles.card} href={p.websiteUrl} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    )
  }

  return <div className={styles.cardStatic}>{inner}</div>
}

export function PartnerGrid({ partners, emptyMessage }: Props) {
  if (partners.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  return (
    <div className={styles.grid}>
      {partners.map((p) => (
        <PartnerCard key={p.id} p={p} />
      ))}
    </div>
  )
}
