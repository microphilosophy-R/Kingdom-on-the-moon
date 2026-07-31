import { describe, expect, it } from 'vitest'
import {
  buildFacilityModifiers,
  canBuildFacility,
  defaultReserveFloors,
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

  it('switches building production methods through coded technologies', () => {
    const e1 = facilityEconomySpecs.E1
    expect(selectProductionMethod(e1.productionMethods).id).toBe('ME1-1')
    expect(projectFacilityNet(e1, 1).power).toBe(6)
    expect(projectFacilityNet(e1, 1).oxygen).toBeUndefined()

    expect(selectProductionMethod(e1.productionMethods, ['TE-1 纳米光催化剂']).id).toBe('ME1-2')
    const upgraded = projectFacilityNet(e1, 1, {}, ['TE-1 纳米光催化剂'])
    expect(upgraded.water).toBe(-0.6)
    expect(upgraded.oxygen).toBe(1.2)
  })

  it('keeps production method and technology codes synchronized', () => {
    const allMethods = facilityOrder.flatMap(id => facilityEconomySpecs[id].productionMethods.map(method => [id, method.id, method.unlockedBy] as const))
    allMethods.forEach(([facilityId, methodId, techId]) => {
      expect(methodId).toMatch(new RegExp(`^M${facilityId}-\\d+$`))
      if (techId) expect(technologyCatalog[techId]?.unlocks).toBe(methodId)
    })

    Object.values(technologyCatalog).forEach(tech => {
      if (!tech.unlocks) return
      expect(allMethods.some(([, methodId]) => methodId === tech.unlocks)).toBe(true)
    })
  })

  it('locks the user-specified facility recipe inputs', () => {
    expect(facilityEconomySpecs.E2.productionMethods[0].input).toMatchObject({ regolith: 1.4 })
    expect(projectFacilityNet(facilityEconomySpecs.E3, 1).power).toBeUndefined()
    expect(projectFacilityNet(facilityEconomySpecs.E3, 1, {}, ['TE3-1 外星科技：微型黑洞约束']).power).toBe(10)
    expect(facilityEconomySpecs.E3.productionMethods[0].input).toEqual({})

    expect(facilityEconomySpecs.C1.productionMethods[0].input.power).toBeGreaterThan(0)
    expect(facilityEconomySpecs.C2.productionMethods[0].input.power).toBeGreaterThan(0)
    expect(facilityEconomySpecs.B.productionMethods[0].input.water).toBeGreaterThan(0)
    expect(facilityEconomySpecs.F.productionMethods[0].input).toMatchObject({ power: 1.2, regolith: 1.6 })
  })

  it('does not treat ecological ring later phases as default output', () => {
    expect(selectProductionMethod(facilityEconomySpecs.R.productionMethods).id).toBe('MR-1')
    const net = projectFacilityNet(facilityEconomySpecs.R, 1)
    expect(net.water).toBeUndefined()
    expect(net.oxygen).toBeUndefined()
    expect(net.alloy).toBeLessThan(0)
  })

  it('requires building technologies before construction', () => {
    expect(technologyCatalog['TE3-1'].unlocks).toBe('ME3-1')
    expect(facilityEconomySpecs.E3.requiredTech).toBe('TE3-1')
    expect(canBuildFacility(facilityEconomySpecs.E3, 60, [])).toBe(false)
    expect(canBuildFacility(facilityEconomySpecs.E3, 60, ['TE3-1 外星科技：微型黑洞约束'])).toBe(true)
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
      techs: ['TE-1 纳米光催化剂', 'TF-1 重原子炼金术'],
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
      capitalHorizonYears: 20,
    })
    expect(planWithoutTech.actions.some(action => action.id === 'E3')).toBe(false)

    const planWithTech = planFacilityAutomation({
      resources: richResources,
      facilities: baseFacilities,
      year: 60,
      weights: { ...richResources, power: 100, quantumCore: 1, knowledge: 1, population: 1 },
      techs: ['TE3-1 外星科技：微型黑洞约束'],
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
      techs: ['TE-1 纳米光催化剂'],
      globalBonus: { biomass: 1 },
    })

    expect(net.power).toBeGreaterThan(11)
    expect(net.water).toBeLessThan(0)
    expect(net.oxygen).toBeGreaterThan(1)
    expect(net.biomass).toBe(1)
  })
})
