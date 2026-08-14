import { mkdirSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  applyBundle,
  buildFacilityModifiers,
  calculateCurrencyDebtInterest,
  canAfford,
  constrainDailyNet,
  defaultReserveFloors,
  defaultStartingTechs,
  difficultyConfigs,
  estimateLiquidationValue,
  facilityEconomySpecs,
  facilityOrder,
  gameCalendar,
  getConstructionDays,
  getDifficultyShipStages,
  getFacilityWorkCapacity,
  hasTech,
  isHousingFacility,
  projectDailyNet,
  projectFacilityCost,
  projectPopulationSystem,
  rebalanceStaffing,
  planAutoTradesForDeficits,
  resourceDebtLimits,
  settleDailyResources,
  resourceOrder,
  selectProductionMethod,
  ecologyRingPhases,
  technologyCatalog,
  type Difficulty,
  type FacilityId,
  type FacilityState,
  type PopulationPolicy,
  type ProductionMethodId,
  type ResourceKey,
  type Resources,
  type TechnologyId,
} from '../src/economy'
import { crownStewardOptimizer } from '../src/optimizers'

type ConstructionProject = {
  startedDay: number
  completeDay: number
  fromLevel: number
  toLevel: number
  cost: Partial<Resources>
}

type Snapshot = {
  day: number
  resources: Resources
  dailyNet: Resources
  economicTotal: number
  population: {
    total: number
    capacity: number
    availableCapacity: number
    net: number
    growthPotential: number
    lifeSupportRatio: number
    pressureDays: number
    status: string
  }
  levels: Record<FacilityId, number>
  staffing: Record<FacilityId, number>
  construction: Partial<Record<FacilityId, ConstructionProject>>
  cumulative: {
    started: number
    completed: number
    skippedForCost: number
    maxPopulation: number
    minWater: number
    minOxygen: number
    minBiomass: number
    capacityFullDays: number
    strainedDays: number
  }
}

type SimulationResult = {
  scenario: string
  difficulty: Difficulty
  assumptions: string[]
  snapshots: Snapshot[]
  final: Snapshot
  findings: string[]
  shipWinDay: number
}

const initialResources: Resources = {
  power: 24,
  water: 20,
  oxygen: 24,
  biomass: 16,
  regolith: 80,
  alloy: 60,
  quantumCore: 2,
  currency: 1000,
  population: 10,
  knowledge: 0,
  luxury: 0,
}

const initialLevels: Partial<Record<FacilityId, number>> = { E1: 1, C1: 1, K: 2, S: 1, L: 1 }

const round = (value: number) => Number(value.toFixed(2))
const roundResources = (resources: Resources): Resources =>
  Object.fromEntries(resourceOrder.map(key => [key, round(resources[key])])) as Resources
const emptyResources = (): Resources =>
  Object.fromEntries(resourceOrder.map(key => [key, 0])) as Resources
const mergeResources = (...bundles: Partial<Resources>[]): Resources => {
  const total = emptyResources()
  bundles.forEach(bundle => {
    resourceOrder.forEach(key => {
      total[key] += bundle[key] ?? 0
    })
  })
  return total
}

const completedTechnologyIds = (techs: string[]) =>
  Object.values(technologyCatalog).filter(tech => techs.some(item => item.startsWith(`${tech.id} `))).map(tech => tech.id)
const hasResearchPrerequisites = (techId: TechnologyId, techs: string[]) =>
  (technologyCatalog[techId].prerequisites ?? []).every(prerequisite => hasTech(techs, prerequisite))
const firstResearchableTechnology = () =>
  Object.values(technologyCatalog)
    .filter(tech => tech.category !== 'construction')
    .sort((a, b) => {
      const eraRank = { early: 1, mid: 2, late: 3 }
      return eraRank[a.era ?? 'early'] - eraRank[b.era ?? 'early'] || a.name.localeCompare(b.name, 'zh-Hans-CN')
    })[0].id

const makeFacilityMap = (levels: Record<FacilityId, number>): Record<FacilityId, FacilityState> =>
  Object.fromEntries(facilityOrder.map(id => [id, { id, level: levels[id] }])) as Record<FacilityId, FacilityState>

function simulateToDay1000(difficulty: Difficulty = 'normal'): SimulationResult {
  let day = 1
  let resources = { ...initialResources }
  const levels = Object.fromEntries(facilityOrder.map(id => [id, initialLevels[id] ?? 0])) as Record<FacilityId, number>
  const staffing = Object.fromEntries(facilityOrder.map(id => [
    id,
    isHousingFacility(id) ? 0 : getFacilityWorkCapacity(id, levels[id]),
  ])) as Record<FacilityId, number>
  const construction = Object.fromEntries(facilityOrder.map(id => [id, null])) as Record<FacilityId, ConstructionProject | null>
  const productionMethods = Object.fromEntries(
    facilityOrder.map(id => [id, selectProductionMethod(facilityEconomySpecs[id].productionMethods, defaultStartingTechs).id]),
  ) as Record<FacilityId, ProductionMethodId>
  let techs = [...defaultStartingTechs, 'TE2-0 月冕能源署建造许可', 'TC2-0 西海采掘署建造许可', 'TF-0 天工精炼署建造许可', 'TP-0 伊犁河谷建造许可', 'TR-0 月穹生态环建造许可', 'TL-0 问天研究实验室建造许可', 'TH-0 翡翠宫建造许可', 'TM-0 新月府建造许可', 'TD-0 冠冕星舰坞建造许可']
  let activeResearch = firstResearchableTechnology()
  let populationPressureDays = 0
  const policy: PopulationPolicy = 'ration'
  const autoTradeProtectionEnabled = true
  const autoTradeEnabled: Partial<Record<ResourceKey, boolean>> = {}
  const snapshots: Snapshot[] = []
  let shipWinDay = 0 // 三阶段全部完成且具备 TD-1 的御日
  let shipStageIndex = 0
  const shipStageProgress = emptyResources()
  const shipStages = getDifficultyShipStages(difficulty)
  let rPhaseIndex = 0
  const rPhaseProgress = emptyResources()
  const cumulative = {
    started: 0,
    completed: 0,
    skippedForCost: 0,
    maxPopulation: resources.population,
    minWater: resources.water,
    minOxygen: resources.oxygen,
    minBiomass: resources.biomass,
    capacityFullDays: 0,
    strainedDays: 0,
  }

  const protectedPopulationProjection = (resourceState: Resources) => {
    const preliminary = projectPopulationSystem({
      resources: resourceState,
      facilities: makeFacilityMap(levels),
      policy,
      techs,
      pressureDays: populationPressureDays,
    })
    const protection = planAutoTradesForDeficits(
      resourceState,
      {
        water: preliminary.lifeSupportCost.water ?? 0,
        oxygen: preliminary.lifeSupportCost.oxygen ?? 0,
        biomass: preliminary.lifeSupportCost.biomass ?? 0,
        regolith: defaultReserveFloors.regolith,
        alloy: 0,
        quantumCore: 0,
        luxury: 0,
      },
      facilityOrder.map(id => ({ id, level: levels[id] })),
      techs,
      autoTradeEnabled,
      autoTradeProtectionEnabled,
    )
    const interest = calculateCurrencyDebtInterest(protection.resources)
    return projectPopulationSystem({
      resources: interest > 0 ? applyBundle(protection.resources, { currency: -interest }) : protection.resources,
      facilities: makeFacilityMap(levels),
      policy,
      techs,
      pressureDays: populationPressureDays,
    })
  }

  const buildSnapshot = (dailyNet = emptyResources()): Snapshot => {
    const projection = protectedPopulationProjection(resources)
    return {
      day,
      resources: roundResources(resources),
      dailyNet: roundResources(dailyNet),
      economicTotal: round(estimateLiquidationValue(resources, techs)),
      population: {
        total: round(resources.population),
        capacity: round(projection.capacity),
        availableCapacity: round(projection.availableCapacity),
        net: round(projection.net.population ?? 0),
        growthPotential: round(projection.growthPotential),
        lifeSupportRatio: round(projection.lifeSupportRatio),
        pressureDays: populationPressureDays,
        status: projection.status,
      },
      levels: { ...levels },
      staffing: { ...staffing },
      construction: Object.fromEntries(Object.entries(construction).filter(([, project]) => project)) as Partial<Record<FacilityId, ConstructionProject>>,
      cumulative: { ...cumulative },
    }
  }

  snapshots.push(buildSnapshot())

  while (day < gameCalendar.finalDay) {
    const nextDay = day + 1
    const facilityStates = Object.fromEntries(facilityOrder.map(id => [
      id,
      { id, level: Math.min(getFacilityWorkCapacity(id, levels[id]), staffing[id]) },
    ])) as Record<FacilityId, FacilityState>
    const facilityLevels = { ...levels }
    const modifiers = Object.fromEntries(facilityOrder.map(id => [
      id,
      buildFacilityModifiers(levels.M, policy, 1),
    ]))
    // 星舰坞 / 月穹生态环按当前阶段切换生产方式
    productionMethods.D = facilityEconomySpecs.D.productionMethods[Math.min(shipStageIndex, shipStages.length - 1)].id
    productionMethods.R = facilityEconomySpecs.R.productionMethods[rPhaseIndex].id
    const productionNet = projectDailyNet({
      facilities: facilityStates,
      facilityLevels,
      modifiers,
      techs,
      productionMethods,
      globalBonus: policy === 'ration' ? { biomass: 1 } : {},
    })
    // 星舰阶段材料投入：材料已计入 MD 生产方式的 input（projectDailyNet 已消耗），这里累计进度并记录每日材料需求。
    const shipMaterialDaily = emptyResources()
    if (shipStageIndex < shipStages.length) {
      const shipStage = shipStages[shipStageIndex]
      const dMethodSpec = facilityEconomySpecs.D.productionMethods[shipStageIndex]
      const dCapacity = getFacilityWorkCapacity('D', levels.D)
      const dAssigned = Math.min(dCapacity, staffing.D ?? 0)
      // 实际工程进度按当前在岗数推进；采购目标按满员计算，打破「没人→不采购→没人」的死锁。
      const dProgressScale = dAssigned * (1 + Math.max(0, levels.D - 1) * facilityEconomySpecs.D.yieldGrowth)
      const dFullScale = dCapacity * (1 + Math.max(0, levels.D - 1) * facilityEconomySpecs.D.yieldGrowth)
      resourceOrder.forEach(key => {
        if (key === 'power') return
        const progressDaily = (dMethodSpec.input[key] ?? 0) * dProgressScale
        const materialDaily = (dMethodSpec.input[key] ?? 0) * dFullScale
        if (progressDaily > 0) shipStageProgress[key] += progressDaily
        if (materialDaily > 0) shipMaterialDaily[key] += materialDaily
      })
      const shipStageDone = resourceOrder.every(key => {
        const total = shipStage.input[key] ?? 0
        return total <= 0 || (shipStageProgress[key] ?? 0) >= total
      })
      if (shipStageDone) {
        shipStageIndex += 1
        if (shipStageIndex < shipStages.length) {
          resourceOrder.forEach(key => { shipStageProgress[key] = 0 })
        }
      }
    }
    // 月穹生态环阶段材料投入：材料已计入 MR 生产方式的 input（projectDailyNet 已消耗），这里累计进度并记录每日材料需求。
    const ringMaterialDaily = emptyResources()
    if (rPhaseIndex < ecologyRingPhases.length - 1) {
      const rPhase = ecologyRingPhases[rPhaseIndex]
      const rMethodSpec = facilityEconomySpecs.R.productionMethods[rPhaseIndex]
      const rCapacity = getFacilityWorkCapacity('R', levels.R)
      const rAssigned = Math.min(rCapacity, staffing.R ?? 0)
      // 实际工程进度按当前在岗数推进；采购目标按满员计算，打破「没人→不采购→没人」的死锁。
      const rProgressScale = rAssigned * (1 + Math.max(0, levels.R - 1) * facilityEconomySpecs.R.yieldGrowth)
      const rFullScale = rCapacity * (1 + Math.max(0, levels.R - 1) * facilityEconomySpecs.R.yieldGrowth)
      resourceOrder.forEach(key => {
        if (key === 'power') return
        const progressDaily = (rMethodSpec.input[key] ?? 0) * rProgressScale
        const materialDaily = (rMethodSpec.input[key] ?? 0) * rFullScale
        if (progressDaily > 0) rPhaseProgress[key] += progressDaily
        if (materialDaily > 0) ringMaterialDaily[key] += materialDaily
      })
      const rPhaseDone = resourceOrder.every(key => {
        const total = rPhase.input[key] ?? 0
        return total <= 0 || (rPhaseProgress[key] ?? 0) >= total
      })
      if (rPhaseDone) {
        rPhaseIndex += 1
        resourceOrder.forEach(key => { rPhaseProgress[key] = 0 })
      }
    }
    const sinkStageInputs = {
      D: shipStageIndex < shipStages.length ? shipStages[shipStageIndex].input : {},
      R: rPhaseIndex < ecologyRingPhases.length - 1 ? ecologyRingPhases[rPhaseIndex].input : {},
    }
    const afterProductionResources = settleDailyResources(resources, productionNet)
    const preliminaryPopulationProjection = projectPopulationSystem({
      resources: afterProductionResources,
      facilities: makeFacilityMap(levels),
      policy,
      techs,
      pressureDays: populationPressureDays,
    })
    // 采购目标 = 储备线 + 「生命维持 + 满员星舰/生态环材料」的当日需求。
    // 关键是把库存补到储备线之上（available>0），computeSinkReadiness 才会放行 D/R 岗位；
    // 否则「缺材料 → 撤人 → 更缺材料」的死锁会一直卡住生态环与星舰。
    const autoTradeTargets = {
      water: defaultReserveFloors.water + (preliminaryPopulationProjection.lifeSupportCost.water ?? 0) + (shipMaterialDaily.water ?? 0) + (ringMaterialDaily.water ?? 0),
      oxygen: defaultReserveFloors.oxygen + (preliminaryPopulationProjection.lifeSupportCost.oxygen ?? 0) + (shipMaterialDaily.oxygen ?? 0) + (ringMaterialDaily.oxygen ?? 0),
      biomass: defaultReserveFloors.biomass + (preliminaryPopulationProjection.lifeSupportCost.biomass ?? 0) + (shipMaterialDaily.biomass ?? 0) + (ringMaterialDaily.biomass ?? 0),
      regolith: defaultReserveFloors.regolith + (shipMaterialDaily.regolith ?? 0) + (ringMaterialDaily.regolith ?? 0),
      alloy: defaultReserveFloors.alloy + (shipMaterialDaily.alloy ?? 0) + (ringMaterialDaily.alloy ?? 0),
      quantumCore: defaultReserveFloors.quantumCore + (shipMaterialDaily.quantumCore ?? 0) + (ringMaterialDaily.quantumCore ?? 0),
      luxury: 0,
    }
    // 近似每日净增长 = 设施生产净产出 + 人口生命维持消耗，用于售卖盈余时判断哪些资源在净消耗
    const approximateDailyNet = mergeResources(productionNet, preliminaryPopulationProjection.net)
    const autoTradePlan = planAutoTradesForDeficits(
      afterProductionResources,
      autoTradeTargets,
      facilityOrder.map(id => ({ id, level: levels[id] })),
      techs,
      autoTradeEnabled,
      autoTradeProtectionEnabled,
      approximateDailyNet,
    )
    const currencyDebtInterest = calculateCurrencyDebtInterest(autoTradePlan.resources)
    const populationProjection = projectPopulationSystem({
      resources: currencyDebtInterest > 0 ? applyBundle(autoTradePlan.resources, { currency: -currencyDebtInterest }) : autoTradePlan.resources,
      facilities: makeFacilityMap(levels),
      policy,
      techs,
      pressureDays: populationPressureDays,
    })
    const rawDailyNet = mergeResources(productionNet, autoTradePlan.delta, { currency: -currencyDebtInterest }, populationProjection.net)

    // L6 吞吐率修正：物资稀缺时等比衰减全设施产出，防止日结深度恶化
    const constraintResult = constrainDailyNet(resources, rawDailyNet, resourceDebtLimits)
    resources = settleDailyResources(resources, constraintResult.constrainedNet)
    const dailyNet = constraintResult.constrainedNet

    // L1 人力重分配：按当前资源赤字重新平衡生产比例（人力是随时可调的杠杆）
    const rebalancedStaffing = rebalanceStaffing(
      resources,
      facilityOrder.map(id => ({ id, level: levels[id] })),
      staffing,
      techs,
      productionMethods,
      modifiers,
      defaultReserveFloors,
      sinkStageInputs,
    )
    Object.assign(staffing, rebalancedStaffing)
    populationPressureDays = populationProjection.nextPressureDays

    Object.entries(construction).forEach(([id, project]) => {
      if (!project || project.completeDay > nextDay) return
      levels[id as FacilityId] = project.toLevel
      construction[id as FacilityId] = null
      cumulative.completed += 1
      if (!isHousingFacility(id as FacilityId)) {
        const usedPopulation = facilityOrder.reduce((sum, facilityId) => sum + staffing[facilityId], 0)
        const freePopulation = Math.max(0, Math.floor(resources.population - usedPopulation))
        const addedCapacity = getFacilityWorkCapacity(id as FacilityId, project.toLevel) - getFacilityWorkCapacity(id as FacilityId, project.fromLevel)
        staffing[id as FacilityId] = Math.min(
          getFacilityWorkCapacity(id as FacilityId, project.toLevel),
          staffing[id as FacilityId] + Math.min(freePopulation, addedCapacity),
        )
      }
    })

    const activeResearchSpec = technologyCatalog[activeResearch]
    // 研究不再按每日吞吐逐日推进：知识库存达到研究成本即立刻解锁，
    // 研究速度完全由 L 的知识产出决定（L 满级产出即为知识供给上限）。
    if (activeResearchSpec && !hasTech(techs, activeResearch) && hasResearchPrerequisites(activeResearch, techs)) {
      // 研究成本与价值挂钩，难度倍率影响成本（costScaleMultiplier 越大研究越慢）。
      const requiredKnowledge = (activeResearchSpec.researchCost ?? 0) * difficultyConfigs[difficulty].costScaleMultiplier
      if (resources.knowledge >= requiredKnowledge) {
        resources = { ...resources, knowledge: resources.knowledge - requiredKnowledge }
        techs = techs.some(item => item.startsWith(`${activeResearch} `)) ? techs : [...techs, `${activeResearch} ${activeResearchSpec.name}`]
        activeResearch = firstResearchableTechnology()
      }
    }

    const postPopulationProjection = protectedPopulationProjection(resources)
    const plan = crownStewardOptimizer.run({
      resources,
      facilities: facilityOrder.map(id => ({ id, level: levels[id] })),
      staffing,
      population: postPopulationProjection,
      blockedFacilities: facilityOrder.filter(id => construction[id]),
      modifiers,
      globalBonus: policy === 'ration' ? { biomass: 1 } : {},
      reserveFloors: defaultReserveFloors,
      sinkStageInputs,
      techs,
      productionMethods,
      year: day,
      capitalHorizonYears: 360,
      difficulty,
    })
    const startedIds = new Set<FacilityId>()
    plan.methodActions.forEach(action => {
      productionMethods[action.facilityId] = action.toMethodId
    })
    plan.technologyActions.forEach(action => {
      if (!canAfford(resources, action.cost)) return
      resources = applyBundle(resources, action.cost, -1)
      if (!techs.some(item => item.startsWith(`${action.techId} `))) {
        techs = [...techs, `${action.techId} ${action.name}`]
      }
    })
    plan.actions.forEach(action => {
      if (startedIds.has(action.id) || construction[action.id]) return
      action.trades?.forEach(trade => {
        if (canAfford(resources, trade.input)) {
          resources = applyBundle(applyBundle(resources, trade.input, -1), trade.output)
        }
      })
      if (!canAfford(resources, action.cost)) {
        cumulative.skippedForCost += 1
        return
      }
      resources = applyBundle(resources, action.cost, -1)
      ;(action.technologyUnlocks ?? []).forEach(techId => {
        if (!techs.some(item => item.startsWith(`${techId} `))) {
          techs = [...techs, `${techId} ${technologyCatalog[techId].name}`]
        }
      })
      construction[action.id] = {
        startedDay: nextDay,
        completeDay: nextDay + getConstructionDays(techs),
        fromLevel: action.fromLevel,
        toLevel: action.toLevel,
        cost: action.cost,
      }
      cumulative.started += 1
      startedIds.add(action.id)
    })

    // 优化器人力重分配：将工人调到高边际产出岗位
    plan.staffingActions.forEach(action => {
      staffing[action.facilityId] = action.toStaff
    })

    day = nextDay
    cumulative.maxPopulation = Math.max(cumulative.maxPopulation, resources.population)
    cumulative.minWater = Math.min(cumulative.minWater, resources.water)
    cumulative.minOxygen = Math.min(cumulative.minOxygen, resources.oxygen)
    cumulative.minBiomass = Math.min(cumulative.minBiomass, resources.biomass)
    if (postPopulationProjection.status === 'full') cumulative.capacityFullDays += 1
    if (postPopulationProjection.status === 'strained') cumulative.strainedDays += 1
    if (shipWinDay === 0 && shipStageIndex >= shipStages.length && hasTech(techs, 'TD-1')) shipWinDay = nextDay
    if (day % 50 === 0 || day === gameCalendar.finalDay) snapshots.push(buildSnapshot(dailyNet))
  }

  const final = snapshots[snapshots.length - 1]
  const builtFacilities = facilityOrder.filter(id => final.levels[id] > 0)
  const firstUnlockedExpansionCosts = facilityOrder
    .filter(id => hasTech(techs, facilityEconomySpecs[id].requiredTech))
    .map(id => ({ id, cost: projectFacilityCost(facilityEconomySpecs[id], levels[id], techs) }))
  const findings = [
    `默认无事件、无额外建造科技时，最终人口 ${final.population.total}/${final.population.capacity}，低于 500 目标。`,
    `最终启用建筑 ${builtFacilities.join(', ')}；当前默认科技只允许 E1/C1/K 建造，B/L/H/M/S 等建筑没有进入自动经济。`,
    final.cumulative.started === 0
      ? `优化器共开工 0 项：新扩建成本按 4 岗/容量规模放大后，初始合金 14 不足以支付 E1/C1/K 任一首轮扩建。`
      : `优化器共开工 ${final.cumulative.started} 项、完工 ${final.cumulative.completed} 项。`,
    `最低生命维持库存：水 ${round(final.cumulative.minWater)}、氧气 ${round(final.cumulative.minOxygen)}、生物质 ${round(final.cumulative.minBiomass)}。`,
    `氧气在第 50 御日前后跌入紧张；B 水培生态球未默认解锁，自动系统没有可用氧气补给建筑。`,
    `容量满/紧张天数 ${final.cumulative.capacityFullDays}，生命维持紧张天数 ${final.cumulative.strainedDays}。`,
    `已具备科技：${completedTechnologyIds(techs).join(', ') || '无' }。`,
    `可诊断扩建候选：${firstUnlockedExpansionCosts.map(item => `${item.id} ${JSON.stringify(item.cost)}`).join('; ') || '无' }。`,
  ]

  findings.splice(
    0,
    findings.length,
    final.population.total >= 500
      ? `Without random events, final population is ${final.population.total}/${final.population.capacity}, meeting the 500 target.`
      : `Without random events, final population is ${final.population.total}/${final.population.capacity}, below the 500 target.`,
    `Built facilities: ${builtFacilities.join(', ')}. Auto-purchase protection is on; starport buys alloy/regolith on credit when below reserve floors.`,
    final.cumulative.started === 0
      ? 'The optimizer started no construction; early costs or tradable materials still need adjustment.'
      : `The optimizer started ${final.cumulative.started} projects and completed ${final.cumulative.completed}.`,
    `Liquidation value (economic total): ${round(final.economicTotal)} currency.`,
    `Minimum life-support stocks: water ${round(final.cumulative.minWater)}, oxygen ${round(final.cumulative.minOxygen)}, biomass ${round(final.cumulative.minBiomass)}.`,
    final.population.status === 'full'
      ? `The main bottleneck is now the designed housing cap: life support remains positive, and population fills ${final.population.capacity} capacity.`
      : `Population is still growing at day 1000: net ${final.population.net}/day with ${final.population.availableCapacity} spare housing capacity.`,
    `Capacity-full days: ${final.cumulative.capacityFullDays}; strained life-support days: ${final.cumulative.strainedDays}.`,
    `Completed techs: ${completedTechnologyIds(techs).join(', ') || 'none'}.`,
    `Diagnosable expansion candidates: ${firstUnlockedExpansionCosts.map(item => `${item.id} ${JSON.stringify(item.cost)}`).join('; ') || 'none'}.`,
  )

  findings.push(
    shipWinDay > 0
      ? `Ship victory achieved at day ${shipWinDay} (target: ${difficultyConfigs[difficulty].targetWinDay}).`
      : `Ship not completed by day 1000 (D level ${final.levels.D}).`,
    `Ecology ring: phase ${rPhaseIndex + 1} (${productionMethods.R}), staffing ${staffing.R}/${getFacilityWorkCapacity('R', levels.R)}.`,
  )

  return {
    scenario: `default-no-random-events-${crownStewardOptimizer.id}`,
    difficulty,
    assumptions: [
      '使用默认初始资源、默认科技、默认配给基线。',
      '不触发随机访客事件，不手动切换生产方式。',
      `每天运行 ${crownStewardOptimizer.name} 优化器；每座建筑有独立施工状态。`,
      '开启自动购入保护，生命维持与建设物资（含合金/月壤）低于储备底线时由星港信贷采购。',
      '每 50 御日记录一次结构化快照。',
    ],
    snapshots,
    final,
    findings,
    shipWinDay,
  }
}

function writeSimulationReport(result: SimulationResult, runIndex: number) {
  const outputDir = resolve(process.cwd(), 'test-results', 'simulation')
  mkdirSync(outputDir, { recursive: true })

  // 轮转：仅保留最近 10 次历史记录（json + md）
  const rotate = (ext: string) => {
    const files = readdirSync(outputDir).filter(name => new RegExp(`^run-\\d{3}\\.${ext}$`).test(name)).sort()
    while (files.length >= 10) {
      unlinkSync(join(outputDir, files.shift()!))
    }
  }
  rotate('json')
  rotate('md')

  const padded = String(runIndex).padStart(3, '0')
  const jsonPath = resolve(outputDir, `run-${padded}.json`)
  const mdPath = resolve(outputDir, `run-${padded}.md`)
  writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  writeFileSync(mdPath, [
    '# 1000 御日自动经济模拟',
    '',
    `场景：\`${result.scenario}\``,
    '',
    '## 假设',
    ...result.assumptions.map(item => `- ${item}`),
    '',
    '## 主要发现',
    ...result.findings.map(item => `- ${item}`),
    '',
    '## 最终快照',
    '',
    '```json',
    JSON.stringify(result.final, null, 2),
    '```',
    '',
    `结构化快照：\`${jsonPath}\``,
    '',
  ].join('\n'), 'utf8')
}

describe('1000-day headless simulation', () => {
  const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'ultimate']

  const difficultyIndex: Record<Difficulty, number> = { easy: 1, normal: 2, hard: 3, ultimate: 4 }

  difficulties.forEach(difficulty => {
    it(`runs ${difficulty} difficulty to day 1000 (1 run) and reports ship win day`, () => {
      const result = simulateToDay1000(difficulty)
      writeSimulationReport(result, difficultyIndex[difficulty])

      expect(result.final.day).toBe(1000)
      expect(result.final.resources.population).toBeGreaterThanOrEqual(defaultReserveFloors.population)

      const target = difficultyConfigs[difficulty].targetWinDay
      console.log(`\n[${difficulty}] pop=${result.final.population.total}/${result.final.population.capacity}, started=${result.final.cumulative.started}, shipWinDay=${result.shipWinDay} (target: ${target})\n`)
    }, 20000)
  })
})
