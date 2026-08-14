import { getFacilityWorkCapacity, getHousingCapacity, isFixedFacility, isHousingFacility } from './calendar'
import { ecologyRingPhases, facilityEconomySpecs, facilityOrder, shipProjectStages } from './facilities'
import { canAfford, applyBundle, defaultReserveFloors, emptyResources, resourceMeta, resourceOrder, resourceWeights, weightedValue } from './resources'
import { canBuildFacility, canUseProductionMethod, estimateTechnologyValue, hasTech, hasTechnologyPrerequisites, selectProductionMethod, technologyCatalog } from './technologies'
import { difficultyConfigs, type Difficulty } from './difficulty'
import { emergencyCreditDebtLimit, estimateResourceDeficitPremium, estimateTradePremium, planAutoTradesForCost, resourceDebtLimits } from './trade'
import { projectFacilityCost, projectFacilityNet, projectTechnologyCost } from './production'
import { eventChains, getCurrentGameEra } from '../events'
import type { AutomationAction, AutomationPlan, FacilityId, FacilityModifiers, FacilityState, MethodAutomationAction, PopulationProjection, ProductionMethod, ProductionMethodId, ResourceKey, Resources, StaffingAction, TechnologyAutomationAction, TechnologySpec } from './types'
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

/**
 * D/R 材料就绪度：当前库存相对储备线的富余度（取阶段材料中最短板，0-1）。
 * 库存低于储备线时按比例减速，让 D/R 在材料紧张时自动放缓而非硬烧库存。
 */
const computeSinkReadiness = (resources: Resources, stageInput: Partial<Resources>, floors: Resources): number => {
  let readiness = 1
  resourceOrder.forEach(key => {
    if (key === 'power' || key === 'population' || key === 'knowledge' || key === 'luxury' || key === 'currency') return
    const required = stageInput[key] ?? 0
    if (required <= 0) return
    const stock = Math.max(0, resources[key] ?? 0)
    const floor = floors[key] ?? 0
    if (floor <= 0) return
    // 库存相对储备线的富余度：低于储备线时按比例减速
    readiness = Math.min(readiness, stock / floor)
  })
  return Math.max(0, Math.min(1, readiness))
}

/** 是否仍存在可研究（前置已满足且未解锁的非设施许可）科技。结果按已解锁科技集合缓存。 */
const unresearchedTechCache = new Map<string, boolean>()
const hasUnresearchedTech = (techs: string[]): boolean => {
  const key = techs.join('|')
  const cached = unresearchedTechCache.get(key)
  if (cached !== undefined) return cached
  const result = Object.values(technologyCatalog).some(tech => {
    if (tech.category === 'construction') return false
    if (hasTech(techs, tech.id)) return false
    return hasTechnologyPrerequisites(tech.id, techs)
  })
  unresearchedTechCache.set(key, result)
  return result
}

const scaleGain = (gain: Partial<Resources>, factor: number): Partial<Resources> => {
  const scaled: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    const v = gain[key] ?? 0
    if (v !== 0) scaled[key] = v * factor
  })
  return scaled
}

// D/R 蓄水池加分：盈余资源价值越高、越接近覆盖整个阶段投入，加分越高（非线性）。
// 当盈余价值 >= 阶段投入总价值时，给到最高分，表示可以「全力冲刺」。
const MAX_SINK_GAIN = 300

/** 扩建成本摊销天数：按约 3 个王月（90 御日）回收，避免 horizon=360 把成本摊薄到趋近 0。 */
const COST_AMORTIZATION_DAYS = 90

/** 维生跌破储备线的惩罚系数：扩建若让水/氧/生物质一年内跌破储备线，重罚。 */
const LIFE_SUPPORT_SAFETY_PENALTY = 6

/** D/R 材料「盈余加分」权重：盈余比例越高，加分越高（与材料消耗减分独立加权，不做符号翻转）。 */
const SURPLUS_SINK_BONUS_WEIGHT = 1

const projectSinkGain = (
  id: FacilityId,
  currentLevel: number,
  resources: Resources,
  reserveFloors: Resources,
) => {
  if (!isProjectSinkFacility(id)) return 0
  if (id === 'D' && currentLevel >= facilityEconomySpecs.D.maxLevel) return 0
  if (id === 'R' && currentLevel >= facilityEconomySpecs.R.maxLevel) return 0

  const stage = id === 'D' ? shipProjectStages[0] : ecologyRingPhases[0]
  const stageTotalValue = weightedValue(stage.input, resourceWeights)
  if (stageTotalValue <= 0) return 0

  const surplusValue = resourceOrder.reduce((sum, key) => {
    const surplus = (resources[key] ?? 0) - (reserveFloors[key] ?? 0)
    return surplus > 0 ? sum + surplus * resourceWeights[key] : sum
  }, 0)

  const ratio = surplusValue / stageTotalValue
  if (ratio <= 0) return 0
  return Math.min(MAX_SINK_GAIN, MAX_SINK_GAIN * ratio * ratio)
}

type StaffingRating = {
  id: FacilityId
  capacity: number
  perJobNet: Partial<Resources>
  score: number
}

type StaffingRatingInput = {
  resources: Resources
  levels: Record<FacilityId, number>
  staffing: Partial<Record<FacilityId, number>>
  techs: string[]
  productionMethods: Partial<Record<FacilityId, ProductionMethodId>>
  modifiers: Partial<Record<FacilityId, FacilityModifiers>>
  reserveFloors: Resources
  sinkStageInputs: Partial<Record<'D' | 'R', Partial<Resources>>>
}

/**
 * 人力分配的唯一评分口径：按每岗净值 + 电力裕度 + 赤字溢价 + D/R 盈余加分，
 * 计算各生产设施在给定库存/等级/科技/生产方式下的排序结果。
 * 扩建评估（projectStaffing）与每日实际分配（rebalanceStaffing）共用此函数，避免两套口径漂移。
 */
function rateStaffingFacilities(input: StaffingRatingInput): StaffingRating[] {
  const { resources, levels, staffing, techs, productionMethods, modifiers, reserveFloors, sinkStageInputs } = input
  const rated: StaffingRating[] = []
  const totalNet = emptyResources()
  let powerConsumption = 0

  facilityOrder.forEach(id => {
    const spec = facilityEconomySpecs[id]
    if (isHousingFacility(id) || isFixedFacility(id)) return
    const level = levels[id] ?? 0
    let capacity = getFacilityWorkCapacity(id, level)
    if (capacity <= 0) return
    // D/R 材料就绪度动态上限：材料不足时自动减速
    if (isProjectSinkFacility(id)) {
      const stageInput = sinkStageInputs[id as 'D' | 'R']
      if (stageInput) {
        const readiness = computeSinkReadiness(resources, stageInput, reserveFloors)
        capacity = Math.floor(capacity * readiness)
      }
      if (capacity <= 0) return
    }
    const method = selectProductionMethod(spec.productionMethods, techs, productionMethods[id])
    const perJobNet = projectFacilityNet(spec, 1, modifiers[id], techs, method.id, level)
    rated.push({ id, capacity, perJobNet, score: 0 })
    const assigned = Math.min(capacity, staffing[id] ?? 0)
    if (assigned > 0) {
      resourceOrder.forEach(key => {
        totalNet[key] += (perJobNet[key] ?? 0) * assigned
      })
      if ((perJobNet.power ?? 0) < 0) {
        powerConsumption += -(perJobNet.power ?? 0) * assigned
      }
    }
  })

  // 赤字权重：库存低于储备线，或净产出为负且逼近储备线时，抬升该资源的边际价值（电力单独按裕度处理）。
  const deficitWeights: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    if (key === 'population' || key === 'knowledge' || key === 'luxury' || key === 'power') return
    const floor = reserveFloors[key] ?? 0
    const stock = resources[key] ?? 0
    const net = totalNet[key] ?? 0
    let weight = 0
    if (stock < floor) {
      weight = Math.min(3, 1 + (floor - stock) / Math.max(1, floor))
    } else if (net < 0) {
      const daysToFloor = (stock - floor) / Math.abs(net)
      if (daysToFloor < 10) weight = Math.max(0.2, 1 - daysToFloor / 10)
    }
    if (weight > 0) deficitWeights[key] = weight
  })

  // 电力裕度评分：基于「净电力 / 绝对消耗」的连续权重，消除 0/1 阶跃导致的震荡。
  const powerMargin = totalNet.power ?? 0
  const powerScale = Math.max(1, powerConsumption)
  const powerWeight = Math.max(0, Math.min(3, 1 - powerMargin / powerScale))
  // 知识溢出（无可解锁科技）时评分归零，避免后期继续堆知识
  const knowledgeWeight = hasUnresearchedTech(techs) ? (resourceWeights.knowledge ?? 0) : 0

  rated.forEach(item => {
    const isSink = isProjectSinkFacility(item.id)
    let score = 0
    resourceOrder.forEach(key => {
      const netValue = item.perJobNet[key] ?? 0
      const baseWeight = key === 'power' ? powerWeight : key === 'knowledge' ? knowledgeWeight : resourceWeights[key]
      // 基础分：产出价值 + 材料/电力消耗减分
      score += netValue * baseWeight
    })
    // D/R 整体盈余加分：盈余价值相对当前阶段总投入的比例，连续、无翻转、无二值封锁。
    if (isSink) {
      const stageInput = sinkStageInputs[item.id as 'D' | 'R']
      if (stageInput) {
        let surplusValue = 0
        let stageCost = 0
        let materialValue = 0
        resourceOrder.forEach(key => {
          if (key === 'power' || key === 'population' || key === 'knowledge' || key === 'luxury') return
          const w = resourceWeights[key] ?? 0
          const stock = resources[key] ?? 0
          const floor = reserveFloors[key] ?? 0
          surplusValue += Math.max(0, stock - floor) * w
          stageCost += (stageInput[key] ?? 0) * w
          const netValue = item.perJobNet[key] ?? 0
          if (netValue < 0) materialValue += netValue * w
        })
        const ratio = stageCost > 0 ? Math.min(1, surplusValue / stageCost) : 0
        if (ratio > 0) score += (-materialValue) * ratio * SURPLUS_SINK_BONUS_WEIGHT
      }
    }
    resourceOrder.forEach(key => {
      const weight = deficitWeights[key] ?? 0
      if (weight > 0) score += (item.perJobNet[key] ?? 0) * resourceWeights[key] * weight
    })
    item.score = score
  })

  return rated.sort((a, b) => b.score - a.score)
}

/** 按评分贪心分配全部可用人口，返回各设施最终在岗数。 */
function assignStaffingByRating(rated: StaffingRating[], population: number): Record<FacilityId, number> {
  const next = Object.fromEntries(facilityOrder.map(id => [id, 0])) as Record<FacilityId, number>
  let workers = Math.max(0, Math.floor(population))
  for (const item of rated) {
    const assign = Math.min(item.capacity, workers)
    next[item.id] = assign
    workers -= assign
  }
  return next
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
  /** D/R 当前阶段所需材料总量（用于整体盈余比例评分） */
  sinkStageInputs?: Partial<Record<'D' | 'R', Partial<Resources>>>
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
  if (!hasUnresearchedTech(input.techs ?? [])) weights.knowledge = 0
  const sinkStageInputs = input.sinkStageInputs ?? {}
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

  // 后期星舰战略加成：殖民地已稳固，全力推进御座号（难度差异由星舰阶段资源倍率体现）
  const lateGameVictoryBonus = (id: FacilityId) => {
    if (!isLateGame()) return 0
    if (id === 'L' && (stateById.D?.level ?? 0) > 0) return 5
    return 0
  }

  const deficitPremium = (resources: Resources) =>
    estimateResourceDeficitPremium(resources, reserveFloors, Object.values(stateById), workingTechs, weights)

  // 以“当前总人口”为唯一约束的人力投影：与每日实际分配的 rebalanceStaffing 共用同一评分口径，
  // 返回候选设施在目标等级下按该口径能分到多少在岗人口。
  const projectStaffing = (candidateId: FacilityId, candidateLevel: number): number => {
    const projectionLevels = Object.fromEntries(
      facilityOrder.map(fid => [fid, fid === candidateId ? candidateLevel : (stateById[fid]?.level ?? 0)]),
    ) as Record<FacilityId, number>
    const rated = rateStaffingFacilities({
      resources: workingResources,
      levels: projectionLevels,
      staffing: input.staffing ?? {},
      techs: workingTechs,
      productionMethods: workingMethods,
      modifiers: input.modifiers ?? {},
      reserveFloors,
      sinkStageInputs,
    })
    return assignStaffingByRating(rated, workingResources.population)[candidateId] ?? 0
  }

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
    // 扩建收益按“当前总人口”约束下的人力投影计算：人口可随时重分配，
    // 候选设施能分到多少在岗人口由 projectStaffing 贪心分配决定，而非满员容量。
    let presentAssigned = 0
    let upgradedAssigned = 0
    if (isHousingFacility(id)) {
      presentAssigned = 0
      upgradedAssigned = 0
    } else {
      presentAssigned = Math.min(getFacilityWorkCapacity(id, current.level), input.staffing?.[id] ?? 0)
      upgradedAssigned = projectStaffing(id, current.level + 1)
    }
    const presentNet = projectFacilityNet(spec, presentAssigned, modifiers, evaluationTechs, input.productionMethods?.[id], current.level)
    const upgradedNet = projectFacilityNet(spec, upgradedAssigned, modifiers, evaluationTechs, input.productionMethods?.[id], current.level + 1)
    let strategicBonus = requiredTech ? overstockTechnologyBonus() : 0
    let housingCapacityPressure = false
    const annualGain = mergeBundles(upgradedNet)
    resourceOrder.forEach(key => {
      annualGain[key] = (upgradedNet[key] ?? 0) - (presentNet[key] ?? 0)
    })
    if (isHousingFacility(id)) {
      const presentCapacity = input.population?.capacity ?? (['K', 'H', 'M'] as FacilityId[]).reduce((sum, facilityId) => sum + getHousingCapacity(facilityId, stateById[facilityId]?.level ?? 0), 0)
      const addedCapacity = getHousingCapacity(id, current.level + 1) - getHousingCapacity(id, current.level)
      const vacancy = presentCapacity - input.resources.population
      housingCapacityPressure = vacancy <= 0
      const potentialMigrants = Math.min(addedCapacity, Math.max(0, (input.population?.growthPotential ?? 0.5) * horizon - vacancy))
      annualGain.population = potentialMigrants / Math.min(horizon, 120)
      // 新增人口的维生消耗计入扩建收益，避免住房在维生不足时被过度扩建
      const residentInput = spec.productionMethods[0].input
      for (const key of ['water', 'oxygen', 'biomass'] as ResourceKey[]) {
        annualGain[key] -= (residentInput[key] ?? 0) * potentialMigrants
      }
      if (vacancy <= (input.population?.growthPotential ?? 0.5) * 90) {
        strategicBonus += addedCapacity * weights.population / 80 + overstockTechnologyBonus()
      }
      if (housingCapacityPressure) {
        strategicBonus += addedCapacity * weights.population / 16
      }
    }

    const projectedResources = applyBundle(tradePlan.resources, cost, -1)
    // 施工扣费不得跌破物质资源债务上限或货币信贷上限
    const breachesDebtLimit = resourceOrder.some(key => {
      const limit = resourceDebtLimits[key]
      return limit !== undefined && (projectedResources[key] ?? 0) < limit
    })
    if (breachesDebtLimit || projectedResources.currency < emergencyCreditDebtLimit) return null
    const nextYearProjection = applyBundle(projectedResources, upgradedNet)

    // 维生安全：扩建后一年内水/氧/生物质不应跌破储备线（前瞻约束）
    let lifeSupportSafetyPenalty = 0
    for (const key of ['water', 'oxygen', 'biomass'] as ResourceKey[]) {
      const projected = nextYearProjection[key] ?? 0
      const floor = reserveFloors[key] ?? 0
      if (projected < floor) {
        lifeSupportSafetyPenalty += (floor - projected) * weights[key] * LIFE_SUPPORT_SAFETY_PENALTY
      }
    }

    const normalGain = weightedValue(annualGain, weights)
    const weightedGain = normalGain + projectSinkGain(id, current.level, workingResources, reserveFloors)
    const tradePremium = tradePlan.trades.reduce((sum, trade) => sum + estimateTradePremium(trade, weights), 0)
    const currentDeficitPremium = deficitPremium(workingResources)
    const immediateDeficitPremium = deficitPremium(projectedResources)
    const nextDeficitPremium = deficitPremium(nextYearProjection)
    const deficitPremiumDelta = Math.max(immediateDeficitPremium, nextDeficitPremium) - currentDeficitPremium
    const deficitRelief = Math.max(0, currentDeficitPremium - Math.min(immediateDeficitPremium, nextDeficitPremium))
    const weightedCost = (weightedValue(cost, weights) + tradePremium) / COST_AMORTIZATION_DAYS + Math.max(0, deficitPremiumDelta)
    let score = weightedGain - weightedCost + spec.priority * 0.01 + strategicBonus + lateGameVictoryBonus(id)
    score += deficitRelief * 1.5
    score -= lifeSupportSafetyPenalty
    if (housingCapacityPressure) score = Math.max(score, 6)
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

      // 后期星舰驱动：仅当知识已溢出（无可解锁科技）且方法产出 quantumCore 时才切换，
      // 避免过早从知识生产切换到量子核心生产导致后续科技研究停滞。
      const victoryPressure = isLateGame() && !hasUnresearchedTech(workingTechs) && (net.quantumCore ?? 0) > 0
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

  // 人力分配已由 rebalanceStaffing 在每日循环中统一执行（人口可重分配），
  // 优化器不再做“空余人口自动分配”这种低级补位。
  const staffingActions: StaffingAction[] = []

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

/**
 * 人力再平衡 —— 将人力视为随时可调的生产比例杠杆。
 * 每个御日根据当前库存与净产出，把劳动力按“基础价值 + 赤字溢价”重新分配到各生产设施，
 * 使赤字资源的生产者获得更高优先级、赤字资源的消费者被压低优先级，从而在赤字出现时及时纠偏，
 * 而不是等到跌破债务上限才被动撤人。
 */
export function rebalanceStaffing(
  resources: Resources,
  facilities: { id: FacilityId; level: number }[],
  staffing: Record<FacilityId, number>,
  techs: string[],
  productionMethods: Partial<Record<FacilityId, ProductionMethodId>>,
  modifiers: Partial<Record<FacilityId, FacilityModifiers>> = {},
  reserveFloors: Partial<Resources> = defaultReserveFloors,
  sinkStageInputs: Partial<Record<'D' | 'R', Partial<Resources>>> = {},
): Record<FacilityId, number> {
  const floors = { ...defaultReserveFloors, ...reserveFloors } as Resources
  const levels = Object.fromEntries(facilities.map(item => [item.id, item.level])) as Record<FacilityId, number>
  const rated = rateStaffingFacilities({
    resources,
    levels,
    staffing,
    techs,
    productionMethods,
    modifiers,
    reserveFloors: floors,
    sinkStageInputs,
  })
  return assignStaffingByRating(rated, resources.population)
}
