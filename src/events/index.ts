export * from './types'
export { roles } from './roles'
export { eventChains } from './chains'

import { eventChains } from './chains'
import { roles } from './roles'
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

export const getAvailableEventChains = (progress: Record<string, number>) =>
  eventChains.filter(chain => (progress[chain.id] ?? 0) < chain.events.length)
