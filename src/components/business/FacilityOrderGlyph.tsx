import type { FacilityOrderMode } from '../../types/game'
import styles from './FacilityOrderGlyph.module.css'

export interface FacilityOrderGlyphProps {
  mode: Extract<FacilityOrderMode, 'expand' | 'expand-continuous' | 'shrink' | 'shrink-continuous'>
}

export function FacilityOrderGlyph({ mode }: FacilityOrderGlyphProps) {
  if (mode === 'expand-continuous') {
    return (
      <svg className={`${styles['facility-order-glyph']} ${styles.continuous}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 14l5-5 5 5" />
        <path d="M7 19l5-5 5 5" />
        <path d="M4 5h7c5 0 8 3 8 8" />
      </svg>
    )
  }
  if (mode === 'shrink') {
    return (
      <svg className={styles['facility-order-glyph']} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 4v13" />
        <path d="M7 12l5 5 5-5" />
        <path d="M6 20h12" />
      </svg>
    )
  }
  if (mode === 'shrink-continuous') {
    return (
      <svg className={`${styles['facility-order-glyph']} ${styles.continuous}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 10l5 5 5-5" />
        <path d="M7 5l5 5 5-5" />
        <path d="M20 19h-7c-5 0-8-3-8-8" />
      </svg>
    )
  }
  return (
    <svg className={styles['facility-order-glyph']} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 20V7" />
      <path d="M7 12l5-5 5 5" />
      <path d="M6 4h12" />
    </svg>
  )
}
