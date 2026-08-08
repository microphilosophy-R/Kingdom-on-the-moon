import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

export interface TabItem<T extends string = string> {
  id: T
  label: string
  icon: ComponentType<LucideProps>
  color?: string
}

export interface TabNavProps<T extends string = string> {
  items: TabItem<T>[]
  activeId: T
  onSelect: (id: T) => void
  ariaLabel?: string
}

export function TabNav<T extends string = string>({ items, activeId, onSelect, ariaLabel = '底部系统菜单' }: TabNavProps<T>) {
  return (
    <nav className="tab-nav" aria-label={ariaLabel}>
      {items.map(item => {
        const NavIcon = item.icon
        return (
          <button
            key={item.id}
            className={activeId === item.id ? 'active' : ''}
            style={{ '--tab-color': item.color ?? 'var(--ui-brass)' } as React.CSSProperties}
            onClick={() => onSelect(item.id)}
          >
            <NavIcon size={16} />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
