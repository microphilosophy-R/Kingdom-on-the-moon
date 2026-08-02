import { getHousingCapacity } from './calendar'
import { defaultReserveFloors, resourceOrder } from './resources'
import { hasTech } from './technologies'
import type { FacilityId, PopulationContext, PopulationPolicy, PopulationProjection, ResourceKey, Resources } from './types'
const residentRules: Record<FacilityId, { water: number; oxygen: number; biomass: number; currency?: number; luxury?: number }> = {
  K: { water: 0.025, oxygen: 0.020, biomass: 0.015, currency: 0.040 },
  H: { water: 0.035, oxygen: 0.030, biomass: 0.035, luxury: 0.025 },
  M: { water: 0.012, oxygen: 0.010, biomass: 0.010 },
  E1: { water: 0, oxygen: 0, biomass: 0 },
  E2: { water: 0, oxygen: 0, biomass: 0 },
  E3: { water: 0, oxygen: 0, biomass: 0 },
  C1: { water: 0, oxygen: 0, biomass: 0 },
  C2: { water: 0, oxygen: 0, biomass: 0 },
  B: { water: 0, oxygen: 0, biomass: 0 },
  F: { water: 0, oxygen: 0, biomass: 0 },
  P: { water: 0, oxygen: 0, biomass: 0 },
  R: { water: 0, oxygen: 0, biomass: 0 },
  S: { water: 0, oxygen: 0, biomass: 0 },
  L: { water: 0, oxygen: 0, biomass: 0 },
  D: { water: 0, oxygen: 0, biomass: 0 },
}

const populationPolicyOrder: Record<PopulationPolicy, FacilityId[]> = {
  ration: ['M', 'K', 'H'],
  mandate: ['K', 'M', 'H'],
  festival: ['H', 'K', 'M'],
}

export function projectPopulationSystem(context: PopulationContext): PopulationProjection {
  const capacity = (['K', 'H', 'M'] as FacilityId[]).reduce(
    (sum, id) => sum + getHousingCapacity(id, context.facilities[id]?.level ?? 0),
    0,
  )
  let unassignedResidents = Math.max(0, context.resources.population)
  const residentsByFacility: Partial<Record<FacilityId, number>> = {}

  populationPolicyOrder[context.policy].forEach(id => {
    const residents = Math.min(unassignedResidents, getHousingCapacity(id, context.facilities[id]?.level ?? 0))
    if (residents > 0) residentsByFacility[id] = residents
    unassignedResidents -= residents
  })

  const facilityNet: Partial<Record<FacilityId, Partial<Resources>>> = {}
  const lifeSupportCost: Partial<Resources> = {}
  let currency = 0
  let luxury = 0

  ;(['K', 'H', 'M'] as FacilityId[]).forEach(id => {
    const residents = residentsByFacility[id] ?? 0
    const rule = residentRules[id]
    const net: Partial<Resources> = {}
    if (residents <= 0) {
      facilityNet[id] = net
      return
    }
    net.water = -residents * rule.water
    net.oxygen = -residents * rule.oxygen
    net.biomass = -residents * rule.biomass
    if (rule.currency) {
      net.currency = residents * rule.currency
      currency += net.currency
    }
    if (rule.luxury) {
      net.luxury = residents * rule.luxury
      luxury += net.luxury
    }
    lifeSupportCost.water = (lifeSupportCost.water ?? 0) + residents * rule.water
    lifeSupportCost.oxygen = (lifeSupportCost.oxygen ?? 0) + residents * rule.oxygen
    lifeSupportCost.biomass = (lifeSupportCost.biomass ?? 0) + residents * rule.biomass
    facilityNet[id] = net
  })

  const lifeSupportRatio = (['water', 'oxygen', 'biomass'] as ResourceKey[]).reduce((ratio, key) => {
    const required = lifeSupportCost[key] ?? 0
    if (required <= 0) return ratio
    return Math.min(ratio, Math.max(0, context.resources[key]) / required)
  }, 1)
  const availableCapacity = capacity - context.resources.population
  const hasCapacityPressure = availableCapacity <= 0
  const hasLifePressure = lifeSupportRatio < 1
  const nextPressureDays = hasCapacityPressure || hasLifePressure ? (context.pressureDays ?? 0) + 1 : 0

  const policyMultiplier = context.policy === 'festival' ? 1.15 : context.policy === 'ration' ? 0.85 : 1
  const growthPotential = (
    0.04 +
    (context.facilities.K?.level ?? 0) * 0.03 +
    (context.facilities.H?.level ?? 0) * 0.08 +
    (context.facilities.M?.level ?? 0) * 0.12 +
    (hasTech(context.techs, 'TS-1') ? 0.25 : 0) +
    (hasTech(context.techs, 'TC2-2') ? 0.18 : 0)
  ) * policyMultiplier
  const migrationIn = hasCapacityPressure || hasLifePressure ? 0 : Math.min(Math.max(0, availableCapacity), growthPotential * lifeSupportRatio)
  const overCapacity = Math.max(0, -availableCapacity)
  const attrition = nextPressureDays >= 3
    ? Math.min(
      5,
      Math.max(0, context.resources.population - defaultReserveFloors.population),
      overCapacity * 0.1 + Math.max(0, 1 - lifeSupportRatio) * context.resources.population * 0.03,
    )
    : 0
  const populationDelta = Math.max(
    defaultReserveFloors.population - context.resources.population,
    Math.min(Math.max(0, availableCapacity), migrationIn) - attrition,
  )

  const net: Partial<Resources> = {
    population: populationDelta,
    water: -(lifeSupportCost.water ?? 0),
    oxygen: -(lifeSupportCost.oxygen ?? 0),
    biomass: -(lifeSupportCost.biomass ?? 0),
  }
  if (currency) net.currency = currency
  if (luxury) net.luxury = luxury

  return {
    capacity,
    availableCapacity,
    residentsByFacility,
    facilityNet,
    lifeSupportCost,
    lifeSupportRatio,
    growthPotential,
    migrationIn,
    attrition,
    nextPressureDays,
    net,
    status: hasLifePressure ? 'strained' : hasCapacityPressure ? 'full' : 'stable',
  }
}
