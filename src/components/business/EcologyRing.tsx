import { ChevronLeft, Waves } from 'lucide-react'
import {
  facilityEconomySpecs,
  getFacilityWorkCapacity,
  hasTech,
  isFixedFacility,
  isHousingFacility,
  projectFacilityFlow,
  selectProductionMethod,
  technologyCatalog,
} from '../../economy'
import type { ProductionMethodId } from '../../economy'
import { displayCopy } from '../../utils/format'
import { ResourceDeltaRows, FlowArrowSvg } from '../resources'
import type { SpecialFacilityViewModel } from '../../types/game'

export interface EcologyRingProps {
  facility: SpecialFacilityViewModel
  techs: string[]
  productionMethods: Record<string, ProductionMethodId>
  facilityModifiers: Partial<Record<string, { outputMultiplier?: number; upkeepMultiplier?: number }>>
  onMethod: (id: string, methodId: ProductionMethodId) => void
  onBack: () => void
}

export function EcologyRing({ facility, techs, productionMethods, facilityModifiers, onMethod, onBack }: EcologyRingProps) {
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
            <Waves size={56} />
            <span>{facility.region.id}</span>
          </div>
        </div>
        <section className="detail-command-column">
          <article className="construction-card expand">
            <h3>生态概况</h3>
            <div className="construction-resources">
              <span>状态</span>
              <b className="research-stat-big">{statusLabel}</b>
              <span className="construction-days-pill">吞吐 {throughputText}</span>
            </div>
            <div className="construction-resources" style={{ marginTop: '.32rem' }}>
              <span>在岗</span>
              <b className="research-stat-big">{staffText}</b>
            </div>
          </article>
          <article className="construction-card shrink">
            <h3>生态说明</h3>
            <p className="research-rule-text">生态环按阶段改变生态、人口与工业结构，阶段信息直接影响后续设施与人口包。</p>
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

      {/* 特殊内容：生态阶段 */}
      <section className="special-content-block phase-list">
        <div className="tech-tree-toolbar">
          <h3><Waves size={18} />生态阶段</h3>
        </div>
        {facility.region.phaseNotes?.map(phase => (
          <p key={phase.name} style={{ border: '1px solid var(--ui-line)', borderRadius: '5px', padding: '.55rem .62rem', background: 'var(--ui-surface)', marginBottom: '.42rem' }}>
            <b style={{ display: 'block', marginBottom: '.18rem', color: 'var(--ui-ink-strong)', fontSize: 'var(--font-card)' }}>{phase.name}</b>
            <span style={{ color: 'var(--ui-muted)', fontSize: 'var(--font-note)', lineHeight: '1.55' }}>{displayCopy(phase.note)}</span>
          </p>
        ))}
      </section>
    </div>
  )
}
