import { defaultReserveFloors, emptyResources, resourceMeta, resourceOrder, resourceWeights, weightedValue, applyBundle, canAfford } from './resources'
import { hasTech } from './technologies'
import type { AutoTrade, FacilityState, ResourceKey, Resources, StarportTradeOffer } from './types'
const emptyTradeDelta = (): Resources => ({
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
})

export const starportTradeOffers: StarportTradeOffer[] = [
  {
    id: 'ts0-water',
    unlockTech: 'TS-0',
    name: '水资源',
    resource: 'water',
    input: { currency: 2.1 },
    output: { water: 1 },
    baseValue: 2.0,
    buyPremium: 0.05,
    sellDiscount: 0.05,
    note: '太渊星域地下水系丰沛，货源充足。',
    automated: true,
    canSell: true,
  },
  {
    id: 'ts0-oxygen',
    unlockTech: 'TS-0',
    name: '氧气',
    resource: 'oxygen',
    input: { currency: 2.1 },
    output: { oxygen: 1 },
    baseValue: 2.0,
    buyPremium: 0.05,
    sellDiscount: 0.05,
    note: '压缩罐装运输，货舱密度高。',
    automated: true,
    canSell: true,
  },
  {
    id: 'ts0-biomass',
    unlockTech: 'TS-0',
    name: '生物质',
    resource: 'biomass',
    input: { currency: 3.21 },
    output: { biomass: 1 },
    baseValue: 3.0,
    buyPremium: 0.07,
    sellDiscount: 0.07,
    note: '活体培养物，需检疫保险，溢价含风险金。',
    automated: true,
    canSell: true,
  },
  {
    id: 'ts0-regolith',
    unlockTech: 'TS-0',
    name: '月壤',
    resource: 'regolith',
    input: { currency: 1.08 },
    output: { regolith: 1 },
    baseValue: 1.0,
    buyPremium: 0.08,
    sellDiscount: 0.08,
    note: '月面最廉价资源，运费占比高。',
    automated: true,
    canSell: true,
  },
  {
    id: 'ts0-alloy',
    unlockTech: 'TS-0',
    name: '合金',
    resource: 'alloy',
    input: { currency: 5.25 },
    output: { alloy: 1 },
    baseValue: 5.0,
    buyPremium: 0.05,
    sellDiscount: 0.05,
    note: '专用防震舱位运输，损耗低。',
    automated: true,
    canSell: true,
  },
  {
    id: 'ts1-labor',
    unlockTech: 'TS-1',
    name: '星际劳工',
    resource: 'population',
    input: { currency: 28.89 },
    output: { population: 1 },
    baseValue: 27.0,
    buyPremium: 0.07,
    sellDiscount: 0,
    note: '含维生舱租赁与航行配给。仅限买入。',
    canSell: false,
  },
  {
    id: 'ts2-knowledge',
    unlockTech: 'TS-2',
    name: '知识包（6份）',
    resource: 'knowledge',
    input: { currency: 18.9 },
    output: { knowledge: 6 },
    baseValue: 18.0,
    buyPremium: 0.05,
    sellDiscount: 0.05,
    note: '量子加密信道传输，6份一包。',
    canSell: true,
  },
  {
    id: 'ts2-core',
    unlockTech: 'TS-2',
    name: '量子计算核心',
    resource: 'quantumCore',
    input: { currency: 123.6 },
    output: { quantumCore: 1 },
    baseValue: 120,
    buyPremium: 0.03,
    sellDiscount: 0.03,
    note: '太渊硬通货，武装押运，溢价主为保险。',
    automated: true,
    canSell: true,
  },
  {
    id: 'ts3-luxury',
    unlockTech: 'TS-3',
    name: '艺术奢侈品',
    resource: 'luxury',
    input: { currency: 6.42 },
    output: { luxury: 1 },
    baseValue: 6.0,
    buyPremium: 0.07,
    sellDiscount: 0.07,
    note: '玫瑰星球溢价十倍，星港仅收佣金。',
    automated: true,
    canSell: true,
  },
]

/** 每日自动交易资源（点击后锁定每日执行），其余为单次交易。 */
export const dailyTradeResources: ResourceKey[] = ['water', 'oxygen', 'biomass', 'regolith', 'alloy', 'knowledge']

export const isDailyTradeResource = (key: ResourceKey) => dailyTradeResources.includes(key)

const scaleBundle = (bundle: Partial<Resources>, multiplier: number): Partial<Resources> => {
  const scaled: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    const value = bundle[key] ?? 0
    if (value) scaled[key] = value * multiplier
  })
  return scaled
}

const hasOperationalStarport = (facilities: FacilityState[], techs: string[] = []) =>
  hasTech(techs, 'TS-0') && facilities.some(facility => facility.id === 'S' && facility.level > 0)

const resourceImportOffer = (key: ResourceKey) =>
  starportTradeOffers.find(offer => (offer.output[key] ?? 0) > 0 && (offer.input.currency ?? 0) > 0)

const bundleDelta = (output: Partial<Resources>, input: Partial<Resources>) => {
  const delta: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    const value = (output[key] ?? 0) - (input[key] ?? 0)
    if (value) delta[key] = value
  })
  return delta
}

export const isCurrencyOnlyTradeInput = (input: Partial<Resources>) =>
  resourceOrder.every(key => key === 'currency' || !(input[key] ?? 0))

export const canExecuteStarportTrade = (resources: Resources, input: Partial<Resources>) =>
  canAfford(resources, input) || isCurrencyOnlyTradeInput(input)

export const currencyDebtInterestRate = 0.002
export const emergencyCreditDebtLimit = -240
export const emergencyCreditBatchLimit = 12

/** 物质资源债务上限 —— 资源不得跌破此值。触及后全设施产出等比衰减。 */
export const resourceDebtLimits: Partial<Resources> = {
  water: -1000,
  oxygen: -1000,
  biomass: -1000,
  regolith: -3000,
  alloy: -3000,
  luxury: -500,
}

/**
 * 约束日净产出：当任意资源会因当日消耗超出弹性债务上限时，
 * 等比缩放全部设施的净产出，衰减从 100%（恰在上限）到 2%（深度超限）。
 * 返回约束后的净产出和衰减系数（1 = 无约束）。
 */
export function constrainDailyNet(
  bank: Resources,
  dailyNet: Resources,
  debtLimits: Partial<Resources> = resourceDebtLimits,
): { constrainedNet: Resources; throttleFactor: number } {
  let throttleFactor = 1

  resourceOrder.forEach(key => {
    const limit = debtLimits[key]
    if (limit === undefined) return
    const net = dailyNet[key] ?? 0
    if (net >= 0) return
    const projected = (bank[key] ?? 0) + net
    if (projected >= limit) return
    // 弹性区间：上限下方 10% 作为缓冲区
    const elasticity = Math.abs(limit) * 0.1
    const softLimit = limit - elasticity
    const factor = Math.max(0.02, Math.min(1, ((bank[key] ?? 0) - softLimit) / (limit - softLimit)))
    throttleFactor = Math.min(throttleFactor, factor)
  })

  if (throttleFactor >= 1) return { constrainedNet: dailyNet, throttleFactor: 1 }

  const constrainedNet = emptyResources()
  resourceOrder.forEach(key => {
    constrainedNet[key] = (dailyNet[key] ?? 0) * throttleFactor
  })

  return { constrainedNet, throttleFactor }
}

export const calculateCurrencyDebtInterest = (resources: Resources) =>
  resources.currency < 0 ? Math.max(0.05, Math.abs(resources.currency) * currencyDebtInterestRate) : 0

export const estimateTradePremium = (trade: AutoTrade, weights: Resources = resourceWeights) =>
  Math.max(0, weightedValue(trade.input, weights) - weightedValue(trade.output, weights)) +
  calculateCurrencyDebtInterest(applyBundle(emptyTradeDelta(), trade.input, -1))

export function estimateResourceImportPremium(
  key: ResourceKey,
  shortage: number,
  resources: Resources,
  techs: string[] = [],
  weights: Resources = resourceWeights,
) {
  if (shortage <= 0) return 0
  const offer = resourceImportOffer(key)
  if (!offer || !hasTech(techs, offer.unlockTech)) return shortage * weights[key] * 4
  const outputPerBatch = offer.output[key] ?? 0
  if (outputPerBatch <= 0) return shortage * weights[key] * 4

  const batches = Math.ceil(shortage / outputPerBatch)
  const input = scaleBundle(offer.input, batches)
  const output = scaleBundle(offer.output, batches)
  const postTrade = applyBundle(applyBundle(resources, input, -1), output)
  return estimateTradePremium({ offerId: offer.id, name: offer.name, input, output }, weights) +
    calculateCurrencyDebtInterest(postTrade) * 30
}

export function estimateResourceDeficitPremium(
  resources: Resources,
  targets: Partial<Resources>,
  facilities: FacilityState[],
  techs: string[] = [],
  weights: Resources = resourceWeights,
) {
  const starportOnline = hasOperationalStarport(facilities, techs)
  const basePremium = resourceOrder.reduce((sum, key) => {
    const target = targets[key] ?? 0
    const shortage = Math.max(0, target - resources[key])
    if (shortage <= 0) return sum
    if (key === 'currency') return sum + calculateCurrencyDebtInterest(resources) * 50 + shortage * weights.currency * 0.5
    if (key === 'power' || key === 'population' || key === 'knowledge') return sum + shortage * weights[key] * 2
    if (!resourceMeta[key].storable || !resourceMeta[key].tradable) return sum + shortage * weights[key] * 2
    return sum + (starportOnline ? estimateResourceImportPremium(key, shortage, resources, techs, weights) : shortage * weights[key] * 4)
  }, 0)

  // 硬债务约束惩罚：资源逼近债务上限时指数级飙升，强制 optimizer 避让
  let hardConstraintPenalty = 0
  resourceOrder.forEach(key => {
    const limit = resourceDebtLimits[key]
    if (limit === undefined) return
    if ((resources[key] ?? 0) < limit) {
      // 已跌破上限 → 按缺口深度 × 权重 × 100 倍惩罚
      const breachDepth = limit - (resources[key] ?? 0)
      hardConstraintPenalty += Math.abs(breachDepth) * weights[key] * 100
    } else {
      // 在上限之上 → 检查是否在危险区间内
      const headroom = (resources[key] ?? 0) - limit
      const dangerZone = Math.abs(limit) * 0.5
      if (headroom < dangerZone) {
        hardConstraintPenalty += weights[key] * dangerZone / Math.max(1, headroom) * 120
      }
    }
  })

  return basePremium + hardConstraintPenalty
}

export function planAutoTradesForDeficits(
  resources: Resources,
  targets: Partial<Resources>,
  facilities: FacilityState[],
  techs: string[] = [],
  enabled: Partial<Record<ResourceKey, boolean>> = {},
  protectionEnabled = true,
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

export function planAutoTradesForCost(
  resources: Resources,
  cost: Partial<Resources>,
  facilities: FacilityState[],
  techs: string[] = [],
  reserveFloors: Partial<Resources> = defaultReserveFloors,
): { trades: AutoTrade[]; resources: Resources } {
  if (!hasOperationalStarport(facilities, techs)) return { trades: [], resources }

  const floors = { ...defaultReserveFloors, ...reserveFloors } as Resources
  let working = { ...resources }
  const trades: AutoTrade[] = []

  // 遍历所有自动贸易品，处理每种物资的短缺（用货币购买）
  starportTradeOffers
    .filter(offer => offer.automated && hasTech(techs, offer.unlockTech))
    .forEach(offer => {
      const outputKeys = resourceOrder.filter(key => (offer.output[key] ?? 0) > 0)
      outputKeys.forEach(outputKey => {
        if (outputKey === 'power' || outputKey === 'population' || outputKey === 'knowledge' || outputKey === 'luxury') return
        const outputPerBatch = offer.output[outputKey] ?? 0
        if (outputPerBatch <= 0) return

        const target = (cost[outputKey] ?? 0) + floors[outputKey]
        const shortage = Math.max(0, target - working[outputKey])
        if (shortage <= 0) return

        // 可用货币 = 当前货币 - 建筑消耗所需货币 - 储备底线
        const availableCurrency = Math.max(0, working.currency - (cost.currency ?? 0) - floors.currency)
        const currencyCost = offer.input.currency ?? 0
        const maxBatchesByCurrency = currencyCost > 0 ? Math.floor(availableCurrency / currencyCost) : Number.POSITIVE_INFINITY
        const maxBatchesByShortage = Math.ceil(shortage / outputPerBatch)
        const batches = Math.min(maxBatchesByCurrency, maxBatchesByShortage)
        if (batches <= 0 || !Number.isFinite(batches)) return

        const input = scaleBundle(offer.input, batches)
        const output = scaleBundle(offer.output, batches)
        working = applyBundle(applyBundle(working, input, -1), output)
        trades.push({ offerId: offer.id, name: offer.name, input, output })
      })
    })

  return { trades, resources: working }
}
