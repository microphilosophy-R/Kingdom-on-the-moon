import { ChevronDown, ChevronUp } from 'lucide-react'
import { ResourceAtom } from '../resources'
import { allResourceKeys } from '../../game/appFlow'
import { fmtCompactAmount, fmtSignedCompactAmount } from '../../utils/format'
import type { ResourceKey, Resources } from '../../economy'

interface ResourceRailProps {
  collapsed: boolean
  resources: Resources
  dailyProduction: Resources
  dailyConsumption: Resources
  dailyNet: Resources
  allocatedPopulation: number
  tradeSourcedResources: Partial<Record<ResourceKey, boolean>>
  autoTradeProtectionEnabled: boolean
  autoTradeEnabled: Partial<Record<ResourceKey, boolean>>
  selfProducedSurplus: Partial<Record<ResourceKey, boolean>>
  onToggleCollapsed: () => void
  onStopAutoTrade: (key: ResourceKey) => void
}

export function ResourceRail({
  collapsed,
  resources,
  dailyProduction,
  dailyConsumption,
  dailyNet,
  allocatedPopulation,
  tradeSourcedResources,
  autoTradeProtectionEnabled,
  autoTradeEnabled,
  selfProducedSurplus,
  onToggleCollapsed,
  onStopAutoTrade,
}: ResourceRailProps) {
  return (
    <div className={`resource-rail-wrapper${collapsed ? ' rail-collapsed' : ''}`}>
      <button
        type="button"
        className="rail-collapse-toggle"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? '展开资源栏' : '收起资源栏'}
      >
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        <span className="rail-toggle-label">{collapsed ? '展开库存' : '收起'}</span>
      </button>
      <section className="resource-rail" aria-label="王国库存">
        {allResourceKeys.map(key => {
          const value = key === 'power' ? dailyProduction.power : resources[key]
          const canCancelAutoTrade = Boolean(autoTradeProtectionEnabled && tradeSourcedResources[key] && autoTradeEnabled[key] !== false && selfProducedSurplus[key])
          const detail = canCancelAutoTrade ? '自产盈余，可停购' : undefined
          const isPower = key === 'power'
          const isPopulation = key === 'population'
          const subValue = isPower
            ? `/${fmtCompactAmount(dailyConsumption.power)}`
            : isPopulation
              ? `/${fmtSignedCompactAmount(dailyNet.population)}`
              : `/${fmtSignedCompactAmount(dailyNet[key])}`
          return <ResourceAtom
            key={key}
            resourceKey={key}
            value={isPopulation ? allocatedPopulation : value}
            detail={detail}
            subValue={subValue}
            actionLabel={canCancelAutoTrade ? '停购' : undefined}
            onAction={canCancelAutoTrade ? () => onStopAutoTrade(key) : undefined}
          />
        })}
      </section>
    </div>
  )
}
