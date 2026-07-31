import { describe, expect, it } from 'vitest'
import {
  buildFacilityModifiers,
  buildResearchBonus,
  defaultReserveFloors,
  facilityEconomySpecs,
  planFacilityAutomation,
  projectAnnualNet,
  resourceMeta,
  type FacilityState,
  type Resources,
} from '../src/economy'

const baseFacilities: FacilityState[] = [
  { id: 'energy', level: 1 },
  { id: 'mines', level: 1 },
  { id: 'biosphere', level: 0 },
  { id: 'habitats', level: 0 },
  { id: 'palace', level: 0 },
  { id: 'leisure', level: 0 },
  { id: 'exchange', level: 0 },
  { id: 'shipyard', level: 0 },
]

const richResources: Resources = {
  power: 500,
  fuel: 200,
  alloy: 500,
  regolith: 500,
  water: 200,
  oxygen: 200,
  food: 200,
  research: 80,
}

describe('economy catalog', () => {
  it('keeps the philosophy names and labels stable', () => {
    expect(resourceMeta.research.label).toBe('知识')
    expect(facilityEconomySpecs.energy.name).toBe('日冕能源署')
    expect(facilityEconomySpecs.palace.name).toBe('月面王城')
    expect(facilityEconomySpecs.exchange.name).toBe('星海交易港')
    expect(facilityEconomySpecs.shipyard.code).toBe('D')
  })
})

describe('automation planner', () => {
  it('falls back to manual mode when reserve floors are breached', () => {
    const plan = planFacilityAutomation({
      resources: { power: 0, fuel: 0, alloy: 0, regolith: 0, water: 0, oxygen: 0, food: 0, research: 0 },
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
      weights: { power: 10, fuel: 1, alloy: 1, regolith: 1, water: 1, oxygen: 1, food: 1, research: 1 },
      capitalHorizonYears: 5,
    })

    expect(plan.mode).toBe('auto')
    expect(plan.actions.length).toBeGreaterThan(0)
    expect(plan.actions[0].id).toBe('energy')
    expect(plan.targetLevels.energy).toBeGreaterThan(1)
  })
})

describe('annual projections', () => {
  it('apply policy, worker, and research bonuses consistently', () => {
    const modifiers = {
      energy: buildFacilityModifiers(2, 'mandate', 1.5),
    }
    const net = projectAnnualNet({
      facilities: { energy: { id: 'energy', level: 1 }, mines: { id: 'mines', level: 0 }, biosphere: { id: 'biosphere', level: 0 }, habitats: { id: 'habitats', level: 0 }, palace: { id: 'palace', level: 0 }, leisure: { id: 'leisure', level: 0 }, exchange: { id: 'exchange', level: 0 }, shipyard: { id: 'shipyard', level: 0 } },
      modifiers,
      globalBonus: { ...buildResearchBonus(['日冕镜阵效率 +15%', '生态圈年度水耗 -1']), food: 1 },
    })

    expect(net.power).toBeGreaterThan(11)
    expect(net.water).toBe(1)
    expect(net.fuel).toBeLessThan(0)
  })
})
