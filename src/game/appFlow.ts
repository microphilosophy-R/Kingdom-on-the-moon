/**
 * 资源流计算纯函数：汇总生产/消耗/净变化、人口流、交易流、王月报告资源行。
 * 从 App.tsx 拆分而来（原模块级代码）。
 */
import {
  planAutoTradesForDeficits,
  resourceGroups,
  resourceOrder,
  shipProjectStages,
  type PopulationProjection,
  type ResourceKey,
  type Resources,
} from '../economy'
import type { ReignReport } from '../types/game'

export const allResourceKeys = resourceGroups.flatMap(group => group.keys)

export const weightedShipReadiness = (resources: Resources) => {
  const ratios = shipProjectStages.flatMap(stage =>
    Object.entries(stage.input).map(([key, required]) => Math.min(1, resources[key as ResourceKey] / (required || 1))),
  )
  return ratios.length ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length * 24 : 0
}

export const mergeResourceChanges = (...bundles: Partial<Resources>[]): Resources => {
  const total = Object.fromEntries(resourceOrder.map(key => [key, 0])) as Resources
  bundles.forEach(bundle => {
    resourceOrder.forEach(key => {
      total[key] += bundle[key] ?? 0
    })
  })
  return total
}

export const flowFromPopulation = (projection: PopulationProjection) => {
  const production = mergeResourceChanges()
  const consumption = mergeResourceChanges()

  resourceOrder.forEach(key => {
    const net = projection.net[key] ?? 0
    const lifeSupport = projection.lifeSupportCost[key] ?? 0
    if (lifeSupport > 0) consumption[key] += lifeSupport
    if (key === 'water' || key === 'oxygen' || key === 'biomass') return
    if (net > 0) production[key] += net
    if (net < 0) consumption[key] += Math.abs(net)
  })

  return { production, consumption }
}

export const flowFromTrades = (trades: ReturnType<typeof planAutoTradesForDeficits>['trades'], currencyInterest = 0) => {
  const production = mergeResourceChanges()
  const consumption = mergeResourceChanges()
  const net = mergeResourceChanges()

  trades.forEach(trade => {
    resourceOrder.forEach(key => {
      const input = trade.input[key] ?? 0
      const output = trade.output[key] ?? 0
      if (output > 0) production[key] += output
      if (input > 0) consumption[key] += input
      net[key] += output - input
    })
  })
  if (currencyInterest > 0) {
    consumption.currency += currencyInterest
    net.currency -= currencyInterest
  }

  return { production, consumption, net }
}

export const summarizeResourceRows = (production: Resources, consumption: Resources): ReignReport['resourceRows'] => {
  const rows: ReignReport['resourceRows'] = {}
  resourceOrder.forEach(key => {
    const produced = production[key] ?? 0
    const consumed = consumption[key] ?? 0
    const net = produced - consumed
    if (produced || consumed || net) rows[key] = { produced, consumed, net }
  })
  return rows
}
