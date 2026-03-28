import type { Partner } from './partnersData'
import styles from './PartnerGrid.module.css'

type Props = {
  partners: Partner[]
  emptyMessage: string
}

export function PartnerGrid({ partners, emptyMessage }: Props) {
  if (partners.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  return (
    <div className={styles.grid}>
      {partners.map((p) => (
        <a
          key={p.id}
          className={styles.card}
          href={p.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className={styles.logoWrap}>
            <img className={styles.logo} src={p.logoSrc} alt="" decoding="async" />
          </div>
          <span className={styles.name}>{p.name}</span>
        </a>
      ))}
    </div>
  )
}
