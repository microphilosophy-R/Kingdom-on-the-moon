import type { ImgHTMLAttributes } from 'react'

export interface PortraitSlotProps extends ImgHTMLAttributes<HTMLImageElement> {
  className?: string
  'aria-label'?: string
}

export function PortraitSlot({
  src,
  alt,
  className = 'visitor-portrait-slot',
  'aria-label': ariaLabel,
  ...rest
}: PortraitSlotProps) {
  return (
    <div className={className} aria-label={ariaLabel}>
      <img src={src} alt={alt} {...rest} />
    </div>
  )
}
