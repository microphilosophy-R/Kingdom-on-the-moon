export interface TechnologyImagePlaceholderProps {
  active: boolean
}

export function TechnologyImagePlaceholder({ active }: TechnologyImagePlaceholderProps) {
  return (
    <svg className="tech-image-placeholder" viewBox="0 0 120 74" role="img" aria-label="科技图像占位">
      <rect x="1" y="1" width="118" height="72" rx="6" />
      <circle cx="36" cy="37" r="16" />
      <path d="M52 37h34M76 24l12 13-12 13M20 58h80" className={active ? 'active-line' : ''} />
    </svg>
  )
}
