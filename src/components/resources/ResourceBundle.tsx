import { resourceOrder } from '../../economy'
import { ResourceAtom } from './ResourceAtom'
import type { Resources } from '../../economy'

export interface ResourceBundleProps {
  bundle: Partial<Resources>
  empty?: string
  signed?: boolean
  boxedEmpty?: boolean
}

export function ResourceBundle({
  bundle,
  empty = '无',
  signed = true,
  boxedEmpty = false,
}: ResourceBundleProps) {
  const entries = resourceOrder.filter(key => bundle[key])
  if (!entries.length) {
    return <span className={boxedEmpty ? 'resource-empty boxed' : 'resource-empty'}>{empty}</span>
  }
  return (
    <span className="resource-bundle">
      {entries.map(key => (
        <ResourceAtom
          key={key}
          resourceKey={key}
          value={bundle[key] ?? 0}
          compact
          signed={signed}
        />
      ))}
    </span>
  )
}
