import { useEffect, useId, useState } from 'react'
import styles from './ScrollScoville.module.css'

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

/**
 * Decorative “Scoville scrollbar”: heat rises as you scroll down the page.
 * Pure CSS gradient + SVG - no raster images.
 */
export function ScrollScoville() {
  const [progress, setProgress] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const pepperGradId = useId().replace(/:/g, '')

  useEffect(() => {
    const measure = () => {
      const el = document.documentElement
      const total = el.scrollHeight - el.clientHeight
      const p = total <= 0 ? 0 : el.scrollTop / total
      setProgress(clamp01(p))
    }

    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()

    // Safari fallback
    const mqAny = mq as any
    if (typeof mqAny.addEventListener === 'function') {
      mqAny.addEventListener('change', update)
      return () => mqAny.removeEventListener('change', update)
    }

    mqAny.addListener(update)
    return () => mqAny.removeListener(update)
  }, [])

  const markerTopPct = (1 - progress) * 100
  const markerLeftPct = progress * 100
  const markerStyle = isMobile ? { left: `${markerLeftPct}%`, top: '50%' } : { top: `${markerTopPct}%` }

  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={styles.labels}>
        <span className={styles.labelHot}>2M+ SHU</span>
        <span>50k</span>
        <span className={styles.labelMild}>0 · mild</span>
      </div>
      <div className={styles.track}>
        <svg
          className={styles.flamCap}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2c0 4-3 6-3 9 0 2.5 1.5 4.5 3.5 5-1.5-2-1-5.2 1.3-6.9C17 10.2 18 16 12 22c6-4 5-12-1-14.5 1 2-1.5 4.5-3 3.5-.5-3.5 2.5-6 2.5-9z" />
        </svg>
        <div className={styles.channel}>
          <div
            className={styles.trackFill}
            style={isMobile ? { width: `${markerLeftPct}%` } : undefined}
          />
          <div className={styles.ticks} />
          <div className={styles.marker} style={markerStyle}>
            <svg
              className={styles.markerSvg}
              viewBox="0 0 20 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id={pepperGradId}
                  x1="5"
                  y1="48"
                  x2="13"
                  y2="14"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#5c1010" />
                  <stop offset="0.28" stopColor="#b91c1c" />
                  <stop offset="0.55" stopColor="#dc2626" />
                  <stop offset="0.78" stopColor="#ea580c" />
                  <stop offset="1" stopColor="#fecaca" />
                </linearGradient>
              </defs>
              <path
                fill="#0f2418"
                stroke="#051a10"
                strokeWidth="0.35"
                strokeLinejoin="round"
                d="M9.55 6.35 Q10 4.55 10.45 6.35 L10.55 7.55 L9.45 7.55 Z"
              />
              <path
                fill="#14532d"
                stroke="#052e16"
                strokeWidth="0.4"
                strokeLinejoin="round"
                d="M6.75 13.85 C6.35 12.15 7.15 10.3 9.05 9.8 L9.55 7.45 C9.72 6.15 9.88 5.1 10 4.65 C10.12 5.1 10.28 6.15 10.45 7.45 L10.95 9.8 C12.85 10.35 13.65 12.15 13.25 13.85 C12.35 14.3 11.15 14.45 10 14.45 C8.85 14.45 7.65 14.3 6.75 13.85 Z"
              />
              <path
                fill={`url(#${pepperGradId})`}
                stroke="#1a0a0a"
                strokeWidth="0.6"
                strokeLinejoin="round"
                d="M10 13.65 C12.25 13.85 14.1 16.15 13.75 20 C13.35 25.5 12.15 33.5 10.55 44.2 L10 47.35 L9.45 44.2 C7.85 33.5 6.65 25.5 6.25 20 C5.9 16.15 7.75 13.85 10 13.65 Z"
              />
              <path
                fill="rgba(255,255,255,0.22)"
                d="M8.55 17.2 C8.85 17.05 9.15 17.35 9.25 17.75 C9.85 20.5 10 23.5 9.65 26.4 C9.5 27.85 9.35 29.35 9.55 30.7 C9.65 31.15 9.45 31.65 9.05 31.85 C8.85 31.95 8.65 31.8 8.6 31.55 C8.35 28.6 8.45 25.4 8.55 22.2 C8.65 20.4 8.55 18.6 8.55 17.2 Z"
              />
            </svg>
          </div>
        </div>
        <span className={styles.caption}>Scoville</span>
      </div>
    </div>
  )
}
