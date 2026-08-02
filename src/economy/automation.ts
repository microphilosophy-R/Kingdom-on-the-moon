import { getFacilityWorkCapacity, getHousingCapacity, isFixedFacility, isHousingFacility } from './calendar'
import { facilityEconomySpecs, facilityOrder } from './facilities'
import { canAfford, applyBundle, defaultReserveFloors, emptyResources, resourceMeta, resourceOrder, resourceWeights, weightedValue } from './resources'
import { canBuildFacility, estimateTechnologyValue, hasTech, hasTechnologyPrerequisites, technologyCatalog } from './technologies'
import { estimateResourceDeficitPremium, estimateTradePremium, planAutoTradesForCost } from './trade'
import { projectFacilityCost, projectFacilityNet, projectTechnologyCost } from './production'
import type { AutomationAction, AutomationPlan, FacilityId, FacilityModifiers, FacilityState, PopulationProjection, ProductionMethodId, Resources, TechnologyAutomationAction, TechnologySpec } from './types'
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

const respectsReserveTrajectory = (before: Resources, after: Resources, floors: Resources) =>
  resourceOrder.every(key => {
    if (before[key] < floors[key]) return after[key] >= before[key]
    return after[key] >= floors[key]
  })

const isProjectSinkFacility = (id: FacilityId) => id === 'R' || id === 'D'

const projectSinkTargets = (id: FacilityId, reserveFloors: Resources): Partial<Resources> => {
  if (id === 'D') {
    return {
      power: reserveFloors.power * 120,
      water: reserveFloors.water * 120,
      oxygen: reserveFloors.oxygen * 180,
      biomass: reserveFloors.biomass * 180,
      regolith: reserveFloors.regolith * 180,
      alloy: reserveFloors.alloy * 80,
    }
  }
  return {
    power: reserveFloors.power * 160,
    water: reserveFloors.water * 300,
    oxygen: reserveFloors.oxygen * 260,
    biomass: reserveFloors.biomass * 260,
    regolith: reserveFloors.regolith * 250,
    alloy: reserveFloors.alloy * 120,
  }
}

const projectSinkGain = (
  id: FacilityId,
  currentLevel: number,
  resources: Resources,
  deltaNet: Resources,
  reserveFloors: Resources,
  weights: Resources,
) => {
  if (!isProjectSinkFacility(id)) return 0
  if (id === 'D' && currentLevel >= 6) return 0
  const targets = projectSinkTargets(id, reserveFloors)
  const consumedMaterialKeys = resourceOrder.filter(key => {
    if (key === 'power' || key === 'population' || key === 'quantumCore' || key === 'currency' || key === 'knowledge' || key === 'luxury') return false
    return (deltaNet[key] ?? 0) < 0
  })
  const hasSafeStocksForAllInputs = consumedMaterialKeys.every(key => {
    const target = targets[key] ?? 0
    return target > 0 && resources[key] >= target * 0.8
  })
  if (!hasSafeStocksForAllInputs) return 0

  const materialPressures = resourceOrder.map(key => {
    if (key === 'power' || key === 'population' || key === 'quantumCore' || key === 'currency' || key === 'knowledge' || key === 'luxury') return 0
    const target = targets[key] ?? 0
    if (!target) return 0
    return Math.min(1, Math.max(0, (resources[key] - target) / target))
  })
  const pressuredMaterials = materialPressures.filter(value => value > 0.15).length
  if (pressuredMaterials < 2) return 0

  return resourceOrder.reduce((sum, key) => {
    const consumedByUpgrade = Math.max(0, -(deltaNet[key] ?? 0))
    const target = targets[key] ?? 0
    if (!consumedByUpgrade || !target) return sum
    const rawPressure = Math.min(1, Math.max(0, (resources[key] - target) / target))
    const pressure = key === 'power' ? Math.min(0.5, rawPressure) : rawPressure
    return sum + consumedByUpgrade * weights[key] * pressure * 1.35
  }, 0)
}

export type PlanInput = {
  resources: Resources
  facilities: FacilityState[]
  staffing?: Partial<Record<FacilityId, number>>
  population?: PopulationProjection
  blockedFacilities?: FacilityId[]
  modifiers?: Partial<Record<FacilityId, FacilityModifiers>>
  globalBonus?: Partial<Resources>
  reserveFloors?: Partial<Resources>
  weights?: Partial<Resources>
  techs?: string[]
  productionMethods?: Partial<Record<FacilityId, ProductionMethodId>>
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

  const initialBreach = reserveBreach(input.resources, reserveFloors)

  let workingResources = { ...input.resources }
  let workingTechs = [...(input.techs ?? [])]
  let weightedProfit = 0
  const actions: AutomationAction[] = []
  const technologyActions: TechnologyAutomationAction[] = []

  const overstockTechnologyBonus = () => {
    const materialSurplus =
      Math.max(0, workingResources.alloy - reserveFloors.alloy * 4) * weights.alloy +
      Math.max(0, workingResources.regolith - reserveFloors.regolith * 8) * weights.regolith +
      Math.max(0, workingResources.currency - reserveFloors.currency * 6) * weights.currency
    return Math.min(24, materialSurplus / 1200)
  }

  const deficitPremium = (resources: Resources) =>
    estimateResourceDeficitPremium(resources, reserveFloors, Object.values(stateById), workingTechs, weights)

  const evaluate = (id: FacilityId) => {
    const current = stateById[id]
    const spec = facilityEconomySpecs[id]
    if (isFixedFacility(id)) return null
    if (input.blockedFacilities?.includes(id) || current.level >= spec.maxLevel) return null

    const requiredTech = spec.requiredTech && !hasTech(workingTechs, spec.requiredTech)
      ? technologyCatalog[spec.requiredTech]
      : undefined
    if (requiredTech && (
      current.level > 0 ||
      requiredTech.category !== 'construction' ||
      !hasTechnologyPrerequisites(requiredTech.id, workingTechs)
    )) return null
    if (!requiredTech && !canBuildFacility(spec, year, workingTechs)) return null

    const buildCost = projectFacilityCost(spec, current.level, workingTechs)
    const unlockCost = requiredTech ? projectTechnologyCost(requiredTech, workingTechs) : {}
    const cost = requiredTech ? mergeBundles(unlockCost, buildCost) : buildCost
    const tradePlan = planAutoTradesForCost(
      workingResources,
      cost,
      Object.values(stateById),
      workingTechs,
      reserveFloors,
    )
    if (!canAfford(tradePlan.resources, cost)) return null

    const modifiers = input.modifiers?.[id] ?? {}
    const evaluationTechs = requiredTech ? [...workingTechs, `${requiredTech.id} ${requiredTech.name}`] : workingTechs
    const presentAssigned = isHousingFacility(id) ? 0 : getFacilityWorkCapacity(id, current.level)
    const upgradedAssigned = isHousingFacility(id) ? 0 : getFacilityWorkCapacity(id, current.level + 1)
    const presentNet = projectFacilityNet(spec, presentAssigned, modifiers, evaluationTechs, input.productionMethods?.[id], current.level)
    const upgradedNet = projectFacilityNet(spec, upgradedAssigned, modifiers, evaluationTechs, input.productionMethods?.[id], current.level + 1)
    let strategicBonus = requiredTech ? overstockTechnologyBonus() : 0
    let housingCapacityPressure = false
    const annualGain = mergeBundles(upgradedNet)
    resourceOrder.forEach(key => {
      annualGain[key] = (upgradedNet[key] ?? 0) - (presentNet[key] ?? 0)
      if (workingResources[key] < reserveFloors[key] && annualGain[key] > 0) {
        strategicBonus += annualGain[key] * weights[key] * 3
      }
      if (workingResources[key] < reserveFloors[key] && annualGain[key] < 0) {
        strategicBonus += annualGain[key] * weights[key] * 2
      }
    })
    if (isHousingFacility(id)) {
      if ((input.population?.lifeSupportRatio ?? 1) < 1) return null
      const presentCapacity = input.population?.capacity ?? (['K', 'H', 'M'] as FacilityId[]).reduce((sum, facilityId) => sum + getHousingCapacity(facilityId, stateById[facilityId]?.level ?? 0), 0)
      const addedCapacity = getHousingCapacity(id, current.level + 1) - getHousingCapacity(id, current.level)
      const vacancy = presentCapacity - input.resources.population
      housingCapacityPressure = vacancy <= 0
      const potentialMigrants = Math.min(addedCapacity, Math.max(0, (input.population?.growthPotential ?? 0.5) * horizon - vacancy))
      annualGain.population = potentialMigrants / Math.min(horizon, 120)
      if (vacancy <= (input.population?.growthPotential ?? 0.5) * 90) {
        strategicBonus += addedCapacity * weights.population / 80 + overstockTechnologyBonus()
      }
      if (housingCapacityPressure) {
        strategicBonus += addedCapacity * weights.population / 16
      }
    }

    const projectedResources = applyBundle(tradePlan.resources, cost, -1)
    if (!respectsReserveTrajectory(workingResources, projectedResources, reserveFloors)) return null
    const nextYearProjection = applyBundle(projectedResources, upgradedNet)
    if (!respectsReserveTrajectory(projectedResources, nextYearProjection, reserveFloors)) return null

    const normalGain = weightedValue(annualGain, weights)
    const weightedGain = Math.max(normalGain, projectSinkGain(id, current.level, projectedResources, annualGain, reserveFloors, weights))
    const tradePremium = tradePlan.trades.reduce((sum, trade) => sum + estimateTradePremium(trade, weights), 0)
    const currentDeficitPremium = deficitPremium(workingResources)
    const immediateDeficitPremium = deficitPremium(projectedResources)
    const nextDeficitPremium = deficitPremium(nextYearProjection)
    const deficitPremiumDelta = Math.max(immediateDeficitPremium, nextDeficitPremium) - currentDeficitPremium
    const deficitRelief = Math.max(0, currentDeficitPremium - Math.min(immediateDeficitPremium, nextDeficitPremium))
    const weightedCost = (weightedValue(cost, weights) + tradePremium) / horizon + Math.max(0, deficitPremiumDelta)
    let score = weightedGain - weightedCost + spec.priority * 0.45 + strategicBonus
    score += deficitRelief * 0.35
    if (housingCapacityPressure) score = Math.max(score, 6 + spec.priority * 0.45)
    if (!Number.isFinite(score)) return null

    return {
      kind: 'facility' as const,
      id,
      cost,
      trades: tradePlan.trades,
      technologyUnlocks: requiredTech ? [requiredTech.id] : undefined,
      projectedResources,
      weightedGain,
      weightedCost,
      score,
    }
  }

  const evaluateTechnology = (tech: TechnologySpec) => {
    if (hasTech(workingTechs, tech.id) || tech.category === 'construction') return null
    if (!hasTechnologyPrerequisites(tech.id, workingTechs)) return null
    const cost = projectTechnologyCost(tech, workingTechs)
    if (!canAfford(workingResources, cost)) return null
    const projectedResources = applyBundle(workingResources, cost, -1)
    if (!respectsReserveTrajectory(workingResources, projectedResources, reserveFloors)) return null

    const weightedGain = (tech.value ?? estimateTechnologyValue(tech)) / horizon + overstockTechnologyBonus()
    const deficitPremiumDelta = deficitPremium(projectedResources) - deficitPremium(workingResources)
    const weightedCost = weightedValue(cost, weights) / horizon + Math.max(0, deficitPremiumDelta)
    const score = weightedGain - weightedCost
    if (!Number.isFinite(score)) return null

    return {
      kind: 'technology' as const,
      techId: tech.id,
      name: tech.name,
      cost,
      projectedResources,
      weightedGain,
      weightedCost,
      score,
      unlocksFacility: tech.unlocksFacility,
    }
  }

  while (true) {
    const ranked = [
      ...facilityOrder.map(evaluate),
      ...Object.values(technologyCatalog).map(evaluateTechnology),
    ]
      .filter((candidate): candidate is NonNullable<ReturnType<typeof evaluate> | ReturnType<typeof evaluateTechnology>> => Boolean(candidate))
      .sort((a, b) => b.score - a.score)

    const best = ranked[0]
    if (!best || best.score <= 0) break

    if (best.kind === 'technology') {
      workingResources = applyBundle(workingResources, best.cost, -1)
      workingTechs = [...workingTechs, `${best.techId} ${best.name}`]
      weightedProfit += best.score
      technologyActions.push({
        techId: best.techId,
        name: best.name,
        score: best.score,
        weightedGain: best.weightedGain,
        weightedCost: best.weightedCost,
        cost: best.cost,
        unlocksFacility: best.unlocksFacility,
        projectedResources: best.projectedResources,
      })
      continue
    }

    const currentLevel = targetLevels[best.id]
    targetLevels[best.id] = currentLevel + 1
    best.trades.forEach(trade => {
      workingResources = applyBundle(applyBundle(workingResources, trade.input, -1), trade.output)
    })
    workingResources = applyBundle(workingResources, best.cost, -1)
    if (best.technologyUnlocks) {
      workingTechs = [...workingTechs, ...best.technologyUnlocks.map(techId => `${techId} ${technologyCatalog[techId].name}`)]
    }
    weightedProfit += best.score
    actions.push({
      id: best.id,
      fromLevel: currentLevel,
      toLevel: currentLevel + 1,
      technologyUnlocks: best.technologyUnlocks,
      score: best.score,
      weightedGain: best.weightedGain,
      weightedCost: best.weightedCost,
      cost: best.cost,
      trades: best.trades.length ? best.trades : undefined,
      projectedResources: best.projectedResources,
    })
    stateById[best.id] = { id: best.id, level: currentLevel + 1 }
  }

  if (initialBreach && !actions.length && !technologyActions.length) {
    return {
      mode: 'manual',
      reason: `${resourceMeta[initialBreach].label} 低于最低要求`,
      actions: [],
      technologyActions: [],
      targetLevels,
      weightedProfit: 0,
      projectedResources: { ...input.resources },
    }
  }

  return {
    mode: 'auto',
    actions,
    technologyActions,
    targetLevels,
    weightedProfit,
    projectedResources: workingResources,
  }
}
