import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import type { Difficulty, FacilityId, FacilityState, ProductionMethodId, ResourceKey, Resources, TechnologyId } from '../economy'
import type { Encounter, Role } from '../events'
import type { OptimizerId } from '../optimizers'

export type Icon = ComponentType<LucideProps>

export type RegionId = FacilityId

export type FacilityOrderMode = 'shrink-continuous' | 'shrink' | 'hold' | 'expand' | 'expand-continuous'

export type StaffingPriority = 1 | 2 | 3 | 4 | 5

export type Region = FacilityState & {
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

export type SpecialFacilityViewModel = {
  region: Region
  assignedPopulation: number
  net: Partial<Resources>
  modifier: { outputMultiplier?: number; upkeepMultiplier?: number }
  throughput: number
  methodName: string
}

export type ReignReport = {
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
  phaseGuidance: { title: string; description: string; goals: string[] } | null
}

export type ReignReportBaseline = {
  day: number
  resources: Resources
  gdp: number
}

export type ConstructionProject = {
  mode: 'expand' | 'shrink'
  startedDay: number
  completeDay: number
  fromLevel: number
  toLevel: number
  cost: Partial<Resources>
}

export type AppView = 'facilities' | 'palace' | 'research' | 'ecology' | 'starport' | 'ship' | 'visitors'

export type GameSaveState = {
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
  dockCollapsed: boolean
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
  difficulty?: Difficulty
  observerMode?: boolean
  autoEventsEnabled?: boolean
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

export type SaveSlotMeta = {
  name: string
  day: number
  score: number
  savedAt: string
}
