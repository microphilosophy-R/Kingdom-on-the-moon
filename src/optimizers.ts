import {
  autoCorrectStaffing,
  facilityOrder,
  planFacilityAutomation,
  type AutomationPlan,
  type FacilityId,
  type PlanInput,
  type Resources,
} from './economy'

export { autoCorrectStaffing }

export type OptimizerId = 'crown-steward'

export type GameOptimizer = {
  id: OptimizerId
  name: string
  purpose: 'test-baseline' | 'player-assist'
  description: string
  run: (input: PlanInput) => AutomationPlan
}

export const crownStewardOptimizer: GameOptimizer = {
  id: 'crown-steward',
  name: 'Crown Steward',
  purpose: 'test-baseline',
  description: 'Background economic optimizer used for deterministic simulation and balance tests.',
  run: planFacilityAutomation,
}

export const gameOptimizers: Record<OptimizerId, GameOptimizer> = {
  [crownStewardOptimizer.id]: crownStewardOptimizer,
}

export const createDisabledAutomationPlan = (
  resources: Resources,
  facilities: { id: FacilityId; level: number }[] = facilityOrder.map(id => ({ id, level: 0 })),
): AutomationPlan => ({
  mode: 'manual',
  reason: 'optimizer disabled',
  actions: [],
  technologyActions: [],
  methodActions: [],
  staffingActions: [],
  targetLevels: Object.fromEntries(
    facilityOrder.map(id => [id, facilities.find(facility => facility.id === id)?.level ?? 0]),
  ) as Record<FacilityId, number>,
  weightedProfit: 0,
  projectedResources: { ...resources },
})
