import { ResourceBundle } from './ResourceBundle'
import type { Resources } from '../../economy'
import styles from './FacilityNetRow.module.css'

export interface FacilityNetRowProps {
  net: Partial<Resources>
  compact?: boolean
  empty?: string
}

export function FacilityNetRow({ net, compact = false, empty = '暂无净产值' }: FacilityNetRowProps) {
  return (
    <div className={compact ? `${styles['building-net-row']} ${styles.compact}` : styles['building-net-row']}>
      <span>日净产值</span>
      <ResourceBundle bundle={net} empty={empty} />
    </div>
  )
}
