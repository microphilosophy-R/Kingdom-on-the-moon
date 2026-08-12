import { baseConstructionDays, getConstructionCostDiscount, getUpgradeCostScale, isHousingFacility, jobsPerFacilityLevel } from './calendar'
import { facilityEconomySpecs, facilityOrder, shipProjectStages } from './facilities'
import { applyTechnologyToMethod, canUseProductionMethod, estimateTechnologyResearchCost, hasRequiredFacilityTech, selectProductionMethod } from './technologies'
import { emptyResources, resourceOrder, resourceWeights, weightedValue, type ResourceFlow } from './resources'
import { difficultyConfigs, type Difficulty } from './difficulty'
import type { AnnualContext, FacilityEconomySpec, FacilityId, FacilityModifiers, ProductionMethodId, Resources, TechnologySpec } from './types'
export const shipProjectTotalValue = shipProjectStages.reduce((sum, stage) => sum + weightedValue(stage.input), 0)

export function projectFacilityFlow(
  spec: FacilityEconomySpec,
  assignedPopulation: number,
  modifiers: FacilityModifiers = {},
  techs: string[] = [],
  selectedMethodId?: ProductionMethodId,
  facilityLevel?: number,
): ResourceFlow {
  const flow: ResourceFlow = {
    production: emptyResources(),
    consumption: emptyResources(),
    net: emptyResources(),
  }
  if (assignedPopulation <= 0) return flow
  if (!hasRequiredFacilityTech(spec, techs)) return flow
  if (isHousingFacility(spec.id)) return flow
  const method = selectProductionMethod(spec.productionMethods, techs, selectedMethodId)
  if (!canUseProductionMethod(method, techs)) return flow
  const adjustedMethod = applyTechnologyToMethod(spec, method, techs)
  const outputMultiplier = modifiers.outputMultiplier ?? 1
  const upkeepMultiplier = modifiers.upkeepMultiplier ?? 1
  const builtLevel = facilityLevel ?? Math.max(1, Math.ceil(assignedPopulation / jobsPerFacilityLevel))
  const levelScale = assignedPopulation * (1 + Math.max(0, builtLevel - 1) * spec.yieldGrowth)

  resourceOrder.forEach(key => {
    const produced = (adjustedMethod.output[key] ?? 0) * levelScale * outputMultiplier
    const consumed = (adjustedMethod.input[key] ?? 0) * levelScale * upkeepMultiplier
    if (produced) flow.production[key] += produced
    if (consumed) flow.consumption[key] += consumed
    flow.net[key] += produced - consumed
  })

  return flow
}

export function projectFacilityNet(
  spec: FacilityEconomySpec,
  assignedPopulation: number,
  modifiers: FacilityModifiers = {},
  techs: string[] = [],
  selectedMethodId?: ProductionMethodId,
  facilityLevel?: number,
): Partial<Resources> {
  const net: Partial<Resources> = {}
  const flow = projectFacilityFlow(spec, assignedPopulation, modifiers, techs, selectedMethodId, facilityLevel)

  resourceOrder.forEach(key => {
    if (flow.net[key]) net[key] = flow.net[key]
  })

  return net
}

/**
 * 人均经济利润：每岗产出的资源价值 - 每岗消耗的资源价值。
 * 人口作为劳动力计入产出价值（人口是驱动利润的瓶颈），
 * 因此人口建筑的利润天然偏高，属正常现象。
 */
export function profitPerJob(
  spec: FacilityEconomySpec,
  assignedPopulation: number,
  modifiers: FacilityModifiers = {},
  techs: string[] = [],
  selectedMethodId?: ProductionMethodId,
  facilityLevel?: number,
  weights: Resources = resourceWeights,
): number {
  const net = projectFacilityNet(spec, assignedPopulation, modifiers, techs, selectedMethodId, facilityLevel)
  return weightedValue(net, weights) / Math.max(1, assignedPopulation)
}

export function projectFacilityCost(spec: FacilityEconomySpec, level: number, techs: string[] = [], difficulty: Difficulty = 'normal'): Partial<Resources> {
  const nextLevel = Math.max(1, level + 1)
  const cost: Partial<Resources> = {}
  // 分段线性：前期折扣（L1-5: 0.8x），中期基准（L6-10: 1x），后期加价（L11+: 1.5x）
  const levelTier = nextLevel <= 5 ? 0.8 : nextLevel <= 10 ? 1.0 : 1.5
  const difficultyMult = difficultyConfigs[difficulty].costScaleMultiplier
  const multiplier = getUpgradeCostScale(spec.id) * nextLevel * levelTier * difficultyMult * getConstructionCostDiscount(techs)
  resourceOrder.forEach(key => {
    const base = spec.baseUpgradeCost[key] ?? 0
    if (!base) return
    cost[key] = base * multiplier
  })
  return cost
}

export function projectTechnologyCost(tech: TechnologySpec, techs: string[] = []): Partial<Resources> {
  if (tech.category === 'construction' && tech.unlocksFacility) {
    const facilityCost = projectFacilityCost(facilityEconomySpecs[tech.unlocksFacility], 0, techs)
    const cost = { ...facilityCost }
    delete cost.population
    return cost
  }
  const researchCost = tech.researchCost ?? estimateTechnologyResearchCost(tech)
  return researchCost > 0 ? { knowledge: researchCost } : {}
}

const mergeBundles = (...bundles: Partial<Resources>[]) => {
  const total = emptyResources()
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

export function projectDailyNet(context: AnnualContext): Resources {
  return projectDailyFlow(context).net
}

export function projectDailyFlow(context: AnnualContext): ResourceFlow {
  const total: ResourceFlow = {
    production: emptyResources(),
    consumption: emptyResources(),
    net: emptyResources(),
  }

  facilityOrder.forEach(id => {
    const facility = context.facilities[id]
    if (!facility || facility.level <= 0) return
    const spec = facilityEconomySpecs[id]
    const modifiers = context.modifiers[id] ?? {}
    const contribution = projectFacilityFlow(spec, facility.level, modifiers, context.techs, context.productionMethods?.[id], context.facilityLevels?.[id])
    resourceOrder.forEach(key => {
      total.production[key] += contribution.production[key] ?? 0
      total.consumption[key] += contribution.consumption[key] ?? 0
      total.net[key] += contribution.net[key] ?? 0
    })
  })

  if (context.globalBonus) {
    resourceOrder.forEach(key => {
      const bonus = context.globalBonus?.[key] ?? 0
      if (bonus >= 0) total.production[key] += bonus
      else total.consumption[key] += Math.abs(bonus)
      total.net[key] += bonus
    })
  }

  return total
}

export const projectAnnualNet = projectDailyNet

export const buildFacilityModifiers = (
  habitatLevel: number,
  policy: 'ration' | 'mandate' | 'festival',
  workerBoost: number,
) => {
  const baseProductivity = 0.88
  const habitatBonus = 1 + habitatLevel * 0.025
  const policyBonus = policy === 'mandate' ? 1.16 : policy === 'festival' ? 1.06 : 1
  return {
    outputMultiplier: baseProductivity * habitatBonus * policyBonus * workerBoost,
    upkeepMultiplier: 1,
  }
}
