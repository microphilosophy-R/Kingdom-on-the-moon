/**
 * 操作层级语义标签（L1 / L2 / L3）—— 用于标注「该操作由谁发起」，代码检索与冲突排查的基准。
 *
 * - L1 manual —— 基础手动操作：玩家直接执行的单次系统操作（单次扩建/缩减、单笔贸易、
 *   切换生产方式、手动在岗/安置、研究目标、来访者交换等）。代表系统可执行的最小原语；
 *   L3 优化器最终产出的动作与 L1 一一对应，只是改由算法代发。
 * - L2 automation —— 批量便捷操作：玩家开启开关后按既定规则自动执行的批量操作
 *   （人口按优先级分配、债务触发撤人、星港自动补货、每日重复交易、持续扩建/缩减、
 *   事件自动处理）。L3 优化器激活时应停用与之冲突的 L2 工具，改由 L3 逻辑接管。
 * - L3 optimizer —— 优化器高级操作：由优化器自主决策并发起（扩建/科技/生产方式/贸易计划、
 *   人力评分再平衡）。一般会关闭对应的 L2 批量工具。
 *
 * 冲突判定：L3 与 L2 不得同时持有同一根杠杆（人力 / 贸易 / 事件 / 建设队列）。
 */
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

/** L3 产物：一次设施扩建（与 L1 的 upgrade 一一对应）。 */
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

/** L3 产物：一次科技解锁（L1 的研究是逐日推进，此处为优化器直接完成解锁）。 */
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

/** L3 产物：一次生产方式切换（与 L1 的 onMethod 一一对应）。 */
export type MethodAutomationAction = {
  facilityId: FacilityId
  fromMethodId: ProductionMethodId
  toMethodId: ProductionMethodId
  score: number
  weightedGain: number
  projectedResources: Resources
}

/**
 * L3 优化器执行状态。'active' = 优化器本轮产出可执行计划；
 * 'inactive' = 优化器让位（被禁用，或因资源缺口主动退守）。
 * 注意：与 L1 玩家手动操作、L2 automation 均无关系——该字段只是优化器自身的状态表达。
 * 人力分配不在计划内：每日由 App 侧 L3 rebalanceStaffing 统一执行（见 C1 修复）。
 */
export type AutomationPlan = {
  mode: 'active' | 'inactive'
  reason?: string
  actions: AutomationAction[]
  technologyActions: TechnologyAutomationAction[]
  methodActions: MethodAutomationAction[]
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

/** 星港交易批次。L2 自动补货与 L3 优化器贸易共用；L1 手动交易在 App 内联构造。 */
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
  /** 该阶段在 1 个岗位下的参考完成天数（每日投入 = input / cycleDays） */
  cycleDays: number
  note: string
}

export type EcologyRingPhase = {
  id: 1 | 2 | 3 | 4
  name: string
  input: Partial<Resources>
  output: Partial<Resources>
  /** 该阶段在 1 个岗位下的参考完成天数（每日投入 = input / cycleDays） */
  cycleDays: number
  note: string
}
