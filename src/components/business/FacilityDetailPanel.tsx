import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
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
import styles from './FacilityDetailPanel.module.css'
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
  autoStaffingByFacility: Partial<Record<RegionId, boolean>>
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
  onSelect: (id: RegionId) => void
  onUpgrade: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'expand' | 'expand-continuous'>) => void
  onHold: (id: RegionId) => void
  onShrink: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'shrink' | 'shrink-continuous'>) => void
  onPriority: (id: RegionId, priority: StaffingPriority) => void
  onMethod: (id: RegionId, methodId: ProductionMethodId) => void
  onStaffingSet?: (id: RegionId, staff: number) => void
  onClearManualStaffing?: (id: RegionId, auto: boolean) => void
  onHousingRedistribute?: (id: RegionId, residents: number) => void
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
  staffingPriorities,
  autoStaffingByFacility,
  freePopulation,
  selectedRegion,
  selectedCost,
  resources,
  facilityModifiers,
  regions,
  onBack,
  onSelect,
  onUpgrade,
  onShrink,
  onMethod,
  onStaffingSet,
  onClearManualStaffing,
  onHousingRedistribute,
  children,
}: FacilityDetailPanelProps) {
  const touchStartX = useRef<number | null>(null)
  const currentIndex = regions.findIndex(r => r.id === selectedRegion.id)
  const prevRegion = currentIndex > 0 ? regions[currentIndex - 1] : undefined
  const nextRegion = currentIndex >= 0 && currentIndex < regions.length - 1 ? regions[currentIndex + 1] : undefined

  const navigateTo = (target: Region | undefined) => {
    if (target) onSelect(target.id)
  }
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
  const isHousing = isHousingFacility(selectedRegion.id)
  const isStaffingAuto = autoStaffingByFacility[selectedRegion.id] !== false
  const staffingCurrent = isHousing ? (isStaffingAuto ? housingResidents : staffing[selectedRegion.id] ?? housingResidents) : assignedPopulation
  const staffingHardMax = isHousing ? housingCapacity : workCapacity
  // 人口建筑上下限：所有居民必须安置在人口建筑中，减少某建筑时其余建筑按其空余容量吸收（下限）；
  // 增加某建筑最多只能并入全部居民（上限）
  const housingRegions = regions.filter(region => isHousingFacility(region.id))
  const housingCurrentOf = (hid: RegionId) => autoStaffingByFacility[hid] === false ? (staffing[hid] ?? 0) : (populationProjection.residentsByFacility[hid] ?? 0)
  const housingTotal = housingRegions.reduce((sum, region) => sum + housingCurrentOf(region.id), 0)
  const otherHousingCapacity = housingRegions
    .filter(region => region.id !== selectedRegion.id)
    .reduce((sum, region) => sum + getHousingCapacity(region.id, region.level), 0)
  const staffingMin = isHousing ? Math.max(0, housingTotal - otherHousingCapacity) : 0
  // 生产建筑上限受空闲人口约束：剩余空闲不足时不能填满全部岗位
  const staffingMax = isHousing
    ? Math.min(housingCapacity, housingTotal)
    : Math.min(workCapacity, assignedPopulation + freePopulation)
  const staffingReachableMax = staffingMax
  const staffColumnLabel = isHousing ? '居住人数' : '在岗人数'
  const staffDisplay = isHousing ? `${staffingCurrent}/${housingCapacity}` : `${assignedPopulation}/${workCapacity}`
  const selectedBuildable = canBuildFacility(selectedSpec, techs)
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
  const staffText = isHousingFacility(selectedRegion.id) ? `居民 ${housingResidents}/${housingCapacity}` : `${assignedPopulation}/${workCapacity}`
  const throughputText = selectedFixed ? '在线' : isHousingFacility(selectedRegion.id) ? `${housingCapacity > 0 ? Math.round(housingResidents / housingCapacity * 100) : 0}%` : `${Math.round(throughput * 100)}%`

  return (
    <aside
      className={`inspector ${styles['facility-detail-v2']}`}
      onTouchStart={e => { touchStartX.current = e.changedTouches[0]?.clientX ?? null }}
      onTouchEnd={e => {
        const startX = touchStartX.current
        const endX = e.changedTouches[0]?.clientX ?? startX
        if (startX == null || endX == null) return
        const delta = endX - startX
        const threshold = 48
        if (delta < -threshold) navigateTo(nextRegion)
        else if (delta > threshold) navigateTo(prevRegion)
        touchStartX.current = null
      }}
    >
      <header className={styles['detail-v2-header']}>
        <button className="back-button" onClick={onBack}><ChevronLeft size={16} />建筑名录</button>
        <div className={styles['detail-v2-title']}>
          <h2>{selectedRegion.name}</h2>
          <p>{selectedRegion.subtitle}</p>
        </div>
        <div className={`${styles['building-status-chip']} ${styles[statusTone]}`}><span>{situationTitle}</span><small>{orderLabel(currentOrder)}</small></div>
      </header>

      <div className={styles['detail-top-row']}>
        <div className={styles['detail-v2-art']} aria-label={`${selectedRegion.name}建筑主视觉`}>
          <img src={getFacilityArt(selectedRegion.id)} alt={selectedRegion.name} />
        </div>
        <section className={styles['detail-command-column']}>
          <article className={`${styles['construction-card']} ${styles['expand']}`}>
            <h3>扩建 | 支付成本</h3>
            <div className={styles['construction-resources']}><CostResourceList bundle={selectedCost} baseBundle={baseExpansionCost} empty="无需成本" /><ConstructionDaysPill days={constructionDays} /></div>
            <div className={styles['construction-actions']}>
              <button className={currentOrder === 'expand' ? styles['selected'] : ''} onClick={() => onUpgrade(selectedRegion.id, 'expand')} disabled={expandDisabled}><FacilityOrderGlyph mode="expand" />{expandButtonLabel}</button>
              <button className={currentOrder === 'expand-continuous' ? styles['selected'] : ''} onClick={() => onUpgrade(selectedRegion.id, 'expand-continuous')} disabled={expandDisabled}><FacilityOrderGlyph mode="expand-continuous" />{continuousExpandLabel}</button>
            </div>
            <ProgressLine value={expandProgress} label={activeConstruction?.mode === 'expand' ? `扩建 ${expandProgress}%` : currentOrder === 'expand-continuous' ? '持续扩建已记录' : '等待扩建命令'} />
            <hr className={styles['construction-divider']} />
            <h3>缩减 | 回收资源</h3>
            <div className={styles['construction-resources']}><CostResourceList bundle={shrinkRefund} baseBundle={baseShrinkRefund} empty="无可回收" /><ConstructionDaysPill days={constructionDays} /></div>
            <div className={styles['construction-actions']}>
              <button className={currentOrder === 'shrink' ? styles['selected'] : ''} onClick={() => onShrink(selectedRegion.id, 'shrink')} disabled={shrinkDisabled}><FacilityOrderGlyph mode="shrink" />{shrinkButtonLabel}</button>
              <button className={currentOrder === 'shrink-continuous' ? styles['selected'] : ''} onClick={() => onShrink(selectedRegion.id, 'shrink-continuous')} disabled={shrinkDisabled}><FacilityOrderGlyph mode="shrink-continuous" />{continuousShrinkLabel}</button>
            </div>
            <ProgressLine value={shrinkProgress} label={activeConstruction?.mode === 'shrink' ? `缩减 ${shrinkProgress}%` : currentOrder === 'shrink-continuous' ? '持续缩减已记录' : '等待缩减命令'} />
          </article>
          <article className={`${styles['construction-card']} ${styles['building-desc-card']}`}>
            <h3>建筑描述</h3>
            <div className={styles['building-desc-card-body']}>
              <span className="eyebrow">{selectedRegion.subtitle}</span>
              <p>{displayCopy(selectedRegion.note)}</p>
            </div>
          </article>
        </section>
      </div>

      <section className={styles['method-ledger']}>
        <div className={styles['method-ledger-head']}>
          <div className={styles['method-book-tabs']} role="tablist" aria-label="切换生产方式">
            {selectedSpec.productionMethods.map(method => {
              const ready = availableMethodIds.includes(method.id)
              const techName = method.unlockedBy ? technologyCatalog[method.unlockedBy]?.name : undefined
              return (
                <button
                  key={method.id}
                  type="button"
                  role="tab"
                  aria-selected={method.id === selectedMethod.id}
                  className={method.id === selectedMethod.id ? styles['active'] : ''}
                  disabled={!ready}
                  title={ready ? method.name : `需要 ${techName ?? '科技'}`}
                  onClick={() => onMethod(selectedRegion.id, method.id)}
                >{method.name}</button>
              )
            })}
          </div>
        </div>
        <article className={styles['method-equation']}>
          <div className={styles['method-stage']}>
            <span className={styles['method-column-label']}>配方</span>
            <div className={styles['method-formula']}><ResourceDeltaRows input={selectedMethod.input} output={selectedMethod.output} /></div>
          </div>
          <div className={styles['method-stage']}>
            <span className={styles['method-column-label']}>{staffColumnLabel}</span>
            <div className={styles['method-staff']}>
              {!selectedFixed && staffingHardMax > 0 ? (
                <div className={styles['staffing-slider-row']}>
                  <b><Users size={13} />{staffDisplay}</b>
                  <input
                    type="range"
                    min={staffingMin}
                    max={staffingMax}
                    value={staffingCurrent}
                    onChange={e => {
                      const v = Number(e.target.value)
                      if (isHousing && onHousingRedistribute) {
                        onHousingRedistribute(selectedRegion.id, v)
                      } else {
                        onStaffingSet?.(selectedRegion.id, v)
                      }
                    }}
                    className={styles['staffing-slider']}
                    disabled={!!activeConstruction || isStaffingAuto}
                    style={{
                      background: staffingHardMax > staffingReachableMax
                        ? `linear-gradient(90deg,
                            var(--ui-brass) ${(staffingReachableMax / staffingHardMax * 100).toFixed(1)}%,
                            var(--ui-line) ${(staffingReachableMax / staffingHardMax * 100).toFixed(1)}%,
                            var(--ui-line) 100%)`
                        : undefined,
                    }}
                  />
                  {!selectedFixed && staffingHardMax > 0 && (
                    <label className={styles['staffing-auto-toggle']}>
                      <input
                        type="checkbox"
                        checked={isStaffingAuto}
                        onChange={() => onClearManualStaffing?.(selectedRegion.id, !isStaffingAuto)}
                      />
                      <span>自动调配</span>
                    </label>
                  )}
                </div>
              ) : (
                <b>{staffText}</b>
              )}
            </div>
          </div>
          <div className={styles['method-stage']}>
            <span className={styles['method-column-label']}>吞吐率</span>
            <div className={styles['method-throughput']}>
              <b>{throughputText}</b>
              {!selectedFixed && !isHousingFacility(selectedRegion.id) && (
                <div className={styles['throughput-inline-breakdown']}>
                  <div className={styles['breakdown-row']}><span>基础效率</span><span className={styles['throughput-base']}>88%</span></div>
                  <div className={styles['breakdown-row']}><span>└ 栖息地</span><span className={habitatLevel > 0 ? styles['throughput-bonus'] : styles['throughput-neutral']}>{habitatLevel > 0 ? '+' : ''}{(habitatLevel * 2.5).toFixed(1)}%</span></div>
                </div>
              )}
            </div>
          </div>
          <div className={styles['method-stage']}>
            <span className={styles['method-column-label']}>总产量</span>
            <div className={styles['method-output']}><ResourceDeltaRows input={selectedFlow.consumption} output={selectedFlow.production} /></div>
          </div>
        </article>
        {!selectedFixed && !isHousingFacility(selectedRegion.id) && (
          <p className={styles['method-equation-note']}>总产量 = 配方产出 × 在岗人数 × 吞吐率</p>
        )}
      </section>

      {children}

      <button
        type="button"
        className={`${styles['facility-nav']} ${styles['facility-nav-prev']} ${prevRegion ? styles['available'] : ''}`}
        aria-label={prevRegion ? `上一个：${prevRegion.name}` : '无上一个设施'}
        title={prevRegion ? prevRegion.name : undefined}
        disabled={!prevRegion}
        onClick={() => navigateTo(prevRegion)}
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        className={`${styles['facility-nav']} ${styles['facility-nav-next']} ${nextRegion ? styles['available'] : ''}`}
        aria-label={nextRegion ? `下一个：${nextRegion.name}` : '无下一个设施'}
        title={nextRegion ? nextRegion.name : undefined}
        disabled={!nextRegion}
        onClick={() => navigateTo(nextRegion)}
      >
        <ChevronRight size={22} />
      </button>
    </aside>
  )
}

function canAfford(resources: Resources, cost: Partial<Resources>) {
  return resourceOrder.every(key => resources[key] >= (cost[key] ?? 0))
}
