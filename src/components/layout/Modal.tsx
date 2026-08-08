import type { HTMLAttributes, ReactNode } from 'react'

export type ModalPanelAs = 'section' | 'aside' | 'div'

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  scrimClassName: string
  panelClassName: string
  as?: ModalPanelAs
  ariaLabel: string
  ariaLive?: 'polite' | 'assertive'
  onScrimPointerDown?: () => void
  children: ReactNode
}

export function Modal({
  scrimClassName,
  panelClassName,
  as: Tag = 'section',
  ariaLabel,
  ariaLive,
  onScrimPointerDown,
  children,
  ...rest
}: ModalProps) {
  return (
    <div className={scrimClassName} role="presentation" onPointerDown={onScrimPointerDown} {...rest}>
      <Tag
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-live={ariaLive}
      >
        {children}
      </Tag>
    </div>
  )
}
