import { ArrowUpRight, ChevronDown, Info } from 'lucide-react'
import {
  canBuildFacility,
  facilityEconomySpecs,
  getFacilityWorkCapacity,
  getHousingCapacity,
  hasTech,
  isFixedFacility,
  isHousingFacility,
  projectFacilityNet,
  selectProductionMethod,
  technologyCatalog,
} from '../../economy'
import { FacilityNetRow } from '../resources'
import { SectionHeading } from '../layout'
import { throughputClass } from '../../utils/game'
import { facilityEra, facilityEraSections, specialFacilityViews } from '../../data/eraSections'
import type { ProductionMethodId, Resources } from '../../economy'
import type { FacilityOrderMode, Region, RegionId } from '../../types/game'

export interface FacilityListProps {
  regions: Region[]
  selected: RegionId
  year: number
  techs: string[]
  productionMethods: Record<RegionId, ProductionMethodId>
  facilityOrders: Record<RegionId, FacilityOrderMode>
  construction: Record<RegionId, { mode: 'expand' | 'shrink'; startedDay: number; completeDay: number } | null>
  staffing: Record<RegionId, number>
  facilityModifiers: Partial<Record<RegionId, { outputMultiplier?: number; upkeepMultiplier?: number }>>
  assigned: Record<RegionId, string | undefined>
  roster: { id: string; name: string; glyph: string }[]
  residentsByFacility: Partial<Record<RegionId, number>>
  facilityNetByRegion: Partial<Record<RegionId, Partial<Resources>>>
  onSelect: (id: RegionId) => void
  onUpgrade: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'expand' | 'expand-continuous'>) => void
  onMethod: (id: RegionId, methodId: ProductionMethodId) => void
}

export function FacilityList({
  regions,
  selected,
  year,
  techs,
  productionMethods,
  facilityOrders,
  construction,
  staffing,
  facilityModifiers,
  assigned,
  roster,
  residentsByFacility,
  facilityNetByRegion,
  onSelect,
  onUpgrade,
  onMethod,
}: FacilityListProps) {
  return (
    <section className="facility-ledger">
      <SectionHeading eyebrow="主要设施" title="建筑名录" description="D/R/S/K/L 进入专属系统页。" />
      <div className="facility-era-list">
        {facilityEraSections.map(section => {
          const sectionRegions = regions.filter(region => facilityEra[region.id] === section.id)
          return (
            <section key={section.id} className="facility-era-section">
              <header><span>{section.label}</span><small>{section.note}</small></header>
              <div className="facility-ledger-list">
                {sectionRegions.map(region => {
                  const RegionIcon = region.icon
                  const worker = roster.find(item => item.id === assigned[region.id])
                  const special = specialFacilityViews[region.id]
                  const spec = facilityEconomySpecs[region.id]
                  const method = selectProductionMethod(spec.productionMethods, techs, productionMethods[region.id])
                  const capacity = getFacilityWorkCapacity(region.id, region.level)
                  const housingCapacity = getHousingCapacity(region.id, region.level)
                  const assignedPop = Math.min(capacity, staffing[region.id] ?? 0)
                  const fixed = isFixedFacility(region.id)
                  const staffRate = capacity > 0 ? assignedPop / capacity : housingCapacity > 0 || fixed ? 1 : 0
                  const modifier = facilityModifiers[region.id] ?? { outputMultiplier: 1, upkeepMultiplier: 1 }
                  const throughput = staffRate * (modifier.outputMultiplier ?? 1)
                  const actualNet = isHousingFacility(region.id)
                    ? facilityNetByRegion[region.id] ?? {}
                    : projectFacilityNet(spec, assignedPop, modifier, techs, method.id, region.level)
                  const order = facilityOrders[region.id] ?? 'hold'
                  const canQuickUpgrade = !fixed && !isHousingFacility(region.id) && !construction[region.id] && order === 'hold' && region.level < region.max && canBuildFacility(spec, year, techs)
                  const populationText = fixed ? '固定' : housingCapacity ? `${residentsByFacility[region.id] ?? 0}/${housingCapacity}` : capacity ? `${assignedPop}/${capacity}` : '未建'
                  const throughputText = fixed ? '在线' : region.level === 0 ? '未建' : `${Math.round(throughput * 100)}%`
                  return (
                    <div key={region.id} className={`ledger-card ${selected === region.id ? 'selected' : ''} ${special ? 'special' : ''} throughput-${throughputClass(throughput)}`}>
                      <div className="ledger-block ledger-identity">
                        <div className="ledger-icon-square"><RegionIcon size={28} /></div>
                        <b>{region.name}</b>
                        {worker && <i title={`${worker.name} 执勤`}>{worker.glyph}</i>}
                      </div>
                      <div className="ledger-block ledger-economy-block">
                        <div className="ledger-stat-row"><span className="ledger-stat-label">{fixed ? '岗位' : housingCapacity ? '居住容量' : '岗位占用'}</span><span className="ledger-stat-value"><em>{populationText}</em></span></div>
                        <FacilityNetRow net={actualNet} compact empty="-" />
                      </div>
                      <div className="ledger-block ledger-action-block">
                        <label className="ledger-method-switch" onClick={event => event.stopPropagation()}>
                          <span>生产方式</span>
                          <select value={method.id} onChange={event => onMethod(region.id, event.target.value as ProductionMethodId)} aria-label={`${region.name}生产方式`}>
                            {spec.productionMethods.map(candidate => {
                              const ready = hasTech(techs, candidate.unlockedBy) && candidate.autoSelect !== false
                              const techName = candidate.unlockedBy ? technologyCatalog[candidate.unlockedBy]?.name : undefined
                              return <option key={candidate.id} value={candidate.id} disabled={!ready}>{ready ? candidate.name : `${candidate.name}（需${techName ?? '科技'}）`}</option>
                            })}
                          </select>
                          <ChevronDown size={14} aria-hidden="true" />
                        </label>
                        <button className="ledger-quick-upgrade" type="button" disabled={!canQuickUpgrade} onClick={event => { event.stopPropagation(); onUpgrade(region.id, 'expand') }}>
                          <ArrowUpRight size={14} />单次升级
                        </button>
                        <button className="ledger-detail" type="button" onClick={event => { event.stopPropagation(); onSelect(region.id) }}>
                          <Info size={14} />建筑详情
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}
