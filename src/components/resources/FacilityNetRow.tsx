import { ResourceBundle } from './ResourceBundle'
import type { Resources } from '../../economy'

export interface FacilityNetRowProps {
  net: Partial<Resources>
  compact?: boolean
  empty?: string
}

export function FacilityNetRow({ net, compact = false, empty = '暂无净产值' }: FacilityNetRowProps) {
  return (
    <div className={`building-net-row ${compact ? 'compact' : ''}`}>
      <span>净产值</span>
      <ResourceBundle bundle={net} empty={empty} />
    </div>
  )
}
