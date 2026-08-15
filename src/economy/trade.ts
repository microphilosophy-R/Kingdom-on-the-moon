import { defaultReserveFloors, emptyResources, resourceMeta, resourceOrder, resourceWeights, weightedValue, applyBundle, canAfford } from './resources'
import { hasTech } from './technologies'
import type { AutoTrade, FacilityState, ResourceKey, Resources, StarportTradeOffer } from './types'
export const emptyTradeDelta = (): Resources => ({
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
    input: { currency: 3.15 },
    output: { water: 1 },
    baseValue: 3.0,
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
    input: { currency: 3.15 },
    output: { oxygen: 1 },
    baseValue: 3.0,
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
    input: { currency: 5.35 },
    output: { biomass: 1 },
    baseValue: 5.0,
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
    input: { currency: 2.16 },
    output: { regolith: 1 },
    baseValue: 2.0,
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
    input: { currency: 8.4 },
    output: { alloy: 1 },
    baseValue: 8.0,
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
    input: { currency: 214.0 },
    output: { population: 1 },
    baseValue: 200.0,
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
    input: { currency: 50.4 },
    output: { knowledge: 6 },
    baseValue: 48.0,
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
    input: { currency: 154.5 },
    output: { quantumCore: 1 },
    baseValue: 150.0,
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
    input: { currency: 10.7 },
    output: { luxury: 1 },
    baseValue: 10.0,
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

export const scaleBundle = (bundle: Partial<Resources>, multiplier: number): Partial<Resources> => {
  const scaled: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    const value = bundle[key] ?? 0
    if (value) scaled[key] = value * multiplier
  })
  return scaled
}

export const hasOperationalStarport = (facilities: FacilityState[], techs: string[] = []) =>
  hasTech(techs, 'TS-0') && facilities.some(facility => facility.id === 'S' && facility.level > 0)

export const resourceImportOffer = (key: ResourceKey) =>
  starportTradeOffers.find(offer => (offer.output[key] ?? 0) > 0 && (offer.input.currency ?? 0) > 0)

export const bundleDelta = (output: Partial<Resources>, input: Partial<Resources>) => {
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
export const emergencyCreditDebtLimit = -2000
export const emergencyCreditBatchLimit = 12

/** 售卖盈余时，为净消耗资源保留的缓冲天数（避免卖掉未来会被消耗的库存）。 */
const SELL_RESERVE_DAYS = 30

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

/**
 * 经济总量（清算价值）：假设把当前全部可交易库存通过星港以「卖出价」（多卖少买）归零后，
 * 得到的星海货币总量。即 当前货币 + Σ(可售资源库存 × 单位卖出价)。
 *
 * - 只有星港可售（canSell）且已解锁（unlockTech）的品类才计入；人口仅可买入，不计入。
 * - 电力不可交易，不计入；货币本身直接计入（可为负，即负债）。
 * - 知识以 6 份一包报价，需按每份折算。
 */
export function estimateLiquidationValue(resources: Resources, techs: string[] = []): number {
  let total = resources.currency ?? 0
  for (const offer of starportTradeOffers) {
    if (!offer.canSell || !hasTech(techs, offer.unlockTech)) continue
    const unitsPerBatch = offer.output[offer.resource] ?? 0
    if (unitsPerBatch <= 0) continue
    const sellPricePerUnit = (offer.baseValue * (1 - offer.sellDiscount)) / unitsPerBatch
    total += (resources[offer.resource] ?? 0) * sellPricePerUnit
  }
  return total
}

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

/** 【L2/L3 共享】货币不足时，售卖高于储备线的盈余物资换取货币，用于支付建设或采购，避免单纯依赖信贷。 */
export function planSellSurplusForCurrency(
  resources: Resources,
  currencyShortage: number,
  facilities: FacilityState[],
  techs: string[] = [],
  reserveFloors: Partial<Resources> = defaultReserveFloors,
  dailyNet: Partial<Resources> = {},
): { trades: AutoTrade[]; resources: Resources } {
  if (currencyShortage <= 0 || !hasOperationalStarport(facilities, techs)) {
    return { trades: [], resources }
  }
  const floors = { ...defaultReserveFloors, ...reserveFloors } as Resources
  let working = { ...resources }
  const trades: AutoTrade[] = []
  let remaining = currencyShortage

  // 动态优先级：按「可售盈余」降序售卖，盈余最多（库存富余且非净消耗）的资源优先。
  // 净增长为负的资源保留未来 SELL_RESERVE_DAYS 天的消耗量，避免前脚买入后脚卖出。
  const sellable = starportTradeOffers
    .filter(offer => offer.automated && offer.canSell && hasTech(techs, offer.unlockTech))
    .map(offer => {
      const key = offer.resource
      const net = dailyNet[key] ?? 0
      const reserveBuffer = net < 0 ? Math.abs(net) * SELL_RESERVE_DAYS : 0
      const surplus = Math.max(0, (working[key] ?? 0) - (floors[key] ?? 0) - reserveBuffer)
      return { offer, key, surplus }
    })
    .filter(item => item.surplus > 0)
    .sort((a, b) => b.surplus - a.surplus)

  for (const { offer, key, surplus } of sellable) {
    if (remaining <= 0) break
    const sellValue = offer.baseValue * (1 - offer.sellDiscount)
    if (sellValue <= 0) continue
    const maxUnits = Math.floor(surplus)
    const neededUnits = Math.ceil(remaining / sellValue)
    const units = Math.min(maxUnits, neededUnits)
    if (units <= 0) continue
    const input = { [key]: units } as Partial<Resources>
    const output = { currency: units * sellValue } as Partial<Resources>
    working = applyBundle(applyBundle(working, input, -1), output)
    trades.push({ offerId: offer.id, name: offer.name, input, output })
    remaining -= units * sellValue
  }

  return { trades, resources: working }
}

