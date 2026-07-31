import { describe, expect, it } from 'vitest'
import {
  buildFacilityModifiers,
  canBuildFacility,
  defaultReserveFloors,
  defaultStartingTechs,
  facilityEconomySpecs,
  facilityOrder,
  planFacilityAutomation,
  projectAnnualNet,
  projectFacilityNet,
  resourceMeta,
  resourceOrder,
  selectProductionMethod,
  technologyCatalog,
  type FacilityState,
  type Resources,
} from '../src/economy'

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
    expect(facilityEconomySpecs.R.phaseNotes).toHaveLength(4)
    expect(facilityEconomySpecs.D.code).toBe('D')
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
    expect(projectFacilityNet(e1, 1, {}, defaultStartingTechs).power).toBe(6)
    expect(projectFacilityNet(e1, 1, {}, defaultStartingTechs).oxygen).toBeUndefined()

    const techs = [...defaultStartingTechs, 'TE1-1 纳米光催化剂']
    expect(selectProductionMethod(e1.productionMethods, techs).id).toBe('ME1-1')
    expect(selectProductionMethod(e1.productionMethods, techs, 'ME1-2').id).toBe('ME1-2')
    expect(projectFacilityNet(e1, 1, {}, techs).oxygen).toBeUndefined()

    const upgraded = projectFacilityNet(e1, 1, {}, techs, 'ME1-2')
    expect(upgraded.water).toBe(-0.6)
    expect(upgraded.oxygen).toBe(1.2)
  })

  it('keeps new production method technologies gated and marked', () => {
    expect(technologyCatalog['TC2-2']).toMatchObject({ name: '发现伊甸园', unlocks: 'MC2-2', alien: true, era: 'mid' })
    expect(technologyCatalog['TB-2']).toMatchObject({ name: '无水栽培技术', unlocks: 'MB-2', era: 'early' })
    expect(technologyCatalog['TF-1']).toMatchObject({ unlocks: 'MF-2', alien: true, era: 'mid' })
    expect(technologyCatalog['TP-1']).toMatchObject({ name: '合金作物', unlocks: 'MP-2', alien: true, era: 'mid' })
    expect(technologyCatalog['TG-1'].scope).toBe('G')
    expect(technologyCatalog['TE1-2'].category).toBe('facility-efficiency')

    expect(selectProductionMethod(facilityEconomySpecs.C2.productionMethods, ['TC2-0 西海采掘署建造许可']).id).toBe('MC2-1')
    expect(selectProductionMethod(facilityEconomySpecs.C2.productionMethods, ['TC2-0 西海采掘署建造许可', 'TC2-2 发现伊甸园'], 'MC2-2').id).toBe('MC2-2')
    expect(projectFacilityNet(facilityEconomySpecs.C2, 1, {}, ['TC2-0 西海采掘署建造许可', 'TC2-2 发现伊甸园'], 'MC2-2')).toMatchObject({ power: -1.4, water: 0.8, regolith: 3.4, alloy: 1.2 })

    expect(selectProductionMethod(facilityEconomySpecs.B.productionMethods, ['TB-0 水培生态球建造许可', 'TB-2 无水栽培技术'], 'MB-2').id).toBe('MB-2')
    expect(projectFacilityNet(facilityEconomySpecs.B, 1, {}, ['TB-0 水培生态球建造许可', 'TB-2 无水栽培技术'], 'MB-2')).toMatchObject({ regolith: -0.6, oxygen: 2.6, biomass: 1.8 })

    expect(projectFacilityNet(facilityEconomySpecs.F, 1, {}, ['TF-0 天工精炼署建造许可', 'TF-1 重原子炼金术'], 'MF-2')).toMatchObject({ power: -1.2, regolith: -1.6, alloy: 2.2, oxygen: 0.4, currency: 1.0 })
    expect(projectFacilityNet(facilityEconomySpecs.P, 1, {}, ['TP-0 伊犁河谷建造许可'])).toMatchObject({ water: -0.6, regolith: -1, oxygen: 1.2, biomass: 1.8 })
    expect(projectFacilityNet(facilityEconomySpecs.P, 1, {}, ['TP-0 伊犁河谷建造许可', 'TP-1 合金作物'], 'MP-2')).toMatchObject({ water: -0.6, regolith: -1, oxygen: 0.8, biomass: 1.0, alloy: 0.4 })
  })

  it('applies solidified efficiency and global technologies to facility net output', () => {
    expect(projectFacilityNet(facilityEconomySpecs.E1, 1, {}, ['TE1-0 日冕能源署建造许可', 'TE1-2 光伏阵列校准']).power).toBeCloseTo(6.3)
    expect(projectFacilityNet(facilityEconomySpecs.C1, 1, {}, ['TC1-0 静海采掘署建造许可', 'TC1-1 月面钻头阵列']).regolith).toBeCloseTo(4.41)
    const anchored = projectFacilityNet(facilityEconomySpecs.C2, 1, {}, ['TC2-0 西海采掘署建造许可', 'TC2-1 小行星锚定索'])
    expect(anchored.alloy).toBeCloseTo(1.26)
    expect(anchored.oxygen).toBeCloseTo(-0.42)
    expect(projectFacilityNet(facilityEconomySpecs.B, 1, {}, ['TB-0 水培生态球建造许可', 'TB-1 闭环藻膜培养']).biomass).toBeCloseTo(1.89)
    expect(projectFacilityNet(facilityEconomySpecs.F, 1, {}, ['TF-0 天工精炼署建造许可', 'TG-2 空间微波散热学']).power).toBeCloseTo(-1.14)
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
    expect(projectFacilityNet(facilityEconomySpecs.E3, 1, {}, ['TE3-0 外星科技：微型黑洞约束'], 'ME3-1').power).toBe(10)
    expect(facilityEconomySpecs.E3.productionMethods[0].input).toEqual({})

    expect(facilityEconomySpecs.C1.productionMethods[0].input.power).toBeGreaterThan(0)
    expect(facilityEconomySpecs.C1.productionMethods[0].name).toBe('静海月面采掘')
    expect(facilityEconomySpecs.C1.productionMethods[0].note).toContain('本地月面')
    expect(facilityEconomySpecs.C2.productionMethods[0].name).toBe('西海小行星带采掘')
    expect(facilityEconomySpecs.C2.productionMethods[0].input).toMatchObject({ power: 1.4, water: 0.3, oxygen: 0.4, biomass: 0.2 })
    expect(facilityEconomySpecs.C2.productionMethods[0].note).toContain('小行星带')
    expect(facilityEconomySpecs.B.productionMethods[0].input.water).toBeGreaterThan(0)
    expect(facilityEconomySpecs.F.productionMethods[0].input).toMatchObject({ power: 1.2, regolith: 1.6 })
  })

  it('does not treat ecological ring later phases as default output', () => {
    expect(selectProductionMethod(facilityEconomySpecs.R.productionMethods, ['TR-0 月穹生态环建造许可']).id).toBe('MR-1')
    const net = projectFacilityNet(facilityEconomySpecs.R, 1, {}, ['TR-0 月穹生态环建造许可'])
    expect(net.water).toBeUndefined()
    expect(net.oxygen).toBeUndefined()
    expect(net.alloy).toBeLessThan(0)
  })

  it('requires building technologies before construction', () => {
    expect(defaultStartingTechs).toEqual(['TE1-0 日冕能源署建造许可', 'TC1-0 静海采掘署建造许可', 'TK-0 月面王城建造许可'])
    expect(technologyCatalog['TE3-0'].unlocks).toBe('ME3-1')
    expect(facilityEconomySpecs.E3.requiredTech).toBe('TE3-0')
    expect(canBuildFacility(facilityEconomySpecs.E1, 0, defaultStartingTechs)).toBe(true)
    expect(canBuildFacility(facilityEconomySpecs.E3, 60, [])).toBe(false)
    expect(canBuildFacility(facilityEconomySpecs.E3, 0, ['TE3-0 外星科技：微型黑洞约束'])).toBe(true)
  })
})

describe('automation planner', () => {
  it('falls back to manual mode when reserve floors are breached', () => {
    const plan = planFacilityAutomation({
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

    expect(plan.mode).toBe('manual')
    expect(plan.actions).toHaveLength(0)
    expect(plan.reason).toContain('低于最低要求')
  })

  it('chooses a positive weighted upgrade under abundant resources', () => {
    const plan = planFacilityAutomation({
      resources: richResources,
      facilities: baseFacilities,
      year: 60,
      weights: { ...richResources, power: 10, quantumCore: 8, knowledge: 6, population: 4, currency: 2, luxury: 1 },
      capitalHorizonYears: 5,
      techs: [...defaultStartingTechs, 'TE1-1 纳米光催化剂', 'TF-1 重原子炼金术'],
    })

    expect(plan.mode).toBe('auto')
    expect(plan.actions.length).toBeGreaterThan(0)
    expect(plan.actions[0].score).toBeGreaterThan(0)
    const first = plan.actions[0]
    const current = baseFacilities.find(item => item.id === first.id)!
    expect(plan.targetLevels[first.id]).toBeGreaterThan(current.level)
  })

  it('does not auto-build technology-locked facilities before their tech is unlocked', () => {
    const planWithoutTech = planFacilityAutomation({
      resources: richResources,
      facilities: baseFacilities,
      year: 60,
      weights: { ...richResources, power: 100, quantumCore: 1, knowledge: 1, population: 1 },
      techs: defaultStartingTechs,
      capitalHorizonYears: 20,
    })
    expect(planWithoutTech.actions.some(action => action.id === 'E3')).toBe(false)

    const planWithTech = planFacilityAutomation({
      resources: richResources,
      facilities: baseFacilities,
      year: 60,
      weights: { ...richResources, power: 100, quantumCore: 1, knowledge: 1, population: 1 },
      techs: [...defaultStartingTechs, 'TE3-0 外星科技：微型黑洞约束'],
      capitalHorizonYears: 20,
    })
    expect(planWithTech.actions.some(action => action.id === 'E3')).toBe(true)
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

    expect(net.power).toBeGreaterThan(11)
    expect(net.water).toBeLessThan(0)
    expect(net.oxygen).toBeGreaterThan(1)
    expect(net.biomass).toBe(1)
  })
})
