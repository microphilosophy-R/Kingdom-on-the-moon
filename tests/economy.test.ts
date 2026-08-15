import { describe, expect, it } from 'vitest'
import {
  buildFacilityModifiers,
  canBuildFacility,
  defaultReserveFloors,
  defaultStartingTechs,
  calculateCurrencyDebtInterest,
  estimateResourceDeficitPremium,
  estimateTradePremium,
  facilityEconomySpecs,
  facilityOrder,
  gameCalendar,
  getConstructionDays,
  getFacilityWorkCapacity,
  getHousingCapacity,
  isFixedFacility,
  isHousingFacility,
  maxResearchThroughput,
  planAutoTradesForCost,
  planAutoTradesForDeficits,
  projectDailyFlow,
  projectAnnualNet,
  projectDailyNet,
  projectFacilityNet,
  projectPopulationSystem,
  projectFacilityCost,
  rebalanceStaffing,
  remainingResearchBacklog,
  researchThroughputFor,
  resourceMeta,
  resourceOrder,
  resourceWeights,
  selectProductionMethod,
  settleDailyResources,
  shipProjectStages,
  shipProjectTotalValue,
  technologyCatalog,
  weightedValue,
  type FacilityId,
  type FacilityState,
  type Resources,
} from '../src/economy'
import { createDisabledAutomationPlan, crownStewardOptimizer, gameOptimizers } from '../src/optimizers'

const baseFacilities: FacilityState[] = facilityOrder.map(id => ({ id, level: id === 'E1' || id === 'C1' || id === 'K' ? 1 : 0 }))

const richResources: Resources = {
  power: 500,
  water: 250,
  oxygen: 250,
  biomass: 220,
  regolith: 500,
  alloy: 500,
  quantumCore: 80,
  currency: 200,
  population: 200,
  knowledge: 120,
  luxury: 80,
}

describe('economy catalog', () => {
  it('keeps the philosophy resource and facility roster stable', () => {
    expect(resourceOrder).toEqual(['power', 'water', 'oxygen', 'biomass', 'regolith', 'alloy', 'quantumCore', 'currency', 'population', 'knowledge', 'luxury'])
    expect(resourceMeta.population.label).toBe('人口')
    expect(resourceMeta.luxury.source).toContain('翡翠宫')

    expect(facilityOrder).toEqual(['E1', 'C1', 'K', 'B', 'E2', 'C2', 'F', 'P', 'R', 'L', 'H', 'M', 'S', 'E3', 'D'])
    expect(facilityEconomySpecs.E1.name).toBe('日冕能源署')
    expect(facilityEconomySpecs.E2.name).toBe('月冕能源署')
    expect(facilityEconomySpecs.E3.name).toBe('归元装置')
    expect(facilityEconomySpecs.K.name).toBe('月面王城')
    expect(facilityEconomySpecs.S.maxLevel).toBe(1)
    expect(facilityEconomySpecs.S.baseUpgradeCost).toEqual({})
    expect(facilityEconomySpecs.R.phaseNotes).toHaveLength(4)
    expect(facilityEconomySpecs.D.code).toBe('D')
  })

  it('uses the solidified day calendar and resource values', () => {
    expect(gameCalendar).toMatchObject({
      dayName: '御日',
      finalDay: 1000,
      monthName: '王月',
      reignMonthDays: 50,
      normalMsPerDay: 1600,
      fastMsPerDay: 1000,
      optimizationIntervalDays: 50,
      expectedRealMinutes: 60,
    })
    expect(projectAnnualNet).toBe(projectDailyNet)
    expect(resourceWeights.regolith).toBe(2)
    expect(resourceWeights.alloy).toBe(8)
    expect(resourceWeights.quantumCore).toBe(320)
    expect(resourceWeights.luxury).toBe(1600)
  })

  it('settles power as a non-storable daily balance', () => {
    const next = settleDailyResources(richResources, { power: 12, alloy: 5 })
    expect(next.power).toBe(12)
    expect(next.alloy).toBe(505)
    expect(resourceMeta.power.storable).toBe(false)
  })

  it('keeps starport technologies bidirectional', () => {
    expect(technologyCatalog['TS-1'].note).toContain('双向贸易')
    expect(technologyCatalog['TS-2'].note).toContain('双向贸易')
    expect(technologyCatalog['TS-3'].name).toBe('玫瑰星球')
    expect(technologyCatalog['TS-3'].note).toContain('艺术奢侈品')
    expect(technologyCatalog['TS-3'].note).toContain('双向贸易')

    expect(resourceMeta.population.tradeRule).toContain('TS-1')
    expect(resourceMeta.population.tradeRule).toContain('双向贸易')
    expect(resourceMeta.knowledge.tradeRule).toContain('TS-2')
    expect(resourceMeta.knowledge.tradeRule).toContain('双向贸易')
    expect(resourceMeta.luxury.tradeRule).toContain('TS-3')
    expect(resourceMeta.luxury.tradeRule).toContain('双向贸易')
  })

  it('unlocks production methods through coded technologies without auto-switching', () => {
    const e1 = facilityEconomySpecs.E1
    expect(selectProductionMethod(e1.productionMethods, defaultStartingTechs).id).toBe('ME1-1')
    expect(projectFacilityNet(e1, 1, {}, defaultStartingTechs).power).toBe(3.96)
    expect(projectFacilityNet(e1, 1, {}, defaultStartingTechs).oxygen).toBeUndefined()

    const techs = [...defaultStartingTechs, 'TE1-1 纳米光催化剂']
    expect(selectProductionMethod(e1.productionMethods, techs).id).toBe('ME1-1')
    expect(selectProductionMethod(e1.productionMethods, techs, 'ME1-2').id).toBe('ME1-2')
    expect(projectFacilityNet(e1, 1, {}, techs).oxygen).toBeUndefined()

    const upgraded = projectFacilityNet(e1, 1, {}, techs, 'ME1-2')
    expect(upgraded.water).toBe(-0.6)
    expect(upgraded.oxygen).toBe(1.26)
  })

  it('keeps new production method technologies gated and marked', () => {
    expect(technologyCatalog['TC2-2']).toMatchObject({ name: '发现伊甸园', unlocks: 'MC2-2', alien: true, era: 'mid' })
    expect(technologyCatalog['TB-2']).toMatchObject({ name: '无水栽培技术', unlocks: 'MB-2', era: 'early' })
    expect(technologyCatalog['TF-1']).toMatchObject({ unlocks: 'MF-2', alien: true, era: 'mid' })
    expect(technologyCatalog['TP-1']).toMatchObject({ name: '合金作物', unlocks: 'MP-2', alien: true, era: 'mid' })
    expect(technologyCatalog['TG-1'].scope).toBe('G')
    expect(technologyCatalog['TE1-2'].category).toBe('facility-efficiency')
    expect(technologyCatalog['TL-2']).toMatchObject({ name: '研究吞吐量调度', category: 'facility-efficiency', era: 'mid' })
    expect(technologyCatalog['TL-3']).toMatchObject({ name: '高能课题队列', category: 'facility-efficiency', era: 'late' })

    expect(selectProductionMethod(facilityEconomySpecs.C2.productionMethods, ['TC2-0 西海采掘署建造许可']).id).toBe('MC2-1')
    expect(selectProductionMethod(facilityEconomySpecs.C2.productionMethods, ['TC2-0 西海采掘署建造许可', 'TC2-2 发现伊甸园'], 'MC2-2').id).toBe('MC2-2')
    expect(projectFacilityNet(facilityEconomySpecs.C2, 1, {}, ['TC2-0 西海采掘署建造许可', 'TC2-2 发现伊甸园'], 'MC2-2')).toMatchObject({ power: -1.4, water: 1.62, regolith: 1.08, alloy: 1.26 })

    expect(selectProductionMethod(facilityEconomySpecs.B.productionMethods, ['TB-0 水培生态球建造许可', 'TB-2 无水栽培技术'], 'MB-2').id).toBe('MB-2')
    expect(projectFacilityNet(facilityEconomySpecs.B, 1, {}, ['TB-0 水培生态球建造许可', 'TB-2 无水栽培技术'], 'MB-2')).toMatchObject({ regolith: -0.6, oxygen: 0.81, biomass: 0.88 })

    expect(projectFacilityNet(facilityEconomySpecs.F, 1, {}, ['TF-0 天工精炼署建造许可', 'TF-1 重原子炼金术'], 'MF-2')).toMatchObject({ power: -1.2, regolith: -1.6, oxygen: -0.87, alloy: 1.98, currency: 1.08 })
    expect(projectFacilityNet(facilityEconomySpecs.P, 1, {}, ['TP-0 伊犁河谷建造许可'])).toMatchObject({ water: -0.6, regolith: -1, oxygen: 1.26, biomass: 1.8 })
    expect(projectFacilityNet(facilityEconomySpecs.P, 1, {}, ['TP-0 伊犁河谷建造许可', 'TP-1 合金作物'], 'MP-2')).toMatchObject({ water: -0.6, regolith: -1, oxygen: 0.9, biomass: 1.26, alloy: 0.54 })
  })

  it('applies solidified efficiency and global technologies to facility net output', () => {
    expect(projectFacilityNet(facilityEconomySpecs.E1, 1, {}, ['TE1-0 日冕能源署建造许可', 'TE1-2 光伏阵列校准']).power).toBeCloseTo(4.158)
    expect(projectFacilityNet(facilityEconomySpecs.C1, 1, {}, ['TC1-0 静海采掘署建造许可', 'TC1-1 月面钻头阵列']).regolith).toBeCloseTo(1.512)
    const anchored = projectFacilityNet(facilityEconomySpecs.C2, 1, {}, ['TC2-0 西海采掘署建造许可', 'TC2-1 小行星锚定索'])
    expect(anchored.alloy).toBeCloseTo(1.134)
    expect(anchored.oxygen).toBeCloseTo(-0.42)
    expect(projectFacilityNet(facilityEconomySpecs.B, 1, {}, ['TB-0 水培生态球建造许可', 'TB-1 闭环藻膜培养']).biomass).toBeCloseTo(1.113)
    expect(projectFacilityNet(facilityEconomySpecs.F, 1, {}, ['TF-0 天工精炼署建造许可', 'TG-2 空间微波散热学']).power).toBeCloseTo(-1.14)
    const basicResearch = projectFacilityNet(facilityEconomySpecs.L, 1, {}, ['TL-0 问天研究实验室建造许可'])
    const throughputResearch = projectFacilityNet(facilityEconomySpecs.L, 1, {}, ['TL-0 问天研究实验室建造许可', 'TL-2 研究吞吐量调度'])
    expect(throughputResearch.power).toBeLessThan(basicResearch.power!)
    expect(throughputResearch.knowledge).toBeGreaterThan(basicResearch.knowledge!)
  })

  it('assigns computed technology value and research cost', () => {
    expect(technologyCatalog['TE1-0'].value).toBe(0)
    expect(technologyCatalog['TE1-0'].researchCost).toBe(0)
    expect(technologyCatalog['TE1-2'].value).toBeGreaterThan(0)
    expect(technologyCatalog['TG-1'].value).toBeGreaterThan(0)
    expect(technologyCatalog['TL-2'].researchCost).toBeGreaterThan(0)
  })

  it('defines technology prerequisites for the staged research tree', () => {
    expect(technologyCatalog['TE1-2'].prerequisites).toEqual(['TE1-1'])
    expect(technologyCatalog['TC2-2'].prerequisites).toEqual(['TC2-0', 'TS-0'])
    expect(technologyCatalog['TL-3'].prerequisites).toEqual(['TL-1', 'TG-2'])
    expect(technologyCatalog['TD-0'].prerequisites).toEqual(['TF-1', 'TL-1', 'TS-0'])
    Object.values(technologyCatalog).forEach(tech => {
      tech.prerequisites?.forEach(prerequisite => {
        expect(technologyCatalog[prerequisite]).toBeDefined()
      })
    })
  })

  it('keeps production method and technology codes synchronized', () => {
    const allMethods = facilityOrder.flatMap(id => facilityEconomySpecs[id].productionMethods.map(method => [id, method.id, method.unlockedBy] as const))
    const buildingTechs = Object.values(technologyCatalog).filter(tech => tech.unlocksFacility)
    allMethods.forEach(([facilityId, methodId, techId]) => {
      expect(methodId).toMatch(new RegExp(`^M${facilityId}-\\d+$`))
      if (techId) expect(technologyCatalog[techId]?.unlocks).toBe(methodId)
    })
    facilityOrder.forEach(id => {
      expect(facilityEconomySpecs[id].requiredTech).toBeDefined()
      expect(facilityEconomySpecs[id].requiredTech).toMatch(/^T[A-Z0-9]+-0$/)
      expect(technologyCatalog[facilityEconomySpecs[id].requiredTech!]?.unlocksFacility).toBe(id)
    })
    expect(buildingTechs).toHaveLength(facilityOrder.length)
    const retiredE3Tech = ['TE3', '1'].join('-')
    expect(technologyCatalog[retiredE3Tech as keyof typeof technologyCatalog]).toBeUndefined()

    Object.values(technologyCatalog).forEach(tech => {
      if (!tech.unlocks) return
      expect(allMethods.some(([, methodId]) => methodId === tech.unlocks)).toBe(true)
    })
  })

  it('locks the user-specified facility recipe inputs', () => {
    expect(facilityEconomySpecs.E2.productionMethods[0].input).toMatchObject({ regolith: 1.4 })
    expect(projectFacilityNet(facilityEconomySpecs.E3, 1).power).toBeUndefined()
    expect(projectFacilityNet(facilityEconomySpecs.E3, 1, {}, ['TE3-0 外星科技：微型黑洞约束'], 'ME3-1').power).toBe(6.48)
    expect(facilityEconomySpecs.E3.productionMethods[0].input).toEqual({})

    expect(facilityEconomySpecs.C1.productionMethods[0].input.power).toBeGreaterThan(0)
    expect(facilityEconomySpecs.C1.productionMethods[0].name).toBe('静海月面采掘')
    expect(facilityEconomySpecs.C1.productionMethods[0].note).toContain('本地月面')
    expect(facilityEconomySpecs.C2.productionMethods[0].name).toBe('西海小行星带采掘')
    expect(facilityEconomySpecs.C2.productionMethods[0].input).toMatchObject({ power: 1.4, oxygen: 0.4, biomass: 0.2 })
    expect(facilityEconomySpecs.C2.productionMethods[0].output.water).toBe(0.99)
    expect(facilityEconomySpecs.C2.productionMethods[0].note).toContain('小行星带')
    expect(facilityEconomySpecs.B.productionMethods[0].input.water).toBeGreaterThan(0)
    expect(facilityEconomySpecs.F.productionMethods[0].input).toMatchObject({ power: 1.2, regolith: 1.6 })
  })

  it('splits the ship victory project into three material stages', () => {
    expect(shipProjectStages).toEqual([
      expect.objectContaining({ id: 1, input: { alloy: 6000, oxygen: 6000 } }),
      expect.objectContaining({ id: 2, input: { alloy: 12000, regolith: 30000, biomass: 12000 } }),
      expect.objectContaining({ id: 3, input: { quantumCore: 400, luxury: 12, alloy: 18000, water: 12000, biomass: 18000 } }),
    ])
    shipProjectStages.forEach(stage => {
      expect(stage.input.currency).toBeUndefined()
      expect(stage.input.population).toBeUndefined()
    })
    expect(shipProjectTotalValue).toBeGreaterThan(0)
    expect(facilityEconomySpecs.D.productionMethods[0].input).toEqual({ power: 16, alloy: 10, oxygen: 10 })
    expect(facilityEconomySpecs.D.productionMethods[0].output).toEqual({})
  })

  it('treats the ecological ring default phase as a project sink, not an output phase', () => {
    expect(selectProductionMethod(facilityEconomySpecs.R.productionMethods, ['TR-0 月穹生态环建造许可']).id).toBe('MR-1')
    const net = projectFacilityNet(facilityEconomySpecs.R, 1, {}, ['TR-0 月穹生态环建造许可'])
    expect(net.power).toBeLessThan(0)
    expect(net.alloy).toBeLessThan(0)
    expect(net.water).toBeUndefined()
    expect(net.oxygen).toBeUndefined()
    expect(net.biomass).toBeUndefined()
    expect(net.regolith).toBeUndefined()
  })

  it('lets stage-driven phases be selected explicitly so the ring can reach payback', () => {
    const techs = ['TR-0 月穹生态环建造许可']
    // autoSelect: false 只表示「不由自动挑选进入」；阶段推进显式指定时必须生效，
    // 否则 MR-2/3/4 永远回落到 MR-1，生态环永久烧材料且永不回报。
    ;(['MR-2', 'MR-3', 'MR-4'] as const).forEach(methodId => {
      expect(selectProductionMethod(facilityEconomySpecs.R.productionMethods, techs, methodId).id).toBe(methodId)
    })
    // 自动挑选仍应停在第一阶段
    expect(selectProductionMethod(facilityEconomySpecs.R.productionMethods, techs).id).toBe('MR-1')

    const payback = projectFacilityNet(facilityEconomySpecs.R, 1, {}, techs, 'MR-4')
    expect(payback.water).toBeGreaterThan(0)
    expect(payback.oxygen).toBeGreaterThan(0)
    expect(payback.biomass).toBeGreaterThan(0)
    expect(payback.alloy).toBeUndefined()
  })

  it('requires building technologies before construction', () => {
    expect(defaultStartingTechs).toEqual([
      'TE1-0 日冕能源署建造许可',
      'TC1-0 静海采掘署建造许可',
      'TK-0 月面王城建造许可',
      'TB-0 Hydroponic biosphere charter',
      'TS-0 Starport charter',
    ])
    expect(technologyCatalog['TE3-0'].unlocks).toBe('ME3-1')
    expect(facilityEconomySpecs.E3.requiredTech).toBe('TE3-0')
    expect(canBuildFacility(facilityEconomySpecs.E1, defaultStartingTechs)).toBe(true)
    expect(canBuildFacility(facilityEconomySpecs.E3, [])).toBe(false)
    expect(canBuildFacility(facilityEconomySpecs.E3, ['TE3-0 外星科技：微型黑洞约束'])).toBe(true)
  })
})

describe('automation planner', () => {
  it('exposes Crown Steward as a named background optimizer and supports disabled plans', () => {
    expect(gameOptimizers[crownStewardOptimizer.id]).toBe(crownStewardOptimizer)
    expect(crownStewardOptimizer.purpose).toBe('test-baseline')

    const disabled = createDisabledAutomationPlan(richResources, baseFacilities)
    expect(disabled.mode).toBe('inactive')
    expect(disabled.reason).toBe('optimizer disabled')
    expect(disabled.actions).toEqual([])
    expect(disabled.technologyActions).toEqual([])
    expect(disabled.projectedResources).toEqual(richResources)
  })

  it('falls back to manual mode when reserve floors are breached', () => {
    const plan = crownStewardOptimizer.run({
      resources: {
        power: 0,
        water: 0,
        oxygen: 0,
        biomass: 0,
        regolith: 0,
        alloy: 0,
        quantumCore: 0,
        currency: 0,
        population: 0,
        knowledge: 0,
        luxury: 0,
      },
      facilities: baseFacilities,
      year: 60,
      reserveFloors: defaultReserveFloors,
    })

    expect(plan.mode).toBe('inactive')
    expect(plan.actions).toHaveLength(0)
    expect(plan.reason).toContain('低于最低要求')
  })

  it('chooses a positive weighted upgrade under abundant resources', () => {
    const plan = crownStewardOptimizer.run({
      resources: richResources,
      facilities: baseFacilities,
      year: 60,
      weights: { ...richResources, power: 10, quantumCore: 8, knowledge: 6, population: 4, currency: 2, luxury: 1 },
      capitalHorizonYears: 5,
      techs: [...defaultStartingTechs, 'TE1-1 纳米光催化剂', 'TF-1 重原子炼金术'],
    })

    expect(plan.mode).toBe('active')
    expect(plan.actions.length).toBeGreaterThan(0)
    expect(plan.actions[0].score).toBeGreaterThan(0)
    const first = plan.actions[0]
    const current = baseFacilities.find(item => item.id === first.id)!
    expect(plan.targetLevels[first.id]).toBeGreaterThan(current.level)
  })

  it('does not auto-build technology-locked facilities before their tech is unlocked', () => {
    const planWithoutTech = crownStewardOptimizer.run({
      resources: richResources,
      facilities: baseFacilities,
      year: 60,
      weights: { ...richResources, power: 100, quantumCore: 1, knowledge: 1, population: 1 },
      techs: defaultStartingTechs,
      capitalHorizonYears: 20,
    })
    expect(planWithoutTech.actions.some(action => action.id === 'E3')).toBe(false)

    const planWithTech = crownStewardOptimizer.run({
      resources: richResources,
      facilities: baseFacilities,
      year: 60,
      weights: { ...richResources, power: 100, quantumCore: 1, knowledge: 1, population: 1 },
      techs: [...defaultStartingTechs, 'TE3-0 外星科技：微型黑洞约束'],
      capitalHorizonYears: 20,
    })
    expect(planWithTech.actions.some(action => action.id === 'E3')).toBe(true)
  })

  it('invests high material surplus into late project sinks', () => {
    const plan = crownStewardOptimizer.run({
      resources: {
        ...richResources,
        power: 50000,
        water: 12000,
        oxygen: 16000,
        biomass: 14000,
        regolith: 30000,
        alloy: 30000,
        currency: 500,
        quantumCore: 4,
      },
      facilities: facilityOrder.map(id => ({ id, level: id === 'R' ? 2 : id === 'D' ? 1 : 0 })),
      techs: [...defaultStartingTechs, 'TR-0 月穹生态环建造许可', 'TD-0 冠冕星舰坞建造许可'],
      reserveFloors: defaultReserveFloors,
      capitalHorizonYears: 360,
    })

    expect(plan.actions.some(action => action.id === 'R' || action.id === 'D')).toBe(true)
  })
})

describe('staffing allocation invariants', () => {
  const allTechs = Object.values(technologyCatalog).map(tech => `${tech.id} ${tech.name}`)
  const builtLevels: Record<FacilityId, number> = Object.fromEntries(
    facilityOrder.map(id => [id, facilityEconomySpecs[id].maxLevel]),
  ) as Record<FacilityId, number>
  const facilities = facilityOrder.map(id => ({ id, level: builtLevels[id] }))
  const emptyStaffing = Object.fromEntries(facilityOrder.map(id => [id, 0])) as Record<FacilityId, number>

  it('always keeps power plants staffed, since power is a non-tradable intermediate', () => {
    // 电力权重若归零，发电厂（唯一产出就是电力）评分为 0 会被整批撤人，电网崩塌。
    const flush: Resources = { ...richResources, power: 5000, population: 600, water: 4000, oxygen: 4000, biomass: 4000 }
    const staffed = rebalanceStaffing(flush, facilities, emptyStaffing, allTechs, {}, {}, defaultReserveFloors, {})
    expect(staffed.E1).toBeGreaterThan(0)
    expect(staffed.E2).toBeGreaterThan(0)
  })

  it('never staffs a loss-making production facility just because workers are idle', () => {
    // 物资枯竭时，工程蓄水池（D/R）应被就绪度收敛到 0 岗，而不是继续硬烧库存。
    const drained: Resources = {
      ...richResources, population: 600, water: 0, oxygen: 0, biomass: 0, regolith: 0, alloy: 0, quantumCore: 0,
    }
    const staffed = rebalanceStaffing(drained, facilities, emptyStaffing, allTechs, {}, {}, defaultReserveFloors, {})
    expect(staffed.D).toBe(0)
    expect(staffed.R).toBe(0)
  })

  it('staffs project sinks once surplus can actually cover their draw', () => {
    const flush: Resources = {
      ...richResources, population: 900, power: 20000,
      water: 40000, oxygen: 40000, biomass: 40000, regolith: 60000, alloy: 60000, quantumCore: 400,
    }
    const staffed = rebalanceStaffing(flush, facilities, emptyStaffing, allTechs, {}, {}, defaultReserveFloors, {})
    expect(staffed.D).toBeGreaterThan(0)
  })

  it('prices knowledge against the rate research can absorb, not a flat weight', () => {
    // 研究每日封顶 maxResearchThroughput；库存已能喂完剩余科技树时，边际知识价值应归零。
    expect(remainingResearchBacklog(allTechs)).toBe(0)
    expect(remainingResearchBacklog(defaultStartingTechs)).toBeGreaterThan(0)
    expect(researchThroughputFor(100, allTechs)).toBe(maxResearchThroughput)

    // 人力充裕（每座设施都能满员），差异只来自知识的边际权重
    const base: Resources = { ...richResources, population: 4000, power: 40000 }
    const labTechs = [...defaultStartingTechs, 'TL-0 问天研究实验室建造许可']
    const staffedOnStarved = rebalanceStaffing({ ...base, knowledge: 0 }, facilities, emptyStaffing, labTechs, {}, {}, defaultReserveFloors, {})
    const staffedOnGlut = rebalanceStaffing({ ...base, knowledge: 50000 }, facilities, emptyStaffing, labTechs, {}, {}, defaultReserveFloors, {})
    // 知识见底时实验室应上岗；知识已远超整棵科技树所需时应停产
    expect(staffedOnStarved.L).toBeGreaterThan(0)
    expect(staffedOnGlut.L).toBe(0)
  })

  it('evaluates production methods at full capacity so an idle lab is not deadlocked', () => {
    // 旧实现要求 currentAssigned > 0 才评估生产方式：实验室空转 → 永不切 ML-2 →
    // 永无量子核心 → 星舰第三阶段永久停滞。人力是可调杠杆，评估应按满员产能。
    // isLateGame() 需要后期年份 + 人口过半 + 核心设施均级达标，这里以满级殖民地满足。
    const plan = crownStewardOptimizer.run({
      resources: { ...richResources, knowledge: 50000, quantumCore: 2, population: 900, power: 40000, water: 4000, oxygen: 4000, biomass: 4000, alloy: 4000 },
      facilities,
      staffing: { ...emptyStaffing, L: 0 },
      population: {
        capacity: 1000, availableCapacity: 100, residentsByFacility: {}, facilityNet: {},
        lifeSupportCost: {}, lifeSupportRatio: 1, growthPotential: 0, migrationIn: 0,
        attrition: 0, nextPressureDays: 0, net: {}, status: 'stable',
      },
      techs: allTechs,
      reserveFloors: defaultReserveFloors,
      year: 900,
      capitalHorizonYears: 360,
    })
    expect(plan.methodActions.some(action => action.facilityId === 'L' && action.toMethodId === 'ML-2')).toBe(true)
  })
})

describe('population and construction scale', () => {
  const emptyFacilityMap = Object.fromEntries(facilityOrder.map(id => [id, { id, level: 0 }])) as Record<(typeof facilityOrder)[number], FacilityState>

  it('separates building level capacity from assigned production workers', () => {
    expect(getFacilityWorkCapacity('E1', 3)).toBe(12)
    expect(projectFacilityNet(facilityEconomySpecs.E1, 6, {}, defaultStartingTechs, 'ME1-1', 3).power).toBeCloseTo(26.6112)
    expect(projectFacilityNet(facilityEconomySpecs.E1, 12, {}, defaultStartingTechs, 'ME1-1', 3).power).toBeCloseTo(53.2224)
    expect(isHousingFacility('K')).toBe(true)
    expect(getFacilityWorkCapacity('K', 2)).toBe(0)
    expect(isFixedFacility('S')).toBe(true)
    expect(getFacilityWorkCapacity('S', 1)).toBe(0)
    expect(projectFacilityCost(facilityEconomySpecs.S, 1)).toEqual({})
    expect(projectFacilityNet(facilityEconomySpecs.K, 16, {}, defaultStartingTechs)).toEqual({})
  })

  it('tracks gross daily production and consumption for GDP reports', () => {
    const flow = projectDailyFlow({
      facilities: { ...emptyFacilityMap, C1: { id: 'C1', level: 4 } },
      facilityLevels: { C1: 1 },
      modifiers: {},
      techs: defaultStartingTechs,
      productionMethods: { C1: 'MC1-1' },
    })

    expect(flow.production.regolith).toBeGreaterThan(0)
    expect(flow.consumption.power).toBeGreaterThan(0)
    expect(flow.net.regolith).toBe(flow.production.regolith)
    expect(weightedValue(flow.production)).toBeGreaterThan(weightedValue(flow.net))
  })

  it('projects K2 opening housing capacity and migration pressure', () => {
    const projection = projectPopulationSystem({
      resources: { ...richResources, population: 12 },
      facilities: { ...emptyFacilityMap, K: { id: 'K', level: 2 } },
      policy: 'mandate',
      techs: defaultStartingTechs,
    })

    expect(getHousingCapacity('K', 2)).toBe(16)
    expect(projection.capacity).toBe(16)
    expect(projection.availableCapacity).toBe(4)
    expect(projection.net.population).toBeGreaterThan(0)
    expect(projection.facilityNet.K?.currency).toBeCloseTo(19.2)
  })

  it('pauses migration at capacity and applies attrition after sustained pressure', () => {
    const full = projectPopulationSystem({
      resources: { ...richResources, population: 16 },
      facilities: { ...emptyFacilityMap, K: { id: 'K', level: 2 } },
      policy: 'mandate',
      pressureDays: 0,
    })
    expect(full.net.population).toBe(0)
    expect(full.nextPressureDays).toBe(1)

    const strained = projectPopulationSystem({
      resources: { ...richResources, water: 0, oxygen: 0, biomass: 0, population: 40 },
      facilities: { ...emptyFacilityMap, K: { id: 'K', level: 2 } },
      policy: 'mandate',
      pressureDays: 2,
    })
    expect(strained.status).toBe('strained')
    expect(strained.attrition).toBeGreaterThan(0)
    expect(strained.net.population).toBeLessThan(0)
  })

  it('locks construction timing and discounted expansion costs by tech', () => {
    expect(getConstructionDays([])).toBe(20)
    expect(getConstructionDays(['TG-1 天工工业软件套装', 'TG-3 通用建筑预制件'])).toBe(17)
    const base = projectFacilityCost(facilityEconomySpecs.E1, 0)
    const discounted = projectFacilityCost(facilityEconomySpecs.E1, 0, ['TG-3 通用建筑预制件'])
    expect(base.regolith).toBeCloseTo(11.2)
    expect(base.alloy).toBeCloseTo(5.6)
    expect(discounted.regolith).toBeCloseTo(10.64)
  })

  it('skips buildings that are already in construction cooldown', () => {
    const plan = crownStewardOptimizer.run({
      resources: richResources,
      facilities: [{ id: 'E1', level: 1 }, ...facilityOrder.filter(id => id !== 'E1').map(id => ({ id, level: 0 as number }))],
      year: 60,
      techs: defaultStartingTechs,
      blockedFacilities: ['E1'],
      weights: { ...richResources, power: 100, population: 1, quantumCore: 1 },
      capitalHorizonYears: 20,
    })

    expect(plan.actions.some(action => action.id === 'E1')).toBe(false)
  })

  it('keeps power out of construction material costs', () => {
    facilityOrder.forEach(id => {
      expect(facilityEconomySpecs[id].baseUpgradeCost.power).toBeUndefined()
      expect(facilityEconomySpecs[id].baseUpgradeCost.population).toBeUndefined()
      expect(projectFacilityCost(facilityEconomySpecs[id], 0).power).toBeUndefined()
      expect(projectFacilityCost(facilityEconomySpecs[id], 0).population).toBeUndefined()
    })
  })

  it('can use the opening starport to trade for construction alloy', () => {
    const cost = { alloy: 12 }
    const facilities = facilityOrder.map(id => ({ id, level: id === 'S' ? 1 : 0 }))
    const tradePlan = planAutoTradesForCost(
      { ...richResources, alloy: 8, currency: 200 },
      cost,
      facilities,
      ['TS-0 Starport charter'],
      defaultReserveFloors,
    )

    expect(tradePlan.trades.length).toBeGreaterThan(0)
    expect(tradePlan.resources.alloy).toBeGreaterThanOrEqual(cost.alloy + defaultReserveFloors.alloy - 1)
    expect(tradePlan.trades.some(trade => trade.output.alloy)).toBe(true)
  })

  it('uses starport credit purchases to soften material deficits', () => {
    const tradePlan = planAutoTradesForDeficits(
      { ...richResources, water: -2, currency: 1, oxygen: 0, biomass: 0, regolith: 0, alloy: 0 },
      { water: 8 },
      facilityOrder.map(id => ({ id, level: id === 'S' ? 1 : 0 })),
      ['TS-0 Starport charter'],
    )

    expect(tradePlan.resources.water).toBeGreaterThanOrEqual(8)
    expect(tradePlan.resources.currency).toBeLessThan(0)
    expect(tradePlan.tradedResources).toContain('water')
    expect(calculateCurrencyDebtInterest(tradePlan.resources)).toBeGreaterThan(0)
    expect(estimateTradePremium(tradePlan.trades[0])).toBeGreaterThan(0)
  })

  it('sells surplus resources for currency before using credit', () => {
    const tradePlan = planAutoTradesForDeficits(
      { ...richResources, water: -2, currency: 1 },
      { water: 8 },
      facilityOrder.map(id => ({ id, level: id === 'S' ? 1 : 0 })),
      ['TS-0 Starport charter'],
    )

    expect(tradePlan.resources.water).toBeGreaterThanOrEqual(8)
    expect(tradePlan.trades.some(trade => (trade.output.currency ?? 0) > 0)).toBe(true)
    expect(tradePlan.resources.alloy).toBeLessThan(richResources.alloy)
  })

  it('can globally disable automatic deficit purchases', () => {
    const tradePlan = planAutoTradesForDeficits(
      { ...richResources, water: -2, currency: 1 },
      { water: 8 },
      facilityOrder.map(id => ({ id, level: id === 'S' ? 1 : 0 })),
      ['TS-0 Starport charter'],
      {},
      false,
    )

    expect(tradePlan.trades).toEqual([])
    expect(tradePlan.resources.water).toBe(-2)
    expect(tradePlan.resources.currency).toBe(1)
    expect(tradePlan.tradedResources).toEqual([])
  })

  it('prices resource deficits as starport premium inside optimizer scoring', () => {
    const facilities = facilityOrder.map(id => ({ id, level: id === 'S' || id === 'C1' || id === 'K' ? 1 : 0 }))
    const scarce = { ...richResources, water: 1, currency: 3 }
    const premium = estimateResourceDeficitPremium(
      scarce,
      defaultReserveFloors,
      facilities,
      defaultStartingTechs,
      resourceWeights,
    )

    expect(premium).toBeGreaterThan(0)

    const plan = crownStewardOptimizer.run({
      resources: scarce,
      facilities,
      staffing: Object.fromEntries(facilityOrder.map(id => [id, id === 'C1' ? 4 : 0])) as Partial<Record<FacilityId, number>>,
      population: {
        capacity: 80,
        availableCapacity: 68,
        residentsByFacility: {},
        facilityNet: {},
        lifeSupportCost: { water: 1, oxygen: 1, biomass: 1 },
        lifeSupportRatio: 1,
        growthPotential: 0.5,
        migrationIn: 0,
        attrition: 0,
        nextPressureDays: 0,
        net: { population: 0 },
        status: 'stable',
      },
      year: 60,
      reserveFloors: defaultReserveFloors,
      techs: defaultStartingTechs,
      capitalHorizonYears: 360,
    })

    expect(plan.actions.some(action => action.id === 'C1')).toBe(true)
  })

  it('can package a facility unlock with its first construction level', () => {
    const plan = crownStewardOptimizer.run({
      resources: richResources,
      facilities: facilityOrder.map(id => ({ id, level: id === 'S' ? 1 : 0 })),
      blockedFacilities: facilityOrder.filter(id => id !== 'L' && id !== 'S'),
      techs: ['TS-0 Starport charter'],
      reserveFloors: defaultReserveFloors,
      capitalHorizonYears: 360,
    })

    const labPackage = plan.actions.find(action => action.id === 'L')
    expect(labPackage?.fromLevel).toBe(0)
    expect(labPackage?.toLevel).toBe(1)
    expect(labPackage?.technologyUnlocks).toContain('TL-0')
    expect(labPackage?.cost.alloy).toBeGreaterThan(projectFacilityCost(facilityEconomySpecs.L, 0).alloy ?? 0)
  })

  it('does not expand the fixed starport node', () => {
    const plan = crownStewardOptimizer.run({
      resources: richResources,
      facilities: facilityOrder.map(id => ({ id, level: id === 'S' ? 1 : 0 })),
      techs: defaultStartingTechs,
      reserveFloors: defaultReserveFloors,
      capitalHorizonYears: 360,
    })

    expect(plan.actions.some(action => action.id === 'S')).toBe(false)
    expect(plan.targetLevels.S).toBe(1)
  })
})

describe('annual projections', () => {
  it('apply policy, worker, and production-method tech consistently', () => {
    const modifiers = {
      E1: buildFacilityModifiers(2, 'mandate', 1.5),
    }
    const net = projectAnnualNet({
      facilities: { E1: { id: 'E1', level: 1 }, C1: { id: 'C1', level: 0 }, K: { id: 'K', level: 0 }, B: { id: 'B', level: 0 }, E2: { id: 'E2', level: 0 }, C2: { id: 'C2', level: 0 }, F: { id: 'F', level: 0 }, P: { id: 'P', level: 0 }, R: { id: 'R', level: 0 }, L: { id: 'L', level: 0 }, H: { id: 'H', level: 0 }, M: { id: 'M', level: 0 }, S: { id: 'S', level: 0 }, E3: { id: 'E3', level: 0 }, D: { id: 'D', level: 0 } },
      modifiers,
      techs: [...defaultStartingTechs, 'TE1-1 纳米光催化剂'],
      productionMethods: { E1: 'ME1-2' },
      globalBonus: { biomass: 1 },
    })

    expect(net.power).toBeCloseTo(7.23492)
    expect(net.water).toBeLessThan(0)
    expect(net.oxygen).toBeGreaterThan(1)
    expect(net.biomass).toBe(1)
  })
})
