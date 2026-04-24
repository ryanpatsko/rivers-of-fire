import type { Partner } from './partnersData'
import styles from './PartnerGrid.module.css'

type Props = {
  partners: Partner[]
  emptyMessage: string
  /** When false, missing logos show no “Logo to come” text (e.g. sponsors TBA). Default true. */
  showMissingLogoPlaceholder?: boolean
  /**
   * When true and 1–3 partners, layout uses a centered row (sponsor levels).
   * Four or more keep the default full-width grid.
   */
  centerIfSparse?: boolean
}

function PartnerCard({
  p,
  showMissingLogoPlaceholder,
}: {
  p: Partner
  showMissingLogoPlaceholder: boolean
}) {
  const inner = (
    <>
      <div className={styles.logoWrap}>
        {p.logoSrc ? (
          <img className={styles.logo} src={p.logoSrc} alt={p.name} decoding="async" />
        ) : showMissingLogoPlaceholder ? (
          <span className={styles.logoPlaceholder}>Logo to come</span>
        ) : null}
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

export function PartnerGrid({
  partners,
  emptyMessage,
  showMissingLogoPlaceholder = true,
  centerIfSparse = false,
}: Props) {
  if (partners.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  const useSparseCenter =
    centerIfSparse && partners.length > 0 && partners.length < 4
  const gridClass = useSparseCenter ? styles.gridSparse : styles.grid

  return (
    <div className={gridClass}>
      {partners.map((p) => (
        <PartnerCard
          key={p.id}
          p={p}
          showMissingLogoPlaceholder={showMissingLogoPlaceholder}
        />
      ))}
    </div>
  )
}
