import { ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { PlanetScene, planetTextures } from '../../PlanetScene'
import { PortraitSlot } from '../ui'
import { FacilityList } from './FacilityList'
import { FacilityDetailPanel } from './FacilityDetailPanel'
import { formatDay } from '../../utils/format'
import charChenlin from '../../assets/char-chenlin.jpg'
import type { AutomationPlan, PopulationProjection, ProductionMethodId, Resources } from '../../economy'
import type { Role } from '../../events'
import type {
  ConstructionProject,
  FacilityOrderMode,
  Region,
  RegionId,
  StaffingPriority,
} from '../../types/game'

export interface PlanetFacilitiesProps {
  regions: Region[]
  selected: RegionId
  year: number
  techs: string[]
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
  planetTexture: typeof planetTextures[number]
  docked: boolean
  detailOpen: boolean
  dockCollapsed: boolean
  onDock: () => void
  onBack: () => void
  onToggleDockCollapse: () => void
  onSelect: (id: RegionId) => void
  onUpgrade: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'expand' | 'expand-continuous'>) => void
  onHold: (id: RegionId) => void
  onShrink: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'shrink' | 'shrink-continuous'>) => void
  onPriority: (id: RegionId, priority: StaffingPriority) => void
  onMethod: (id: RegionId, methodId: ProductionMethodId) => void
  onAssignment: (visitorId: string | undefined) => void
}

export function PlanetFacilities({
  regions,
  selected,
  year,
  techs,
  productionMethods,
  facilityOrders,
  facilityOrderStarted,
  construction,
  populationProjection,
  staffing,
  staffingPriorities,
  allocatedPopulation,
  freePopulation,
  facilityModifiers,
  lastAutomatedAction,
  roster,
  assigned,
  selectedRegion,
  selectedCost,
  resources,
  dailyNet,
  automationPlan,
  planetTexture,
  docked,
  detailOpen,
  dockCollapsed,
  onDock,
  onBack,
  onToggleDockCollapse,
  onSelect,
  onUpgrade,
  onHold,
  onShrink,
  onPriority,
  onMethod,
  onAssignment,
}: PlanetFacilitiesProps) {
  if (!docked) {
    return (
      <div className="planet-home">
        <div className="planet-stage">
          <PlanetScene texture={planetTexture} onActivate={onDock} />
          <div className="planet-title">
            <span className="eyebrow">殖民星球 · {planetTexture.name}</span>
            <h2>静海王国</h2>
            <p>{formatDay(year)} · 已启动 {regions.filter(region => region.level > 0).length}/{regions.length} 座设施</p>
            <button onClick={onDock}>展开设施名录 <ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`planet-workbench ${detailOpen ? 'detail-mode' : ''} ${dockCollapsed ? 'dock-collapsed' : ''}`}>
      {dockCollapsed && !detailOpen && (
        <button
          type="button"
          className="dock-expand-toggle"
          onClick={onToggleDockCollapse}
          aria-label="展开左侧信息"
          title="展开左侧信息"
        >
          <PanelLeftOpen size={14} />
          <span>展开</span>
        </button>
      )}
      {!detailOpen && !dockCollapsed && (
        <section className="planet-dock">
          <button
            type="button"
            className="dock-collapse-toggle"
            onClick={onToggleDockCollapse}
            aria-label="收起左侧信息"
            title="收起左侧信息"
          >
            <PanelLeftClose size={14} />
            <span>收起</span>
          </button>
          <div className="docked-orbit"><PlanetScene texture={planetTexture} compact onActivate={() => onBack()} /></div>
          <div className="planet-dock-copy"><span className="eyebrow">殖民星球</span><h2>{planetTexture.name}</h2><p>{formatDay(year)}，国祚仍在设施、报告与星舰之间被重新分配。</p></div>
          <aside className="king-profile compact-player">
            <PortraitSlot src={charChenlin} alt="陈林 · 月面王" className="king-portrait-slot" />
            <div><span className="eyebrow">玩家国王</span><h3>月冠执政者</h3></div>
          </aside>
        </section>
      )}
      {detailOpen ? (
        <FacilityDetailPanel
          selected={selected}
          year={year}
          techs={techs}
          productionMethods={productionMethods}
          facilityOrders={facilityOrders}
          facilityOrderStarted={facilityOrderStarted}
          construction={construction}
          populationProjection={populationProjection}
          staffing={staffing}
          staffingPriorities={staffingPriorities}
          allocatedPopulation={allocatedPopulation}
          freePopulation={freePopulation}
          facilityModifiers={facilityModifiers}
          lastAutomatedAction={lastAutomatedAction}
          roster={roster}
          assigned={assigned}
          selectedRegion={selectedRegion}
          selectedCost={selectedCost}
          resources={resources}
          dailyNet={dailyNet}
          automationPlan={automationPlan}
          regions={regions}
          onBack={onBack}
          onUpgrade={onUpgrade}
          onHold={onHold}
          onShrink={onShrink}
          onPriority={onPriority}
          onMethod={onMethod}
          onAssignment={onAssignment}
        />
      ) : (
        <FacilityList
          regions={regions}
          selected={selected}
          year={year}
          techs={techs}
          productionMethods={productionMethods}
          facilityOrders={facilityOrders}
          construction={construction}
          staffing={staffing}
          facilityModifiers={facilityModifiers}
          assigned={assigned}
          roster={roster}
          residentsByFacility={populationProjection.residentsByFacility}
          facilityNetByRegion={populationProjection.facilityNet}
          onSelect={onSelect}
          onUpgrade={onUpgrade}
          onMethod={onMethod}
        />
      )}
    </div>
  )
}
