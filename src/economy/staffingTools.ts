import { getFacilityWorkCapacity, isFixedFacility, isHousingFacility } from './calendar'
import { facilityEconomySpecs, facilityOrder } from './facilities'
import { resourceOrder } from './resources'
import { selectProductionMethod } from './technologies'
import { resourceDebtLimits } from './trade'
import type { FacilityId, FacilityState, ProductionMethodId, Resources } from './types'

/**
 * 人力自动纠正 —— 系统自带的便捷工具（完全手动启停）。
 * 当物质资源跌破债务上限时，精确撤走最大消耗设施中对应数量的岗位，
 * 并按优先级将释放的人力重分配到有闲置容量的设施。
 * 返回调整后的人力配置和释放总数。
 *
 * 冲突说明：本工具与优化器内置的 rebalanceStaffing（高级评分分配）是两套互相冲突的分配口径，
 * 启用优化器时应停用本工具，改用 rebalanceStaffing，避免两套算法同时争夺人力。
 */
export function autoCorrectStaffing(
  resources: Resources,
  facilities: FacilityState[],
  staffing: Record<FacilityId, number>,
  techs: string[],
  productionMethods: Partial<Record<FacilityId, ProductionMethodId>>,
  debtLimits: Partial<Resources> = resourceDebtLimits,
): { adjustedStaffing: Record<FacilityId, number>; releasedWorkers: number } {
  const adjusted = { ...staffing }
  let released = 0

  // 阶段一：对被突破上限的资源，找到最大消费者并按超额量精确撤人
  resourceOrder.forEach(key => {
    const limit = debtLimits[key]
    if (limit === undefined) return
    if ((resources[key] ?? 0) >= limit) return

    const overshoot = limit - (resources[key] ?? 0)

    // 找到当前在职的、每岗消耗该资源最多的设施
    const biggestConsumer = facilityOrder
      .filter(id => adjusted[id] > 0)
      .map(id => {
        const spec = facilityEconomySpecs[id]
        if (isHousingFacility(id) || isFixedFacility(id)) return null
        const method = selectProductionMethod(spec.productionMethods, techs, productionMethods[id])
        const perJob = method.input[key] ?? 0
        if (perJob <= 0) return null
        return { id, perJob, totalDaily: perJob * adjusted[id] }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.totalDaily - a.totalDaily)[0]

    if (!biggestConsumer) return

    // 精确撤人：超额量 + 5% 债务上限缓冲，防止撤人后立即反弹
    const buffer = Math.abs(limit) * 0.05
    const jobsToRemove = Math.min(
      adjusted[biggestConsumer.id],
      Math.max(1, Math.ceil((overshoot + buffer) / Math.max(0.01, biggestConsumer.perJob))),
    )

    adjusted[biggestConsumer.id] -= jobsToRemove
    released += jobsToRemove
  })

  // 阶段二：按设施优先级将释放的人力重分配到有闲置容量的设施（排除刚撤人的设施防回弹）
  if (released > 0) {
    let remaining = released
    const penalizedIds = new Set(
      resourceOrder
        .filter(key => {
          const limit = debtLimits[key]
          return limit !== undefined && (resources[key] ?? 0) < limit
        })
        .map(key => {
          return facilityOrder
            .filter(id => adjusted[id] < (staffing[id] ?? 0))
            .map(id => {
              const spec = facilityEconomySpecs[id]
              if (isHousingFacility(id) || isFixedFacility(id)) return null
              const method = selectProductionMethod(spec.productionMethods, techs, productionMethods[id])
              return { id, perJob: method.input[key] ?? 0 }
            })
            .filter((c): c is NonNullable<typeof c> => c !== null && c.perJob > 0)
            .sort((a, b) => (b.perJob * (staffing[b.id] ?? 0)) - (a.perJob * (staffing[a.id] ?? 0)))[0]?.id
        })
        .filter((id): id is FacilityId => id !== undefined),
    )
    const candidates = facilityOrder
      .filter(id => {
        if (penalizedIds.has(id)) return false
        if (isHousingFacility(id) || isFixedFacility(id)) return false
        const capacity = getFacilityWorkCapacity(id, facilities.find(f => f.id === id)?.level ?? 0)
        return capacity > 0 && adjusted[id] < capacity
      })
      .map(id => ({
        id,
        priority: facilityEconomySpecs[id].priority,
        capacity: getFacilityWorkCapacity(id, facilities.find(f => f.id === id)?.level ?? 0),
        current: adjusted[id],
      }))
      .sort((a, b) => b.priority - a.priority)

    candidates.forEach(c => {
      if (remaining <= 0) return
      const assignable = Math.min(remaining, c.capacity - c.current)
      adjusted[c.id] += assignable
      remaining -= assignable
    })
  }

  return { adjustedStaffing: adjusted, releasedWorkers: released }
}
