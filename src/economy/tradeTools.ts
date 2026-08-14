import { applyBundle, defaultReserveFloors, resourceMeta, resourceOrder } from './resources'
import { hasTech } from './technologies'
import { bundleDelta, emptyTradeDelta, emergencyCreditBatchLimit, emergencyCreditDebtLimit, hasOperationalStarport, planSellSurplusForCurrency, resourceImportOffer, scaleBundle } from './trade'
import type { AutoTrade, FacilityState, ResourceKey, Resources } from './types'

/**
 * 自动贸易保护 —— 系统自带的便捷工具（完全手动启停）。
 * 默认补齐低于目标的物资（通常是维生与星舰/生态环材料），
 * 并在货币赤字时先售卖盈余物资换取货币，减少对信贷的依赖。
 *
 * 冲突说明：本工具是「按固定目标被动补资源」的系统默认口径；
 * 优化器使用 optimizer.ts 内的 planAutoTradesForCost 自主决定购入/卖出数量，
 * 启用优化器时应停用本工具，避免两套贸易策略同时争抢库存。
 */
export function planAutoTradesForDeficits(
  resources: Resources,
  targets: Partial<Resources>,
  facilities: FacilityState[],
  techs: string[] = [],
  enabled: Partial<Record<ResourceKey, boolean>> = {},
  protectionEnabled = true,
  dailyNet: Partial<Resources> = {},
): { trades: AutoTrade[]; resources: Resources; delta: Partial<Resources>; tradedResources: ResourceKey[] } {
  if (!protectionEnabled || !hasOperationalStarport(facilities, techs)) {
    return { trades: [], resources, delta: {}, tradedResources: [] }
  }

  let working = { ...resources }
  const trades: AutoTrade[] = []
  const tradedResources: ResourceKey[] = []

  resourceOrder.forEach(key => {
    if (key === 'power' || key === 'currency' || key === 'population' || key === 'knowledge') return
    if (enabled[key] === false || !resourceMeta[key].storable || !resourceMeta[key].tradable) return
    const target = targets[key] ?? 0
    const shortage = Math.max(0, target - working[key])
    if (shortage <= 0) return
    const offer = resourceImportOffer(key)
    if (!offer || !hasTech(techs, offer.unlockTech)) return
    const outputPerBatch = offer.output[key] ?? 0
    if (outputPerBatch <= 0) return

    const requestedBatches = Math.ceil(shortage / outputPerBatch)
    const currencyCost = offer.input.currency ?? 0

    // 货币赤字时，先售卖盈余物资换货币，减少对信贷的依赖
    if (currencyCost > 0) {
      const requestedCurrency = requestedBatches * currencyCost
      const availableCurrency = Math.max(0, working.currency)
      if (availableCurrency < requestedCurrency) {
        const sellPlan = planSellSurplusForCurrency(working, requestedCurrency - availableCurrency, facilities, techs, defaultReserveFloors, dailyNet)
        working = sellPlan.resources
        trades.push(...sellPlan.trades)
      }
    }

    const affordableBatches = currencyCost > 0
      ? Math.max(0, Math.floor(Math.max(0, working.currency) / currencyCost))
      : requestedBatches
    const debtCapacity = currencyCost > 0
      ? Math.max(0, Math.floor(Math.max(0, working.currency - emergencyCreditDebtLimit) / currencyCost))
      : requestedBatches
    const batches = Math.min(requestedBatches, Math.max(affordableBatches, Math.min(debtCapacity, emergencyCreditBatchLimit)))
    if (batches <= 0) return
    const input = scaleBundle(offer.input, batches)
    const output = scaleBundle(offer.output, batches)
    working = applyBundle(applyBundle(working, input, -1), output)
    trades.push({ offerId: offer.id, name: offer.name, input, output })
    tradedResources.push(key)
  })

  const delta = trades.reduce((sum, trade) => applyBundle(sum as Resources, bundleDelta(trade.output, trade.input)), emptyTradeDelta())

  return { trades, resources: working, delta, tradedResources }
}
