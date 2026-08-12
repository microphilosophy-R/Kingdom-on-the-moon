import { getFacilityWorkCapacity, getHousingCapacity, isFixedFacility, isHousingFacility } from './calendar'
import { facilityEconomySpecs, facilityOrder } from './facilities'
import { canAfford, applyBundle, defaultReserveFloors, emptyResources, resourceMeta, resourceOrder, resourceWeights, weightedValue } from './resources'
import { canBuildFacility, canUseProductionMethod, estimateTechnologyValue, hasTech, hasTechnologyPrerequisites, selectProductionMethod, technologyCatalog } from './technologies'
import { difficultyConfigs, type Difficulty } from './difficulty'
import { estimateResourceDeficitPremium, estimateTradePremium, planAutoTradesForCost, resourceDebtLimits } from './trade'
import { projectFacilityCost, projectFacilityNet, projectTechnologyCost } from './production'
import { eventChains, getCurrentGameEra } from '../events'
import type { AutomationAction, AutomationPlan, FacilityId, FacilityModifiers, FacilityState, MethodAutomationAction, PopulationProjection, ProductionMethod, ProductionMethodId, Resources, StaffingAction, TechnologyAutomationAction, TechnologySpec } from './types'
const mergeBundles = (...bundles: Partial<Resources>[]) => {
  const total = emptyResources()
  bundles.forEach(bundle => {
    resourceOrder.forEach(key => {
      total[key] += bundle[key] ?? 0
    })
  })
  return total
}

const reserveBreach = (resources: Resources, floors: Resources) =>
  resourceOrder.find(key => resources[key] < floors[key])

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

const scaleGain = (gain: Partial<Resources>, factor: number): Partial<Resources> => {
  const scaled: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    const v = gain[key] ?? 0
    if (v !== 0) scaled[key] = v * factor
  })
  return scaled
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
    if (key === 'power' || key === 'population' || key === 'currency' || key === 'knowledge' || key === 'luxury') return false
    return (deltaNet[key] ?? 0) < 0
  })
  const hasSafeStocksForAllInputs = consumedMaterialKeys.every(key => {
    const target = targets[key] ?? 0
    return target > 0 && resources[key] >= target * 0.8
  })
  if (!hasSafeStocksForAllInputs) return 0

  const materialPressures = resourceOrder.map(key => {
    if (key === 'power' || key === 'population' || key === 'currency' || key === 'knowledge' || key === 'luxury') return 0
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
  difficulty?: Difficulty
  /** 启用后优化器按 defaultAction 自动处理事件 */
  autoEventsEnabled?: boolean
  /** 事件链进度 */
  chainProgress?: Record<string, number>
}

export function planFacilityAutomation(input: PlanInput): AutomationPlan {
  const reserveFloors = { ...defaultReserveFloors, ...input.reserveFloors } as Resources
  const weights = { ...resourceWeights, ...input.weights } as Resources
  const horizon = input.capitalHorizonYears ?? 5
  const year = input.year ?? 0
  const difficulty = input.difficulty ?? 'normal'
  const stateById: Record<FacilityId, FacilityState> = Object.fromEntries(
    facilityOrder.map(id => [id, input.facilities.find(item => item.id === id) ?? { id, level: 0 }]),
  ) as Record<FacilityId, FacilityState>
  const workingMethods = Object.fromEntries(
    facilityOrder.map(id => [
      id,
      selectProductionMethod(facilityEconomySpecs[id].productionMethods, input.techs ?? [], input.productionMethods?.[id]).id,
    ]),
  ) as Record<FacilityId, ProductionMethodId>
  const targetLevels: Record<FacilityId, number> = Object.fromEntries(
    facilityOrder.map(id => [id, stateById[id].level]),
  ) as Record<FacilityId, number>

  const initialBreach = reserveBreach(input.resources, reserveFloors)

  let workingResources = { ...input.resources }
  let workingTechs = [...(input.techs ?? [])]
  let weightedProfit = 0
  const actions: AutomationAction[] = []
  const technologyActions: TechnologyAutomationAction[] = []
  const methodActions: MethodAutomationAction[] = []

  // 自动事件处理：按 defaultAction 模拟事件效果
  if (input.autoEventsEnabled) {
    const eraRank = { early: 1, mid: 2, late: 3 }
    const maxEra = getCurrentGameEra(input.facilities)

    const eventProgress = { ...(input.chainProgress ?? {}) }
    // 处理每个有未完成步骤且属于当前时期的事件链
    for (const chain of eventChains) {
      const progress = eventProgress[chain.id] ?? 0
      if (progress >= chain.events.length) continue
      if (eraRank[chain.stage] > eraRank[maxEra]) continue

      const step = chain.events[progress]
      if (step.defaultAction !== 'accept') {
        // 跳过（dismiss 将链标记为完成）
        if (step.defaultAction === 'dismiss') eventProgress[chain.id] = chain.events.length
        continue
      }

      const effect = step.offer ?? (step.rolls?.length ? step.rolls[0] : undefined)
      if (!effect) continue

      // 检查支付能力
      if (!canAfford(workingResources, effect.take)) continue

      workingResources = applyBundle(applyBundle(workingResources, effect.take, -1), effect.give)
      if (effect.tech && !hasTech(workingTechs, effect.tech as any)) {
        workingTechs = [...workingTechs, effect.tech]
        technologyActions.push({
          techId: effect.tech as any,
          name: effect.tech,
          score: 0,
          weightedGain: 0,
          weightedCost: 0,
          cost: {},
          projectedResources: { ...workingResources },
        })
      }
      eventProgress[chain.id] = progress + 1
    }
  }

  const overstockTechnologyBonus = () => {
    const materialSurplus =
      Math.max(0, workingResources.alloy - reserveFloors.alloy * 4) * weights.alloy +
      Math.max(0, workingResources.regolith - reserveFloors.regolith * 8) * weights.regolith +
      Math.max(0, workingResources.currency - reserveFloors.currency * 6) * weights.currency
    return Math.min(24, materialSurplus / 1200)
  }

  // 后期判断：年份阈值随难度浮动（成本越高越晚启动量子核心）
  const lateGameYearThreshold = difficulty === 'easy' ? 400 : difficulty === 'normal' ? 550 : difficulty === 'hard' ? 680 : 790
  const isLateGame = () => {
    if (year < lateGameYearThreshold) return false
    const popRatio = input.resources.population / Math.max(1, input.population?.capacity ?? 1)
    if (popRatio < 0.5) return false
    const coreFacilities = ['E1', 'C1', 'K', 'B', 'F', 'L'] as FacilityId[]
    const avgCoreLevel = coreFacilities.reduce((sum, id) => sum + (stateById[id]?.level ?? 0), 0) / coreFacilities.length
    const levelThreshold = difficulty === 'easy' ? 6 : 7
    return avgCoreLevel >= levelThreshold
  }

  // 后期星舰战略加成：殖民地已稳固，全力推进御座号（难度越高加成越强）
  const lateGameVictoryBonus = (id: FacilityId) => {
    if (!isLateGame()) return 0
    if (id === 'D') {
      const base = difficulty === 'easy' ? 30 : difficulty === 'normal' ? 40 : difficulty === 'hard' ? 45 : 60
      return base + overstockTechnologyBonus() * 3
    }
    if (id === 'L' && (stateById.D?.level ?? 0) > 0) return 5
    return 0
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
    if (!requiredTech && !canBuildFacility(spec, workingTechs)) return null

    const buildCost = projectFacilityCost(spec, current.level, workingTechs, difficulty)
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
    const nextYearProjection = applyBundle(projectedResources, upgradedNet)

    const normalGain = weightedValue(annualGain, weights)
    const weightedGain = Math.max(normalGain, projectSinkGain(id, current.level, projectedResources, annualGain, reserveFloors, weights))
    const tradePremium = tradePlan.trades.reduce((sum, trade) => sum + estimateTradePremium(trade, weights), 0)
    const currentDeficitPremium = deficitPremium(workingResources)
    const immediateDeficitPremium = deficitPremium(projectedResources)
    const nextDeficitPremium = deficitPremium(nextYearProjection)
    const deficitPremiumDelta = Math.max(immediateDeficitPremium, nextDeficitPremium) - currentDeficitPremium
    const deficitRelief = Math.max(0, currentDeficitPremium - Math.min(immediateDeficitPremium, nextDeficitPremium))
    const weightedCost = (weightedValue(cost, weights) + tradePremium) / horizon + Math.max(0, deficitPremiumDelta)
    let score = weightedGain - weightedCost + spec.priority * 0.45 + strategicBonus + lateGameVictoryBonus(id)
    score += deficitRelief * 1.5
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

  const evaluateMethod = (id: FacilityId): ReturnType<typeof evaluateTechnology> | (MethodAutomationAction & { kind: 'method'; projectedResources: Resources }) | null => {
    const spec = facilityEconomySpecs[id]
    if (isFixedFacility(id) || isHousingFacility(id)) return null
    const currentAssigned = Math.min(
      getFacilityWorkCapacity(id, stateById[id].level),
      input.staffing?.[id] ?? getFacilityWorkCapacity(id, stateById[id].level),
    )
    if (currentAssigned <= 0) return null
    const currentMethod = selectProductionMethod(spec.productionMethods, workingTechs, workingMethods[id])
    if (!canUseProductionMethod(currentMethod, workingTechs)) return null
    // 收集所有可用方法（包括当前方法），对所有方法独立评分后择优
    const usableMethods = [currentMethod, ...spec.productionMethods.filter(method => method.id !== currentMethod.id && canUseProductionMethod(method, workingTechs))]
    if (usableMethods.length <= 1) return null

    const modifiers = input.modifiers?.[id] ?? {}
    const evaluationTechs = workingTechs
    const horizon = Math.min(5, input.capitalHorizonYears ?? 5)

    const scored = usableMethods.map(method => {
      const net = projectFacilityNet(spec, currentAssigned, modifiers, evaluationTechs, method.id, stateById[id].level)
      // 绝对基础收益：不考虑与当前方法的差异，直接对产出做加权
      const baseValue = weightedValue(net, weights)

      // 短缺激励：当某资源低于储备底线时，该资源产出/消耗获得额外权重
      const shortageWeight = resourceOrder.reduce((sum, key) => {
        const v = net[key] ?? 0
        if (workingResources[key] < reserveFloors[key]) {
          return sum + v * weights[key] * 2
        }
        return sum
      }, 0)

      // 赤字投影：应用该方法的净产出后，评估未来赤字风险
      const projected = applyBundle(workingResources, net)
      const forwardProjection = applyBundle(projected, scaleGain(net, horizon))
      const currentDeficit = deficitPremium(workingResources)
      const immediateDeficit = deficitPremium(projected)
      const forwardDeficit = deficitPremium(forwardProjection)
      const deficitDelta = Math.max(0, Math.max(immediateDeficit, forwardDeficit * 0.6) - currentDeficit)

      // 后期星舰驱动：若方法产出 quantumCore 且殖民地进入后期，强力加分
      const victoryPressure = isLateGame() && (net.quantumCore ?? 0) > 0
        ? (net.quantumCore ?? 0) * weights.quantumCore * 6
        : 0

      return {
        method,
        score: baseValue + shortageWeight - deficitDelta * 2 + victoryPressure,
        net,
      }
    })

    scored.sort((a, b) => b.score - a.score)
    const best = scored[0]

    // 最优方法就是当前方法，无需切换
    if (best.method.id === currentMethod.id) return null

    // 需要有一定收益才切换（MinScoreThreshold 过滤噪声）
    const currentScore = scored.find(s => s.method.id === currentMethod.id)?.score ?? 0
    const improvement = best.score - currentScore
    if (improvement <= 0.01) return null

    return {
      kind: 'method' as const,
      facilityId: id,
      fromMethodId: currentMethod.id,
      toMethodId: best.method.id,
      score: improvement,
      weightedGain: improvement,
      projectedResources: applyBundle(workingResources, best.net),
    }
  }

  const MAX_LOOP_ITERATIONS = 200
  let loopIteration = 0
  while (loopIteration < MAX_LOOP_ITERATIONS) {
    loopIteration++
    const candidates = [
      ...facilityOrder.map(evaluate),
      ...Object.values(technologyCatalog).map(evaluateTechnology),
      ...facilityOrder.map(evaluateMethod),
    ]
    const ranked = candidates
      .filter(c => c != null)
      .sort((a, b) => b.score - a.score)

    const best = ranked[0]
    if (!best || best.score <= 0) break

    if (best.kind === 'method') {
      workingMethods[best.facilityId] = best.toMethodId
      weightedProfit += best.score
      methodActions.push({
        facilityId: best.facilityId,
        fromMethodId: best.fromMethodId,
        toMethodId: best.toMethodId,
        score: best.score,
        weightedGain: best.weightedGain,
        projectedResources: best.projectedResources,
      })
      continue
    }

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
      methodActions: [],
      staffingActions: [],
      targetLevels,
      weightedProfit: 0,
      projectedResources: { ...input.resources },
    }
  }

  // 人力分配：将自由人口分配到空置岗位，按加权产出排序
  const staffingActions: StaffingAction[] = []
  const totalStaffed = facilityOrder.reduce((sum, id) => sum + (input.staffing?.[id] ?? 0), 0)
  let freePopulation = Math.max(0, Math.floor((input.resources?.population ?? 0) - totalStaffed))

  if (freePopulation > 0) {
    // 按当前边际产出排序：优先填最高价值空缺
    const facilityMargins = facilityOrder
      .filter(id => !isHousingFacility(id) && !isFixedFacility(id))
      .map(id => {
        const capacity = getFacilityWorkCapacity(id, stateById[id]?.level ?? 0)
        const current = input.staffing?.[id] ?? 0
        const deficit = capacity - current
        if (deficit <= 0) return null
        const spec = facilityEconomySpecs[id]
        const method = selectProductionMethod(spec.productionMethods, workingTechs, workingMethods[id])
        const modifiers = input.modifiers?.[id] ?? {}
        const addition = projectFacilityNet(spec, Math.min(capacity, current + 1), modifiers, workingTechs, method.id, stateById[id]?.level ?? 1)
        const base = projectFacilityNet(spec, current, modifiers, workingTechs, method.id, stateById[id]?.level ?? 1)
        const margin = weightedValue(addition, weights) - weightedValue(base, weights)
        return { id, current, capacity, deficit, margin }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.margin - a.margin)

    facilityMargins.forEach(item => {
      if (freePopulation <= 0) return
      const assign = Math.min(freePopulation, item.deficit)
      staffingActions.push({
        facilityId: item.id,
        fromStaff: item.current,
        toStaff: item.current + assign,
        score: item.margin,
      })
      freePopulation -= assign
    })
  }

  return {
    mode: 'auto' as const,
    actions,
    technologyActions,
    methodActions,
    staffingActions,
    targetLevels,
    weightedProfit,
    projectedResources: workingResources,
  }
}

/**
 * 人力自动纠正 —— 当物质资源跌破债务上限时，精确撤走最大消耗设施中对应数量的岗位，
 * 并按优先级将释放的人力重分配到有闲置容量的设施。
 * 返回调整后的人力配置和释放总数。
 */
export function autoCorrectStaffing(
  resources: Resources,
  facilities: FacilityState[],
  staffing: Record<FacilityId, number>,
  techs: string[],
  productionMethods: Partial<Record<FacilityId, ProductionMethodId>>,
  debtLimits: Partial<Resources> = resourceDebtLimits,
): { adjustedStaffing: Record<FacilityId, number>; releasedWorkers: number } {
  const adjusted = { ...staffing }
  let released = 0

  // 阶段一：对被突破上限的资源，找到最大消费者并按超额量精确撤人
  resourceOrder.forEach(key => {
    const limit = debtLimits[key]
    if (limit === undefined) return
    if ((resources[key] ?? 0) >= limit) return

    const overshoot = limit - (resources[key] ?? 0)

    // 找到当前在职的、每岗消耗该资源最多的设施
    const biggestConsumer = facilityOrder
      .filter(id => adjusted[id] > 0)
      .map(id => {
        const spec = facilityEconomySpecs[id]
        if (isHousingFacility(id) || isFixedFacility(id)) return null
        const method = selectProductionMethod(spec.productionMethods, techs, productionMethods[id])
        const perJob = method.input[key] ?? 0
        if (perJob <= 0) return null
        return { id, perJob, totalDaily: perJob * adjusted[id] }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.totalDaily - a.totalDaily)[0]

    if (!biggestConsumer) return

    // 精确撤人：超额量 + 5% 债务上限缓冲，防止撤人后立即反弹
    const buffer = Math.abs(limit) * 0.05
    const jobsToRemove = Math.min(
      adjusted[biggestConsumer.id],
      Math.max(1, Math.ceil((overshoot + buffer) / Math.max(0.01, biggestConsumer.perJob))),
    )

    adjusted[biggestConsumer.id] -= jobsToRemove
    released += jobsToRemove
  })

  // 阶段二：按设施优先级将释放的人力重分配到有闲置容量的设施（排除刚撤人的设施防回弹）
  if (released > 0) {
    let remaining = released
    const penalizedIds = new Set(
      resourceOrder
        .filter(key => {
          const limit = debtLimits[key]
          return limit !== undefined && (resources[key] ?? 0) < limit
        })
        .map(key => {
          return facilityOrder
            .filter(id => adjusted[id] < (staffing[id] ?? 0))
            .map(id => {
              const spec = facilityEconomySpecs[id]
              if (isHousingFacility(id) || isFixedFacility(id)) return null
              const method = selectProductionMethod(spec.productionMethods, techs, productionMethods[id])
              return { id, perJob: method.input[key] ?? 0 }
            })
            .filter((c): c is NonNullable<typeof c> => c !== null && c.perJob > 0)
            .sort((a, b) => (b.perJob * (staffing[b.id] ?? 0)) - (a.perJob * (staffing[a.id] ?? 0)))[0]?.id
        })
        .filter((id): id is FacilityId => id !== undefined),
    )
    const candidates = facilityOrder
      .filter(id => {
        if (penalizedIds.has(id)) return false
        if (isHousingFacility(id) || isFixedFacility(id)) return false
        const capacity = getFacilityWorkCapacity(id, facilities.find(f => f.id === id)?.level ?? 0)
        return capacity > 0 && adjusted[id] < capacity
      })
      .map(id => ({
        id,
        priority: facilityEconomySpecs[id].priority,
        capacity: getFacilityWorkCapacity(id, facilities.find(f => f.id === id)?.level ?? 0),
        current: adjusted[id],
      }))
      .sort((a, b) => b.priority - a.priority)

    candidates.forEach(c => {
      if (remaining <= 0) return
      const assignable = Math.min(remaining, c.capacity - c.current)
      adjusted[c.id] += assignable
      remaining -= assignable
    })
  }

  return { adjustedStaffing: adjusted, releasedWorkers: released }
}
