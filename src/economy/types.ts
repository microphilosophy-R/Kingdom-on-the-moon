export type ResourceKey =
  | 'power'
  | 'water'
  | 'oxygen'
  | 'biomass'
  | 'regolith'
  | 'alloy'
  | 'quantumCore'
  | 'currency'
  | 'population'
  | 'knowledge'
  | 'luxury'

export type Resources = Record<ResourceKey, number>

export type ResourceCategory = 'energy' | 'life' | 'matter' | 'society' | 'science' | 'culture'

export type ResourceSpec = {
  label: string
  category: ResourceCategory
  source: string
  coreUse: string
  deficit: string
  tradeRule: string
  autoBuyRule: string
  tradable: boolean
  storable: boolean
  reserveFloor: number
}

export type FacilityId = 'E1' | 'E2' | 'E3' | 'C1' | 'C2' | 'B' | 'F' | 'P' | 'R' | 'S' | 'K' | 'L' | 'H' | 'M' | 'D'
export type FacilityRole = 'energy' | 'extraction' | 'life' | 'industry' | 'ecology' | 'trade' | 'government' | 'research' | 'culture' | 'habitat' | 'ship'
export type ProductionMethodId = `M${FacilityId}-${number}`
export type TechnologyId = `T${string}-${number}`

export type FacilityPhase = {
  name: string
  note: string
}

export type ProductionMethod = {
  id: ProductionMethodId
  name: string
  input: Partial<Resources>
  output: Partial<Resources>
  unlockedBy?: TechnologyId
  condition?: string
  autoSelect?: boolean
  note: string
}

export type TechnologySpec = {
  id: TechnologyId
  name: string
  scope: FacilityId | 'G'
  category?: 'construction' | 'production-method' | 'facility-efficiency' | 'global' | 'trade'
  era?: 'early' | 'mid' | 'late'
  alien?: boolean
  prerequisites?: TechnologyId[]
  unlocksFacility?: FacilityId
  unlocks?: ProductionMethodId
  value?: number
  researchCost?: number
  note: string
}

export type FacilityEconomySpec = {
  id: FacilityId
  code: FacilityId
  name: string
  subtitle: string
  role: FacilityRole
  requiredTech?: TechnologyId
  maxLevel: number
  minLevel?: number
  baseUpgradeCost: Partial<Resources>
  yieldGrowth: number
  priority: number
  reserveFloor: Partial<Resources>
  interfaceDuty: string
  note: string
  productionMethods: ProductionMethod[]
  phaseNotes?: FacilityPhase[]
}

export type FacilityState = {
  id: FacilityId
  level: number
}

export type FacilityModifiers = {
  outputMultiplier?: number
  upkeepMultiplier?: number
}

export type AnnualContext = {
  facilities: Record<FacilityId, FacilityState>
  facilityLevels?: Partial<Record<FacilityId, number>>
  modifiers: Partial<Record<FacilityId, FacilityModifiers>>
  globalBonus?: Partial<Resources>
  techs?: string[]
  productionMethods?: Partial<Record<FacilityId, ProductionMethodId>>
}

export type AutomationAction = {
  id: FacilityId
  fromLevel: number
  toLevel: number
  technologyUnlocks?: TechnologyId[]
  score: number
  weightedGain: number
  weightedCost: number
  cost: Partial<Resources>
  trades?: AutoTrade[]
  projectedResources: Resources
}

export type TechnologyAutomationAction = {
  techId: TechnologyId
  name: string
  score: number
  weightedGain: number
  weightedCost: number
  cost: Partial<Resources>
  trades?: AutoTrade[]
  unlocksFacility?: FacilityId
  projectedResources: Resources
}

export type MethodAutomationAction = {
  facilityId: FacilityId
  fromMethodId: ProductionMethodId
  toMethodId: ProductionMethodId
  score: number
  weightedGain: number
  projectedResources: Resources
}

export type StaffingAction = {
  facilityId: FacilityId
  fromStaff: number
  toStaff: number
  score: number
}

export type AutomationPlan = {
  mode: 'auto' | 'manual'
  reason?: string
  actions: AutomationAction[]
  technologyActions: TechnologyAutomationAction[]
  methodActions: MethodAutomationAction[]
  staffingActions: StaffingAction[]
  targetLevels: Record<FacilityId, number>
  weightedProfit: number
  projectedResources: Resources
}

export type StarportTradeOffer = {
  id: string
  unlockTech: TechnologyId
  name: string
  resource: ResourceKey
  input: Partial<Resources>
  output: Partial<Resources>
  baseValue: number
  buyPremium: number
  sellDiscount: number
  note: string
  automated?: boolean
  canSell?: boolean
}

export type AutoTrade = {
  offerId: string
  name: string
  input: Partial<Resources>
  output: Partial<Resources>
}

export type PopulationPolicy = 'ration' | 'mandate' | 'festival'

export type PopulationProjection = {
  capacity: number
  availableCapacity: number
  residentsByFacility: Partial<Record<FacilityId, number>>
  facilityNet: Partial<Record<FacilityId, Partial<Resources>>>
  lifeSupportCost: Partial<Resources>
  lifeSupportRatio: number
  growthPotential: number
  migrationIn: number
  attrition: number
  nextPressureDays: number
  net: Partial<Resources>
  status: 'stable' | 'full' | 'strained'
}

export type PopulationContext = {
  resources: Resources
  facilities: Record<FacilityId, FacilityState>
  policy: PopulationPolicy
  techs?: string[]
  pressureDays?: number
}

export type ShipProjectStage = {
  id: 1 | 2 | 3
  name: string
  input: Partial<Resources>
  note: string
}
