import { defaultReserveFloors, emergencyCreditDebtLimit, resourceOrder } from '../economy'
import type { Resources } from '../economy'

export const scaleResourceBundle = (bundle: Partial<Resources>, multiplier: number): Partial<Resources> => {
  const scaled: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    if (bundle[key]) scaled[key] = bundle[key]! * multiplier
  })
  return scaled
}

export const bundleHasValues = (bundle: Partial<Resources>) => resourceOrder.some(key => Boolean(bundle[key]))

export const maxTradeBatchesFromSurplus = (resources: Resources, input: Partial<Resources>) => {
  const limits = resourceOrder
    .map(key => {
      const required = input[key] ?? 0
      if (!required) return Number.POSITIVE_INFINITY
      const floor = key === 'currency' ? defaultReserveFloors.currency : defaultReserveFloors[key]
      const surplus = Math.max(0, resources[key] - floor)
      return Math.floor(surplus / required)
    })
    .filter(limit => Number.isFinite(limit))
  return limits.length ? Math.max(0, Math.min(...limits)) : 0
}

export const maxTradeBatchesWithDebt = (resources: Resources, input: Partial<Resources>) => {
  const limits = resourceOrder
    .map(key => {
      const required = input[key] ?? 0
      if (!required) return Number.POSITIVE_INFINITY
      if (key === 'currency') return Math.floor(Math.max(0, resources.currency - emergencyCreditDebtLimit) / required)
      return Math.floor(Math.max(0, resources[key]) / required)
    })
    .filter(limit => Number.isFinite(limit))
  return limits.length ? Math.max(0, Math.min(...limits)) : 0
}

export const deficitTradeBatches = (resources: Resources, output: Partial<Resources>) => {
  const needed = resourceOrder.map(key => {
    const produced = output[key] ?? 0
    if (!produced) return 0
    return Math.ceil(Math.max(0, defaultReserveFloors[key] - resources[key]) / produced)
  })
  return Math.max(0, ...needed)
}
