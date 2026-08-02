import type { FacilityId, Resources } from '../economy'

export type Role = {
  id: string
  name: string
  species: string
  glyph: string
  portrait: string
  specialty: FacilityId
  boost: number
  retainerCost: Partial<Resources>
  quote: string
}

export type EventEffect = { give: Partial<Resources>; take: Partial<Resources>; tech?: string }
export type EventInteraction = 'techTrade' | 'starportTrade' | 'hire' | 'gift' | 'request' | 'accident' | 'rareTrade' | 'chainChoice'

export type EventStep = {
  id: string
  title: string
  body: string
  interaction: EventInteraction
  offer?: EventEffect
  rolls?: EventEffect[]
  hireCost?: Partial<Resources>
  concealed?: boolean
  note?: string
}

export type EventChain = {
  id: string
  roleId: string
  arc: 'simple' | 'long'
  stage: 'early' | 'mid' | 'late'
  events: EventStep[]
}

export type Encounter = Role & {
  chain: EventChain
  event: EventStep
  offer: EventEffect
}
