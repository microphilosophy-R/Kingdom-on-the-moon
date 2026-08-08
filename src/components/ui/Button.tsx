import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'default'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({
  variant = 'default',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const classes = [variant === 'primary' ? 'primary-action' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes || undefined} {...rest}>
      {children}
    </button>
  )
}
