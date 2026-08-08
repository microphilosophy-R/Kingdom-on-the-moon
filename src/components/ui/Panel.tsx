import type { HTMLAttributes, ReactNode } from 'react'

export type PanelVariant = 'surface' | 'parchment' | 'hero' | 'raised'
export type PanelAs = 'div' | 'section' | 'aside' | 'article' | 'header' | 'footer'

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  variant?: PanelVariant
  as?: PanelAs
  children: ReactNode
}

const variantClass: Record<PanelVariant, string> = {
  surface: 'ui-panel',
  parchment: 'ui-panel ui-panel-parchment',
  hero: 'ui-panel ui-panel-hero',
  raised: 'ui-panel ui-panel-raised',
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
