import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'default' | 'continue' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

/** 实心主按钮的 oklch 色相：primary=金色(76)，continue=青色(205)，danger=红色(28) */
const actionHue: Partial<Record<ButtonVariant, number>> = {
  primary: 76,
  continue: 205,
  danger: 28,
}

export function Button({
  variant = 'default',
  className = '',
  children,
  style,
  ...rest
}: ButtonProps) {
  const hue = variant !== 'default' ? actionHue[variant] : undefined
  // 复用同一套 primary-action 样式，仅通过 --action-hue 改变颜色
  const classes = [hue !== undefined ? 'primary-action' : '', className]
    .filter(Boolean)
    .join(' ')
  const mergedStyle = hue !== undefined
    ? { ...style, '--action-hue': hue } as CSSProperties
    : style

  return (
    <button type="button" className={classes || undefined} style={mergedStyle} {...rest}>
      {children}
    </button>
  )
}
