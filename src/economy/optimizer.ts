import { getFacilityWorkCapacity, getHousingCapacity, isFixedFacility, isHousingFacility } from './calendar'
import { ecologyRingPhases, facilityEconomySpecs, facilityOrder, shipProjectStages } from './facilities'
import { canAfford, applyBundle, defaultReserveFloors, emptyResources, resourceMeta, resourceOrder, resourceWeights, weightedValue } from './resources'
import { canBuildFacility, canUseProductionMethod, estimateTechnologyValue, hasTech, hasTechnologyPrerequisites, remainingResearchBacklog, selectProductionMethod, technologyCatalog } from './technologies'
import type { Difficulty } from './difficulty'
import { emergencyCreditDebtLimit, estimateResourceDeficitPremium, estimateTradePremium, hasOperationalStarport, planSellSurplusForCurrency, resourceDebtLimits, scaleBundle, starportTradeOffers } from './trade'
import { projectFacilityCost, projectFacilityNet, projectTechnologyCost } from './production'
import { eventChains, getCurrentGameEra } from '../events'
import type { AutoTrade, AutomationAction, AutomationPlan, FacilityId, FacilityModifiers, FacilityState, MethodAutomationAction, PopulationProjection, ProductionMethodId, ResourceKey, Resources, StaffingAction, TechnologyAutomationAction, TechnologySpec } from './types'

/** 【L3 内部】优化器按建造成本与储备线买入缺料（仅买入，不做售卖）。 */
const planAutoBuyForCost = (
  resources: Resources,
  cost: Partial<Resources>,
  facilities: FacilityState[],
  techs: string[],
  floors: Resources,
): { trades: AutoTrade[]; resources: Resources } => {
  let working = { ...resources }
  const trades: AutoTrade[] = []

  starportTradeOffers
    .filter(offer => offer.automated && hasTech(techs, offer.unlockTech))
    .forEach(offer => {
      const outputKeys = resourceOrder.filter(key => (offer.output[key] ?? 0) > 0)
      outputKeys.forEach(outputKey => {
        if (outputKey === 'power' || outputKey === 'population' || outputKey === 'knowledge' || outputKey === 'luxury') return
        const outputPerBatch = offer.output[outputKey] ?? 0
        if (outputPerBatch <= 0) return

        const target = (cost[outputKey] ?? 0) + floors[outputKey]
        const shortage = Math.max(0, target - working[outputKey])
        if (shortage <= 0) return

        const availableCurrency = Math.max(0, working.currency - (cost.currency ?? 0) - floors.currency)
        const currencyCost = offer.input.currency ?? 0
        const maxBatchesByCurrency = currencyCost > 0 ? Math.floor(availableCurrency / currencyCost) : Number.POSITIVE_INFINITY
        const maxBatchesByShortage = Math.ceil(shortage / outputPerBatch)
        const batches = Math.min(maxBatchesByCurrency, maxBatchesByShortage)
        if (batches <= 0 || !Number.isFinite(batches)) return

        const input = scaleBundle(offer.input, batches)
        const output = scaleBundle(offer.output, batches)
        working = applyBundle(applyBundle(working, input, -1), output)
        trades.push({ offerId: offer.id, name: offer.name, input, output })
      })
    })

  return { trades, resources: working }
}

/**
 * 【L3 optimizer】优化器高级贸易策略：自主决策购入与卖出的数量。
 * 先按建造成本与储备线计算缺料所需的货币；若可用货币不足，
 * 则售卖高于储备线的盈余物资补足货币，再完成买入。
 * 与 L2 的 planAutoTradesForDeficits（固定目标被动补货）口径互斥。
 */
export function planAutoTradesForCost(
  resources: Resources,
  cost: Partial<Resources>,
  facilities: FacilityState[],
  techs: string[] = [],
  reserveFloors: Partial<Resources> = defaultReserveFloors,
): { trades: AutoTrade[]; resources: Resources } {
  if (!hasOperationalStarport(facilities, techs)) return { trades: [], resources }

  const floors = { ...defaultReserveFloors, ...reserveFloors } as Resources
  const reservedCurrency = (cost.currency ?? 0) + floors.currency

  // 估算买入全部缺料所需货币（只做轻量求和，避免完整模拟一遍买入）
  let neededCurrency = 0
  starportTradeOffers
    .filter(offer => offer.automated && hasTech(techs, offer.unlockTech))
    .forEach(offer => {
      const outputKeys = resourceOrder.filter(key => (offer.output[key] ?? 0) > 0)
      outputKeys.forEach(outputKey => {
        if (outputKey === 'power' || outputKey === 'population' || outputKey === 'knowledge' || outputKey === 'luxury') return
        const outputPerBatch = offer.output[outputKey] ?? 0
        if (outputPerBatch <= 0) return
        const target = (cost[outputKey] ?? 0) + floors[outputKey]
        const shortage = Math.max(0, target - resources[outputKey])
        if (shortage <= 0) return
        neededCurrency += Math.ceil(shortage / outputPerBatch) * (offer.input.currency ?? 0)
      })
    })

  const availableCurrency = Math.max(0, resources.currency - reservedCurrency)

  let working = resources
  const trades: AutoTrade[] = []

  if (neededCurrency > availableCurrency) {
    // 售卖盈余补足货币；抬高建造成本所需资源的储备线，避免左手卖右手买
    const sellFloors = { ...floors }
    resourceOrder.forEach(key => {
      if ((cost[key] ?? 0) > 0) sellFloors[key] += cost[key] ?? 0
    })
    const sellPlan = planSellSurplusForCurrency(working, neededCurrency - availableCurrency, facilities, techs, sellFloors)
    working = sellPlan.resources
    trades.push(...sellPlan.trades)
  }

  const buyPlan = planAutoBuyForCost(working, cost, facilities, techs, floors)
  trades.push(...buyPlan.trades)
  return { trades, resources: buyPlan.resources }
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

const reserveBreach = (resources: Resources, floors: Resources) =>
  resourceOrder.find(key => resources[key] < floors[key])

const isProjectSinkFacility = (id: FacilityId) => id === 'R' || id === 'D'

/** D/R 就绪度判定的目标储备天数：库存需覆盖这么多天的单岗投入才允许满员。 */
const SINK_COVER_DAYS = 20

/**
 * D/R 材料就绪度：储备线之上的可用库存能覆盖多少天的「单岗」投入（取最短板，0-1）。
 *
 * 分母必须是每岗日耗，不能是 `reserveFloor`：储备线是 10 量级的常数，而工程配方是
 * 10~50/岗/日，满员时日耗数百，库存/储备线之比恒 > 1，就绪度永远为 1，减速形同虚设。
 * 同样也不能用 `sinkStageInputs`——那是阶段总量（数千），会把就绪度永久压到 0。
 * 因此这里直接取每岗净产出中的负项作为每岗日耗。
 */
const computeSinkReadiness = (resources: Resources, perJobNet: Partial<Resources>, floors: Resources): number => {
  let readiness = 1
  resourceOrder.forEach(key => {
    if (key === 'power' || key === 'population' || key === 'knowledge' || key === 'luxury' || key === 'currency') return
    const perJobDaily = -(perJobNet[key] ?? 0)
    if (perJobDaily <= 0) return
    const available = (resources[key] ?? 0) - (floors[key] ?? 0)
    if (available <= 0) {
      readiness = 0
      return
    }
    readiness = Math.min(readiness, available / (perJobDaily * SINK_COVER_DAYS))
  })
  return Math.max(0, Math.min(1, readiness))
}

/** 住房扩建评分用的人口增长假设（每日人数），与 growthPotential 解耦，避免人口增速下调时连锁压低住房扩建。 */
const HOUSING_GROWTH_ASSUMPTION = 1.5

/** 知识库存的目标缓冲天数：库存足以覆盖这么多天的 L 满级产出后，边际知识价值归零。 */
const KNOWLEDGE_BUFFER_DAYS = 30

/**
 * L 满级知识产出（60 岗 × 1 知识/岗/日）。研究改为「知识达标立即解锁」后，
 * 不再有每日吸收上限（原 maxResearchThroughput=10），知识供给上限即为 L 满级产出。
 */
const MAX_LAB_KNOWLEDGE_OUTPUT = 60

/**
 * 电力边际权重的下限。电力不可储存、不可交易，发电厂的唯一产出就是电力，
 * 因此其权重绝不能归零——否则发电厂评分为 0，会被整批撤人导致电网崩塌。
 */
const POWER_MIN_WEIGHT = 0.25

/**
 * 知识的边际权重：研究改为「知识达标立即解锁」，知识供给上限是 L 满级产出。
 * 因此「再多产 1 点知识」的价值取决于剩余科技树还需多少、以及现有库存能覆盖多少天。
 *
 * 只在「整棵树点完」时归零是不够的：L 满级产能远超单次研究需求时，
 * 会在树点完之前就堆出废库存。分母用 L 满级产出而非「当前实验室在岗数」，
 * 避免实验室没人时吸收速率按 1/日计、少量库存就显得能撑上百天的循环。
 */
const knowledgeMarginalWeight = (
  resources: Resources,
  techs: string[],
  baseWeight: number,
): number => {
  if (baseWeight <= 0) return 0
  const backlog = remainingResearchBacklog(techs)
  if (backlog <= 0) return 0
  const stocked = Math.max(0, resources.knowledge ?? 0)
  // 库存已能喂完剩余科技树 → 边际价值归零
  if (stocked >= backlog) return 0
  const bufferedDays = stocked / MAX_LAB_KNOWLEDGE_OUTPUT
  const urgency = Math.max(0, Math.min(1, 1 - bufferedDays / KNOWLEDGE_BUFFER_DAYS))
  return baseWeight * urgency
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
  /** 工程蓄水池（D/R）：净产出价值恒为负，其岗位由「盈余可支撑的天数」而非评分正负决定。 */
  isSink: boolean
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
    const method = selectProductionMethod(spec.productionMethods, techs, productionMethods[id])
    const perJobNet = projectFacilityNet(spec, 1, modifiers[id], techs, method.id, level)
    // D/R 材料就绪度动态上限：按每岗日耗判断库存能撑多久，材料不足时自动减速
    if (isProjectSinkFacility(id)) {
      capacity = Math.floor(capacity * computeSinkReadiness(resources, perJobNet, reserveFloors))
      if (capacity <= 0) return
    }
    rated.push({ id, capacity, perJobNet, score: 0, isSink: isProjectSinkFacility(id) })
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
  // 下限不能为 0：电力不可储存、不可交易，是纯中间品，发电厂的唯一产出就是电力。
  // 权重归零会让发电厂评分变成 0，被「不给非正分岗位派人」的规则整批撤空，
  // 电网随之崩塌（电力跌至负值 → 优化器进入 manual 模式 → 整局停摆）。
  const powerMargin = totalNet.power ?? 0
  const powerScale = Math.max(1, powerConsumption)
  const powerWeight = Math.max(POWER_MIN_WEIGHT, Math.min(3, 1 - powerMargin / powerScale))
  // 知识权重按「研究实际能吸收多少」折算，避免后期继续堆积无法消化的知识。
  const knowledgeWeight = knowledgeMarginalWeight(resources, techs, resourceWeights.knowledge ?? 0)

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

/**
 * 按评分贪心分配可用人口，返回各设施最终在岗数。
 *
 * 生产设施评分为负时不再兜底填人：负分意味着该岗位净产出价值为负（烧材料多于产出），
 * 让富余人口「反正闲着不如上岗」是亏损行为。空闲人口本身不额外消耗资源
 * （生命维持按居住人口结算），因此闲置严格优于负值生产。
 *
 * 工程蓄水池（D/R）例外：它们的配方没有产出，评分恒为负，用同一条规则会永久空转，
 * 星舰因此永远造不完。它们的岗位上限已由 `computeSinkReadiness` 按「盈余能撑多少天」
 * 收敛，这里只需让它们排在正收益生产设施之后，用剩下的人力推进工程。
 */
function assignStaffingByRating(rated: StaffingRating[], population: number): Record<FacilityId, number> {
  const next = Object.fromEntries(facilityOrder.map(id => [id, 0])) as Record<FacilityId, number>
  let workers = Math.max(0, Math.floor(population))
  // 先满足正收益的生产设施，再把剩余人力投入工程蓄水池
  const ordered = [
    ...rated.filter(item => !item.isSink && item.score > 0),
    ...rated.filter(item => item.isSink),
  ]
  for (const item of ordered) {
    if (workers <= 0) break
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

/** 【L3 optimizer】优化器主入口：在给定库存/科技/人力下自主决策扩建、科技、生产方式与贸易计划。 */
export function planFacilityAutomation(input: PlanInput): AutomationPlan {
  const reserveFloors = { ...defaultReserveFloors, ...input.reserveFloors } as Resources
  const weights = { ...resourceWeights, ...input.weights } as Resources
  // 知识按研究实际吸收速率折算边际价值（见 knowledgeMarginalWeight）。
  // 旧实现只在「整棵树点完」时才归零，无法阻止树点完之前的巨额过剩堆积。
  weights.knowledge = knowledgeMarginalWeight(input.resources, input.techs ?? [], weights.knowledge ?? 0)
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
  // evaluationTechs 必须包含本次动作会一并解锁的建造许可，否则新设施在投影里没有产出、
  // 评分为 0，会被「不给零分岗位派人」的规则判为不值得派人，从而永远无法首建。
  const projectStaffing = (candidateId: FacilityId, candidateLevel: number, evaluationTechs: string[] = workingTechs): number => {
    const projectionLevels = Object.fromEntries(
      facilityOrder.map(fid => [fid, fid === candidateId ? candidateLevel : (stateById[fid]?.level ?? 0)]),
    ) as Record<FacilityId, number>
    const rated = rateStaffingFacilities({
      resources: workingResources,
      levels: projectionLevels,
      staffing: input.staffing ?? {},
      techs: evaluationTechs,
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
      upgradedAssigned = projectStaffing(id, current.level + 1, evaluationTechs)
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
      const potentialMigrants = Math.min(addedCapacity, Math.max(0, HOUSING_GROWTH_ASSUMPTION * horizon - vacancy))
      annualGain.population = potentialMigrants / Math.min(horizon, 120)
      // 新增人口的维生消耗计入扩建收益，避免住房在维生不足时被过度扩建
      const residentInput = spec.productionMethods[0].input
      for (const key of ['water', 'oxygen', 'biomass'] as ResourceKey[]) {
        annualGain[key] -= (residentInput[key] ?? 0) * potentialMigrants
      }
      if (vacancy <= HOUSING_GROWTH_ASSUMPTION * 90) {
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
    const capacity = getFacilityWorkCapacity(id, stateById[id].level)
    if (capacity <= 0) return null
    // 生产方式评估按「满员产能」而非当前在岗数：人力分配依赖生产方式的评分，
    // 若反过来又要求先有在岗人口，两者会互锁——空转的实验室永远评不上 ML-2，
    // 于是永远没有量子核心，星舰第三阶段永久停滞（旧实现的死锁）。
    // 人力是随时可调的杠杆，这里评估的是「切换后满员运行是否更优」。
    const currentAssigned = capacity
    const currentMethod = selectProductionMethod(spec.productionMethods, workingTechs, workingMethods[id])
    if (!canUseProductionMethod(currentMethod, workingTechs)) return null
    // 收集所有可用方法（包括当前方法），对所有方法独立评分后择优
    const usableMethods = [currentMethod, ...spec.productionMethods.filter(method => method.id !== currentMethod.id && canUseProductionMethod(method, workingTechs))]
    if (usableMethods.length <= 1) return null

    const modifiers = input.modifiers?.[id] ?? {}
    const evaluationTechs = workingTechs
    const horizon = Math.min(5, input.capitalHorizonYears ?? 5)

    // 方法评分使用与人力分配一致的知识边际权重：知识产能已远超研究吸收速率时，
    // 继续按 flat weight 给知识计分会让 L 永远锁死在 ML-1，量子核心配方永不启用。
    const methodWeights = {
      ...weights,
      knowledge: knowledgeMarginalWeight(workingResources, workingTechs, resourceWeights.knowledge ?? 0),
    } as Resources

    const scored = usableMethods.map(method => {
      const net = projectFacilityNet(spec, currentAssigned, modifiers, evaluationTechs, method.id, stateById[id].level)
      // 绝对基础收益：不考虑与当前方法的差异，直接对产出做加权
      const baseValue = weightedValue(net, methodWeights)

      // 短缺激励：当某资源低于储备底线时，该资源产出/消耗获得额外权重
      const shortageWeight = resourceOrder.reduce((sum, key) => {
        const v = net[key] ?? 0
        if (workingResources[key] < reserveFloors[key]) {
          return sum + v * methodWeights[key] * 2
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

      // 后期星舰驱动：量子核心是第三阶段的硬门槛，一旦知识边际价值归零就应转产。
      // 旧条件额外要求 `!hasUnresearchedTech`（整棵树点完），而 TD-2 等科技依赖研究推进，
      // 实际上几乎不可达，导致 L 永远停在知识生产、量子核心只能靠采购。
      const victoryPressure = isLateGame() && methodWeights.knowledge <= 0 && (net.quantumCore ?? 0) > 0
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
    // mode='manual'：优化器因初始资源缺口主动让位（与 L1 玩家手动操作无关，仅表达「本轮无可执行计划」）。
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

  // 人力分配：L3 的 rebalanceStaffing 设计为每日循环统一执行，但当前 App.tsx 尚未接入
  // （优化器激活时仍由 L2 的 autoAllocateStaffing 按优先级分配），故此处不再产出 staffingActions。
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
 * 【L3 optimizer】人力再平衡 —— 优化器自有的人力分配工具（高级评分分配）。
 * 将人力视为随时可调的生产比例杠杆。
 * 每个御日根据当前库存与净产出，把劳动力按“基础价值 + 赤字溢价”重新分配到各生产设施，
 * 使赤字资源的生产者获得更高优先级、赤字资源的消费者被压低优先级，从而在赤字出现时及时纠偏，
 * 而不是等到跌破债务上限才被动撤人。
 *
 * 冲突说明：与系统自带的 autoCorrectStaffing（L2，债务上限触发式撤人）是两套互相冲突的分配口径，
 * 启用优化器时应停用 autoCorrectStaffing，统一使用本函数。
 * 现状：本函数已导出但 App.tsx 未调用（优化器激活时人力仍走 L2 的 autoAllocateStaffing）。
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
