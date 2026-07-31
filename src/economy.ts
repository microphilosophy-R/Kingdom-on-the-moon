export type ResourceKey = 'power' | 'fuel' | 'alloy' | 'regolith' | 'water' | 'oxygen' | 'food' | 'research'
export type Resources = Record<ResourceKey, number>

export type FacilityId = 'energy' | 'mines' | 'biosphere' | 'habitats' | 'palace' | 'leisure' | 'exchange' | 'shipyard'
export type FacilityRole = 'life' | 'production' | 'research' | 'culture' | 'trade' | 'ship'

export type ResourceSpec = {
  label: string
  category: 'energy' | 'matter' | 'life' | 'knowledge'
  tradable: boolean
  storable: boolean
  reserveFloor: number
  weight: number
}

export type FacilityEconomySpec = {
  id: FacilityId
  code: string
  name: string
  subtitle: string
  role: FacilityRole
  unlockYear: number
  maxLevel: number
  baseYield: Partial<Resources>
  baseUpgradeCost: Partial<Resources>
  yieldGrowth: number
  priority: number
  reserveFloor: Partial<Resources>
  note: string
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
  modifiers: Partial<Record<FacilityId, FacilityModifiers>>
  globalBonus?: Partial<Resources>
}

export type AutomationAction = {
  id: FacilityId
  fromLevel: number
  toLevel: number
  score: number
  weightedGain: number
  weightedCost: number
  cost: Partial<Resources>
  projectedResources: Resources
}

export type AutomationPlan = {
  mode: 'auto' | 'manual'
  reason?: string
  actions: AutomationAction[]
  targetLevels: Record<FacilityId, number>
  weightedProfit: number
  projectedResources: Resources
}

export const resourceOrder: ResourceKey[] = ['power', 'fuel', 'alloy', 'regolith', 'water', 'oxygen', 'food', 'research']

export const resourceMeta: Record<ResourceKey, ResourceSpec> = {
  power: { label: '电力', category: 'energy', tradable: false, storable: false, reserveFloor: 12, weight: 3.2 },
  fuel: { label: '氦燃料', category: 'energy', tradable: true, storable: true, reserveFloor: 6, weight: 1.4 },
  alloy: { label: '合金', category: 'matter', tradable: true, storable: true, reserveFloor: 10, weight: 2.4 },
  regolith: { label: '月壤', category: 'matter', tradable: true, storable: true, reserveFloor: 12, weight: 1.0 },
  water: { label: '水', category: 'life', tradable: true, storable: true, reserveFloor: 8, weight: 2.0 },
  oxygen: { label: '氧气', category: 'life', tradable: true, storable: true, reserveFloor: 10, weight: 2.3 },
  food: { label: '食物', category: 'life', tradable: true, storable: true, reserveFloor: 8, weight: 1.7 },
  research: { label: '知识', category: 'knowledge', tradable: false, storable: true, reserveFloor: 0, weight: 3.6 },
}

export const resourceGroups: { label: string; keys: ResourceKey[] }[] = [
  { label: '能源', keys: ['power', 'fuel'] },
  { label: '物质', keys: ['alloy', 'regolith'] },
  { label: '生命维持', keys: ['water', 'oxygen', 'food'] },
  { label: '知识', keys: ['research'] },
]

export const defaultReserveFloors: Resources = {
  power: 12,
  fuel: 6,
  alloy: 10,
  regolith: 12,
  water: 8,
  oxygen: 10,
  food: 8,
  research: 0,
}

export const resourceWeights: Resources = {
  power: 3.2,
  fuel: 1.4,
  alloy: 2.4,
  regolith: 1.0,
  water: 2.0,
  oxygen: 2.3,
  food: 1.7,
  research: 3.6,
}

export const facilityEconomySpecs: Record<FacilityId, FacilityEconomySpec> = {
  energy: {
    id: 'energy',
    code: 'E1',
    name: '日冕能源署',
    subtitle: '光伏发电 · 基地供电',
    role: 'life',
    unlockYear: 0,
    maxLevel: 5,
    baseYield: { power: 5.3, fuel: -0.8 },
    baseUpgradeCost: { regolith: 10, alloy: 8 },
    yieldGrowth: 0.06,
    priority: 8,
    reserveFloor: { power: 14, fuel: 4 },
    note: '前期供电基座，后续通过镜阵与聚变持续提高单位产值。',
  },
  mines: {
    id: 'mines',
    code: 'C1',
    name: '静海采掘署',
    subtitle: '能源矿物 · 建材 · 土壤',
    role: 'production',
    unlockYear: 0,
    maxLevel: 5,
    baseYield: { regolith: 5.1, alloy: 2.1, fuel: 1.6, oxygen: -0.9 },
    baseUpgradeCost: { power: 14, alloy: 5 },
    yieldGrowth: 0.05,
    priority: 7,
    reserveFloor: { oxygen: 8, power: 10 },
    note: '前期经济底座，负责月壤、合金与少量氦燃料的基础供给。',
  },
  biosphere: {
    id: 'biosphere',
    code: 'B',
    name: '水培生态球',
    subtitle: '蓝藻 · 氧气 · 生物质',
    role: 'life',
    unlockYear: 8,
    maxLevel: 5,
    baseYield: { oxygen: 4.1, food: 3.0, water: -1.0, regolith: -0.8 },
    baseUpgradeCost: { power: 16, water: 6, regolith: 8 },
    yieldGrowth: 0.07,
    priority: 10,
    reserveFloor: { water: 10, oxygen: 12, food: 8 },
    note: '把冰、藻类与土壤转为可持续的呼吸与食物供给。',
  },
  habitats: {
    id: 'habitats',
    code: 'M',
    name: '新月府',
    subtitle: '人口 · 秩序 · 低消耗',
    role: 'life',
    unlockYear: 14,
    maxLevel: 5,
    baseYield: { food: -1.9, oxygen: -1.8, research: 1.2 },
    baseUpgradeCost: { alloy: 16, regolith: 18, water: 8 },
    yieldGrowth: 0.04,
    priority: 6,
    reserveFloor: { food: 8, oxygen: 10 },
    note: '后期人口建筑，单位人口消耗更低，承担稳定居民承载。',
  },
  palace: {
    id: 'palace',
    code: 'K',
    name: '月面王城',
    subtitle: '税收 · 政策 · 人口',
    role: 'research',
    unlockYear: 22,
    maxLevel: 3,
    baseYield: { research: 3.4, power: -1.8 },
    baseUpgradeCost: { alloy: 28, regolith: 24, power: 20 },
    yieldGrowth: 0.08,
    priority: 9,
    reserveFloor: { power: 10 },
    note: '前期人口与政策核心，负责把统治转译成税收与制度增益。',
  },
  leisure: {
    id: 'leisure',
    code: 'H',
    name: '翡翠宫',
    subtitle: '人口 · 奢侈 · 声望',
    role: 'culture',
    unlockYear: 30,
    maxLevel: 4,
    baseYield: { research: 2.0, food: -1.0, power: -0.8 },
    baseUpgradeCost: { alloy: 20, power: 22, food: 10 },
    yieldGrowth: 0.07,
    priority: 4,
    reserveFloor: { food: 6, power: 10 },
    note: '中期人口建筑，更高单位消耗，产出艺术奢侈品与声望增益。',
  },
  exchange: {
    id: 'exchange',
    code: 'S',
    name: '星海交易港',
    subtitle: '贸易 · 结算 · 自动购买',
    role: 'trade',
    unlockYear: 38,
    maxLevel: 4,
    baseYield: { power: 3.0 },
    baseUpgradeCost: { alloy: 26, power: 26, food: 12 },
    yieldGrowth: 0.05,
    priority: 5,
    reserveFloor: { power: 10, food: 6 },
    note: '自动交换盈余物资并提供结算能力，是后期调度枢纽。',
  },
  shipyard: {
    id: 'shipyard',
    code: 'D',
    name: '冠冕星舰坞',
    subtitle: '终局工程 · 出航评分',
    role: 'ship',
    unlockYear: 52,
    maxLevel: 5,
    baseYield: { power: -5.0, alloy: -3.2, fuel: -2.0 },
    baseUpgradeCost: { alloy: 56, power: 60, fuel: 25, research: 15 },
    yieldGrowth: 0.1,
    priority: 12,
    reserveFloor: { power: 14, alloy: 12, fuel: 8, research: 4 },
    note: '所有资源最终汇入的终局目标，优先级仅次于生存安全。',
  },
}

export const facilityOrder: FacilityId[] = ['energy', 'mines', 'biosphere', 'habitats', 'palace', 'leisure', 'exchange', 'shipyard']

export const resourceText = (bundle: Partial<Resources>) =>
  resourceOrder
    .map(key => bundle[key] ? `${resourceMeta[key].label} ${bundle[key]}` : null)
    .filter(Boolean)
    .join('、')

export const canAfford = (bank: Resources, price: Partial<Resources>) =>
  resourceOrder.every(key => bank[key] >= (price[key] ?? 0))

export const applyBundle = (bank: Resources, change: Partial<Resources>, direction = 1): Resources => {
  const next = { ...bank }
  resourceOrder.forEach(key => {
    const delta = change[key] ?? 0
    next[key] = Math.max(0, next[key] + direction * delta)
  })
  return next
}

export const weightedValue = (bundle: Partial<Resources>, weights: Resources = resourceWeights) =>
  resourceOrder.reduce((sum, key) => sum + (bundle[key] ?? 0) * weights[key], 0)

export function projectFacilityNet(
  spec: FacilityEconomySpec,
  level: number,
  modifiers: FacilityModifiers = {},
): Partial<Resources> {
  if (level <= 0) return {}
  const outputMultiplier = modifiers.outputMultiplier ?? 1
  const upkeepMultiplier = modifiers.upkeepMultiplier ?? 1
  const levelScale = level * (1 + Math.max(0, level - 1) * spec.yieldGrowth)
  const net: Partial<Resources> = {}

  resourceOrder.forEach(key => {
    const base = spec.baseYield[key] ?? 0
    if (!base) return
    const scale = base > 0 ? outputMultiplier : upkeepMultiplier
    net[key] = (net[key] ?? 0) + base * levelScale * scale
  })

  return net
}

export function projectFacilityCost(spec: FacilityEconomySpec, level: number): Partial<Resources> {
  const nextLevel = Math.max(1, level + 1)
  const cost: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    const base = spec.baseUpgradeCost[key] ?? 0
    if (!base) return
    cost[key] = base * nextLevel
  })
  return cost
}

const mergeBundles = (...bundles: Partial<Resources>[]) => {
  const total: Resources = { power: 0, fuel: 0, alloy: 0, regolith: 0, water: 0, oxygen: 0, food: 0, research: 0 }
  bundles.forEach(bundle => {
    resourceOrder.forEach(key => {
      total[key] += bundle[key] ?? 0
    })
  })
  return total
}

const meetsFloor = (resources: Resources, floors: Resources) =>
  resourceOrder.every(key => resources[key] >= floors[key])

const reserveBreach = (resources: Resources, floors: Resources) =>
  resourceOrder.find(key => resources[key] < floors[key])

export function projectAnnualNet(context: AnnualContext): Resources {
  const total: Resources = { power: 0, fuel: 0, alloy: 0, regolith: 0, water: 0, oxygen: 0, food: 0, research: 0 }

  facilityOrder.forEach(id => {
    const facility = context.facilities[id]
    if (!facility || facility.level <= 0) return
    const spec = facilityEconomySpecs[id]
    const modifiers = context.modifiers[id] ?? {}
    const contribution = projectFacilityNet(spec, facility.level, modifiers)
    resourceOrder.forEach(key => {
      total[key] += contribution[key] ?? 0
    })
  })

  if (context.globalBonus) {
    resourceOrder.forEach(key => {
      total[key] += context.globalBonus?.[key] ?? 0
    })
  }

  return total
}

export type PlanInput = {
  resources: Resources
  facilities: FacilityState[]
  modifiers?: Partial<Record<FacilityId, FacilityModifiers>>
  globalBonus?: Partial<Resources>
  reserveFloors?: Partial<Resources>
  weights?: Partial<Resources>
  year?: number
  capitalHorizonYears?: number
}

export function planFacilityAutomation(input: PlanInput): AutomationPlan {
  const reserveFloors = { ...defaultReserveFloors, ...input.reserveFloors } as Resources
  const weights = { ...resourceWeights, ...input.weights } as Resources
  const horizon = input.capitalHorizonYears ?? 5
  const year = input.year ?? 0
  const stateById: Record<FacilityId, FacilityState> = Object.fromEntries(
    facilityOrder.map(id => [id, input.facilities.find(item => item.id === id) ?? { id, level: 0 }]),
  ) as Record<FacilityId, FacilityState>
  const targetLevels: Record<FacilityId, number> = Object.fromEntries(
    facilityOrder.map(id => [id, stateById[id].level]),
  ) as Record<FacilityId, number>

  if (!meetsFloor(input.resources, reserveFloors)) {
    const breach = reserveBreach(input.resources, reserveFloors)
    return {
      mode: 'manual',
      reason: breach ? `${resourceMeta[breach].label} 低于最低要求` : '最低要求未满足',
      actions: [],
      targetLevels,
      weightedProfit: 0,
      projectedResources: { ...input.resources },
    }
  }

  let workingResources = { ...input.resources }
  let weightedProfit = 0
  const actions: AutomationAction[] = []

  const evaluate = (id: FacilityId) => {
    const current = stateById[id]
    const spec = facilityEconomySpecs[id]
    if (year < spec.unlockYear || current.level >= spec.maxLevel) return null

    const cost = projectFacilityCost(spec, current.level)
    if (!canAfford(workingResources, cost)) return null

    const modifiers = input.modifiers?.[id] ?? {}
    const presentNet = projectFacilityNet(spec, current.level, modifiers)
    const upgradedNet = projectFacilityNet(spec, current.level + 1, modifiers)
    const annualGain = mergeBundles(upgradedNet, presentNet, {})
    resourceOrder.forEach(key => {
      annualGain[key] = (upgradedNet[key] ?? 0) - (presentNet[key] ?? 0)
    })

    const projectedResources = applyBundle(workingResources, cost, -1)
    const nextYearProjection = applyBundle(projectedResources, upgradedNet)
    if (!meetsFloor(nextYearProjection, reserveFloors)) return null

    const weightedGain = weightedValue(annualGain, weights)
    const weightedCost = weightedValue(cost, weights) / horizon
    const score = weightedGain - weightedCost + spec.priority * 0.45
    if (!Number.isFinite(score)) return null

    return { id, cost, projectedResources, weightedGain, weightedCost, score }
  }

  while (true) {
    const ranked = facilityOrder
      .map(evaluate)
      .filter((candidate): candidate is NonNullable<ReturnType<typeof evaluate>> => Boolean(candidate))
      .sort((a, b) => b.score - a.score)

    const best = ranked[0]
    if (!best || best.score <= 0) break

    const currentLevel = targetLevels[best.id]
    targetLevels[best.id] = currentLevel + 1
    workingResources = applyBundle(workingResources, best.cost, -1)
    weightedProfit += best.score
    actions.push({
      id: best.id,
      fromLevel: currentLevel,
      toLevel: currentLevel + 1,
      score: best.score,
      weightedGain: best.weightedGain,
      weightedCost: best.weightedCost,
      cost: best.cost,
      projectedResources: best.projectedResources,
    })
    stateById[best.id] = { id: best.id, level: currentLevel + 1 }
  }

  return {
    mode: 'auto',
    actions,
    targetLevels,
    weightedProfit,
    projectedResources: workingResources,
  }
}

export const buildResearchBonus = (techs: string[]) => ({
  power: techs.some(tech => tech.includes('日冕')) ? 2 : 0,
  water: techs.some(tech => tech.includes('生态')) ? 1 : 0,
})

export const buildFacilityModifiers = (
  habitatLevel: number,
  policy: 'ration' | 'mandate' | 'festival',
  workerBoost: number,
) => {
  const habitatBonus = 1 + habitatLevel * 0.04
  const policyBonus = policy === 'mandate' ? 1.16 : policy === 'festival' ? 1.06 : 1
  return {
    outputMultiplier: habitatBonus * policyBonus * workerBoost,
    upkeepMultiplier: 1,
  }
}
