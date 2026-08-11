export * from './types'
export { roles } from './roles'
export { eventChains } from './chains'

import { eventChains } from './chains'
import { roles } from './roles'
import { facilityEra } from '../data/eraSections'
import type { FacilityState } from '../economy'
import type { EventEffect, EventStep, EventChain, Encounter, Role } from './types'

export const emptyEffect: EventEffect = { give: {}, take: {} }
export const rolesById = Object.fromEntries(roles.map(role => [role.id, role])) as Record<string, Role>

export const rollEventEffect = (event: EventStep): EventEffect => {
  if (event.rolls?.length) return event.rolls[Math.floor(Math.random() * event.rolls.length)]
  return event.offer ?? emptyEffect
}

export const buildEncounter = (chain: EventChain, progress = 0): Encounter => {
  const role = rolesById[chain.roleId]
  const event = chain.events[Math.min(progress, chain.events.length - 1)]
  return { ...role, chain, event, offer: rollEventEffect(event) }
}

/**
 * 根据已建设施推断当前游戏时期。
 * 晚期：任何 late 设施已建成。中期：任何 mid 设施已建成。早期：其余。
 */
export const getCurrentGameEra = (facilities: FacilityState[]): 'early' | 'mid' | 'late' => {
  const eraRank = { early: 1, mid: 2, late: 3 }
  let maxEra: 'early' | 'mid' | 'late' = 'early'
  facilities.forEach(f => {
    if (f.level <= 0) return
    const era = facilityEra[f.id]
    if (era && eraRank[era] > eraRank[maxEra]) maxEra = era
  })
  return maxEra
}

/** 获取可触发的事件链：过滤已完成的步骤 + 仅限当前时期及更早的链 */
export const getAvailableEventChains = (progress: Record<string, number>, currentEra: 'early' | 'mid' | 'late' = 'early') => {
  const eraRank: Record<string, number> = { early: 1, mid: 2, late: 3 }
  return eventChains.filter(chain =>
    (progress[chain.id] ?? 0) < chain.events.length &&
    eraRank[chain.stage] <= eraRank[currentEra]
  )
}
