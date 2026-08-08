import type { ReactNode } from 'react'

export interface LetterActionsProps {
  children: ReactNode
  className?: string
}

export function LetterActions({ children, className = 'letter-actions' }: LetterActionsProps) {
  return <div className={className}>{children}</div>
}
