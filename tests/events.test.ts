import { describe, expect, it } from 'vitest'
import { facilityEconomySpecs, technologyCatalog } from '../src/economy'
import { eventChains, getAvailableEventChains, roles, rolesById } from '../src/events'

const catalog = technologyCatalog as Record<string, unknown>

const rewardTechIds = () => eventChains.flatMap(chain =>
  chain.events.flatMap(event => [
    event.offer?.tech,
    ...(event.rolls ?? []).map(roll => roll.tech),
  ]).filter(Boolean).map(tech => tech!.split(' ')[0]),
)

describe('character and event catalogs', () => {
  it('keeps roles as a separate stable container', () => {
    expect(roles).toHaveLength(8)
    expect(new Set(roles.map(role => role.id)).size).toBe(roles.length)

    roles.forEach(role => {
      expect(role.name).toBeTruthy()
      expect(role.species).toBeTruthy()
      expect(role.glyph).toBeTruthy()
      expect(role.portrait).toBeTruthy()
      expect(role.quote).toBeTruthy()
      expect(facilityEconomySpecs[role.specialty]).toBeDefined()
      expect(role.boost).toBeGreaterThan(0)
      expect(Object.values(role.retainerCost).some(value => (value ?? 0) > 0)).toBe(true)
    })
  })

  it('keeps event chains separate from role identity and non-repeating after completion', () => {
    const longChains = eventChains.filter(chain => chain.arc === 'long')
    const simpleChains = eventChains.filter(chain => chain.arc === 'simple')

    expect(longChains.map(chain => chain.id).sort()).toEqual([
      'atya-refuge', 'evi-echo', 'melu-waterless', 'nix-labor',
      'orri-leviathan', 'rosa-luxury', 'sava-catalyst', 'taro-alchemy',
    ])
    expect(simpleChains).toHaveLength(0)
    expect(longChains.every(chain => chain.events.length > 1)).toBe(true)

    eventChains.forEach(chain => {
      expect(rolesById[chain.roleId]).toBeDefined()
      expect(chain.events.length).toBeGreaterThan(0)
      chain.events.forEach(event => {
        expect(event.id).toBeTruthy()
        expect(event.title).toBeTruthy()
        expect(event.body.length).toBeGreaterThan(10)
        expect(event.offer || event.rolls?.length).toBeTruthy()
      })
    })

    const completedProgress = Object.fromEntries(eventChains.map(chain => [chain.id, chain.events.length]))
    expect(getAvailableEventChains(completedProgress)).toHaveLength(0)
  })

  it('references only existing technology rewards', () => {
    expect(rewardTechIds().sort()).toEqual(['TB-2', 'TC2-2', 'TE1-1', 'TE3-0', 'TF-1', 'TS-1', 'TS-2', 'TS-2', 'TS-3'])
    rewardTechIds().forEach(techId => {
      expect(catalog[techId]).toBeDefined()
    })
  })

  it('keeps starport trade events bound to starport trade technologies', () => {
    const starportEvents = eventChains.flatMap(chain => chain.events).filter(event => event.interaction === 'starportTrade')

    expect(starportEvents).toHaveLength(2)
    starportEvents.forEach(event => {
      const techId = event.offer?.tech?.split(' ')[0]
      expect(techId).toMatch(/^TS-\d+$/)
      expect(event.note).toContain('星海交易港')
      expect(event.note).toContain('双向贸易')
    })
  })

  it('keeps concealed accident events inferable through body text', () => {
    const concealedEvents = eventChains.flatMap(chain => chain.events).filter(event => event.concealed)

    expect(concealedEvents).toHaveLength(7)
    concealedEvents.forEach(event => {
      expect(event.interaction).toBe('accident')
      expect(event.rolls?.length).toBeGreaterThan(1)
      expect(event.body).not.toContain('损失')
      expect(event.body).not.toContain('获得')
    })
  })
})
