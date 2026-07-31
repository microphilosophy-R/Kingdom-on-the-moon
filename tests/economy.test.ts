import { describe, expect, it } from 'vitest'
import {
  buildFacilityModifiers,
  buildResearchBonus,
  defaultReserveFloors,
  facilityEconomySpecs,
  facilityOrder,
  planFacilityAutomation,
  projectAnnualNet,
  resourceMeta,
  resourceOrder,
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
    expect(facilityEconomySpecs.K.name).toBe('月面王城')
    expect(facilityEconomySpecs.R.phaseNotes).toHaveLength(4)
    expect(facilityEconomySpecs.D.code).toBe('D')
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

  it('chooses the best weighted upgrade under abundant resources', () => {
    const plan = planFacilityAutomation({
      resources: richResources,
      facilities: baseFacilities,
      year: 60,
      weights: { ...richResources, power: 10, quantumCore: 8, knowledge: 6, population: 4, currency: 2, luxury: 1 },
      capitalHorizonYears: 5,
    })

    expect(plan.mode).toBe('auto')
    expect(plan.actions.length).toBeGreaterThan(0)
    expect(plan.actions[0].score).toBeGreaterThan(0)
    const first = plan.actions[0]
    const current = baseFacilities.find(item => item.id === first.id)!
    expect(plan.targetLevels[first.id]).toBeGreaterThan(current.level)
  })
})

describe('annual projections', () => {
  it('apply policy, worker, and bonus consistently', () => {
    const modifiers = {
      E1: buildFacilityModifiers(2, 'mandate', 1.5),
    }
    const net = projectAnnualNet({
      facilities: { E1: { id: 'E1', level: 1 }, C1: { id: 'C1', level: 0 }, K: { id: 'K', level: 0 }, B: { id: 'B', level: 0 }, E2: { id: 'E2', level: 0 }, C2: { id: 'C2', level: 0 }, F: { id: 'F', level: 0 }, P: { id: 'P', level: 0 }, R: { id: 'R', level: 0 }, L: { id: 'L', level: 0 }, H: { id: 'H', level: 0 }, M: { id: 'M', level: 0 }, S: { id: 'S', level: 0 }, E3: { id: 'E3', level: 0 }, D: { id: 'D', level: 0 } },
      modifiers,
      globalBonus: { ...buildResearchBonus(['日冕镜阵效率 +15%', '生态圈年度水耗 -1']), biomass: 1 },
    })

    expect(net.power).toBeGreaterThan(11)
    expect(net.biomass).toBe(1)
    expect(net.oxygen).toBe(0)
  })
})
