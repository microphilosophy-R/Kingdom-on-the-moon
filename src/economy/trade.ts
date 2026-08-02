import { defaultReserveFloors, resourceMeta, resourceOrder, resourceWeights, weightedValue, applyBundle, canAfford } from './resources'
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
    id: 'ts0-currency-to-alloy',
    unlockTech: 'TS-0',
    name: '合金采购',
    input: { currency: 4 },
    output: { alloy: 1 },
    note: '用星海货币采购建设合金。',
    automated: true,
  },
  {
    id: 'ts0-water-credit',
    unlockTech: 'TS-0',
    name: '水资源信用采购',
    input: { currency: 2 },
    output: { water: 1 },
    note: '用星海信用补足水资源赤字，货币不足时形成债务。',
    automated: true,
  },
  {
    id: 'ts0-oxygen-credit',
    unlockTech: 'TS-0',
    name: '氧气信用采购',
    input: { currency: 2 },
    output: { oxygen: 1 },
    note: '用星海信用补足氧气赤字，货币不足时形成债务。',
    automated: true,
  },
  {
    id: 'ts0-biomass-credit',
    unlockTech: 'TS-0',
    name: '生物质信用采购',
    input: { currency: 3 },
    output: { biomass: 1 },
    note: '用星海信用补足生物质赤字，货币不足时形成债务。',
    automated: true,
  },
  {
    id: 'ts0-regolith-credit',
    unlockTech: 'TS-0',
    name: '月壤信用采购',
    input: { currency: 1 },
    output: { regolith: 1 },
    note: '用星海信用补足月壤赤字，货币不足时形成债务。',
    automated: true,
  },
  {
    id: 'ts0-regolith-to-alloy',
    unlockTech: 'TS-0',
    name: '月壤换购合金',
    input: { regolith: 6 },
    output: { alloy: 1 },
    note: '出售盈余月壤，换取建设合金。',
    automated: true,
  },
  {
    id: 'ts1-labor',
    unlockTech: 'TS-1',
    name: '招募星际劳工',
    input: { currency: 6, luxury: 1 },
    output: { population: 1 },
    note: '用星海货币和礼物吸引一名外来定居者。',
  },
  {
    id: 'ts2-knowledge',
    unlockTech: 'TS-2',
    name: '采购知识包',
    input: { currency: 5, alloy: 2 },
    output: { knowledge: 6 },
    note: '用工业品换取可研究知识。',
  },
  {
    id: 'ts2-core-credit',
    unlockTech: 'TS-2',
    name: '量子核心信用采购',
    input: { currency: 32 },
    output: { quantumCore: 1 },
    note: '用高额星海信用补足量子计算核心。',
    automated: true,
  },
  {
    id: 'ts3-luxury-export',
    unlockTech: 'TS-3',
    name: '出口艺术奢侈品',
    input: { biomass: 4, water: 2 },
    output: { luxury: 3, currency: 2 },
    note: '把生态盈余加工为外交礼物和结算货币。',
  },
  {
    id: 'ts3-luxury-credit',
    unlockTech: 'TS-3',
    name: '艺术奢侈品信用采购',
    input: { currency: 4 },
    output: { luxury: 1 },
    note: '用星海信用补足外交礼物。',
    automated: true,
  },
]

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

export const currencyDebtInterestRate = 0.003
export const emergencyCreditDebtLimit = -240
export const emergencyCreditBatchLimit = 12

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
  return resourceOrder.reduce((sum, key) => {
    const target = targets[key] ?? 0
    const shortage = Math.max(0, target - resources[key])
    if (shortage <= 0) return sum
    if (key === 'currency') return sum + calculateCurrencyDebtInterest(resources) * 50 + shortage * weights.currency * 0.5
    if (key === 'power' || key === 'population' || key === 'knowledge') return sum + shortage * weights[key] * 2
    if (!resourceMeta[key].storable || !resourceMeta[key].tradable) return sum + shortage * weights[key] * 2
    return sum + (starportOnline ? estimateResourceImportPremium(key, shortage, resources, techs, weights) : shortage * weights[key] * 4)
  }, 0)
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
  const alloyTarget = (cost.alloy ?? 0) + floors.alloy
  let alloyShortage = Math.max(0, alloyTarget - working.alloy)
  if (alloyShortage <= 0) return { trades, resources: working }

  starportTradeOffers
    .filter(offer => offer.automated && (offer.output.alloy ?? 0) > 0 && hasTech(techs, offer.unlockTech))
    .forEach(offer => {
      if (alloyShortage <= 0) return
      const outputAlloy = offer.output.alloy ?? 0
      const maxBatches = resourceOrder.reduce((limit, key) => {
        const required = offer.input[key] ?? 0
        if (!required) return limit
        const reserved = (cost[key] ?? 0) + floors[key]
        const surplus = Math.max(0, working[key] - reserved)
        return Math.min(limit, Math.floor(surplus / required))
      }, Number.POSITIVE_INFINITY)
      if (!Number.isFinite(maxBatches) || maxBatches <= 0) return

      const batches = Math.min(maxBatches, Math.ceil(alloyShortage / outputAlloy))
      const input = scaleBundle(offer.input, batches)
      const output = scaleBundle(offer.output, batches)
      working = applyBundle(applyBundle(working, input, -1), output)
      alloyShortage = Math.max(0, alloyTarget - working.alloy)
      trades.push({ offerId: offer.id, name: offer.name, input, output })
    })

  return { trades, resources: working }
}
