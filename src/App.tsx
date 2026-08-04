import { useEffect, useMemo, useRef, useState, type ComponentType, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, BookOpen, Bot, Check, ChevronLeft, ChevronRight, CircleDot, Crown, Droplet, Factory,
  Coins, FlaskConical, FolderOpen, Gauge, House, Info, Landmark, Leaf, Lock, LogOut, Minus, Mountain, Orbit,
  Pause, Pickaxe, Play, Rocket, Save, Settings, Sparkles, Sprout, Sun, Theater, Users, Volume2, Waves, X, Zap,
  type LucideProps,
} from 'lucide-react'
import {
  applyBundle,
  buildFacilityModifiers,
  calculateCurrencyDebtInterest,
  canBuildFacility,
  canAfford,
  canExecuteStarportTrade,
  defaultReserveFloors,
  defaultStartingTechs,
  emergencyCreditDebtLimit,
  facilityEconomySpecs,
  facilityOrder,
  gameCalendar,
  getConstructionDays,
  getFacilityWorkCapacity,
  getHousingCapacity,
  hasTech,
  isFixedFacility,
  isHousingFacility,
  projectDailyFlow,
  projectFacilityCost,
  projectFacilityFlow,
  projectFacilityNet,
  projectPopulationSystem,
  resourceGroups,
  resourceMeta,
  resourceOrder,
  selectProductionMethod,
  settleDailyResources,
  planAutoTradesForDeficits,
  shipProjectStages,
  shipProjectTotalValue,
  starportTradeOffers,
  technologyCatalog,
  weightedValue,
  type AutomationPlan,
  type FacilityId,
  type FacilityState,
  type PopulationProjection,
  type ProductionMethodId,
  type ResourceKey,
  type Resources,
  type TechnologyId,
} from './economy'
import {
  buildEncounter,
  getAvailableEventChains,
  roles,
  rolesById,
  type Encounter,
  type Role,
} from './events'
import { createDisabledAutomationPlan, gameOptimizers, type OptimizerId } from './optimizers'
import { PlanetScene, planetTextures } from './PlanetScene'
import charChenlin from './assets/char-chenlin.jpg'

type AppView = 'facilities' | 'palace' | 'research' | 'ecology' | 'starport' | 'ship' | 'visitors'
type Icon = ComponentType<LucideProps>
type RegionId = FacilityId
type FacilityOrderMode = 'shrink-continuous' | 'shrink' | 'hold' | 'expand' | 'expand-continuous'
type StaffingPriority = 1 | 2 | 3 | 4 | 5
type FacilityEra = 'early' | 'mid' | 'late'
type TechnologyEra = 'early' | 'mid' | 'late'

type ReignReport = {
  id: string
  startDay: number
  endDay: number
  monthNumber: number
  populationStart: number
  populationEnd: number
  populationDelta: number
  housingCapacity: number
  gdp: number
  gdpDelta: number
  resourceRows: Partial<Record<ResourceKey, { produced: number; consumed: number; net: number }>>
  suggestions: string[]
}

type ReignReportBaseline = {
  day: number
  resources: Resources
  gdp: number
}

type ConstructionProject = {
  mode: 'expand' | 'shrink'
  startedDay: number
  completeDay: number
  fromLevel: number
  toLevel: number
  cost: Partial<Resources>
}

type GameSaveState = {
  version: 4 | 5 | 6
  savedAt: string
  gameStarted: boolean
  resources: Resources
  regionLevels: Record<RegionId, number>
  day: number
  isRunning: boolean
  speed: 'normal' | 'fast'
  view: AppView
  selected: RegionId
  planetDocked: boolean
  detailOpen: boolean
  planetTextureId: string
  visitor: Encounter | null
  roster: Role[]
  assigned: Record<RegionId, string | undefined>
  chainProgress: Record<string, number>
  techs: string[]
  activeResearch: TechnologyId
  researchProgress: Partial<Record<TechnologyId, number>>
  productionMethods: Record<RegionId, ProductionMethodId>
  staffing: Record<RegionId, number>
  staffingPriorities?: Record<RegionId, StaffingPriority>
  facilityOrders: Record<RegionId, FacilityOrderMode>
  facilityOrderStarted: Record<RegionId, number>
  construction: Record<RegionId, ConstructionProject | null>
  populationPressureDays: number
  activeOptimizerId: OptimizerId | 'none'
  autoTradeProtectionEnabled?: boolean
  autoTradeEnabled?: Partial<Record<ResourceKey, boolean>>
  tradeSourcedResources?: Partial<Record<ResourceKey, boolean>>
  lastAutomatedAction: { id: RegionId; day: number; mode: FacilityOrderMode } | null
  policy: 'ration'
  policyLastChangedDay: number
  policyReportStartedDay: number
  policyReportBaseline: Resources
  lastPolicyReport: unknown
  reignReportBaseline: ReignReportBaseline
  lastReignReport: ReignReport | null
  activeReignReport: ReignReport | null
  log: string[]
  pendingMonthlyReport: string | null
}

type SpecialFacilityViewModel = {
  region: Region
  assignedPopulation: number
  net: Partial<Resources>
  modifier: { outputMultiplier?: number; upkeepMultiplier?: number }
  throughput: number
  methodName: string
}

type Region = FacilityState & {
  icon: Icon
  name: string
  subtitle: string
  unlock: number
  max: number
  note: string
  interfaceDuty: string
  phaseNotes?: { name: string; note: string }[]
  yields: Partial<Resources>
  cost: Partial<Resources>
  parentIds: RegionId[]
  position: { x: number; y: number }
}

const initialResources: Resources = {
  power: 24,
  water: 12,
  oxygen: 14,
  biomass: 10,
  regolith: 22,
  alloy: 14,
  quantumCore: 2,
  currency: 10,
  population: 12,
  knowledge: 0,
  luxury: 0,
}

const regionLayout: Record<RegionId, { icon: Icon; parentIds: RegionId[]; position: { x: number; y: number } }> = {
  E1: { icon: Sun, parentIds: [], position: { x: 8, y: 12 } },
  C1: { icon: Pickaxe, parentIds: [], position: { x: 8, y: 32 } },
  K: { icon: Crown, parentIds: [], position: { x: 8, y: 52 } },
  B: { icon: Sprout, parentIds: ['E1', 'C1'], position: { x: 26, y: 18 } },
  E2: { icon: CircleDot, parentIds: ['E1'], position: { x: 26, y: 38 } },
  C2: { icon: Pickaxe, parentIds: ['C1', 'B'], position: { x: 26, y: 60 } },
  F: { icon: Factory, parentIds: ['C2', 'E2'], position: { x: 44, y: 20 } },
  P: { icon: Leaf, parentIds: ['C1', 'B'], position: { x: 44, y: 42 } },
  R: { icon: Waves, parentIds: ['B', 'P'], position: { x: 44, y: 64 } },
  L: { icon: FlaskConical, parentIds: ['K', 'F'], position: { x: 62, y: 14 } },
  H: { icon: Sparkles, parentIds: ['K', 'B'], position: { x: 62, y: 34 } },
  M: { icon: House, parentIds: ['R', 'K'], position: { x: 62, y: 56 } },
  S: { icon: ArrowLeftRight, parentIds: ['K', 'L', 'H'], position: { x: 62, y: 78 } },
  E3: { icon: Orbit, parentIds: ['E2', 'F', 'R'], position: { x: 80, y: 32 } },
  D: { icon: Rocket, parentIds: ['L', 'F', 'S', 'M'], position: { x: 80, y: 72 } },
}

const initialLevels: Partial<Record<RegionId, number>> = { E1: 1, C1: 1, K: 2, S: 1 }
const initialConstruction = Object.fromEntries(facilityOrder.map(id => [id, null])) as Record<RegionId, ConstructionProject | null>
const initialProductionMethods = Object.fromEntries(
  facilityOrder.map(id => [id, selectProductionMethod(facilityEconomySpecs[id].productionMethods, defaultStartingTechs).id]),
) as Record<RegionId, ProductionMethodId>

const facilityOrderIndex = Object.fromEntries(facilityOrder.map((id, index) => [id, index])) as Record<RegionId, number>
const priorityLevels: StaffingPriority[] = [1, 2, 3, 4, 5]
const defaultPriorityForFacility = (id: RegionId): StaffingPriority => {
  const priority = facilityEconomySpecs[id].priority
  if (priority >= 12) return 5
  if (priority >= 9) return 4
  if (priority >= 7) return 3
  if (priority >= 5) return 2
  return 1
}
const initialStaffingPriorities = Object.fromEntries(
  facilityOrder.map(id => [id, defaultPriorityForFacility(id)]),
) as Record<RegionId, StaffingPriority>
const normalizeStaffingPriority = (value: unknown, fallback: StaffingPriority): StaffingPriority => {
  const numeric = typeof value === 'number' ? value : Number(value)
  return priorityLevels.includes(numeric as StaffingPriority) ? numeric as StaffingPriority : fallback
}
const normalizeStaffingPriorities = (saved?: Partial<Record<RegionId, unknown>>) => Object.fromEntries(
  facilityOrder.map(id => [id, normalizeStaffingPriority(saved?.[id], initialStaffingPriorities[id])]),
) as Record<RegionId, StaffingPriority>
const autoAllocateStaffingFromLevels = (
  levels: Partial<Record<RegionId, number>>,
  population: number,
  priorities: Record<RegionId, StaffingPriority>,
) => {
  const next = Object.fromEntries(facilityOrder.map(id => [id, 0])) as Record<RegionId, number>
  let remainingPopulation = Math.max(0, Math.floor(population))
  const assignable = facilityOrder
    .filter(id => !isHousingFacility(id) && !isFixedFacility(id) && getFacilityWorkCapacity(id, levels[id] ?? 0) > 0)
    .sort((a, b) =>
      (priorities[b] ?? initialStaffingPriorities[b]) - (priorities[a] ?? initialStaffingPriorities[a])
      || facilityEconomySpecs[b].priority - facilityEconomySpecs[a].priority
      || facilityOrderIndex[a] - facilityOrderIndex[b],
    )
  assignable.forEach(id => {
    const capacity = getFacilityWorkCapacity(id, levels[id] ?? 0)
    const assigned = Math.min(capacity, remainingPopulation)
    next[id] = assigned
    remainingPopulation -= assigned
  })
  return next
}
const autoAllocateStaffing = (
  regions: Pick<Region, 'id' | 'level'>[],
  population: number,
  priorities: Record<RegionId, StaffingPriority>,
) => autoAllocateStaffingFromLevels(
  Object.fromEntries(regions.map(region => [region.id, region.level])) as Partial<Record<RegionId, number>>,
  population,
  priorities,
)
const initialStaffing = autoAllocateStaffingFromLevels(initialLevels, initialResources.population, initialStaffingPriorities)

const facilityEra: Record<RegionId, FacilityEra> = {
  E1: 'early',
  C1: 'early',
  K: 'early',
  B: 'early',
  L: 'early',
  E2: 'mid',
  C2: 'mid',
  F: 'mid',
  P: 'mid',
  H: 'mid',
  S: 'mid',
  R: 'mid',
  M: 'late',
  E3: 'late',
  D: 'late',
}

const facilityEraSections: { id: FacilityEra; label: string; note: string }[] = [
  { id: 'early', label: '早期设施', note: '维持月面前哨的最低闭环。' },
  { id: 'mid', label: '中期设施', note: '打开工业、文化、贸易与生态改造。' },
  { id: 'late', label: '晚期设施', note: '服务终局星舰与外星科技。' },
]

const regionTemplate: Region[] = facilityOrder.map(id => {
  const spec = facilityEconomySpecs[id]
  const layout = regionLayout[id]
  const level = initialLevels[id] ?? 0
  return {
    id,
    level,
    icon: layout.icon,
    name: spec.name,
    subtitle: spec.subtitle,
    unlock: spec.unlockYear,
    max: spec.maxLevel,
    note: spec.note,
    interfaceDuty: spec.interfaceDuty,
    phaseNotes: spec.phaseNotes,
    yields: projectFacilityNet(spec, level, {}, defaultStartingTechs),
    cost: projectFacilityCost(spec, level),
    parentIds: layout.parentIds,
    position: layout.position,
  }
})

const navItems: { id: AppView; label: string; icon: Icon; color: string }[] = [
  { id: 'facilities', label: '设施', icon: Orbit, color: 'oklch(52% .1 76)' },
  { id: 'palace', label: '王城', icon: Landmark, color: 'oklch(45% .08 250)' },
  { id: 'research', label: '科技', icon: FlaskConical, color: 'oklch(55% .09 300)' },
  { id: 'ecology', label: '生态', icon: Waves, color: 'oklch(50% .1 160)' },
  { id: 'starport', label: '贸易', icon: ArrowLeftRight, color: 'oklch(58% .1 40)' },
  { id: 'ship', label: '星舰', icon: Rocket, color: 'oklch(50% .12 330)' },
  { id: 'visitors', label: '异客', icon: Sparkles, color: 'oklch(60% .11 85)' },
]

const specialFacilityViews: Partial<Record<RegionId, AppView>> = {
  K: 'palace',
  L: 'research',
  R: 'ecology',
  S: 'starport',
  D: 'ship',
}

const resourceUiMeta: Record<ResourceKey, { label: string; icon: Icon; tone: string }> = {
  power: { label: resourceMeta.power.label, icon: Zap, tone: 'gold' },
  water: { label: resourceMeta.water.label, icon: Droplet, tone: 'cyan' },
  oxygen: { label: resourceMeta.oxygen.label, icon: CircleDot, tone: 'cyan' },
  biomass: { label: resourceMeta.biomass.label, icon: Sprout, tone: 'green' },
  regolith: { label: resourceMeta.regolith.label, icon: Mountain, tone: 'ochre' },
  alloy: { label: resourceMeta.alloy.label, icon: Factory, tone: 'slate' },
  quantumCore: { label: '核心', icon: Orbit, tone: 'violet' },
  currency: { label: '货币', icon: Coins, tone: 'gold' },
  population: { label: resourceMeta.population.label, icon: Users, tone: 'coral' },
  knowledge: { label: resourceMeta.knowledge.label, icon: FlaskConical, tone: 'violet' },
  luxury: { label: '奢侈', icon: Sparkles, tone: 'violet' },
}

const researchEraSections: { id: TechnologyEra; label: string; note: string }[] = [
  { id: 'early', label: '前期', note: '维持月面闭环与第一批生产方式。' },
  { id: 'mid', label: '中期', note: '打开工业、贸易、生态和外星接口。' },
  { id: 'late', label: '晚期', note: '服务终局星舰、高能研究与禁忌能源。' },
]

const technologyCategoryLabel: Record<NonNullable<(typeof technologyCatalog)[TechnologyId]['category']>, string> = {
  construction: '建造许可',
  'production-method': '生产方式',
  'facility-efficiency': '效率修正',
  global: '全局规则',
  trade: '贸易权限',
}

const researchableTechIds = Object.values(technologyCatalog)
  .filter(tech => tech.category !== 'construction')
  .sort((a, b) => {
    const eraRank = { early: 1, mid: 2, late: 3 }
    return eraRank[a.era ?? 'early'] - eraRank[b.era ?? 'early'] || a.name.localeCompare(b.name, 'zh-Hans-CN')
  })
  .map(tech => tech.id)

const fmt = (value: number) => Math.round(value).toLocaleString('zh-CN')
const fmtAmount = (value: number) => Number.isInteger(value) ? fmt(value) : value.toFixed(1)
const fmtCompactAmount = (value: number) => {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs > 1_000_000_000) return `${sign}${Math.round(abs / 1_000_000_000)}B`
  if (abs > 100_000) return `${sign}${Math.round(abs / 100_000)}M`
  if (abs > 1_000) return `${sign}${Math.round(abs / 1_000)}K`
  return fmtAmount(value)
}
const fmtSignedCompactAmount = (value: number) => `${value >= 0 ? '+' : ''}${fmtCompactAmount(value)}`
const canPay = canAfford
const apply = applyBundle
const musicSource = '/audio/Gravity_s_Edge.mp3'
const saveKey = 'lunar-crown-save-v4'
const musicVolumeKey = 'lunar-crown-music-volume'
const formatDay = (day: number) => `御日 ${String(day).padStart(3, '0')}`
const displayCopy = (text: string) => text.replace(/\b[TM][A-Z0-9]+-\d+\s*为/g, '').replace(/\b[TM][A-Z0-9]+-\d+\s*/g, '')
const allResourceKeys = resourceGroups.flatMap(group => group.keys)
const weightedShipReadiness = (resources: Resources) => {
  const ratios = shipProjectStages.flatMap(stage =>
    Object.entries(stage.input).map(([key, required]) => Math.min(1, resources[key as ResourceKey] / (required || 1))),
  )
  return ratios.length ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length * 24 : 0
}
const mergeResourceChanges = (...bundles: Partial<Resources>[]): Resources => {
  const total = Object.fromEntries(resourceOrder.map(key => [key, 0])) as Resources
  bundles.forEach(bundle => {
    resourceOrder.forEach(key => {
      total[key] += bundle[key] ?? 0
    })
  })
  return total
}
const scaleResourceBundle = (bundle: Partial<Resources>, multiplier: number): Partial<Resources> => {
  const scaled: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    if (bundle[key]) scaled[key] = bundle[key]! * multiplier
  })
  return scaled
}
const bundleHasValues = (bundle: Partial<Resources>) => resourceOrder.some(key => Boolean(bundle[key]))
const maxTradeBatchesFromSurplus = (resources: Resources, input: Partial<Resources>) => {
  const limits = resourceOrder
    .map(key => {
      const required = input[key] ?? 0
      if (!required) return Number.POSITIVE_INFINITY
      const floor = key === 'currency' ? defaultReserveFloors.currency : defaultReserveFloors[key]
      const surplus = Math.max(0, resources[key] - floor)
      return Math.floor(surplus / required)
    })
    .filter(limit => Number.isFinite(limit))
  return limits.length ? Math.max(0, Math.min(...limits)) : 0
}
const maxTradeBatchesWithDebt = (resources: Resources, input: Partial<Resources>) => {
  const limits = resourceOrder
    .map(key => {
      const required = input[key] ?? 0
      if (!required) return Number.POSITIVE_INFINITY
      if (key === 'currency') return Math.floor(Math.max(0, resources.currency - emergencyCreditDebtLimit) / required)
      return Math.floor(Math.max(0, resources[key]) / required)
    })
    .filter(limit => Number.isFinite(limit))
  return limits.length ? Math.max(0, Math.min(...limits)) : 0
}
const deficitTradeBatches = (resources: Resources, output: Partial<Resources>) => {
  const needed = resourceOrder.map(key => {
    const produced = output[key] ?? 0
    if (!produced) return 0
    return Math.ceil(Math.max(0, defaultReserveFloors[key] - resources[key]) / produced)
  })
  return Math.max(0, ...needed)
}
const flowFromPopulation = (projection: PopulationProjection) => {
  const production = mergeResourceChanges()
  const consumption = mergeResourceChanges()

  resourceOrder.forEach(key => {
    const net = projection.net[key] ?? 0
    const lifeSupport = projection.lifeSupportCost[key] ?? 0
    if (lifeSupport > 0) consumption[key] += lifeSupport
    if (key === 'water' || key === 'oxygen' || key === 'biomass') return
    if (net > 0) production[key] += net
    if (net < 0) consumption[key] += Math.abs(net)
  })

  return { production, consumption }
}
const flowFromTrades = (trades: ReturnType<typeof planAutoTradesForDeficits>['trades'], currencyInterest = 0) => {
  const production = mergeResourceChanges()
  const consumption = mergeResourceChanges()
  const net = mergeResourceChanges()

  trades.forEach(trade => {
    resourceOrder.forEach(key => {
      const input = trade.input[key] ?? 0
      const output = trade.output[key] ?? 0
      if (output > 0) production[key] += output
      if (input > 0) consumption[key] += input
      net[key] += output - input
    })
  })
  if (currencyInterest > 0) {
    consumption.currency += currencyInterest
    net.currency -= currencyInterest
  }

  return { production, consumption, net }
}
const summarizeResourceRows = (production: Resources, consumption: Resources): ReignReport['resourceRows'] => {
  const rows: ReignReport['resourceRows'] = {}
  resourceOrder.forEach(key => {
    const produced = production[key] ?? 0
    const consumed = consumption[key] ?? 0
    const net = produced - consumed
    if (produced || consumed || net) rows[key] = { produced, consumed, net }
  })
  return rows
}
const directionForFacility = (id: FacilityId) => {
  const role = facilityEconomySpecs[id].role
  if (isHousingFacility(id)) return '扩大居住容量，给人口增长预留空间。'
  if (role === 'life' || role === 'ecology') return '补强生命维持，优先稳住水、氧气和生物质。'
  if (role === 'energy') return '提高能源供给，让后续工业扩张不被电力拖住。'
  if (role === 'extraction' || role === 'industry') return '强化材料链，尤其关注合金与基础建材。'
  if (role === 'research') return '投入研究能力，为建筑解锁和新生产方式铺路。'
  if (role === 'trade') return '利用星港贸易，把盈余换成当前短缺的关键材料。'
  if (role === 'ship') return '保留星舰工程材料，等核心供应稳定后推进终局。'
  return '维持核心设施升级，优先选择能改善瓶颈的方向。'
}
const directionForTechnology = (category?: string) => {
  if (category === 'construction') return '补齐建筑许可，把新设施与首级建设一起规划。'
  if (category === 'production-method') return '研究新的生产方式，再手动切换到更合适的配方。'
  if (category === 'trade') return '完善星港协议，让贸易成为合金和知识的缓冲器。'
  if (category === 'global') return '推进通用工程科技，提高整个王国的扩张效率。'
  return '选择一项能解除当前资源瓶颈的科技。'
}
const summarizeOptimizerDirections = (plan: AutomationPlan, population: PopulationProjection): string[] => {
  const ranked = [
    ...plan.actions.map(action => ({ score: action.score, text: directionForFacility(action.id) })),
    ...plan.technologyActions.map(action => ({ score: action.score, text: directionForTechnology(technologyCatalog[action.techId]?.category) })),
  ].sort((a, b) => b.score - a.score)
  const suggestions: string[] = []
  ranked.forEach(item => {
    if (suggestions.length >= 3 || suggestions.includes(item.text)) return
    suggestions.push(item.text)
  })
  if (suggestions.length < 3 && population.availableCapacity <= population.growthPotential * 60) suggestions.push('人口快接近住房上限，下一轮王月前考虑扩容。')
  if (suggestions.length < 3 && population.lifeSupportRatio < 1.15) suggestions.push('生命维持余量偏薄，先别让住房扩张跑在水氧之前。')
  if (suggestions.length < 3) suggestions.push('观察库存盈余，把长期过剩资源转化为建筑或研究进度。')
  return suggestions.slice(0, 3)
}
const completedTechnologyIds = (techs: string[]) =>
  Object.values(technologyCatalog).filter(tech => hasTech(techs, tech.id)).map(tech => tech.id)
const hasResearchPrerequisites = (techId: TechnologyId, techs: string[]) =>
  (technologyCatalog[techId].prerequisites ?? []).every(prerequisite => hasTech(techs, prerequisite))
const techLabel = (techId: TechnologyId) => technologyCatalog[techId]?.name ?? techId

function ResourceAtom({ resourceKey, value, net, detail, actionLabel, onAction, compact = false, signed = true, subValue }: { resourceKey: ResourceKey; value: number; net?: number; detail?: string; actionLabel?: string; onAction?: () => void; compact?: boolean; signed?: boolean; subValue?: string; subLabel?: string }) {
  const meta = resourceUiMeta[resourceKey]
  const ResourceIcon = meta.icon
  return <span className={`resource-atom tone-${meta.tone} ${compact ? 'compact' : ''}`}>
    <ResourceIcon className={meta.tone} size={compact ? 13 : 17} />
    <span className="resource-atom-content">
      <small className="resource-label">{meta.label}</small>
      <span className="resource-main-value">
        <strong className={value < 0 ? 'negative' : ''}>{value > 0 && compact && signed ? '+' : ''}{fmtCompactAmount(value)}</strong>
        {subValue !== undefined && <small className="resource-sub-value">{subValue}</small>}
      </span>
      {net !== undefined && <small className={`resource-net ${net < 0 ? 'negative' : ''}`}>{fmtSignedCompactAmount(net)}/日</small>}
      {detail && !compact && <small className="resource-detail">{detail}</small>}
    </span>
    {actionLabel && !compact && <button type="button" className="resource-inline-action" onClick={onAction}>{actionLabel}</button>}
  </span>
}

function ResourceBundle({ bundle, empty = '无', signed = true, boxedEmpty = false }: { bundle: Partial<Resources>; empty?: string; signed?: boolean; boxedEmpty?: boolean }) {
  const entries = resourceOrder.filter(key => bundle[key])
  if (!entries.length) return <span className={boxedEmpty ? 'resource-empty boxed' : 'resource-empty'}>{empty}</span>
  return <span className="resource-bundle">
    {entries.map(key => <ResourceAtom key={key} resourceKey={key} value={bundle[key] ?? 0} compact signed={signed} />)}
  </span>
}

function MetricPill({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'success' | 'danger' }) {
  return <span className={`metric-pill ${tone}`}><small>{label}</small><strong>{value}</strong></span>
}

function CostResourceList({ bundle, baseBundle, empty = '无' }: { bundle: Partial<Resources>; baseBundle?: Partial<Resources>; empty?: string }) {
  const entries = resourceOrder.filter(key => bundle[key])
  if (!entries.length) return <span className="resource-empty">{empty}</span>
  return <span className="cost-resource-list">
    {entries.map(key => {
      const value = bundle[key] ?? 0
      const baseValue = baseBundle?.[key] ?? value
      const delta = baseValue - value
      return <span key={key} className="cost-resource-item">
        <ResourceAtom resourceKey={key} value={value} compact signed={false} />
        {delta > 0 && <small>(-{fmtCompactAmount(delta)})</small>}
      </span>
    })}
  </span>
}

function ProgressLine({ value, label }: { value: number; label: string }) {
  return <div className="detail-progress-line"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /><small>{label}</small></div>
}

function ResourceSymbolStrip({ bundle, empty = '无' }: { bundle: Partial<Resources>; empty?: string }) {
  const entries = resourceOrder.filter(key => bundle[key])
  if (!entries.length) return <span className="symbol-empty">{empty}</span>
  return <span className="resource-symbol-strip">
    {entries.map(key => {
      const meta = resourceUiMeta[key]
      const ResourceIcon = meta.icon
      const value = bundle[key] ?? 0
      return <span key={key} className="resource-symbol-item" title={`${meta.label} ${fmtCompactAmount(value)}`}>
        <ResourceIcon className={meta.tone} size={13} />
        <small className={value < 0 ? 'negative' : ''}>{fmtCompactAmount(value)}</small>
      </span>
    })}
  </span>
}

function ProductionFlow({ input, output }: { input: Partial<Resources>; output: Partial<Resources> }) {
  return <div className="production-flow">
    <div><small>输入</small><ResourceBundle bundle={input} empty="无输入" /></div>
    <FlowArrowSvg />
    <div><small>输出</small><ResourceBundle bundle={output} empty="无输出" /></div>
  </div>
}

function FlowArrowSvg({ className = 'flow-arrow-svg', kind = 'arrow' }: { className?: string; kind?: 'arrow' | 'multiply' | 'equals' }) {
  if (kind === 'multiply') {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  }
  if (kind === 'equals') {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 9h14" />
      <path d="M5 15h14" />
    </svg>
  }
  return <svg className={className} viewBox="0 0 56 18" aria-hidden="true" focusable="false">
    <path d="M2 9h43" />
    <path d="M38 3l9 6-9 6" />
  </svg>
}

const throughputClass = (rate: number) => rate >= 1.1 ? 'surged' : rate >= 0.8 ? 'steady' : rate > 0 ? 'thin' : 'idle'
const orderLabel = (mode: FacilityOrderMode) => {
  if (mode === 'expand-continuous') return '持续增加'
  if (mode === 'expand') return '增加一级'
  if (mode === 'shrink-continuous') return '持续收缩'
  if (mode === 'shrink') return '降低一级'
  return '保持不变'
}
const orderIcon = (mode: FacilityOrderMode) => mode === 'expand' || mode === 'expand-continuous' ? <ArrowUpRight size={13} /> : mode === 'shrink' || mode === 'shrink-continuous' ? <ArrowDownRight size={13} /> : <Minus size={13} />
const loadStoredMusicVolume = () => {
  if (typeof window === 'undefined') return 0.42
  const stored = window.localStorage.getItem(musicVolumeKey)
  const parsed = stored === null ? 0.42 : Number(stored)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.42
}

function InfoToggle({ title, children, autoCloseMs = 7200 }: { title: string; children: ReactNode; autoCloseMs?: number }) {
  const [open, setOpen] = useState(false)
  const hostRef = useRef<HTMLSpanElement | null>(null)
  const closeTimer = useRef<number | null>(null)

  const clearCloseTimer = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimer.current = window.setTimeout(() => setOpen(false), autoCloseMs)
  }

  useEffect(() => {
    if (!open) {
      clearCloseTimer()
      return undefined
    }

    scheduleClose()
    const handlePointerDown = (event: PointerEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearCloseTimer()
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, autoCloseMs])

  return <span ref={hostRef} className={`info-toggle ${open ? 'open' : ''}`} onPointerDownCapture={() => open && scheduleClose()}>
    <button type="button" aria-label={title} aria-expanded={open} title={title} onClick={() => setOpen(previous => !previous)}><Info size={13} /></button>
    {open && <div role="tooltip">{children}</div>}
  </span>
}

function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [resources, setResources] = useState<Resources>(initialResources)
  const [regions, setRegions] = useState(regionTemplate)
  const [day, setDay] = useState(1)
  const [isRunning, setRunning] = useState(false)
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal')
  const [view, setView] = useState<AppView>('facilities')
  const [selected, setSelected] = useState<RegionId>('E1')
  const [planetDocked, setPlanetDocked] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [planetTexture, setPlanetTexture] = useState(() => planetTextures[Math.floor(Math.random() * planetTextures.length)])
  const [visitor, setVisitor] = useState<Encounter | null>(null)
  const [roster, setRoster] = useState<Role[]>([])
  const [assigned, setAssigned] = useState<Record<RegionId, string | undefined>>(Object.fromEntries(facilityOrder.map(id => [id, undefined])) as Record<RegionId, string | undefined>)
  const [chainProgress, setChainProgress] = useState<Record<string, number>>({})
  const [techs, setTechs] = useState<string[]>(defaultStartingTechs)
  const [activeResearch, setActiveResearch] = useState<TechnologyId>(researchableTechIds[0])
  const [researchProgress, setResearchProgress] = useState<Partial<Record<TechnologyId, number>>>({})
  const [productionMethods, setProductionMethods] = useState<Record<RegionId, ProductionMethodId>>(initialProductionMethods)
  const [staffingPriorities, setStaffingPriorities] = useState<Record<RegionId, StaffingPriority>>(initialStaffingPriorities)
  const [facilityOrders, setFacilityOrders] = useState<Record<RegionId, FacilityOrderMode>>(Object.fromEntries(facilityOrder.map(id => [id, 'hold'])) as Record<RegionId, FacilityOrderMode>)
  const [facilityOrderStarted, setFacilityOrderStarted] = useState<Record<RegionId, number>>(Object.fromEntries(facilityOrder.map(id => [id, 1])) as Record<RegionId, number>)
  const [construction, setConstruction] = useState<Record<RegionId, ConstructionProject | null>>(initialConstruction)
  const [populationPressureDays, setPopulationPressureDays] = useState(0)
  const [activeOptimizerId, setActiveOptimizerId] = useState<OptimizerId | 'none'>('none')
  const [autoTradeProtectionEnabled, setAutoTradeProtectionEnabled] = useState(true)
  const [autoTradeEnabled, setAutoTradeEnabled] = useState<Partial<Record<ResourceKey, boolean>>>({})
  const [tradeSourcedResources, setTradeSourcedResources] = useState<Partial<Record<ResourceKey, boolean>>>({})
  const [lastAutomatedAction, setLastAutomatedAction] = useState<{ id: RegionId; day: number; mode: FacilityOrderMode } | null>(null)
  const policy = 'ration' as const
  const [reignReportBaseline, setReignReportBaseline] = useState<ReignReportBaseline>({ day: 1, resources: initialResources, gdp: 0 })
  const [lastReignReport, setLastReignReport] = useState<ReignReport | null>(null)
  const [activeReignReport, setActiveReignReport] = useState<ReignReport | null>(null)
  const [log, setLog] = useState<string[]>(['御日 001：月面行宫已就位，御座号的第一根龙骨等待铸造。'])
  const [pendingMonthlyReport, setPendingMonthlyReport] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [musicVolume, setMusicVolume] = useState(loadStoredMusicVolume)
  const [saveStatus, setSaveStatus] = useState('本机单槽存档')

  const selectedRegion = regions.find(region => region.id === selected)!
  const selectedCost = projectFacilityCost(facilityEconomySpecs[selectedRegion.id], selectedRegion.level, techs)
  const palaceRegion = regions.find(region => region.id === 'K')!
  const palaceLevel = palaceRegion.level
  const habitatLevel = regions.find(region => region.id === 'M')?.level ?? 0
  const shipLevel = regions.find(region => region.id === 'D')!.level
  const completed = day >= gameCalendar.finalDay
  const staffing = useMemo(() => autoAllocateStaffing(regions, resources.population, staffingPriorities), [regions, resources.population, staffingPriorities])
  const allocatedPopulation = useMemo(() => facilityOrder.reduce((sum, id) => sum + (staffing[id] ?? 0), 0), [staffing])
  const freePopulation = Math.max(0, Math.floor(resources.population - allocatedPopulation))
  const activeResearchSpec = technologyCatalog[activeResearch]
  const researchThroughput = Math.max(1, Math.min(10, 1 + Math.floor((staffing.L ?? 0) * 0.5) + (hasTech(techs, 'TL-2') ? 1 : 0) + (hasTech(techs, 'TL-3') ? 2 : 0)))

  const facilityStates = useMemo<Record<RegionId, FacilityState>>(
    () => Object.fromEntries(regions.map(region => [
      region.id,
      { id: region.id, level: Math.min(getFacilityWorkCapacity(region.id, region.level), staffing[region.id] ?? 0) },
    ])) as Record<RegionId, FacilityState>,
    [regions, staffing],
  )
  const facilityLevels = useMemo(
    () => Object.fromEntries(regions.map(region => [region.id, region.level])) as Record<RegionId, number>,
    [regions],
  )
  const workerByFacility = useMemo(
    () => Object.fromEntries(regions.map(region => [region.id, roster.find(item => item.id === assigned[region.id])])) as Partial<Record<RegionId, Role>>,
    [regions, roster, assigned],
  )
  const facilityModifiers = useMemo(
    () => Object.fromEntries(facilityOrder.map(id => {
      const worker = workerByFacility[id]
      return [id, buildFacilityModifiers(habitatLevel, policy, worker?.specialty === id ? 1 + worker.boost : 1)]
    })) as Partial<Record<RegionId, ReturnType<typeof buildFacilityModifiers>>>,
    [workerByFacility, habitatLevel, policy],
  )
  const productionFlow = useMemo(() => projectDailyFlow({
    facilities: facilityStates,
    facilityLevels,
    modifiers: facilityModifiers,
    techs,
    productionMethods,
    globalBonus: policy === 'ration' ? { biomass: 1 } : {},
  }), [facilityStates, facilityLevels, facilityModifiers, techs, productionMethods, policy])
  const housingFacilityMap = useMemo(
    () => regions.reduce((map, region) => ({ ...map, [region.id]: { id: region.id, level: region.level } }), {} as Record<RegionId, FacilityState>),
    [regions],
  )
  const afterProductionResources = useMemo(() => settleDailyResources(resources, productionFlow.net), [resources, productionFlow])
  const preliminaryPopulationProjection = useMemo<PopulationProjection>(() => projectPopulationSystem({
    resources: afterProductionResources,
    facilities: housingFacilityMap,
    policy,
    techs,
    pressureDays: populationPressureDays,
  }), [afterProductionResources, housingFacilityMap, policy, techs, populationPressureDays])
  const autoTradeTargets = useMemo(() => ({
    water: preliminaryPopulationProjection.lifeSupportCost.water ?? 0,
    oxygen: preliminaryPopulationProjection.lifeSupportCost.oxygen ?? 0,
    biomass: preliminaryPopulationProjection.lifeSupportCost.biomass ?? 0,
    regolith: 0,
    alloy: 0,
    quantumCore: 0,
    luxury: 0,
  }), [preliminaryPopulationProjection])
  const autoTradePlan = useMemo(() => planAutoTradesForDeficits(
    afterProductionResources,
    autoTradeTargets,
    regions.map(region => ({ id: region.id, level: region.level })),
    techs,
    autoTradeEnabled,
    autoTradeProtectionEnabled,
  ), [afterProductionResources, autoTradeTargets, regions, techs, autoTradeEnabled, autoTradeProtectionEnabled])
  const currencyDebtInterest = useMemo(() => calculateCurrencyDebtInterest(autoTradePlan.resources), [autoTradePlan.resources])
  const populationBaseResources = useMemo(
    () => currencyDebtInterest > 0 ? apply(autoTradePlan.resources, { currency: -currencyDebtInterest }) : autoTradePlan.resources,
    [autoTradePlan.resources, currencyDebtInterest],
  )
  const populationProjection = useMemo<PopulationProjection>(() => projectPopulationSystem({
    resources: populationBaseResources,
    facilities: housingFacilityMap,
    policy,
    techs,
    pressureDays: populationPressureDays,
  }), [populationBaseResources, housingFacilityMap, policy, techs, populationPressureDays])
  const populationFlow = useMemo(() => flowFromPopulation(populationProjection), [populationProjection])
  const tradeFlow = useMemo(() => flowFromTrades(autoTradePlan.trades, currencyDebtInterest), [autoTradePlan.trades, currencyDebtInterest])
  const dailyProduction = useMemo(() => mergeResourceChanges(productionFlow.production, populationFlow.production, tradeFlow.production), [productionFlow, populationFlow, tradeFlow])
  const dailyConsumption = useMemo(() => mergeResourceChanges(productionFlow.consumption, populationFlow.consumption, tradeFlow.consumption), [productionFlow, populationFlow, tradeFlow])
  const dailyNet = useMemo(() => mergeResourceChanges(productionFlow.net, populationProjection.net, tradeFlow.net), [productionFlow, populationProjection, tradeFlow])
  const selfProducedSurplus = useMemo(() => {
    const rows: Partial<Record<ResourceKey, boolean>> = {}
    resourceOrder.forEach(key => {
      const produced = (productionFlow.production[key] ?? 0) + (populationFlow.production[key] ?? 0)
      const consumed = (productionFlow.consumption[key] ?? 0) + (populationFlow.consumption[key] ?? 0)
      rows[key] = produced > consumed && produced - consumed > 0.01
    })
    return rows
  }, [productionFlow, populationFlow])
  const gdp = useMemo(() => weightedValue(dailyProduction), [dailyProduction])
  const optimizerInput = useMemo(() => ({
    resources,
    facilities: regions.map(region => ({ id: region.id, level: region.level })),
    staffing,
    population: populationProjection,
    blockedFacilities: facilityOrder.filter(id => construction[id]),
    modifiers: facilityModifiers,
    globalBonus: policy === 'ration' ? { biomass: 1 } : {},
    reserveFloors: defaultReserveFloors,
    techs,
    productionMethods,
    year: day,
    capitalHorizonYears: 360,
  }), [resources, regions, staffing, populationProjection, construction, facilityModifiers, techs, productionMethods, policy, day])
  const automationPlan = useMemo<AutomationPlan>(() => (
    activeOptimizerId === 'none'
      ? createDisabledAutomationPlan(resources, regions.map(region => ({ id: region.id, level: region.level })))
      : gameOptimizers[activeOptimizerId].run(optimizerInput)
  ), [activeOptimizerId, resources, regions, optimizerInput])
  const shipProgress = Math.min(100, Math.round(shipLevel * 14 + (hasTech(techs, 'TD-1') ? 6 : 0) + Math.min(24, weightedShipReadiness(resources))))
  const score = Math.round(shipProgress * 8 + regions.reduce((sum, region) => sum + region.level * 12, 0) + roster.length * 25 + resources.knowledge * 2)
  const specialFacility = (id: RegionId): SpecialFacilityViewModel => {
    const region = regions.find(item => item.id === id)!
    const assignedPopulation = Math.min(getFacilityWorkCapacity(id, region.level), staffing[id] ?? 0)
    const modifier = facilityModifiers[id] ?? { outputMultiplier: 1, upkeepMultiplier: 1 }
    const selectedMethod = selectProductionMethod(facilityEconomySpecs[id].productionMethods, techs, productionMethods[id])
    return {
      region,
      assignedPopulation,
      net: isHousingFacility(id)
        ? populationProjection.facilityNet[id] ?? {}
        : projectFacilityNet(facilityEconomySpecs[id], assignedPopulation, modifier, techs, selectedMethod.id, region.level),
      modifier,
      throughput: getFacilityWorkCapacity(id, region.level) ? assignedPopulation / getFacilityWorkCapacity(id, region.level) * (modifier.outputMultiplier ?? 1) : 0,
      methodName: selectedMethod.name,
    }
  }
  const palaceFacility = specialFacility('K')

  useEffect(() => {
    window.localStorage.setItem(musicVolumeKey, String(musicVolume))
    const audio = audioRef.current
    if (!audio) return
    audio.volume = musicVolume
    if (!gameStarted || musicVolume <= 0) {
      audio.pause()
      return
    }
    audio.play().catch(() => {
      setSaveStatus('浏览器等待一次点击后再播放音乐')
    })
  }, [gameStarted, musicVolume])

  const writeLog = (line: string) => setLog(previous => [line, ...previous].slice(0, 5))

  const createReignReport = (
    reportDay: number,
    reportResources: Resources = resources,
    reportRegions: Region[] = regions,
    reportStaffing: Record<RegionId, number> = staffing,
    reportConstruction: Record<RegionId, ConstructionProject | null> = construction,
    reportPopulation: PopulationProjection = populationProjection,
    reportProduction: Resources = dailyProduction,
    reportConsumption: Resources = dailyConsumption,
    reportGdp: number = gdp,
    baseline: ReignReportBaseline = reignReportBaseline,
  ): ReignReport => {
    const reportPlan = gameOptimizers['crown-steward'].run({
      ...optimizerInput,
      resources: reportResources,
      facilities: reportRegions.map(region => ({ id: region.id, level: region.level })),
      staffing: reportStaffing,
      population: reportPopulation,
      blockedFacilities: facilityOrder.filter(id => reportConstruction[id]),
      year: reportDay,
    })
    const isOpening = reportDay <= 1
    return {
      id: `${reportDay}-${Math.round(reportGdp * 100)}`,
      startDay: isOpening ? 1 : baseline.day,
      endDay: reportDay,
      monthNumber: Math.max(1, Math.ceil(reportDay / gameCalendar.reignMonthDays)),
      populationStart: isOpening ? reportResources.population : baseline.resources.population,
      populationEnd: reportResources.population,
      populationDelta: isOpening ? 0 : reportResources.population - baseline.resources.population,
      housingCapacity: reportPopulation.capacity,
      gdp: reportGdp,
      gdpDelta: isOpening ? 0 : reportGdp - baseline.gdp,
      resourceRows: summarizeResourceRows(reportProduction, reportConsumption),
      suggestions: summarizeOptimizerDirections(reportPlan, reportPopulation),
    }
  }

  const publishReignReport = (report: ReignReport, reportResources: Resources, reportGdp: number) => {
    setLastReignReport(report)
    setActiveReignReport(report)
    setReignReportBaseline({ day: report.endDay, resources: reportResources, gdp: reportGdp })
    setRunning(false)
    writeLog(`${formatDay(report.endDay)}：第 ${report.monthNumber} 个${gameCalendar.monthName}报告已归档，日 GDP ${report.gdp.toFixed(1)}。`)
  }

  const currentSave = (): GameSaveState => ({
    version: 6,
    savedAt: new Date().toISOString(),
    gameStarted,
    resources,
    regionLevels: Object.fromEntries(regions.map(region => [region.id, region.level])) as Record<RegionId, number>,
    day,
    isRunning,
    speed,
    view,
    selected,
    planetDocked,
    detailOpen,
    planetTextureId: planetTexture.id,
    visitor,
    roster,
    assigned,
    chainProgress,
    techs,
    activeResearch,
    researchProgress,
    productionMethods,
    staffing,
    staffingPriorities,
    facilityOrders,
    facilityOrderStarted,
    construction,
    populationPressureDays,
    activeOptimizerId,
    autoTradeProtectionEnabled,
    autoTradeEnabled,
    tradeSourcedResources,
    lastAutomatedAction,
    policy,
    policyLastChangedDay: 1,
    policyReportStartedDay: 1,
    policyReportBaseline: initialResources,
    lastPolicyReport: null,
    reignReportBaseline,
    lastReignReport,
    activeReignReport,
    log,
    pendingMonthlyReport,
  })

  const applySave = (save: GameSaveState) => {
    setResources(save.resources)
    setRegions(regionTemplate.map(region => ({ ...region, level: save.regionLevels[region.id] ?? region.level })))
    setDay(save.day)
    setRunning(save.isRunning)
    setSpeed(save.speed)
    setView(save.view)
    setSelected(save.selected)
    setPlanetDocked(save.planetDocked)
    setDetailOpen(save.detailOpen)
    setPlanetTexture(planetTextures.find(texture => texture.id === save.planetTextureId) ?? planetTexture)
    setVisitor(save.visitor)
    setRoster(save.roster)
    setAssigned(save.assigned)
    setChainProgress(save.chainProgress)
    setTechs(save.techs)
    setActiveResearch(save.activeResearch)
    setResearchProgress(save.researchProgress)
    setProductionMethods(save.productionMethods)
    setStaffingPriorities(normalizeStaffingPriorities(save.staffingPriorities))
    setFacilityOrders(save.facilityOrders)
    setFacilityOrderStarted(save.facilityOrderStarted)
    setConstruction(save.construction)
    setPopulationPressureDays(save.populationPressureDays)
    setActiveOptimizerId(save.activeOptimizerId ?? 'none')
    setAutoTradeProtectionEnabled(save.autoTradeProtectionEnabled ?? true)
    setAutoTradeEnabled(save.autoTradeEnabled ?? {})
    setTradeSourcedResources(save.tradeSourcedResources ?? {})
    setLastAutomatedAction(save.lastAutomatedAction)
    setReignReportBaseline(save.reignReportBaseline)
    setLastReignReport(save.lastReignReport)
    setActiveReignReport(save.activeReignReport)
    setLog(save.log)
    setPendingMonthlyReport(save.pendingMonthlyReport)
    setGameStarted(true)
  }

  const saveGame = () => {
    const snapshot = currentSave()
    window.localStorage.setItem(saveKey, JSON.stringify(snapshot))
    setSaveStatus(`已存档：${formatDay(snapshot.day)}`)
  }

  const loadGame = () => {
    const rawSave = window.localStorage.getItem(saveKey)
    if (!rawSave) {
      setSaveStatus('没有可读取的本机存档')
      return
    }
    try {
      const parsed = JSON.parse(rawSave) as GameSaveState
      if ((parsed.version !== 4 && parsed.version !== 5 && parsed.version !== 6) || !parsed.resources || !parsed.regionLevels || !parsed.construction || !parsed.reignReportBaseline) throw new Error('invalid save')
      applySave(parsed)
      setSettingsOpen(false)
      setSaveStatus(`已读档：${formatDay(parsed.day)}`)
    } catch {
      setSaveStatus('存档格式无法读取')
    }
  }

  const exitGame = () => {
    setRunning(false)
    setSettingsOpen(false)
    setGameStarted(false)
    audioRef.current?.pause()
  }

  const chooseVisitor = () => {
    const available = getAvailableEventChains(chainProgress)
    if (available.length) {
      const chain = available[Math.floor(Math.random() * available.length)]
      setVisitor(buildEncounter(chain, chainProgress[chain.id] ?? 0))
    }
  }

  const advanceEncounter = (encounter: Encounter, completed = false) => {
    setChainProgress(previous => {
      const nextStep = completed ? encounter.chain.events.length : Math.min((previous[encounter.chain.id] ?? 0) + 1, encounter.chain.events.length)
      return { ...previous, [encounter.chain.id]: nextStep }
    })
    setVisitor(null)
  }

  const advanceDay = () => {
    if (completed) return
    const nextDay = day + 1
    const isReportDay = nextDay % gameCalendar.reignMonthDays === 0
    const afterDailyNet = settleDailyResources(resources, dailyNet)
    const completedProjects = Object.entries(construction).filter(([, project]) => project && project.completeDay <= nextDay) as [RegionId, ConstructionProject][]
    let finalResources = afterDailyNet
    const startedActions: typeof automationPlan.actions = []
    const completedTechnologyActions: typeof automationPlan.technologyActions = []

    if (activeResearchSpec && !hasTech(techs, activeResearch) && hasResearchPrerequisites(activeResearch, techs)) {
      const requiredKnowledge = activeResearchSpec.researchCost ?? 0
      const currentProgress = researchProgress[activeResearch] ?? 0
      const remainingKnowledge = Math.max(0, requiredKnowledge - currentProgress)
      const spentKnowledge = Math.min(finalResources.knowledge, researchThroughput, remainingKnowledge)
      if (spentKnowledge > 0 || requiredKnowledge === 0) {
        const nextProgress = Math.min(requiredKnowledge, currentProgress + spentKnowledge)
        finalResources = { ...finalResources, knowledge: finalResources.knowledge - spentKnowledge }
        setResearchProgress(previous => ({ ...previous, [activeResearch]: nextProgress }))
        if (nextProgress >= requiredKnowledge) {
          setTechs(previous => previous.some(item => item.includes(activeResearch)) ? previous : [...previous, `${activeResearch} ${activeResearchSpec.name}`])
          writeLog(`${formatDay(nextDay)}：问天研究实验室完成「${activeResearchSpec.name}」。`)
        }
      }
    }

    setResources(finalResources)
    setPopulationPressureDays(populationProjection.nextPressureDays)
    if (autoTradeProtectionEnabled && autoTradePlan.tradedResources.length) {
      setTradeSourcedResources(previous => {
        const next = { ...previous }
        autoTradePlan.tradedResources.forEach(key => { next[key] = true })
        return next
      })
      if (isReportDay) {
        writeLog(`${formatDay(nextDay)}：星海交易港自动补入 ${autoTradePlan.tradedResources.map(key => resourceMeta[key].label).join('、')}。`)
      }
    }

    if (completedProjects.length) {
      setRegions(previous => previous.map(region => {
        const project = completedProjects.find(([id]) => id === region.id)?.[1]
        return project?.mode === 'expand' ? { ...region, level: project.toLevel } : region
      }))
      setConstruction(previous => {
        const next = { ...previous }
        completedProjects.forEach(([id]) => { next[id] = null })
        return next
      })
      writeLog(`${formatDay(nextDay)}：${completedProjects.map(([id, project]) => `${regions.find(region => region.id === id)?.name ?? id}${project.mode === 'expand' ? '完工' : '拆除冷却结束'}`).join('、')}。`)
    }

    const completedProjectById = Object.fromEntries(completedProjects) as Partial<Record<RegionId, ConstructionProject>>
    const manualContinuousProjects: [RegionId, ConstructionProject][] = []
    const manualImmediateLevels: Partial<Record<RegionId, number>> = {}
    facilityOrder.forEach(id => {
      const mode = facilityOrders[id]
      if (mode !== 'expand-continuous' && mode !== 'shrink-continuous') return
      if (isFixedFacility(id)) return
      if (construction[id] && !completedProjectById[id]) return
      const region = regions.find(item => item.id === id)!
      const completedProject = completedProjectById[id]
      const currentLevel = completedProject?.mode === 'expand' ? completedProject.toLevel : region.level
      const spec = facilityEconomySpecs[id]
      if (mode === 'expand-continuous') {
        const cost = projectFacilityCost(spec, currentLevel, techs)
        if (!canBuildFacility(spec, nextDay, techs) || currentLevel >= spec.maxLevel || !canPay(finalResources, cost)) return
        finalResources = apply(finalResources, cost, -1)
        manualContinuousProjects.push([id, {
          mode: 'expand',
          startedDay: nextDay,
          completeDay: nextDay + getConstructionDays(techs),
          fromLevel: currentLevel,
          toLevel: currentLevel + 1,
          cost,
        }])
        return
      }
      if (currentLevel <= 0) return
      const refund = scaleResourceBundle(projectFacilityCost(spec, currentLevel - 1, techs), 0.5)
      finalResources = apply(finalResources, refund)
      manualImmediateLevels[id] = currentLevel - 1
      manualContinuousProjects.push([id, {
        mode: 'shrink',
        startedDay: nextDay,
        completeDay: nextDay + getConstructionDays(techs),
        fromLevel: currentLevel,
        toLevel: currentLevel - 1,
        cost: refund,
      }])
    })
    if (manualContinuousProjects.length) {
      setResources(finalResources)
      if (Object.keys(manualImmediateLevels).length) {
        setRegions(previous => previous.map(region => manualImmediateLevels[region.id] === undefined ? region : { ...region, level: manualImmediateLevels[region.id]! }))
      }
      setConstruction(previous => {
        const next = { ...previous }
        manualContinuousProjects.forEach(([id, project]) => { next[id] = project })
        return next
      })
      setFacilityOrderStarted(previous => {
        const next = { ...previous }
        manualContinuousProjects.forEach(([id]) => { next[id] = nextDay })
        return next
      })
      writeLog(`${formatDay(nextDay)}：持续命令继续执行 ${manualContinuousProjects.map(([id]) => regions.find(region => region.id === id)?.name ?? id).join('、')}。`)
    }

    if (activeOptimizerId !== 'none' && isReportDay) {
    const startedIds = new Set<RegionId>()
    automationPlan.technologyActions.forEach(action => {
      if (!canPay(finalResources, action.cost)) return
      finalResources = apply(finalResources, action.cost, -1)
      completedTechnologyActions.push(action)
    })
    automationPlan.actions.forEach(action => {
      if (startedIds.has(action.id) || construction[action.id]) return
      action.trades?.forEach(trade => {
        if (canPay(finalResources, trade.input)) {
          finalResources = apply(apply(finalResources, trade.input, -1), trade.output)
        }
      })
      if (!canPay(finalResources, action.cost)) return
      finalResources = apply(finalResources, action.cost, -1)
      startedActions.push(action)
      startedIds.add(action.id)
    })
    if (completedTechnologyActions.length || startedActions.length) {
      setResources(finalResources)
    }
    if (completedTechnologyActions.length) {
      setTechs(previous => {
        const next = [...previous]
        completedTechnologyActions.forEach(action => {
          if (!next.some(item => item.includes(action.techId))) next.push(`${action.techId} ${action.name}`)
        })
        return next
      })
    }
    if (startedActions.length) {
      setTechs(previous => {
        const next = [...previous]
        startedActions.flatMap(action => action.technologyUnlocks ?? []).forEach(techId => {
          if (!next.some(item => item.includes(techId))) next.push(`${techId} ${technologyCatalog[techId].name}`)
        })
        return next
      })
      setConstruction(previous => {
        const next = { ...previous }
        startedActions.forEach(action => {
          next[action.id] = {
            mode: 'expand',
            startedDay: nextDay,
            completeDay: nextDay + getConstructionDays(techs),
            fromLevel: action.fromLevel,
            toLevel: action.toLevel,
            cost: action.cost,
          }
        })
        return next
      })
      setFacilityOrders(previous => {
        const next = { ...previous }
        startedActions.forEach(action => { next[action.id] = 'expand' })
        return next
      })
      setFacilityOrderStarted(previous => {
        const next = { ...previous }
        startedActions.forEach(action => { next[action.id] = nextDay })
        return next
      })
      setLastAutomatedAction({ id: startedActions[0].id, day: nextDay, mode: 'expand' })
      const names = startedActions.map(action => regions.find(region => region.id === action.id)?.name ?? action.id).join('、')
      if (isReportDay) {
        setPendingMonthlyReport(`${formatDay(nextDay + 1)} 王月报告：内置优化署开工 ${names}，共 ${startedActions.length} 项，完工后进入新规模。`)
      }
    } else if (isReportDay) {
      setPendingMonthlyReport(`${formatDay(nextDay + 1)} 王月报告：内置优化署完成复核，当前无可执行扩建；维持既有施工队列。`)
    }
    }

    setDay(nextDay)
    if (isReportDay) {
      const report = createReignReport(nextDay, finalResources)
      publishReignReport(report, finalResources, report.gdp)
    }
    if (pendingMonthlyReport && nextDay % gameCalendar.reignMonthDays === 1) {
      writeLog(pendingMonthlyReport)
      setPendingMonthlyReport(null)
    }
    if (!isReportDay && !visitor && (nextDay % 80 === 0 || Math.random() < 0.025)) chooseVisitor()
    if (nextDay === gameCalendar.finalDay) writeLog(`${formatDay(gameCalendar.finalDay)}：千日试验到期。御座号的完成度将成为此局国祚。`)
  }

  useEffect(() => {
    if (!gameStarted || !isRunning || completed) return
    const timer = window.setInterval(advanceDay, speed === 'fast' ? gameCalendar.fastMsPerDay : gameCalendar.normalMsPerDay)
    return () => window.clearInterval(timer)
    // The interval intentionally observes current game state after each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, isRunning, completed, day, dailyNet, visitor, speed, pendingMonthlyReport, automationPlan, activeOptimizerId, construction, populationProjection])

  const selectFacility = (id: RegionId) => {
    setSelected(id)
    const specialView = specialFacilityViews[id]
    if (specialView) {
      setView(specialView)
      setPlanetDocked(true)
      setDetailOpen(false)
      return
    }
    setView('facilities')
    setPlanetDocked(true)
    setDetailOpen(true)
  }

  const upgrade = (id: RegionId, orderMode: Extract<FacilityOrderMode, 'expand' | 'expand-continuous'> = 'expand') => {
    const region = regions.find(item => item.id === id)!
    const spec = facilityEconomySpecs[id]
    const cost = projectFacilityCost(facilityEconomySpecs[id], region.level, techs)
    if (isFixedFacility(id)) {
      writeLog(`${formatDay(day)}：${region.name}是固定贸易节点，不需要扩建。`)
      return
    }
    if (!canBuildFacility(spec, day, techs) || region.level >= region.max) return
    if (construction[id]) {
      writeLog(`${formatDay(day)}：${region.name}仍在施工或拆除冷却中。`)
      return
    }
    if (!canPay(resources, cost)) {
      writeLog(`${formatDay(day)}：${region.name}的扩建诏令因库存不足被退回。`)
      return
    }
    setResources(previous => apply(previous, cost, -1))
    setConstruction(previous => ({
      ...previous,
      [id]: {
        mode: 'expand',
        startedDay: day,
        completeDay: day + getConstructionDays(techs),
        fromLevel: region.level,
        toLevel: region.level + 1,
        cost,
      },
    }))
    setFacilityOrders(previous => ({ ...previous, [id]: orderMode }))
    setFacilityOrderStarted(previous => ({ ...previous, [id]: day }))
    writeLog(`${formatDay(day)}：${region.name}开工扩建，预计 ${getConstructionDays(techs)} 御日后升为第 ${region.level + 1} 阶。${orderMode === 'expand-continuous' ? '持续增加命令已记录。' : ''}`)
  }

  const holdFacility = (id: RegionId) => {
    const region = regions.find(item => item.id === id)!
    setFacilityOrders(previous => ({ ...previous, [id]: 'hold' }))
    setFacilityOrderStarted(previous => ({ ...previous, [id]: day }))
    writeLog(`${formatDay(day)}：${region.name}维持现行规模，等待下个王月报告复核。`)
  }

  const shrinkFacility = (id: RegionId, orderMode: Extract<FacilityOrderMode, 'shrink' | 'shrink-continuous'> = 'shrink') => {
    const region = regions.find(item => item.id === id)!
    if (isFixedFacility(id)) {
      writeLog(`${formatDay(day)}：${region.name}是固定贸易节点，不能缩减规模。`)
      return
    }
    if (region.level <= 0) return
    if (construction[id]) {
      writeLog(`${formatDay(day)}：${region.name}仍在施工或拆除冷却中。`)
      return
    }
    setFacilityOrders(previous => ({ ...previous, [id]: orderMode }))
    setFacilityOrderStarted(previous => ({ ...previous, [id]: day }))
    const refund = scaleResourceBundle(projectFacilityCost(facilityEconomySpecs[id], region.level - 1, techs), 0.5)
    setRegions(previous => previous.map(item => item.id === id ? { ...item, level: Math.max(0, item.level - 1) } : item))
    setResources(previous => apply(previous, refund))
    setConstruction(previous => ({
      ...previous,
      [id]: {
        mode: 'shrink',
        startedDay: day,
        completeDay: day + getConstructionDays(techs),
        fromLevel: region.level,
        toLevel: Math.max(0, region.level - 1),
        cost: refund,
      },
    }))
    writeLog(`${formatDay(day)}：${region.name}缩小至第 ${Math.max(0, region.level - 1)} 阶，回收约 50% 建材并进入冷却。${orderMode === 'shrink-continuous' ? '持续收缩命令已记录。' : ''}`)
  }

  const setStaffPriority = (id: RegionId, priority: StaffingPriority) => {
    const region = regions.find(item => item.id === id)!
    if (isFixedFacility(id) || isHousingFacility(id)) {
      writeLog(`${formatDay(day)}：${region.name}不占用岗位，优先级不参与人口分配。`)
      return
    }
    setStaffingPriorities(previous => ({ ...previous, [id]: priority }))
    writeLog(`${formatDay(day)}：${region.name}岗位优先级调整为 ${priority}。`)
  }

  const acceptTrade = () => {
    if (!visitor || !canPay(resources, visitor.offer.take)) return
    if (visitor.offer.give.population && (populationProjection.availableCapacity < visitor.offer.give.population || populationProjection.lifeSupportRatio < 1)) {
      writeLog(`${formatDay(day)}：住房或生命维持不足，${visitor.event.title}暂缓接纳人口。`)
      return
    }
    setResources(previous => apply(apply(previous, visitor.offer.take, -1), visitor.offer.give))
    if (visitor.offer.tech) setTechs(previous => previous.includes(visitor.offer.tech!) ? previous : [...previous, visitor.offer.tech!])
    writeLog(`${formatDay(day)}：${visitor.event.title}落定，${visitor.name}${visitor.offer.tech ? `交出「${visitor.offer.tech}」` : '留下新的回声'}。`)
    advanceEncounter(visitor)
  }

  const employ = () => {
    if (!visitor) return
    if (!canPay(resources, visitor.retainerCost)) return
    setResources(previous => apply(previous, visitor.retainerCost, -1))
    setRoster(previous => previous.some(member => member.id === visitor.id) ? previous : [...previous, rolesById[visitor.id]])
    setAssigned(previous => ({ ...previous, [visitor.specialty]: visitor.id }))
    writeLog(`${formatDay(day)}：${visitor.name}宣誓效忠，入职${regions.find(region => region.id === visitor.specialty)?.name}。`)
    advanceEncounter(visitor, visitor.chain.arc === 'simple')
  }

  const dismiss = () => {
    if (visitor) writeLog(`${formatDay(day)}：${visitor.name}离开了月面，信标从本轮记录中熄灭。`)
    if (visitor) advanceEncounter(visitor, true)
  }

  const inspectFacility = (id: RegionId) => {
    setSelected(id)
    setView('facilities')
    setPlanetDocked(true)
    setDetailOpen(true)
  }

  const executeTrade = (name: string, input: Partial<Resources>, output: Partial<Resources>) => {
    if (!canExecuteStarportTrade(resources, input)) {
      writeLog(`${formatDay(day)}：${name}未能成交，库存不足。`)
      return
    }
    if (output.population && (populationProjection.availableCapacity < output.population || populationProjection.lifeSupportRatio < 1)) {
      writeLog(`${formatDay(day)}：${name}未能成交，住房或生命维持不足。`)
      return
    }
    setResources(previous => apply(apply(previous, input, -1), output))
    writeLog(`${formatDay(day)}：星海交易港完成「${name}」。`)
  }

  const startGame = () => {
    const openingBaseline = { day: 1, resources, gdp }
    const report = createReignReport(1, resources, regions, staffing, construction, populationProjection, dailyProduction, dailyConsumption, gdp, openingBaseline)
    setGameStarted(true)
    publishReignReport(report, resources, gdp)
  }

  if (!gameStarted) {
    return <StartGate planetTexture={planetTexture} onStart={startGame} />
  }

  return <main className="app-shell">
    <header className="site-header">
      <div className="brand-block">
        <div className="brand-seal"><Crown size={23} /></div>
        <div><p>月面主权局 · 1000御日试验</p><h1>月冠纪元</h1></div>
      </div>
      <button className="settings-button" onClick={() => setSettingsOpen(true)}><Settings size={16} />设置</button>
    </header>

    <audio ref={audioRef} src={musicSource} loop preload="auto" />

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
          onAction={canCancelAutoTrade ? () => setAutoTradeEnabled(previous => ({ ...previous, [key]: false })) : undefined}
        />
      })}
    </section>

    {activeReignReport && <ReignReportModal report={activeReignReport} onClose={() => setActiveReignReport(null)} />}

    {visitor && <div className="event-scrim" role="presentation"><section className="diplomatic-letter event-modal" aria-live="polite" aria-modal="true" role="dialog">
      <div className="visitor-portrait-slot" aria-label="访客肖像占位">
        <span>{visitor.glyph}</span>
        <small>portrait placeholder</small>
      </div>
      <div className="letter-copy">
        <div className="event-transmission-head">
          <span>深空来讯</span>
          <small>{visitor.species} · {visitor.chain.arc === 'long' ? `链 ${Math.min((chainProgress[visitor.chain.id] ?? 0) + 1, visitor.chain.events.length)}/${visitor.chain.events.length}` : '偶遇'}</small>
        </div>
        <strong>{visitor.event.title}</strong>
        <p className="letter-body">{visitor.event.body}</p>
        <p className="letter-portrait-text">{visitor.portrait}</p>
        {visitor.event.note && <p className="letter-note">{visitor.event.note}</p>}
        {visitor.event.concealed ? <div className="event-exchange concealed"><div><b>隐含风险</b><span className="resource-empty">从来函文字判断</span></div><div><b>留任</b><ResourceBundle bundle={visitor.retainerCost} /></div></div> : <div className="event-exchange">
          <div><b>索取</b><ResourceBundle bundle={visitor.offer.take} /></div>
          <div><b>回赠</b><ResourceBundle bundle={visitor.offer.give} /></div>
          <div><b>留任</b><ResourceBundle bundle={visitor.retainerCost} /></div>
        </div>}
      </div>
      <div className="letter-actions"><button onClick={dismiss}>礼送</button><button onClick={acceptTrade} disabled={!canPay(resources, visitor.offer.take) || Boolean(visitor.offer.give.population && (populationProjection.availableCapacity < visitor.offer.give.population || populationProjection.lifeSupportRatio < 1))}>{visitor.event.interaction === 'gift' ? '收下' : visitor.event.interaction === 'accident' ? '接入' : visitor.event.interaction === 'request' ? '准许' : '交换'}</button><button className="primary" onClick={employ} disabled={!canPay(resources, visitor.retainerCost)}>留任</button></div>
      <button className="letter-close" onClick={dismiss} aria-label="关闭来函"><X size={16} /></button>
    </section></div>}

    <section className="page-content">
      {view === 'facilities' && <PlanetFacilities regions={regions} selected={selected} year={day} techs={techs} productionMethods={productionMethods} facilityOrders={facilityOrders} facilityOrderStarted={facilityOrderStarted} construction={construction} populationProjection={populationProjection} staffing={staffing} staffingPriorities={staffingPriorities} allocatedPopulation={allocatedPopulation} freePopulation={freePopulation} facilityModifiers={facilityModifiers} lastAutomatedAction={lastAutomatedAction} roster={roster} assigned={assigned} selectedRegion={selectedRegion} selectedCost={selectedCost} resources={resources} dailyNet={dailyNet} automationPlan={automationPlan} planetTexture={planetTexture} docked={planetDocked} detailOpen={detailOpen} onDock={() => setPlanetDocked(true)} onBack={() => setDetailOpen(false)} onSelect={selectFacility} onUpgrade={upgrade} onHold={holdFacility} onShrink={shrinkFacility} onPriority={setStaffPriority} onMethod={(methodId) => setProductionMethods(previous => ({ ...previous, [selectedRegion.id]: methodId }))} onAssignment={visitorId => setAssigned(previous => ({ ...previous, [selectedRegion.id]: visitorId }))} />}
      {view === 'palace' && <Palace facility={palaceFacility} day={day} lastReignReport={lastReignReport} onOpenReport={(report) => setActiveReignReport(report)} />}
      {view === 'research' && <ResearchLab facility={specialFacility('L')} techs={techs} activeResearch={activeResearch} researchProgress={researchProgress} researchThroughput={researchThroughput} knowledgeStock={resources.knowledge} onResearch={setActiveResearch} onSelectFacility={() => inspectFacility('L')} />}
      {view === 'ecology' && <EcologyRing facility={specialFacility('R')} onSelectFacility={() => inspectFacility('R')} />}
      {view === 'starport' && <Starport facility={specialFacility('S')} resources={resources} populationProjection={populationProjection} techs={techs} autoTradeProtectionEnabled={autoTradeProtectionEnabled} autoTradeEnabled={autoTradeEnabled} onProtection={setAutoTradeProtectionEnabled} onTrade={executeTrade} onAutoTrade={(key, enabled) => setAutoTradeEnabled(previous => ({ ...previous, [key]: enabled }))} onSelectFacility={() => inspectFacility('S')} />}
      {view === 'ship' && <Shipyard facility={specialFacility('D')} shipProgress={shipProgress} score={score} onSelectFacility={() => inspectFacility('D')} />}
      {view === 'visitors' && <Visitors roster={roster} assigned={assigned} regions={regions} visitor={visitor} onSelect={selectFacility} onAssignment={(regionId, visitorId) => setAssigned(previous => ({ ...previous, [regionId]: visitorId }))} />}
    </section>

    {settingsOpen && <SettingsPanel volume={musicVolume} saveStatus={saveStatus} autoTradeProtectionEnabled={autoTradeProtectionEnabled} onAutoTradeProtection={setAutoTradeProtectionEnabled} onVolume={setMusicVolume} onContinue={() => setSettingsOpen(false)} onSave={saveGame} onLoad={loadGame} onExit={exitGame} />}

    <footer className="command-deck bottom-tabs">
      <div className="footer-row footer-row-left">
        <div className="scoreline gdp-line"><span>GDP</span><strong>{gdp.toFixed(1)}</strong><small>星海货币/日</small></div>
        <div className="scoreline"><span>国祚评分</span><strong>{score}</strong><small>星舰进度权重最高</small></div>
      </div>
      <nav className="tab-nav" aria-label="底部系统菜单">{navItems.map(item => { const NavIcon = item.icon; return <button key={item.id} className={view === item.id ? 'active' : ''} style={{ '--tab-color': item.color } as React.CSSProperties} onClick={() => setView(item.id)}><NavIcon size={16} />{item.label}</button> })}</nav>
      <div className="footer-row footer-row-right">
        <div className="time-dock" aria-label="时间控制">
          <div className="day-counter"><span>{gameCalendar.dayName}</span><div><strong>{String(Math.min(day, gameCalendar.finalDay)).padStart(3, '0')}</strong><small>/ {gameCalendar.finalDay}</small></div></div>
          <button className="time-control-btn" onClick={() => setSpeed(speed === 'normal' ? 'fast' : 'normal')} aria-label="切换时间速度"><Gauge size={15} /><span>{speed === 'normal' ? '正常' : '加速'}</span></button>
          <button className="time-control-btn" onClick={() => setRunning(!isRunning)} aria-label={isRunning ? '暂停日历' : '恢复日历'} disabled={completed}>{isRunning ? <Pause size={15} /> : <Play size={15} />}<span>{isRunning ? '暂停' : '恢复'}</span></button>
        </div>
      </div>
    </footer>
  </main>
}

function StartGate({ planetTexture, onStart }: { planetTexture: typeof planetTextures[number]; onStart: () => void }) {
  return <main className="start-gate">
    <section className="start-orbit" aria-label="殖民星球预览">
      <PlanetScene texture={planetTexture} onActivate={onStart} />
    </section>
    <section className="start-console" aria-label="开始游戏">
      <div className="brand-seal"><Crown size={25} /></div>
      <span className="eyebrow">月面主权局 · 1000御日试验</span>
      <h1>月冠纪元</h1>
      <p>在第一个御日签发殖民诏令。资源会自动结算，设施、科技、贸易、王月报告与星舰共同决定国祚。</p>
      <div className="start-facts">
        <span><Orbit size={14} />{planetTexture.name}</span>
        <span><Rocket size={14} />终局星舰</span>
        <span><Landmark size={14} />政务舱</span>
      </div>
      <button className="primary-action" onClick={onStart}><Play size={16} />开始执政</button>
    </section>
  </main>
}

function ReignReportModal({ report, onClose }: { report: ReignReport; onClose: () => void }) {
  const rows = resourceOrder.filter(key => report.resourceRows[key])
  const positiveGdp = report.gdpDelta > 0
  const populationDelta = report.populationDelta >= 0 ? `+${fmtAmount(report.populationDelta)}` : fmtAmount(report.populationDelta)
  const gdpDelta = report.gdpDelta === 0 ? '0.0' : `${positiveGdp ? '+' : ''}${report.gdpDelta.toFixed(1)}`

  return <div className="reign-report-scrim" role="presentation">
    <section className="reign-report-modal" role="dialog" aria-modal="true" aria-label="王月报告">
      <header>
        <div>
          <span className="eyebrow">{gameCalendar.monthName} {report.monthNumber} · {formatDay(report.startDay)} 至 {formatDay(report.endDay)}</span>
          <h2>王月报告</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="关闭王月报告"><X size={16} /></button>
      </header>

      <div className="reign-report-kpis">
        <div><span>人口变化</span><strong>{populationDelta}</strong><small>{fmt(report.populationEnd)}/{fmtAmount(report.housingCapacity)} 人</small></div>
        <div><span>GDP</span><strong>{report.gdp.toFixed(1)}</strong><small className={report.gdpDelta < 0 ? 'negative' : ''}>{gdpDelta} 星海货币/日</small></div>
        <div><span>阶段长度</span><strong>{report.endDay - report.startDay + 1}</strong><small>御日，50 御日为一王月</small></div>
      </div>

      <div className="reign-report-grid">
        <section>
          <h3>每日产消</h3>
          <div className="reign-resource-table">
            {rows.map(key => {
              const row = report.resourceRows[key]!
              return <div key={key}>
                <span>{resourceMeta[key].label}</span>
                <b>{row.produced ? fmtAmount(row.produced) : '0'}</b>
                <b>{row.consumed ? fmtAmount(row.consumed) : '0'}</b>
                <b className={row.net < 0 ? 'negative' : ''}>{row.net > 0 ? '+' : ''}{fmtAmount(row.net)}</b>
              </div>
            })}
          </div>
        </section>

        <section>
          <h3>下个王月方向</h3>
          <ol className="reign-suggestion-list">
            {report.suggestions.map(item => <li key={item}>{item}</li>)}
          </ol>
        </section>
      </div>

      <footer>
        <button className="primary-action" onClick={onClose}><Play size={15} />回到手动决策</button>
      </footer>
    </section>
  </div>
}

function SettingsPanel({ volume, saveStatus, autoTradeProtectionEnabled, onAutoTradeProtection, onVolume, onContinue, onSave, onLoad, onExit }: { volume: number; saveStatus: string; autoTradeProtectionEnabled: boolean; onAutoTradeProtection: (enabled: boolean) => void; onVolume: (volume: number) => void; onContinue: () => void; onSave: () => void; onLoad: () => void; onExit: () => void }) {
  return <div className="settings-scrim" role="presentation" onPointerDown={onContinue}>
    <aside className="settings-panel" role="dialog" aria-modal="true" aria-label="游戏设置" onPointerDown={event => event.stopPropagation()}>
      <header>
        <div><span className="eyebrow">系统</span><h2>设置</h2></div>
        <button className="icon-button" onClick={onContinue} aria-label="关闭设置"><X size={16} /></button>
      </header>

      <section className="settings-section">
        <div className="settings-section-title"><Volume2 size={16} /><span>音乐</span><strong>{Math.round(volume * 100)}%</strong></div>
        <input type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={event => onVolume(Number(event.target.value) / 100)} aria-label="游戏音乐音量" />
      </section>

      <section className="settings-section">
        <label className="settings-toggle">
          <span><ArrowLeftRight size={16} />自动购入保护</span>
          <input type="checkbox" checked={autoTradeProtectionEnabled} onChange={event => onAutoTradeProtection(event.target.checked)} />
          <i aria-hidden="true" />
        </label>
        <small>{autoTradeProtectionEnabled ? '赤字时允许星海交易港限量信用采购。' : '已关闭赤字兜底，库存短缺将交给玩家或优化器处理。'}</small>
      </section>

      <section className="settings-section">
        <div className="settings-section-title"><Save size={16} /><span>存档读档</span></div>
        <div className="settings-actions">
          <button onClick={onSave}><Save size={15} />存档</button>
          <button onClick={onLoad}><FolderOpen size={15} />读档</button>
        </div>
        <small>{saveStatus}</small>
      </section>

      <section className="settings-actions settings-main-actions">
        <button className="primary-action" onClick={onContinue}><Play size={15} />继续游戏</button>
        <button onClick={onExit}><LogOut size={15} />退出游戏</button>
      </section>
    </aside>
  </div>
}

function PlanetFacilities({ regions, selected, year, techs, productionMethods, facilityOrders, facilityOrderStarted, construction, populationProjection, staffing, staffingPriorities, allocatedPopulation, freePopulation, facilityModifiers, lastAutomatedAction, roster, assigned, selectedRegion, selectedCost, resources, dailyNet, automationPlan, planetTexture, docked, detailOpen, onDock, onBack, onSelect, onUpgrade, onHold, onShrink, onPriority, onMethod, onAssignment }: { regions: Region[]; selected: RegionId; year: number; techs: string[]; productionMethods: Record<RegionId, ProductionMethodId>; facilityOrders: Record<RegionId, FacilityOrderMode>; facilityOrderStarted: Record<RegionId, number>; construction: Record<RegionId, ConstructionProject | null>; populationProjection: PopulationProjection; staffing: Record<RegionId, number>; staffingPriorities: Record<RegionId, StaffingPriority>; allocatedPopulation: number; freePopulation: number; facilityModifiers: Partial<Record<RegionId, ReturnType<typeof buildFacilityModifiers>>>; lastAutomatedAction: { id: RegionId; day: number; mode: FacilityOrderMode } | null; roster: Role[]; assigned: Record<RegionId, string | undefined>; selectedRegion: Region; selectedCost: Partial<Resources>; resources: Resources; dailyNet: Partial<Resources>; automationPlan: AutomationPlan; planetTexture: typeof planetTextures[number]; docked: boolean; detailOpen: boolean; onDock: () => void; onBack: () => void; onSelect: (id: RegionId) => void; onUpgrade: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'expand' | 'expand-continuous'>) => void; onHold: (id: RegionId) => void; onShrink: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'shrink' | 'shrink-continuous'>) => void; onPriority: (id: RegionId, priority: StaffingPriority) => void; onMethod: (methodId: ProductionMethodId) => void; onAssignment: (visitorId: string | undefined) => void }) {
  if (!docked) {
    return <div className="planet-home">
      <div className="planet-stage">
        <PlanetScene texture={planetTexture} onActivate={onDock} />
        <div className="planet-title"><span className="eyebrow">殖民星球 · {planetTexture.name}</span><h2>静海王国</h2><p>{formatDay(year)} · 已启动 {regions.filter(region => region.level > 0).length}/{regions.length} 座设施</p><button onClick={onDock}>展开设施名录 <ChevronRight size={16} /></button></div>
      </div>
    </div>
  }

  return <div className={detailOpen ? 'planet-workbench detail-mode' : 'planet-workbench'}>
    {!detailOpen && <section className="planet-dock">
      <div className="docked-orbit"><PlanetScene texture={planetTexture} compact onActivate={() => onBack()} /></div>
      <div className="planet-dock-copy"><span className="eyebrow">殖民星球</span><h2>{planetTexture.name}</h2><p>{formatDay(year)}，国祚仍在设施、报告与星舰之间被重新分配。</p></div>
      <aside className="king-profile">
        <div className="king-portrait-slot"><img src={charChenlin} alt="陈林 · 月面王" /></div>
        <div><span className="eyebrow">玩家国王</span><h3>月冠执政者</h3><p>陈林，拓殖署基层公务员，被强行推上龙椅。真实目标是密造御座号归乡，而非追求繁荣。</p></div>
      </aside>
    </section>}
    {detailOpen ? <FacilityDetailPanel selected={selected} year={year} techs={techs} productionMethods={productionMethods} facilityOrders={facilityOrders} facilityOrderStarted={facilityOrderStarted} construction={construction} populationProjection={populationProjection} staffing={staffing} staffingPriorities={staffingPriorities} allocatedPopulation={allocatedPopulation} freePopulation={freePopulation} facilityModifiers={facilityModifiers} lastAutomatedAction={lastAutomatedAction} roster={roster} assigned={assigned} selectedRegion={selectedRegion} selectedCost={selectedCost} resources={resources} dailyNet={dailyNet} automationPlan={automationPlan} regions={regions} onBack={onBack} onUpgrade={onUpgrade} onHold={onHold} onShrink={onShrink} onPriority={onPriority} onMethod={onMethod} onAssignment={onAssignment} /> : <FacilityList regions={regions} selected={selected} year={year} techs={techs} productionMethods={productionMethods} facilityOrders={facilityOrders} construction={construction} staffing={staffing} facilityModifiers={facilityModifiers} assigned={assigned} roster={roster} residentsByFacility={populationProjection.residentsByFacility} onSelect={onSelect} onUpgrade={onUpgrade} />}
  </div>
}

function FacilityList({ regions, selected, year, techs, productionMethods, facilityOrders, construction, staffing, facilityModifiers, assigned, roster, residentsByFacility, onSelect, onUpgrade }: { regions: Region[]; selected: RegionId; year: number; techs: string[]; productionMethods: Record<RegionId, ProductionMethodId>; facilityOrders: Record<RegionId, FacilityOrderMode>; construction: Record<RegionId, ConstructionProject | null>; staffing: Record<RegionId, number>; facilityModifiers: Partial<Record<RegionId, ReturnType<typeof buildFacilityModifiers>>>; assigned: Record<RegionId, string | undefined>; roster: Role[]; residentsByFacility: Partial<Record<RegionId, number>>; onSelect: (id: RegionId) => void; onUpgrade: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'expand' | 'expand-continuous'>) => void }) {
  return <section className="facility-ledger">
    <div className="section-heading"><div><span className="eyebrow">主要设施</span><h2>建筑名录</h2></div><p>D/R/S/K/L 进入专属系统页。</p></div>
    <div className="facility-era-list">{facilityEraSections.map(section => {
      const sectionRegions = regions.filter(region => facilityEra[region.id] === section.id)
      return <section key={section.id} className="facility-era-section">
        <header><span>{section.label}</span><small>{section.note}</small></header>
        <div className="facility-ledger-list">{sectionRegions.map(region => {
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
            ? {}
            : projectFacilityNet(spec, assignedPop, modifier, techs, method.id, region.level)
          const order = facilityOrders[region.id] ?? 'hold'
          const canQuickUpgrade = !fixed && !isHousingFacility(region.id) && !construction[region.id] && order === 'hold' && region.level < region.max && canBuildFacility(spec, year, techs)
          const populationText = fixed ? '固定' : housingCapacity ? `${residentsByFacility[region.id] ?? 0}/${housingCapacity}` : capacity ? `${assignedPop}/${capacity}` : '未建'
          const throughputText = fixed ? '在线' : region.level === 0 ? '未建' : `${Math.round(throughput * 100)}%`
          return <div key={region.id} className={`ledger-card ${selected === region.id ? 'selected' : ''} ${special ? 'special' : ''} throughput-${throughputClass(throughput)}`}>
            <div className="ledger-block ledger-identity">
              <div className="ledger-icon-square"><RegionIcon size={28} /></div>
              <b>{region.name}</b>
              {worker && <i title={`${worker.name} 执勤`}>{worker.glyph}</i>}
            </div>
            <div className="ledger-block ledger-flow-block">
              <div className="ledger-flow"><ResourceSymbolStrip bundle={actualNet} empty="-" /></div>
              <div className="ledger-method-row"><span className="ledger-method-tag">生产方式</span><span className="ledger-method-name">{method.name}</span></div>
            </div>
            <div className="ledger-block ledger-action-block">
              <div className="ledger-stat-row"><span className="ledger-stat-label">岗位占比</span><span className="ledger-stat-value"><em>{populationText}</em></span></div>
              <button className="ledger-quick-upgrade" type="button" disabled={!canQuickUpgrade} onClick={event => { event.stopPropagation(); onUpgrade(region.id, 'expand') }}>
                <ArrowUpRight size={14} />单次升级
              </button>
              <button className="ledger-detail" type="button" onClick={event => { event.stopPropagation(); onSelect(region.id) }}>
                <Info size={14} />建筑详情
              </button>
            </div>
          </div>
        })}</div>
      </section>
    })}</div>
  </section>
}

function FacilityDetailPanel({ selected, year, techs, productionMethods, facilityOrders, facilityOrderStarted, construction, populationProjection, staffing, staffingPriorities, allocatedPopulation, freePopulation, facilityModifiers, lastAutomatedAction, roster, assigned, selectedRegion, selectedCost, resources, dailyNet, automationPlan, regions, onBack, onUpgrade, onHold, onShrink, onPriority, onMethod, onAssignment }: { selected: RegionId; year: number; techs: string[]; productionMethods: Record<RegionId, ProductionMethodId>; facilityOrders: Record<RegionId, FacilityOrderMode>; facilityOrderStarted: Record<RegionId, number>; construction: Record<RegionId, ConstructionProject | null>; populationProjection: PopulationProjection; staffing: Record<RegionId, number>; staffingPriorities: Record<RegionId, StaffingPriority>; allocatedPopulation: number; freePopulation: number; facilityModifiers: Partial<Record<RegionId, ReturnType<typeof buildFacilityModifiers>>>; lastAutomatedAction: { id: RegionId; day: number; mode: FacilityOrderMode } | null; roster: Role[]; assigned: Record<RegionId, string | undefined>; selectedRegion: Region; selectedCost: Partial<Resources>; resources: Resources; dailyNet: Partial<Resources>; automationPlan: AutomationPlan; regions: Region[]; onBack: () => void; onUpgrade: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'expand' | 'expand-continuous'>) => void; onHold: (id: RegionId) => void; onShrink: (id: RegionId, orderMode?: Extract<FacilityOrderMode, 'shrink' | 'shrink-continuous'>) => void; onPriority: (id: RegionId, priority: StaffingPriority) => void; onMethod: (methodId: ProductionMethodId) => void; onAssignment: (visitorId: string | undefined) => void }) {
  const selectedWorker = roster.find(item => item.id === assigned[selectedRegion.id])
  const SelectIcon = selectedRegion.icon
  const selectedSpec = facilityEconomySpecs[selectedRegion.id]
  const selectedFixed = isFixedFacility(selectedRegion.id)
  const selectedMethod = selectProductionMethod(selectedSpec.productionMethods, techs, productionMethods[selectedRegion.id])
  const workCapacity = getFacilityWorkCapacity(selectedRegion.id, selectedRegion.level)
  const housingCapacity = getHousingCapacity(selectedRegion.id, selectedRegion.level)
  const activeConstruction = construction[selectedRegion.id]
  const constructionRemaining = activeConstruction ? Math.max(0, activeConstruction.completeDay - year) : 0
  const assignedPopulation = Math.min(workCapacity, staffing[selectedRegion.id] ?? 0)
  const staffRate = workCapacity > 0 ? assignedPopulation / workCapacity : housingCapacity > 0 || selectedFixed ? 1 : 0
  const selectedModifier = facilityModifiers[selectedRegion.id] ?? { outputMultiplier: 1, upkeepMultiplier: 1 }
  const selectedFlow = projectFacilityFlow(selectedSpec, assignedPopulation, selectedModifier, techs, selectedMethod.id, selectedRegion.level)
  const selectedNet = isHousingFacility(selectedRegion.id) ? populationProjection.facilityNet[selectedRegion.id] ?? {} : selectedFlow.net
  const selectedBuildable = canBuildFacility(selectedSpec, year, techs)
  const selectedRequiredTech = selectedSpec.requiredTech ? technologyCatalog[selectedSpec.requiredTech] : undefined
  const currentOrder = facilityOrders[selectedRegion.id] ?? 'hold'
  const throughput = staffRate * (selectedModifier.outputMultiplier ?? 1)
  const isSpecialDetail = Boolean(specialFacilityViews[selectedRegion.id])
  const affordExpansion = canPay(resources, selectedCost)
  const hasNegativeYield = resourceOrder.some(key => (selectedNet[key] ?? 0) < 0)
  const needsStaff = !selectedFixed && workCapacity > assignedPopulation
  const statusTone = !selectedBuildable || selectedRegion.level === 0 || (!selectedFixed && !isHousingFacility(selectedRegion.id) && throughput <= 0) ? 'attention' : activeConstruction || needsStaff || (!selectedFixed && !isHousingFacility(selectedRegion.id) && throughput < 0.8) ? 'watch' : 'steady'
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
      : needsStaff
        ? '岗位未满'
        : throughput >= 1
          ? '运转充分'
          : throughput > 0
            ? '低负荷运行'
            : '停摆'
  const staffText = selectedFixed ? '固定' : isHousingFacility(selectedRegion.id) ? `容量 ${housingCapacity}` : `${assignedPopulation}/${workCapacity}`
  const throughputText = selectedFixed ? '在线' : isHousingFacility(selectedRegion.id) ? '容量' : `${Math.round(throughput * 100)}%`
  const detailSuggestions = summarizeOptimizerDirections(automationPlan, populationProjection)
  const selectedMethodReady = hasTech(techs, selectedMethod.unlockedBy) && selectedMethod.autoSelect !== false
  const selectedMethodTech = selectedMethod.unlockedBy ? technologyCatalog[selectedMethod.unlockedBy] : undefined
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
      : selectedRegion.level <= 0
        ? '已最低'
        : ''
  const expandDisabled = Boolean(expandDisabledReason)
  const shrinkDisabled = Boolean(shrinkDisabledReason)
  const withDisabledReason = (label: string, reason: string) => reason ? `${label}（${reason}）` : label

  return <aside className={`inspector facility-detail-v2 ${isSpecialDetail ? 'special-detail' : 'standard-detail'}`}>
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
        <SelectIcon size={88} />
      </div>
      <section className="detail-advice-strip">
        <div><span className="eyebrow">王月方向</span><h3>相关操作建议</h3></div>
        <ol>{detailSuggestions.map(item => <li key={item}>{item}</li>)}</ol>
      </section>
    </div>

    <section className="method-ledger">
      <div className="method-ledger-head">
        <div className="method-book-tabs" role="tablist" aria-label="切换生产方式">
          {selectedSpec.productionMethods.map(method => {
            const ready = availableMethodIds.includes(method.id)
            const techName = method.unlockedBy ? technologyCatalog[method.unlockedBy]?.name : undefined
            return <button
              key={method.id}
              type="button"
              role="tab"
              aria-selected={method.id === selectedMethod.id}
              className={method.id === selectedMethod.id ? 'active' : ''}
              disabled={!ready}
              title={ready ? method.name : `需要 ${techName ?? '科技'}`}
              onClick={() => onMethod(method.id)}
            >{method.name}</button>
          })}
        </div>
      </div>
      <article className="method-equation">
        <div className="method-stage">
          <span className="method-column-label">图谱</span>
          <div className="method-image-panel" aria-label={selectedMethodTech?.name ?? (selectedMethodReady ? '基础配方' : '待解锁科技')}>
            <FlaskConical size={40} />
          </div>
        </div>
        <div className="method-stage">
          <span className="method-column-label">配方</span>
          <div className="method-formula"><div className="recipe-flow"><ResourceBundle bundle={selectedMethod.input} empty="无输入" signed={false} boxedEmpty /><FlowArrowSvg /><ResourceBundle bundle={selectedMethod.output} empty="无产出" signed={false} boxedEmpty /></div></div>
        </div>
        <FlowArrowSvg className="equation-operator multiply" kind="multiply" />
        <div className="method-stage">
          <span className="method-column-label">在岗人数</span>
          <div className="method-staff"><b>{staffText}</b></div>
        </div>
        <FlowArrowSvg className="equation-operator multiply" kind="multiply" />
        <div className="method-stage">
          <span className="method-column-label">吞吐率</span>
          <div className="method-throughput"><b>{throughputText}</b></div>
        </div>
        <FlowArrowSvg className="equation-operator equals" kind="equals" />
        <div className="method-stage">
          <span className="method-column-label">净产出</span>
          <div className="method-output"><ResourceBundle bundle={selectedNet} empty="无净产出" /></div>
        </div>
      </article>
    </section>

    <div className="detail-operations-row">
      <section className="construction-control-grid">
        <article className="construction-card expand">
          <h3>扩建</h3>
          <div className="construction-resources"><span>扩建成本</span><CostResourceList bundle={selectedCost} baseBundle={baseExpansionCost} empty="无需成本" /><MetricPill label="周期" value={`${constructionDays}御日`} /></div>
          <div className="construction-actions">
            <button className={currentOrder === 'expand' ? 'selected' : ''} onClick={() => onUpgrade(selectedRegion.id, 'expand')} disabled={expandDisabled}><ArrowUpRight size={15} />{withDisabledReason('立即扩建', expandDisabledReason)}</button>
            <button className={currentOrder === 'expand-continuous' ? 'selected' : ''} onClick={() => onUpgrade(selectedRegion.id, 'expand-continuous')} disabled={expandDisabled}><ArrowUpRight size={15} />{withDisabledReason('持续扩建', expandDisabledReason)}</button>
          </div>
          <ProgressLine value={expandProgress} label={activeConstruction?.mode === 'expand' ? `扩建 ${expandProgress}%` : currentOrder === 'expand-continuous' ? '持续扩建已记录' : '等待扩建命令'} />
        </article>
        <article className="construction-card shrink">
          <h3>缩减</h3>
          <div className="construction-resources"><span>回收资源</span><CostResourceList bundle={shrinkRefund} baseBundle={baseShrinkRefund} empty="无可回收" /><MetricPill label="周期" value={`${constructionDays}御日`} /></div>
          <div className="construction-actions">
            <button className={currentOrder === 'shrink' ? 'selected' : ''} onClick={() => onShrink(selectedRegion.id, 'shrink')} disabled={shrinkDisabled}><ArrowDownRight size={15} />{withDisabledReason('立即缩减', shrinkDisabledReason)}</button>
            <button className={currentOrder === 'shrink-continuous' ? 'selected' : ''} onClick={() => onShrink(selectedRegion.id, 'shrink-continuous')} disabled={shrinkDisabled}><ArrowDownRight size={15} />{withDisabledReason('持续缩减', shrinkDisabledReason)}</button>
          </div>
          <ProgressLine value={shrinkProgress} label={activeConstruction?.mode === 'shrink' ? `缩减 ${shrinkProgress}%` : currentOrder === 'shrink-continuous' ? '持续缩减已记录' : '等待缩减命令'} />
        </article>
      </section>
    </div>
  </aside>
}

function SpecialFacilityPanel({ facility, tone, children }: { facility: SpecialFacilityViewModel; tone: string; children?: ReactNode; onSelectFacility?: () => void }) {
  const FacilityIcon = facility.region.icon
  const workCapacity = getFacilityWorkCapacity(facility.region.id, facility.region.level)
  const housingCapacity = getHousingCapacity(facility.region.id, facility.region.level)
  const fixed = isFixedFacility(facility.region.id)
  const staffingPercent = fixed ? 100 : workCapacity ? Math.round(facility.assignedPopulation / workCapacity * 100) : housingCapacity ? 100 : 0
  const throughputPercent = Math.round(facility.throughput * 100)
  const statusLabel = facility.region.level <= 0 ? '尚未建造' : fixed ? '固定在线' : isHousingFacility(facility.region.id) ? '容量在线' : facility.assignedPopulation < workCapacity ? '等待人口' : facility.throughput >= 1 ? '系统在线' : facility.throughput > 0 ? '低负荷' : '停摆'
  const actionHint = facility.region.level <= 0
    ? '先在设施详情中签发扩张，专属系统才会进入有效运作。'
    : fixed
      ? '无需建筑调度。直接在贸易清单里设置采购量、倍率和自动保护。'
    : !isHousingFacility(facility.region.id) && facility.assignedPopulation < workCapacity
      ? '人口会按设施优先级自动补入；本页不再提供额外调度入口。'
      : '建筑状态稳定。此页右侧工作台是主要操作区。'

  return <section className={`special-facility-panel ${tone}`}>
    <div className="special-panel-head special-building-head">
      <div className="building-art-slot special-art-slot" aria-label={`${facility.region.name}建筑图片占位`}>
        <FacilityIcon size={42} />
        <span>建筑美术占位</span>
      </div>
      <div><span className="eyebrow">特殊建筑 · 这是什么</span><h2>{facility.region.name}</h2><p>{facility.region.subtitle}</p><p className="special-building-note">{displayCopy(facility.region.note)}</p></div>
    </div>
    <div className="special-facility-stats">
      <div><span>{fixed ? '状态' : '设施等级'}</span><strong>{fixed ? '在线' : facility.region.level}<small>{fixed ? '' : `/${facility.region.max}`}</small></strong></div>
      <div><span>{fixed ? '岗位' : isHousingFacility(facility.region.id) ? '人口容量' : '已分配人口'}</span><strong>{fixed ? '无' : isHousingFacility(facility.region.id) ? housingCapacity : facility.assignedPopulation}<small>{fixed ? '' : `/${isHousingFacility(facility.region.id) ? housingCapacity : workCapacity}`}</small></strong></div>
      <div><span>{fixed ? '模式' : '吞吐率'}</span><strong>{fixed ? '贸易' : throughputPercent}<small>{fixed ? '' : '%'}</small></strong></div>
    </div>
    <div className="special-staffing-meter"><span style={{ width: `${staffingPercent}%` }} /><small>{fixed ? '固定节点，无需派驻人口' : `岗位占用 ${staffingPercent}%`}</small></div>
    <div className="special-production-row">
      <div><span>当前状况</span><strong>{statusLabel}</strong></div>
      <div><span>每日结算</span><ResourceBundle bundle={facility.net} empty="暂无日结算" /></div>
    </div>
    <div className="special-intervention-note">
      <span>是否需要干预</span>
      <p>{actionHint}</p>
    </div>
    {children}
  </section>
}

function TechnologyImagePlaceholder({ active }: { active: boolean }) {
  return <svg className="tech-image-placeholder" viewBox="0 0 120 74" role="img" aria-label="科技图像占位">
    <rect x="1" y="1" width="118" height="72" rx="6" />
    <circle cx="36" cy="37" r="16" />
    <path d="M52 37h34M76 24l12 13-12 13M20 58h80" className={active ? 'active-line' : ''} />
  </svg>
}

function TechnologyTags({ tech }: { tech: (typeof technologyCatalog)[TechnologyId] }) {
  const ScopeIcon = tech.scope === 'G' ? Bot : regionLayout[tech.scope].icon
  const facilityTags = facilityOrder.filter(id => tech.scope === id || displayCopy(tech.note).includes(facilityEconomySpecs[id].name)).slice(0, 2)
  const resourceTags = resourceOrder.filter(key => displayCopy(tech.note).includes(resourceMeta[key].label)).slice(0, 3)

  return <div className="tech-tags">
    <span><ScopeIcon size={13} />{tech.scope === 'G' ? '全局' : facilityEconomySpecs[tech.scope].name}</span>
    {facilityTags.filter(id => id !== tech.scope).map(id => {
      const TagIcon = regionLayout[id].icon
      return <span key={id}><TagIcon size={13} />{facilityEconomySpecs[id].name}</span>
    })}
    {resourceTags.map(key => {
      const ResourceIcon = resourceUiMeta[key].icon
      return <span key={key}><ResourceIcon className={resourceUiMeta[key].tone} size={13} />{resourceMeta[key].label}</span>
    })}
  </div>
}

function TechnologyCard({ techId, techs, activeResearch, researchProgress, onResearch }: { techId: TechnologyId; techs: string[]; activeResearch: TechnologyId; researchProgress: Partial<Record<TechnologyId, number>>; onResearch: (techId: TechnologyId) => void }) {
  const tech = technologyCatalog[techId]
  const completed = hasTech(techs, techId)
  const prerequisitesReady = hasResearchPrerequisites(techId, techs)
  const active = activeResearch === techId && !completed
  const locked = !completed && !prerequisitesReady
  const requiredKnowledge = tech.researchCost ?? 0
  const progress = completed ? requiredKnowledge : (researchProgress[techId] ?? 0)
  const progressPercent = requiredKnowledge ? Math.min(100, Math.round(progress / requiredKnowledge * 100)) : 100
  const prerequisites = tech.prerequisites ?? []

  return <button className={`tech-card ${completed ? 'completed' : ''} ${active ? 'researching' : ''} ${locked ? 'locked' : ''}`} onClick={() => !completed && prerequisitesReady && onResearch(techId)} disabled={completed || locked}>
    <div className="tech-card-top">
      <TechnologyImagePlaceholder active={active} />
      <span>{technologyCategoryLabel[tech.category ?? 'global']}</span>
    </div>
    <div className="tech-card-copy">
      <h3>{tech.name}</h3>
      <TechnologyTags tech={tech} />
      <p className="tech-card-note">{displayCopy(tech.note)}</p>
    </div>
    <div className="tech-prerequisites">
      <span>前置</span>
      <small>{prerequisites.length ? prerequisites.map(techLabel).join('、') : '无'}</small>
    </div>
    <div className="tech-cost-row">
      <span><FlaskConical size={13} />需要知识 {requiredKnowledge}</span>
      {locked ? <em><Lock size={12} />前置未满足</em> : completed ? <em><BookOpen size={12} />已入科技书</em> : active ? <em>研究中</em> : <em>可切换研究</em>}
    </div>
    <div className="tech-progress"><span style={{ width: `${progressPercent}%` }} /><small>{progressPercent}%</small></div>
  </button>
}

function ResearchLab({ facility, techs, activeResearch, researchProgress, researchThroughput, knowledgeStock, onResearch, onSelectFacility }: { facility: SpecialFacilityViewModel; techs: string[]; activeResearch: TechnologyId; researchProgress: Partial<Record<TechnologyId, number>>; researchThroughput: number; knowledgeStock: number; onResearch: (techId: TechnologyId) => void; onSelectFacility: () => void }) {
  const completedIds = completedTechnologyIds(techs)
  const currentTech = technologyCatalog[activeResearch]
  const currentCost = currentTech.researchCost ?? 0
  const currentProgress = hasTech(techs, activeResearch) ? currentCost : (researchProgress[activeResearch] ?? 0)
  const treeScrollRef = useRef<HTMLDivElement | null>(null)
  const treeDragRef = useRef({ pointerId: null as number | null, startX: 0, startScrollLeft: 0, moved: false })
  const suppressTechClickRef = useRef(false)
  const [treeDragging, setTreeDragging] = useState(false)

  const beginTreeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const scrollNode = treeScrollRef.current
    if (!scrollNode) return
    treeDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: scrollNode.scrollLeft, moved: false }
    scrollNode.setPointerCapture(event.pointerId)
    setTreeDragging(true)
  }

  const moveTreeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scrollNode = treeScrollRef.current
    const dragState = treeDragRef.current
    if (!scrollNode || dragState.pointerId !== event.pointerId) return
    const deltaX = event.clientX - dragState.startX
    if (Math.abs(deltaX) > 4) dragState.moved = true
    if (!dragState.moved) return
    event.preventDefault()
    scrollNode.scrollLeft = dragState.startScrollLeft - deltaX
  }

  const endTreeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scrollNode = treeScrollRef.current
    const dragState = treeDragRef.current
    const wasMoved = dragState.pointerId === event.pointerId && dragState.moved
    if (scrollNode?.hasPointerCapture(event.pointerId)) scrollNode.releasePointerCapture(event.pointerId)
    treeDragRef.current.pointerId = null
    setTreeDragging(false)
    if (wasMoved) {
      suppressTechClickRef.current = true
      window.setTimeout(() => {
        suppressTechClickRef.current = false
      }, 80)
    }
  }

  const selectResearch = (techId: TechnologyId) => {
    if (!suppressTechClickRef.current) onResearch(techId)
  }

  return <div className="special-system-page">
    <SpecialFacilityPanel facility={facility} tone="research" onSelectFacility={onSelectFacility}>
      <div className="research-rule-box">
        <span><FlaskConical size={16} />研究规则</span>
        <p>每次只推进一项研究。日结算后，问天研究实验室从库存知识中投入当前课题；点击可研究卡片会切换课题。</p>
        <div><b>知识库存 {fmtAmount(knowledgeStock)}</b><b>每日投入上限 {researchThroughput}</b><b>当前 {currentTech.name}</b></div>
        <div className="tech-progress"><span style={{ width: `${currentCost ? Math.min(100, Math.round(currentProgress / currentCost * 100)) : 100}%` }} /><small>{fmtAmount(currentProgress)} / {currentCost}</small></div>
      </div>
    </SpecialFacilityPanel>
    <section className="special-system-main technology-workbench">
      <div className="section-heading"><div><span className="eyebrow">L 问天研究实验室</span><h2>科技树</h2></div><p>从左到右按阶段推进，卡片只显示玩家需要判断的信息。</p></div>
      <div
        ref={treeScrollRef}
        className={`technology-tree-scroll ${treeDragging ? 'dragging' : ''}`}
        aria-label="横向科技树"
        onPointerDown={beginTreeDrag}
        onPointerMove={moveTreeDrag}
        onPointerUp={endTreeDrag}
        onPointerCancel={endTreeDrag}
      >
        <div className="technology-tree">
          {researchEraSections.map(section => {
            const techIds = researchableTechIds.filter(id => (technologyCatalog[id].era ?? 'early') === section.id)
            return <section className="tech-era-column" key={section.id}>
              <header><span>{section.label}</span><small>{section.note}</small></header>
              {techIds.map(id => <TechnologyCard key={id} techId={id} techs={techs} activeResearch={activeResearch} researchProgress={researchProgress} onResearch={selectResearch} />)}
            </section>
          })}
        </div>
      </div>
      <aside className="technology-book">
        <div><BookOpen size={17} /><span>科技书</span><small>已完成科技使用实线边框；未完成科技保留在树中。</small></div>
        <div>{completedIds.map(id => <span key={id}>{techLabel(id)}</span>)}</div>
      </aside>
    </section>
  </div>
}

function EcologyRing({ facility, onSelectFacility }: { facility: SpecialFacilityViewModel; onSelectFacility: () => void }) {
  return <div className="special-system-page">
    <SpecialFacilityPanel facility={facility} tone="ecology" onSelectFacility={onSelectFacility}>
      <div className="special-panel-brief"><Waves size={16} /><span>生态环按阶段改变生态、人口与工业结构，阶段信息直接影响后续设施与人口包。</span></div>
    </SpecialFacilityPanel>
    <section className="special-system-main phase-list"><div className="section-heading"><div><span className="eyebrow">R 月穹生态环</span><h2>生态阶段</h2></div><p>阶段不是装饰文本，是设施和人口经济的条件。</p></div>{facility.region.phaseNotes?.map(phase => <p key={phase.name}><b>{phase.name}</b><span>{displayCopy(phase.note)}</span></p>)}</section>
  </div>
}

function Starport({ facility, resources, populationProjection, techs, autoTradeProtectionEnabled, autoTradeEnabled, onProtection, onTrade, onAutoTrade, onSelectFacility }: { facility: SpecialFacilityViewModel; resources: Resources; populationProjection: PopulationProjection; techs: string[]; autoTradeProtectionEnabled: boolean; autoTradeEnabled: Partial<Record<ResourceKey, boolean>>; onProtection: (enabled: boolean) => void; onTrade: (name: string, input: Partial<Resources>, output: Partial<Resources>) => void; onAutoTrade: (key: ResourceKey, enabled: boolean) => void; onSelectFacility: () => void }) {
  const [tradeBatches, setTradeBatches] = useState<Record<string, number>>({})
  const [tradeSteps, setTradeSteps] = useState<Record<string, number>>({})
  const setOfferBatches = (offerId: string, value: number) => setTradeBatches(previous => ({ ...previous, [offerId]: Math.max(1, Math.min(9999, Math.floor(value) || 1)) }))
  const setOfferStep = (offerId: string, value: number) => setTradeSteps(previous => ({ ...previous, [offerId]: value }))

  return <div className="special-system-page">
    <SpecialFacilityPanel facility={facility} tone="trade" onSelectFacility={onSelectFacility}>
      <div className="special-panel-brief"><ArrowLeftRight size={16} /><span>星港为固定贸易节点，不占用人口、不扩建等级；信用采购允许货币为负，债务每天计息。</span></div>
    </SpecialFacilityPanel>
    <section className="special-system-main trade-board">
      <div className="section-heading"><div><span className="eyebrow">S 星海交易港</span><h2>贸易清单</h2></div><InfoToggle title="贸易规则"><p>交易立即结算库存。自动保护只会补足赤字与安全线，不会替玩家出售自产盈余。</p></InfoToggle></div>
      <label className="trade-protection-toggle">
        <span><ArrowLeftRight size={16} />自动购入保护</span>
        <input type="checkbox" checked={autoTradeProtectionEnabled} onChange={event => onProtection(event.target.checked)} />
        <i aria-hidden="true" />
      </label>
      <div className="trade-offer-list">{starportTradeOffers.map(offer => {
        const unlocked = hasTech(techs, offer.unlockTech)
        const populationBlocked = offer.output.population && (populationProjection.availableCapacity < offer.output.population || populationProjection.lifeSupportRatio < 1)
        const batches = tradeBatches[offer.id] ?? 1
        const step = tradeSteps[offer.id] ?? 1
        const scaledInput = scaleResourceBundle(offer.input, batches)
        const scaledOutput = scaleResourceBundle(offer.output, batches)
        const affordable = canExecuteStarportTrade(resources, scaledInput) && !populationBlocked
        const protectedKey = resourceOrder.find(key => (offer.output[key] ?? 0) > 0 && offer.automated)
        const protectionOn = protectedKey ? autoTradeProtectionEnabled && autoTradeEnabled[protectedKey] !== false : false
        const surplusMax = maxTradeBatchesFromSurplus(resources, offer.input)
        const deficitNeed = deficitTradeBatches(resources, offer.output)
        const deficitMax = Math.min(maxTradeBatchesWithDebt(resources, offer.input), deficitNeed)
        return <article key={offer.id} className={unlocked ? 'active' : 'locked'}>
          <div><span>{offer.unlockTech}</span><h3>{offer.name}</h3><small>{unlocked ? populationBlocked ? '住房或生命维持不足，暂缓接纳人口。' : offer.note : `需要 ${technologyCatalog[offer.unlockTech].name}`}</small></div>
          <div className="trade-flow"><ResourceBundle bundle={scaledInput} empty="无需投入" /><ArrowRight size={15} /><ResourceBundle bundle={scaledOutput} empty="无产出" /></div>
          <div className="trade-actions">
            <div className="trade-quantity-controls" aria-label={`${offer.name}采购数量`}>
              <div className="trade-step-buttons">{[1, 10, 100, 1000].map(value => <button key={value} type="button" className={step === value ? 'selected' : ''} onClick={() => setOfferStep(offer.id, value)} disabled={!unlocked}>x{value}</button>)}</div>
              <div className="trade-count-row">
                <button type="button" onClick={() => setOfferBatches(offer.id, batches - step)} disabled={!unlocked}>-</button>
                <strong>{batches}</strong>
                <button type="button" onClick={() => setOfferBatches(offer.id, batches + step)} disabled={!unlocked}>+</button>
              </div>
              <div className="trade-limit-buttons">
                <button type="button" onClick={() => setOfferBatches(offer.id, surplusMax)} disabled={!unlocked || !bundleHasValues(offer.input) || surplusMax <= 0}>全部盈余</button>
                <button type="button" onClick={() => setOfferBatches(offer.id, deficitMax)} disabled={!unlocked || !bundleHasValues(offer.output) || deficitMax <= 0}>全部亏损</button>
              </div>
            </div>
            {protectedKey && protectedKey !== 'population' && <button type="button" className={protectionOn ? 'selected' : ''} onClick={() => onAutoTrade(protectedKey, !protectionOn)} disabled={!unlocked || !autoTradeProtectionEnabled}>{protectionOn ? '保护中' : '保护关'}</button>}
            <button onClick={() => onTrade(`${offer.name} x${batches}`, scaledInput, scaledOutput)} disabled={!unlocked || !affordable}>{unlocked ? '采购' : '封存'}</button>
          </div>
        </article>
      })}</div>
    </section>
  </div>
}

function Shipyard({ facility, shipProgress, score, onSelectFacility }: { facility: SpecialFacilityViewModel; shipProgress: number; score: number; onSelectFacility: () => void }) {
  return <div className="special-system-page">
    <SpecialFacilityPanel facility={facility} tone="shipyard" onSelectFacility={onSelectFacility}>
      <div className="special-panel-brief"><Rocket size={16} /><span>千日试验以星舰完成度为核心结算，阶段投入会直接决定终局评分。</span></div>
    </SpecialFacilityPanel>
    <section className="special-system-main ship-meter"><div className="section-heading"><div><span className="eyebrow">D 冠冕星舰坞</span><h2>御座号工程</h2></div><p>材料总价值 {Math.round(shipProjectTotalValue)}，当前国祚评分 {score}。</p></div><strong>{shipProgress}<small>%</small></strong><div className="ship-progress"><i style={{ width: `${shipProgress}%` }} /></div><div className="ship-stage-list">{shipProjectStages.map(stage => <article key={stage.id}><b>{stage.id}. {stage.name}</b><ResourceBundle bundle={stage.input} /><small>{stage.note}</small></article>)}</div></section>
  </div>
}

function Palace({ facility, day, lastReignReport, onOpenReport }: { facility: SpecialFacilityViewModel; day: number; lastReignReport: ReignReport | null; onOpenReport: (report: ReignReport) => void }) {
  const palaceCapacity = getHousingCapacity(facility.region.id, facility.region.level)
  const staffingPercent = palaceCapacity ? 100 : 0
  const palaceStatus = palaceCapacity ? '王城容量在线' : '等待建造'
  const reportProgress = Math.round((day % gameCalendar.reignMonthDays) / gameCalendar.reignMonthDays * 100)
  const palaceIntervention = lastReignReport
    ? `最近一份${gameCalendar.monthName}报告已归档，可在右侧复核人口、GDP 和资源产消。`
    : `第一个${gameCalendar.monthName}报告会在开局和每 ${gameCalendar.reignMonthDays} 御日归档。`
  const reportRows = lastReignReport
    ? resourceOrder.filter(key => lastReignReport.resourceRows[key])
    : []
  const populationDelta = lastReignReport
    ? `${lastReignReport.populationDelta >= 0 ? '+' : ''}${fmtAmount(lastReignReport.populationDelta)}`
    : '0'

  return <div className="palace-layout palace-command">
    <section className="palace-hero palace-building-panel">
      <div className="special-panel-head palace-summary-head">
        <div className="building-art-slot special-art-slot palace-art-slot" aria-label={`${facility.region.name}建筑图片占位`}>
          <Crown size={42} />
          <span>建筑美术占位</span>
        </div>
        <div><span className="eyebrow">特殊建筑 · 这是什么</span><h2>{facility.region.name}</h2><p>{facility.region.subtitle}</p><p className="special-building-note">{displayCopy(facility.region.note)}</p></div>
      </div>
      <div className="palace-building-stats">
        <div><span>王城等级</span><strong>{facility.region.level}<small>/{facility.region.max}</small></strong></div>
        <div><span>人口容量</span><strong>{palaceCapacity}<small>人</small></strong></div>
        <div><span>报告周期</span><strong>{reportProgress}<small>%</small></strong></div>
      </div>
      <div className="palace-staffing-meter"><span style={{ width: `${staffingPercent}%` }} /><small>王城容量 {palaceCapacity}</small></div>
      <div className="special-production-row palace-production-row">
        <div><span>当前状况</span><strong>{palaceStatus}</strong></div>
        <div><span>每日结算</span><ResourceBundle bundle={facility.net} empty="王城未产生净变动" /></div>
      </div>
      <div className="special-intervention-note"><span>是否需要干预</span><p>{palaceIntervention}</p></div>
    </section>

    <section className="policy-board palace-report-board">
      <div className="section-heading">
        <div><span className="eyebrow">王城档案库</span><h2>{gameCalendar.monthName}报告</h2></div>
        <p>{lastReignReport ? `${formatDay(lastReignReport.startDay)} 至 ${formatDay(lastReignReport.endDay)}` : '等待归档。'}</p>
      </div>
      {lastReignReport ? <>
      <div className="policy-status palace-report-kpis">
        <div><span>人口变化</span><strong>{populationDelta}</strong><small>{fmt(lastReignReport.populationEnd)}/{fmtAmount(lastReignReport.housingCapacity)} 人</small></div>
        <div><span>GDP</span><strong>{lastReignReport.gdp.toFixed(1)}</strong><small>{lastReignReport.gdpDelta >= 0 ? '+' : ''}{lastReignReport.gdpDelta.toFixed(1)} 星海货币/日</small></div>
        <div><span>阶段</span><strong>{lastReignReport.monthNumber}</strong><small>{gameCalendar.monthName}</small></div>
      </div>
      <div className="policy-cycle-bar" aria-label="王月报告周期进度"><span style={{ width: `${reportProgress}%` }} /></div>
      <div className="palace-report-actions">
        <button className="primary-action" onClick={() => onOpenReport(lastReignReport)}><BookOpen size={15} />打开完整报告</button>
      </div>
      <div className="palace-report-preview">
        <section><h3>每日产消</h3>{reportRows.slice(0, 6).map(key => {
          const row = lastReignReport.resourceRows[key]!
          return <div key={key}><span>{resourceMeta[key].label}</span><b>{row.produced ? fmtAmount(row.produced) : '0'}</b><b>{row.consumed ? fmtAmount(row.consumed) : '0'}</b><b className={row.net < 0 ? 'negative' : ''}>{row.net >= 0 ? '+' : ''}{fmtAmount(row.net)}</b></div>
        })}</section>
        <section><h3>建议</h3><ol>{lastReignReport.suggestions.map(item => <li key={item}>{item}</li>)}</ol></section>
      </div>
      </> : <div className="policy-report-empty palace-report-empty"><BookOpen size={22} /><span>尚未形成可复核的{gameCalendar.monthName}报告。</span></div>}
    </section>
  </div>
}

function Visitors({ roster, assigned, regions, visitor, onSelect, onAssignment }: { roster: Role[]; assigned: Record<RegionId, string | undefined>; regions: Region[]; visitor: Encounter | null; onSelect: (id: RegionId) => void; onAssignment: (regionId: RegionId, visitorId: string | undefined) => void }) {
  return <div className="visitor-layout"><section className="visitor-hero"><span className="eyebrow">异客留任簿 · {roster.length}/{roles.length}</span><h2>陌生人不是资源。<br />他们只是懂得让资源更好地工作。</h2><p>每一位来访者都有独立的族群、需求与专长。选择留任后，他们将持续改变一座设施的产出。</p>{visitor && <div className="pending-visitor"><span>{visitor.glyph}</span><div><b>{visitor.name} 正在等待</b><small>{visitor.species}，请在外交来函中决定去留。</small></div></div>}</section><section className="roster-board">{roster.length ? roster.map(member => { const region = regions.find(item => item.id === member.specialty)!; const RegionIcon = region.icon; const active = assigned[member.specialty] === member.id; return <article key={member.id} className={active ? 'retainer active' : 'retainer'}><div className="retainer-portrait"><span>{member.glyph}</span><small>portrait placeholder</small></div><div className="retainer-copy"><span>{member.species}</span><h3>{member.name}</h3><p>{member.portrait}</p><button onClick={() => onSelect(member.specialty)}><RegionIcon size={14} />{region.name}</button></div><div className="retainer-duty"><b>+{Math.round(member.boost * 100)}%</b><small>专属区域产出</small><button onClick={() => onAssignment(member.specialty, active ? undefined : member.id)}>{active ? '改为待命' : '安排执勤'}</button></div></article> }) : <div className="empty-roster"><Sparkles size={27} /><h3>留任簿仍为空白</h3><p>信标会随机抵达。交换可取得技术，留任则会带来长期区域增益。肖像美术会在这里以占位框接入。</p></div>}</section></div>
}

export default App
