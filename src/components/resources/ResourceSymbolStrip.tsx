import { resourceOrder } from '../../economy'
import { fmtCompactAmount } from '../../utils/format'
import { resourceUiMeta } from './resourceMeta'
import type { Resources } from '../../economy'
import styles from './ResourceSymbolStrip.module.css'

export interface ResourceSymbolStripProps {
  bundle: Partial<Resources>
  empty?: string
}

export function ResourceSymbolStrip({ bundle, empty = '无' }: ResourceSymbolStripProps) {
  const entries = resourceOrder.filter(key => bundle[key])
  if (!entries.length) {
    return <span className={styles['symbol-empty']}>{empty}</span>
  }
  return (
    <span className={styles['resource-symbol-strip']}>
      {entries.map(key => {
        const meta = resourceUiMeta[key]
        const ResourceIcon = meta.icon
        const value = bundle[key] ?? 0
        return (
          <span key={key} className={styles['resource-symbol-item']} title={`${meta.label} ${fmtCompactAmount(value)}`}>
            <ResourceIcon className={meta.tone} size={13} />
            <small className={value < 0 ? styles.negative : ''}>{fmtCompactAmount(value)}</small>
          </span>
        )
      })}
    </span>
  )
}
