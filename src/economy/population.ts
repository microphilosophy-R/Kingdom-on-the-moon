import { getHousingCapacity } from './calendar'
import { defaultReserveFloors, resourceOrder } from './resources'
import { facilityEconomySpecs } from './facilities'
import { hasTech } from './technologies'
import type { FacilityId, PopulationContext, PopulationPolicy, PopulationProjection, ResourceKey, Resources } from './types'

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
  let unassignedResidents = Math.max(0, Math.floor(context.resources.population))
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
    const spec = facilityEconomySpecs[id]
    const method = spec.productionMethods[0]
    const net: Partial<Resources> = {}
    if (residents <= 0) {
      facilityNet[id] = net
      return
    }
    const waterCost = residents * (method.input.water ?? 0)
    const oxygenCost = residents * (method.input.oxygen ?? 0)
    const biomassCost = residents * (method.input.biomass ?? 0)
    net.water = -waterCost
    net.oxygen = -oxygenCost
    net.biomass = -biomassCost
    if (method.output.currency) {
      net.currency = residents * (method.output.currency ?? 0)
      currency += net.currency
    }
    if (method.output.luxury) {
      net.luxury = residents * (method.output.luxury ?? 0)
      luxury += net.luxury
    }
    lifeSupportCost.water = (lifeSupportCost.water ?? 0) + waterCost
    lifeSupportCost.oxygen = (lifeSupportCost.oxygen ?? 0) + oxygenCost
    lifeSupportCost.biomass = (lifeSupportCost.biomass ?? 0) + biomassCost
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
  const highestHousingLevel = Math.max(
    context.facilities.K?.level ?? 0,
    context.facilities.H?.level ?? 0,
    context.facilities.M?.level ?? 0,
  )
  const growthPotential = (
    0.5 +
    highestHousingLevel * 0.04 +
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
