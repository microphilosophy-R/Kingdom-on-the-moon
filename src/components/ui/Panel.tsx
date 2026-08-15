import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Panel.module.css'

export type PanelVariant = 'surface' | 'parchment' | 'hero' | 'raised'
export type PanelAs = 'div' | 'section' | 'aside' | 'article' | 'header' | 'footer'

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  variant?: PanelVariant
  as?: PanelAs
  children: ReactNode
}

const variantClass: Record<PanelVariant, string> = {
  surface: styles['ui-panel'],
  parchment: `${styles['ui-panel']} ${styles['ui-panel-parchment']}`,
  hero: `${styles['ui-panel']} ${styles['ui-panel-hero']}`,
  raised: `${styles['ui-panel']} ${styles['ui-panel-raised']}`,
}

export function Panel({
  variant = 'surface',
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}: PanelProps) {
  const classes = [variantClass[variant], className].filter(Boolean).join(' ')

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}
