import type { FacilityId, Resources } from '../economy'

export type Role = {
  /** 统一角色编号，如 "char-01"，对应 characterRegistry */
  charId?: string
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
export type EventDefaultAction = 'accept' | 'dismiss'

export type EventStep = {
  id: string
  /** 统一事件编号，如 "event01-2"，对应 eventRegistry */
  eventCode?: string
  title: string
  body: string
  interaction: EventInteraction
  offer?: EventEffect
  rolls?: EventEffect[]
  hireCost?: Partial<Resources>
  concealed?: boolean
  note?: string
  /** 优化器自动处理时的默认行为：accept=接受交易, dismiss=礼送跳过 */
  defaultAction?: EventDefaultAction
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
