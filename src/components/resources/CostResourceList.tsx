import { resourceOrder } from '../../economy'
import { fmtCompactAmount } from '../../utils/format'
import { ResourceAtom } from './ResourceAtom'
import type { Resources } from '../../economy'

export interface CostResourceListProps {
  bundle: Partial<Resources>
  baseBundle?: Partial<Resources>
  empty?: string
}

export function CostResourceList({
  bundle,
  baseBundle,
  empty = '无',
}: CostResourceListProps) {
  const entries = resourceOrder.filter(key => bundle[key])
  if (!entries.length) {
    return <span className="resource-empty">{empty}</span>
  }
  return (
    <span className="cost-resource-list">
      {entries.map(key => {
        const value = bundle[key] ?? 0
        const baseValue = baseBundle?.[key] ?? value
        const delta = baseValue - value
        return (
          <span key={key} className="cost-resource-item">
            <ResourceAtom resourceKey={key} value={value} compact signed={false} />
            {delta > 0 && <small>(-{fmtCompactAmount(delta)})</small>}
          </span>
        )
      })}
    </span>
  )
}
