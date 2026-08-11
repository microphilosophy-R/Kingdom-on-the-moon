import { useState } from 'react'
import { ArrowLeftRight, ArrowRight, ChevronLeft } from 'lucide-react'
import {
  canExecuteStarportTrade,
  facilityEconomySpecs,
  getFacilityWorkCapacity,
  hasTech,
  isFixedFacility,
  isHousingFacility,
  projectFacilityFlow,
  resourceOrder,
  selectProductionMethod,
  starportTradeOffers,
  technologyCatalog,
} from '../../economy'
import type { ProductionMethodId } from '../../economy'
import { displayCopy } from '../../utils/format'
import { ResourceDeltaRows, FlowArrowSvg, ResourceBundle } from '../resources'
import { SectionHeading } from '../layout'
import { InfoToggle } from './InfoToggle'
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
  productionMethods: Record<string, ProductionMethodId>
  facilityModifiers: Partial<Record<string, { outputMultiplier?: number; upkeepMultiplier?: number }>>
  onProtection: (enabled: boolean) => void
  onTrade: (name: string, input: Partial<Resources>, output: Partial<Resources>) => void
  onAutoTrade: (key: ResourceKey, enabled: boolean) => void
  onMethod: (id: string, methodId: ProductionMethodId) => void
  onBack: () => void
}

export function Starport({
  facility,
  resources,
  populationProjection,
  techs,
  autoTradeProtectionEnabled,
  autoTradeEnabled,
  productionMethods,
  facilityModifiers,
  onProtection,
  onTrade,
  onAutoTrade,
  onMethod,
  onBack,
}: StarportProps) {
  const regionId = facility.region.id
  const spec = facilityEconomySpecs[regionId]
  const fixed = isFixedFacility(regionId)
  const workCapacity = getFacilityWorkCapacity(regionId, facility.region.level)
  const staffText = fixed ? '固定' : isHousingFacility(regionId) ? '容量' : `${facility.assignedPopulation}/${workCapacity}`
  const throughputPercent = Math.round(facility.throughput * 100)
  const throughputText = fixed ? '在线' : isHousingFacility(regionId) ? '容量' : `${throughputPercent}%`
  const selectedMethod = selectProductionMethod(spec.productionMethods, techs, productionMethods[regionId])
  const modifier = facilityModifiers[regionId] ?? { outputMultiplier: 1, upkeepMultiplier: 1 }
  const flow = projectFacilityFlow(spec, facility.assignedPopulation, modifier, techs, selectedMethod.id, facility.region.level)
  const buildable = spec.requiredTech ? hasTech(techs, spec.requiredTech) : true
  const statusLabel = facility.region.level <= 0 ? '尚未建造' : fixed ? '固定在线' : facility.assignedPopulation < workCapacity ? '等待人口' : facility.throughput >= 1 ? '运转充分' : facility.throughput < 0.5 ? '停摆' : '低负荷'
  const statusTone = !buildable || facility.region.level <= 0 ? 'attention' : facility.throughput < 0.5 ? 'watch' : 'steady'
  const availableMethodIds = spec.productionMethods.filter(m => hasTech(techs, m.unlockedBy) && m.autoSelect !== false).map(m => m.id)

  const [tradeBatches, setTradeBatches] = useState<Record<string, number>>({})
  const [tradeSteps, setTradeSteps] = useState<Record<string, number>>({})

  const setOfferBatches = (offerId: string, value: number) =>
    setTradeBatches(previous => ({ ...previous, [offerId]: Math.max(1, Math.min(9999, Math.floor(value) || 1)) }))

  const setOfferStep = (offerId: string, value: number) =>
    setTradeSteps(previous => ({ ...previous, [offerId]: value }))

  return (
    <div className="facility-detail-v2 standard-detail">
      <header className="detail-v2-header">
        <button className="back-button" onClick={onBack}><ChevronLeft size={16} />设施名录</button>
        <div className="detail-v2-title">
          <h2>{facility.region.name}</h2>
          <p>{facility.region.subtitle}</p>
        </div>
        <div className={`building-status-chip ${statusTone}`}><span>{statusLabel}</span></div>
      </header>

      <div className="detail-top-row">
        <div className="detail-v2-art" aria-label={`${facility.region.name}建筑主视觉`}>
          <div className="detail-v2-art-placeholder">
            <ArrowLeftRight size={56} />
            <span>{facility.region.id}</span>
          </div>
        </div>
        <section className="detail-command-column">
          <article className="construction-card expand">
            <h3>贸易概况</h3>
            <div className="construction-resources">
              <span>星港状态</span>
              <b className="research-stat-big">{fixed ? '固定在线' : '运营中'}</b>
              <span className="construction-days-pill">吞吐 {throughputText}</span>
            </div>
            <div className="construction-resources" style={{ marginTop: '.32rem' }}>
              <span>在岗</span>
              <b className="research-stat-big">{staffText}</b>
            </div>
          </article>
          <article className="construction-card shrink">
            <h3>贸易规则</h3>
            <p className="research-rule-text">交易立即结算库存。自动保护补足赤字与安全线，不会替玩家出售自产盈余。信用采购允许货币为负，债务每天计息。</p>
          </article>
        </section>
      </div>

      <section className="method-ledger">
        <div className="method-ledger-head">
          <div className="method-book-tabs" role="tablist" aria-label="切换生产方式">
            {spec.productionMethods.map(method => {
              const ready = availableMethodIds.includes(method.id)
              const techName = method.unlockedBy ? technologyCatalog[method.unlockedBy]?.name : undefined
              return (
                <button
                  key={method.id}
                  type="button"
                  role="tab"
                  aria-selected={method.id === selectedMethod.id}
                  className={method.id === selectedMethod.id ? 'active' : ''}
                  disabled={!ready}
                  title={ready ? method.name : `需要 ${techName ?? '科技'}`}
                  onClick={() => onMethod(regionId, method.id)}
                >{method.name}</button>
              )
            })}
          </div>
        </div>
        <article className="method-equation">
          <div className="method-stage">
            <span className="method-column-label">配方</span>
            <div className="method-formula"><ResourceDeltaRows input={selectedMethod.input} output={selectedMethod.output} /></div>
          </div>
          <FlowArrowSvg className="equation-operator multiply" kind="multiply" />
          <div className="method-stage">
            <span className="method-column-label">在岗人数</span>
            <div className="method-staff"><b>{staffText}</b></div>
          </div>
          <FlowArrowSvg className="equation-operator multiply" kind="multiply" />
          <div className="method-stage">
            <span className="method-column-label">吞吐率</span>
            <div className="method-throughput"><b>{throughputText}</b></div>
          </div>
          <FlowArrowSvg className="equation-operator equals" kind="equals" />
          <div className="method-stage">
            <span className="method-column-label">总产量</span>
            <div className="method-output"><ResourceDeltaRows input={flow.consumption} output={flow.production} /></div>
          </div>
        </article>
      </section>

      <section className="detail-description-row">
        <div><span className="eyebrow">建筑描述</span><h3>{facility.region.subtitle}</h3></div>
        <p>{displayCopy(facility.region.note)}</p>
        <div className="building-net-row">
          <span>每日净产值</span>
          <div className="resource-bundle" style={{ display: 'flex', flexWrap: 'wrap', gap: '.28rem' }}>
            {Object.entries(facility.net).length === 0 && <span className="resource-empty boxed">暂无日结算</span>}
          </div>
        </div>
      </section>

      {/* 特殊内容：贸易清单 */}
      <section className="special-content-block trade-board-v2">
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
        <div className="trade-offer-list-compact">
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
                <div className="trade-offer-info">
                  <span>{offer.unlockTech}</span>
                  <h3>{offer.name}</h3>
                  <small>
                    {unlocked
                      ? populationBlocked
                        ? '住房或生命维持不足'
                        : offer.note
                      : `需要 ${technologyCatalog[offer.unlockTech].name}`}
                  </small>
                </div>
                <div className="trade-flow">
                  <ResourceBundle bundle={scaledInput} empty="无需投入" />
                  <ArrowRight size={15} />
                  <ResourceBundle bundle={scaledOutput} empty="无产出" />
                </div>
                <div className="trade-actions-compact">
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
                  <div className="trade-exec-row">
                    {protectedKey && protectedKey !== 'population' && (
                      <button type="button" className={protectionOn ? 'selected' : ''} onClick={() => onAutoTrade(protectedKey, !protectionOn)} disabled={!unlocked || !autoTradeProtectionEnabled}>
                        {protectionOn ? '保护中' : '保护关'}
                      </button>
                    )}
                    <button className="primary-action" onClick={() => onTrade(`${offer.name} x${batches}`, scaledInput, scaledOutput)} disabled={!unlocked || !affordable}>
                      {unlocked ? '采购' : '封存'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
