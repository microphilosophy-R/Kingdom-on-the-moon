import { Clock } from 'lucide-react'
import styles from './ConstructionDaysPill.module.css'

export interface ConstructionDaysPillProps {
  days: number
}

export function ConstructionDaysPill({ days }: ConstructionDaysPillProps) {
  return (
    <span
      className={styles['construction-days-pill']}
      aria-label={`周期 ${days} 御日`}
      title={`周期 ${days} 御日`}
    >
      <Clock size={13} />
      <strong>{days}</strong>
    </span>
  )
}
