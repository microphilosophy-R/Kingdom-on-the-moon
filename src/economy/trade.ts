import { defaultReserveFloors, resourceOrder, applyBundle, canAfford } from './resources'
import { hasTech } from './technologies'
import type { AutoTrade, FacilityState, Resources, StarportTradeOffer } from './types'
export const starportTradeOffers: StarportTradeOffer[] = [
  {
    id: 'ts0-currency-to-alloy',
    unlockTech: 'TS-0',
    name: 'Starport alloy purchase',
    input: { currency: 4 },
    output: { alloy: 1 },
    note: 'Uses the starting starport to import construction alloy.',
    automated: true,
  },
  {
    id: 'ts0-regolith-to-alloy',
    unlockTech: 'TS-0',
    name: 'Regolith export for alloy',
    input: { regolith: 6 },
    output: { alloy: 1 },
    note: 'Exports spare regolith and receives alloy for construction.',
    automated: true,
  },
  {
    id: 'ts1-labor',
    unlockTech: 'TS-1',
    name: 'Recruit interstellar workers',
    input: { currency: 6, luxury: 1 },
    output: { population: 1 },
    note: 'Trades currency and gifts for one population unit.',
  },
  {
    id: 'ts2-knowledge',
    unlockTech: 'TS-2',
    name: 'Purchase knowledge packet',
    input: { currency: 5, alloy: 2 },
    output: { knowledge: 6 },
    note: 'Converts industrial goods into researchable knowledge.',
  },
  {
    id: 'ts3-luxury-export',
    unlockTech: 'TS-3',
    name: 'Export luxury goods',
    input: { biomass: 4, water: 2 },
    output: { luxury: 3, currency: 2 },
    note: 'Turns ecological surplus into gifts and settlement currency.',
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
