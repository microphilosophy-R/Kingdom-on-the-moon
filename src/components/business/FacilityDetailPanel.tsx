import { ChevronLeft, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  canBuildFacility,
  emptyResources,
  facilityEconomySpecs,
  getConstructionDays,
  getFacilityWorkCapacity,
  getHousingCapacity,
  hasTech,
  isFixedFacility,
  isHousingFacility,
  projectFacilityCost,
  projectFacilityFlow,
  resourceOrder,
  selectProductionMethod,
  technologyCatalog,
} from '../../economy'
import { ResourceDeltaRows, CostResourceList, ConstructionDaysPill, FlowArrowSvg } from '../resources'
import { ProgressLine } from '../ui'
import { FacilityOrderGlyph } from './FacilityOrderGlyph'
import { displayCopy } from '../../utils/format'
import { orderLabel } from '../../utils/game'
import { scaleResourceBundle } from '../../utils/trade'
import { getFacilityArt } from '../../assets/facilityArt'
import type { AutomationPlan, PopulationProjection, ProductionMethodId, Resources } from '../../economy'
import type { Role } from '../../events'
import type {
  ConstructionProject,
  FacilityOrderMode,
  Region,
  RegionId,
  StaffingPriority,
} from '../../types/game'

export interface FacilityDetailPanelProps {
  selected: RegionId
  year: number
  techs: string[]
  habitatLevel: number
  productionMethods: Record<RegionId, ProductionMethodId>
  facilityOrders: Record<RegionId, FacilityOrderMode>
  facilityOrderStarted: Record<RegionId, number>
  construction: Record<RegionId, ConstructionProject | null>
  populationProjection: PopulationProjection
  staffing: Record<RegionId, number>
  staffingPriorities: Record<RegionId, StaffingPriority>
  allocatedPopulation: number
  freePopulation: number
  facilityModifiers: Partial<Record<RegionId, { outputMultiplier?: number; upkeepMultiplier?: number }>>
  lastAutomatedAction: { id: RegionId; day: number; mode: FacilityOrderMode } | null
  roster: Role[]
  assigned: Record<RegionId, string | undefined>
  selectedRegion: Region
  selectedCost: Partial<Resources>
  resources: Resources
  dailyNet: Partial<Resources>
  automationPlan: AutomationPlan
  regions: Region[]
  onBack: () => void
  onUpgrade: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'expand' | 'expand-continuous'>) => void
  onHold: (id: RegionId) => void
  onShrink: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'shrink' | 'shrink-continuous'>) => void
  onPriority: (id: RegionId, priority: StaffingPriority) => void
  onMethod: (id: RegionId, methodId: ProductionMethodId) => void
  onStaffingSet?: (id: RegionId, staff: number) => void
  onAssignment: (visitorId: string | undefined) => void
  children?: ReactNode
}

export function FacilityDetailPanel({
  selected,
  year,
  techs,
  habitatLevel,
  productionMethods,
  facilityOrders,
  construction,
  populationProjection,
  staffing,
  selectedRegion,
  selectedCost,
  resources,
  facilityModifiers,
  onBack,
  onUpgrade,
  onShrink,
  onMethod,
  onStaffingSet,
  children,
}: FacilityDetailPanelProps) {
  const selectedSpec = facilityEconomySpecs[selectedRegion.id]
  const selectedFixed = isFixedFacility(selectedRegion.id)
  const selectedMethod = selectProductionMethod(selectedSpec.productionMethods, techs, productionMethods[selectedRegion.id])
  const workCapacity = getFacilityWorkCapacity(selectedRegion.id, selectedRegion.level)
  const housingCapacity = getHousingCapacity(selectedRegion.id, selectedRegion.level)
  const activeConstruction = construction[selectedRegion.id]
  const assignedPopulation = Math.min(workCapacity, staffing[selectedRegion.id] ?? 0)
  const staffRate = workCapacity > 0 ? assignedPopulation / workCapacity : housingCapacity > 0 || selectedFixed ? 1 : 0
  const selectedModifier = facilityModifiers[selectedRegion.id] ?? { outputMultiplier: 1, upkeepMultiplier: 1 }
  const facilityNet = populationProjection.facilityNet[selectedRegion.id] ?? {}
  const selectedFlow = isHousingFacility(selectedRegion.id)
    ? (() => {
        const flow = { production: emptyResources(), consumption: emptyResources(), net: emptyResources() }
        resourceOrder.forEach(key => {
          const net = facilityNet[key] ?? 0
          if (net > 0) flow.production[key] = net
          if (net < 0) flow.consumption[key] = Math.abs(net)
          flow.net[key] = net
        })
        return flow
      })()
    : projectFacilityFlow(selectedSpec, assignedPopulation, selectedModifier, techs, selectedMethod.id, selectedRegion.level)
  const housingResidents = isHousingFacility(selectedRegion.id) ? (populationProjection.residentsByFacility[selectedRegion.id] ?? 0) : 0
  const selectedBuildable = canBuildFacility(selectedSpec, year, techs)
  const selectedRequiredTech = selectedSpec.requiredTech ? technologyCatalog[selectedSpec.requiredTech] : undefined
  const currentOrder = facilityOrders[selectedRegion.id] ?? 'hold'
  const throughput = selectedModifier.outputMultiplier ?? 1
  const shrinkFloor = selectedSpec.minLevel ?? 0
  const affordExpansion = canAfford(resources, selectedCost)
  const availableMethodIds = selectedSpec.productionMethods.filter(method => hasTech(techs, method.unlockedBy) && method.autoSelect !== false).map(method => method.id)
  const baseExpansionCost = projectFacilityCost(selectedSpec, selectedRegion.level, [])
  const constructionDays = getConstructionDays(techs)
  const shrinkRefund = selectedRegion.level > 0 ? scaleResourceBundle(projectFacilityCost(selectedSpec, selectedRegion.level - 1, techs), 0.5) : {}
  const baseShrinkRefund = selectedRegion.level > 0 ? scaleResourceBundle(projectFacilityCost(selectedSpec, selectedRegion.level - 1, []), 0.5) : {}
  const progress = activeConstruction
    ? Math.min(100, Math.max(8, Math.round(((year - activeConstruction.startedDay + 1) / Math.max(1, activeConstruction.completeDay - activeConstruction.startedDay)) * 100)))
    : 0
  const expandProgress = activeConstruction?.mode === 'expand' ? progress : currentOrder === 'expand-continuous' ? 100 : 0
  const shrinkProgress = activeConstruction?.mode === 'shrink' ? progress : currentOrder === 'shrink-continuous' ? 100 : 0
  const expandDisabledReason = selectedFixed
    ? '固定建筑'
    : activeConstruction
      ? activeConstruction.mode === 'expand' ? '扩建中' : '缩减中'
      : !selectedBuildable
        ? `需要${selectedRequiredTech?.name ?? '科技'}`
        : selectedRegion.level >= selectedRegion.max
          ? '已满级'
          : !affordExpansion
            ? '材料不足'
            : ''
  const shrinkDisabledReason = selectedFixed
    ? '固定建筑'
    : activeConstruction
      ? activeConstruction.mode === 'expand' ? '扩建中' : '缩减中'
      : selectedRegion.level <= shrinkFloor
        ? '已最低'
        : ''
  const expandDisabled = Boolean(expandDisabledReason)
  const shrinkDisabled = Boolean(shrinkDisabledReason)
  const expandButtonLabel = expandDisabledReason ? expandDisabledReason : '立即扩建'
  const shrinkButtonLabel = shrinkDisabledReason ? shrinkDisabledReason : '立即缩减'
  const continuousExpandLabel = expandDisabledReason ? expandDisabledReason : '持续扩建'
  const continuousShrinkLabel = shrinkDisabledReason ? shrinkDisabledReason : '持续缩减'

  const statusTone = !selectedBuildable || selectedRegion.level === 0 || (!selectedFixed && !isHousingFacility(selectedRegion.id) && assignedPopulation <= 0) ? 'attention' : activeConstruction || (!selectedFixed && !isHousingFacility(selectedRegion.id) && assignedPopulation < workCapacity) ? 'watch' : 'steady'
  const situationTitle = !selectedBuildable
    ? '尚未授权'
    : activeConstruction
      ? activeConstruction.mode === 'expand' ? '施工中' : '冷却中'
      : selectedRegion.level === 0
      ? '等待建造'
      : selectedFixed
        ? '固定在线'
      : isHousingFacility(selectedRegion.id)
        ? '容量在线'
        : assignedPopulation <= 0
        ? '停摆'
        : assignedPopulation < workCapacity
        ? '岗位未满'
          : throughput >= 1
          ? '运转充分'
          : '低效运转'
  const staffText = selectedFixed ? '固定' : isHousingFacility(selectedRegion.id) ? `居民 ${housingResidents}/${housingCapacity}` : `${assignedPopulation}/${workCapacity}`
  const throughputText = selectedFixed ? '在线' : isHousingFacility(selectedRegion.id) ? `${housingCapacity > 0 ? Math.round(housingResidents / housingCapacity * 100) : 0}%` : `${Math.round(throughput * 100)}%`

  return (
    <aside className="inspector facility-detail-v2 standard-detail">
      <header className="detail-v2-header">
        <button className="back-button" onClick={onBack}><ChevronLeft size={16} />建筑名录</button>
        <div className="detail-v2-title">
          <h2>{selectedRegion.name}</h2>
          <p>{selectedRegion.subtitle}</p>
        </div>
        <div className={`building-status-chip ${statusTone}`}><span>{situationTitle}</span><small>{orderLabel(currentOrder)}</small></div>
      </header>

      <div className="detail-top-row">
        <div className="detail-v2-art" aria-label={`${selectedRegion.name}建筑主视觉`}>
          <img src={getFacilityArt(selectedRegion.id)} alt={selectedRegion.name} />
        </div>
        <section className="detail-command-column">
          <article className="construction-card expand">
            <h3>扩建 | 支付成本</h3>
            <div className="construction-resources"><CostResourceList bundle={selectedCost} baseBundle={baseExpansionCost} empty="无需成本" /><ConstructionDaysPill days={constructionDays} /></div>
            <div className="construction-actions">
              <button className={currentOrder === 'expand' ? 'selected' : ''} onClick={() => onUpgrade(selectedRegion.id, 'expand')} disabled={expandDisabled}><FacilityOrderGlyph mode="expand" />{expandButtonLabel}</button>
              <button className={currentOrder === 'expand-continuous' ? 'selected' : ''} onClick={() => onUpgrade(selectedRegion.id, 'expand-continuous')} disabled={expandDisabled}><FacilityOrderGlyph mode="expand-continuous" />{continuousExpandLabel}</button>
            </div>
            <ProgressLine value={expandProgress} label={activeConstruction?.mode === 'expand' ? `扩建 ${expandProgress}%` : currentOrder === 'expand-continuous' ? '持续扩建已记录' : '等待扩建命令'} />
            <hr className="construction-divider" />
            <h3>缩减 | 回收资源</h3>
            <div className="construction-resources"><CostResourceList bundle={shrinkRefund} baseBundle={baseShrinkRefund} empty="无可回收" /><ConstructionDaysPill days={constructionDays} /></div>
            <div className="construction-actions">
              <button className={currentOrder === 'shrink' ? 'selected' : ''} onClick={() => onShrink(selectedRegion.id, 'shrink')} disabled={shrinkDisabled}><FacilityOrderGlyph mode="shrink" />{shrinkButtonLabel}</button>
              <button className={currentOrder === 'shrink-continuous' ? 'selected' : ''} onClick={() => onShrink(selectedRegion.id, 'shrink-continuous')} disabled={shrinkDisabled}><FacilityOrderGlyph mode="shrink-continuous" />{continuousShrinkLabel}</button>
            </div>
            <ProgressLine value={shrinkProgress} label={activeConstruction?.mode === 'shrink' ? `缩减 ${shrinkProgress}%` : currentOrder === 'shrink-continuous' ? '持续缩减已记录' : '等待缩减命令'} />
          </article>
          <article className="construction-card building-desc-card">
            <h3>建筑描述</h3>
            <div className="building-desc-card-body">
              <span className="eyebrow">{selectedRegion.subtitle}</span>
              <p>{displayCopy(selectedRegion.note)}</p>
            </div>
          </article>
        </section>
      </div>

      <section className="method-ledger">
        <div className="method-ledger-head">
          <div className="method-book-tabs" role="tablist" aria-label="切换生产方式">
            {selectedSpec.productionMethods.map(method => {
              const ready = availableMethodIds.includes(method.id)
              const techName = method.unlockedBy ? technologyCatalog[method.unlockedBy]?.name : undefined
              return (
                <button
                  key={method.id}
                  type="button"
                  role="tab"
                  aria-selected={method.id === selectedMethod.id}
                  className={method.id === selectedMethod.id ? 'active' : ''}
                  disabled={!ready}
                  title={ready ? method.name : `需要 ${techName ?? '科技'}`}
                  onClick={() => onMethod(selectedRegion.id, method.id)}
                >{method.name}</button>
              )
            })}
          </div>
        </div>
        <article className="method-equation">
          <div className="method-stage">
            <span className="method-column-label">配方</span>
            <div className="method-formula"><ResourceDeltaRows input={selectedMethod.input} output={selectedMethod.output} /></div>
          </div>
          <div className="method-stage">
            <span className="method-column-label">在岗人数</span>
            <div className="method-staff">
              {!selectedFixed && !isHousingFacility(selectedRegion.id) && workCapacity > 0 ? (
                <div className="staffing-slider-row">
                    <b><Users size={13} />{assignedPopulation}/{workCapacity}</b>
                    <input
                    type="range"
                    min={0}
                    max={workCapacity}
                    value={assignedPopulation}
                    onChange={e => onStaffingSet?.(selectedRegion.id, Number(e.target.value))}
                    className="staffing-slider"
                    disabled={!!activeConstruction}
                  />
                </div>
              ) : (
                <b>{staffText}</b>
              )}
            </div>
          </div>
          <div className="method-stage">
            <span className="method-column-label">吞吐率</span>
            <div className="method-throughput">
              <b>{throughputText}</b>
              {!selectedFixed && !isHousingFacility(selectedRegion.id) && (
                <div className="throughput-inline-breakdown">
                  <div className="breakdown-row"><span>基础效率</span><span className="throughput-base">88%</span></div>
                  <div className="breakdown-row"><span>└ 栖息地</span><span className={`throughput-${habitatLevel > 0 ? 'bonus' : 'neutral'}`}>{habitatLevel > 0 ? '+' : ''}{(habitatLevel * 2.5).toFixed(1)}%</span></div>
                </div>
              )}
            </div>
          </div>
          <div className="method-stage">
            <span className="method-column-label">总产量</span>
            <div className="method-output"><ResourceDeltaRows input={selectedFlow.consumption} output={selectedFlow.production} /></div>
          </div>
        </article>
        {!selectedFixed && !isHousingFacility(selectedRegion.id) && (
          <p className="method-equation-note">总产量 = 配方产出 × 在岗人数 × 吞吐率</p>
        )}
      </section>

      {children}
    </aside>
  )
}

function canAfford(resources: Resources, cost: Partial<Resources>) {
  return resourceOrder.every(key => resources[key] >= (cost[key] ?? 0))
}
