import { Clock } from 'lucide-react'
import { fmtCompactAmount, fmtSignedCompactAmount } from '../../utils/format'
import { resourceUiMeta } from './resourceMeta'
import { rareResourceKeys, recipePeriodDays, type ResourceKey } from '../../economy'

export interface ResourceAtomProps {
  resourceKey: ResourceKey
  value: number
  net?: number
  detail?: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
  signed?: boolean
  subValue?: string
  /** 稀有资源按王月周期展示（如 50 御日产量），普通资源忽略。 */
  periodDays?: number
}

export function ResourceAtom({
  resourceKey,
  value,
  net,
  detail,
  actionLabel,
  onAction,
  compact = false,
  signed = true,
  subValue,
  periodDays,
}: ResourceAtomProps) {
  const meta = resourceUiMeta[resourceKey]
  const ResourceIcon = meta.icon
  const isRarePeriod = periodDays !== undefined && rareResourceKeys.includes(resourceKey)
  const displayValue = isRarePeriod ? value * periodDays : value
  return (
    <span className={`resource-atom tone-${meta.tone} ${compact ? 'compact' : ''}`}>
      <ResourceIcon className={meta.tone} size={compact ? 13 : 17} />
      <span className="resource-atom-content">
        <small className="resource-label">{meta.label}</small>
        <span className="resource-main-value">
          <strong className={value < 0 ? 'negative' : ''}>
            {value > 0 && compact && signed ? '+' : ''}
            {fmtCompactAmount(displayValue)}
          </strong>
          {isRarePeriod && (
            <small className="resource-sub-value">
              <Clock size={10} aria-hidden="true" />/{recipePeriodDays}御日
            </small>
          )}
          {!isRarePeriod && subValue !== undefined && <small className="resource-sub-value">{subValue}</small>}
        </span>
        {net !== undefined && (
          <small className={`resource-net ${net < 0 ? 'negative' : ''}`}>
            {fmtSignedCompactAmount(net)}/日
          </small>
        )}
        {detail && !compact && <small className="resource-detail">{detail}</small>}
      </span>
      {actionLabel && !compact && (
        <button type="button" className="resource-inline-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </span>
  )
}
