import type { ReactNode } from 'react'

export interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
  children?: ReactNode
}

export function SectionHeading({ eyebrow, title, description, children }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children ?? (description ? <p>{description}</p> : null)}
    </div>
  )
}
