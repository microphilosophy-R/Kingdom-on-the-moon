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

/** 【L3 出口】优化器激活时执行的真实运行时（当前仅有 Crown Steward 一个实现）。 */
export const gameOptimizers: Record<OptimizerId, GameOptimizer> = {
  [crownStewardOptimizer.id]: crownStewardOptimizer,
}

/**
 * 【L3 禁用态】优化器未激活时生成的空计划（mode='manual'）。
 * 仅用于向 UI/报告提供统一形状，不产生任何动作。
 */
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
