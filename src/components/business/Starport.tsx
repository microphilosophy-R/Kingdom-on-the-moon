import { useState } from 'react'
import { ArrowLeftRight, ArrowRight } from 'lucide-react'
import { canExecuteStarportTrade, hasTech, resourceOrder, starportTradeOffers, technologyCatalog } from '../../economy'
import { ResourceBundle } from '../resources'
import { SectionHeading } from '../layout'
import { InfoToggle } from './InfoToggle'
import { SpecialFacilityPanel } from './SpecialFacilityPanel'
import { bundleHasValues, deficitTradeBatches, maxTradeBatchesFromSurplus, maxTradeBatchesWithDebt, scaleResourceBundle } from '../../utils/trade'
import type { PopulationProjection, ResourceKey, Resources } from '../../economy'
import type { SpecialFacilityViewModel } from '../../types/game'

export interface StarportProps {
  facility: SpecialFacilityViewModel
  resources: Resources
  populationProjection: PopulationProjection
  techs: string[]
  autoTradeProtectionEnabled: boolean
  autoTradeEnabled: Partial<Record<ResourceKey, boolean>>
  onProtection: (enabled: boolean) => void
  onTrade: (name: string, input: Partial<Resources>, output: Partial<Resources>) => void
  onAutoTrade: (key: ResourceKey, enabled: boolean) => void
  onSelectFacility: () => void
}

export function Starport({
  facility,
  resources,
  populationProjection,
  techs,
  autoTradeProtectionEnabled,
  autoTradeEnabled,
  onProtection,
  onTrade,
  onAutoTrade,
  onSelectFacility,
}: StarportProps) {
  const [tradeBatches, setTradeBatches] = useState<Record<string, number>>({})
  const [tradeSteps, setTradeSteps] = useState<Record<string, number>>({})

  const setOfferBatches = (offerId: string, value: number) =>
    setTradeBatches(previous => ({ ...previous, [offerId]: Math.max(1, Math.min(9999, Math.floor(value) || 1)) }))

  const setOfferStep = (offerId: string, value: number) =>
    setTradeSteps(previous => ({ ...previous, [offerId]: value }))

  return (
    <div className="special-system-page">
      <SpecialFacilityPanel facility={facility} tone="trade" onSelectFacility={onSelectFacility}>
        <div className="special-panel-brief">
          <ArrowLeftRight size={16} />
          <span>星港为固定贸易节点，不占用人口、不扩建等级；信用采购允许货币为负，债务每天计息。</span>
        </div>
      </SpecialFacilityPanel>
      <section className="special-system-main trade-board">
        <SectionHeading eyebrow="S 星海交易港" title="贸易清单">
          <InfoToggle title="贸易规则">
            <p>交易立即结算库存。自动保护只会补足赤字与安全线，不会替玩家出售自产盈余。</p>
          </InfoToggle>
        </SectionHeading>
        <label className="trade-protection-toggle">
          <span><ArrowLeftRight size={16} />自动购入保护</span>
          <input type="checkbox" checked={autoTradeProtectionEnabled} onChange={event => onProtection(event.target.checked)} />
          <i aria-hidden="true" />
        </label>
        <div className="trade-offer-list">
          {starportTradeOffers.map(offer => {
            const unlocked = hasTech(techs, offer.unlockTech)
            const populationBlocked = offer.output.population && (populationProjection.availableCapacity < offer.output.population || populationProjection.lifeSupportRatio < 1)
            const batches = tradeBatches[offer.id] ?? 1
            const step = tradeSteps[offer.id] ?? 1
            const scaledInput = scaleResourceBundle(offer.input, batches)
            const scaledOutput = scaleResourceBundle(offer.output, batches)
            const affordable = canExecuteStarportTrade(resources, scaledInput) && !populationBlocked
            const protectedKey = resourceOrder.find(key => (offer.output[key] ?? 0) > 0 && offer.automated)
            const protectionOn = protectedKey ? autoTradeProtectionEnabled && autoTradeEnabled[protectedKey] !== false : false
            const surplusMax = maxTradeBatchesFromSurplus(resources, offer.input)
            const deficitNeed = deficitTradeBatches(resources, offer.output)
            const deficitMax = Math.min(maxTradeBatchesWithDebt(resources, offer.input), deficitNeed)
            return (
              <article key={offer.id} className={unlocked ? 'active' : 'locked'}>
                <div>
                  <span>{offer.unlockTech}</span>
                  <h3>{offer.name}</h3>
                  <small>
                    {unlocked
                      ? populationBlocked
                        ? '住房或生命维持不足，暂缓接纳人口。'
                        : offer.note
                      : `需要 ${technologyCatalog[offer.unlockTech].name}`}
                  </small>
                </div>
                <div className="trade-flow">
                  <ResourceBundle bundle={scaledInput} empty="无需投入" />
                  <ArrowRight size={15} />
                  <ResourceBundle bundle={scaledOutput} empty="无产出" />
                </div>
                <div className="trade-actions">
                  <div className="trade-quantity-controls" aria-label={`${offer.name}采购数量`}>
                    <div className="trade-step-buttons">
                      {[1, 10, 100, 1000].map(value => (
                        <button key={value} type="button" className={step === value ? 'selected' : ''} onClick={() => setOfferStep(offer.id, value)} disabled={!unlocked}>
                          x{value}
                        </button>
                      ))}
                    </div>
                    <div className="trade-count-row">
                      <button type="button" onClick={() => setOfferBatches(offer.id, batches - step)} disabled={!unlocked}>-</button>
                      <strong>{batches}</strong>
                      <button type="button" onClick={() => setOfferBatches(offer.id, batches + step)} disabled={!unlocked}>+</button>
                    </div>
                    <div className="trade-limit-buttons">
                      <button type="button" onClick={() => setOfferBatches(offer.id, surplusMax)} disabled={!unlocked || !bundleHasValues(offer.input) || surplusMax <= 0}>全部盈余</button>
                      <button type="button" onClick={() => setOfferBatches(offer.id, deficitMax)} disabled={!unlocked || !bundleHasValues(offer.output) || deficitMax <= 0}>全部亏损</button>
                    </div>
                  </div>
                  {protectedKey && protectedKey !== 'population' && (
                    <button type="button" className={protectionOn ? 'selected' : ''} onClick={() => onAutoTrade(protectedKey, !protectionOn)} disabled={!unlocked || !autoTradeProtectionEnabled}>
                      {protectionOn ? '保护中' : '保护关'}
                    </button>
                  )}
                  <button onClick={() => onTrade(`${offer.name} x${batches}`, scaledInput, scaledOutput)} disabled={!unlocked || !affordable}>
                    {unlocked ? '采购' : '封存'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
