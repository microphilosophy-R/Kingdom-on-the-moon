import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  label: string
}

export function IconButton({
  className = 'icon-button',
  children,
  label,
  ...rest
}: IconButtonProps) {
  return (
    <button type="button" className={className} aria-label={label} {...rest}>
      {children}
    </button>
  )
}
