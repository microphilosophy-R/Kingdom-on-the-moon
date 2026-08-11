import { useRef, useState, useEffect, type WheelEvent as ReactWheelEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeftRight, ArrowRight, BookOpen, Crown, FlaskConical, Rocket, Waves } from 'lucide-react'
import {
  canExecuteStarportTrade,
  gameCalendar,
  hasTech,
  resourceMeta,
  resourceOrder,
  starportTradeOffers,
  technologyCatalog,
} from '../../economy'
import type { PopulationProjection, ResourceKey, Resources, TechnologyId } from '../../economy'
import { researchableTechIds, researchEraSections } from '../../data/eraSections'
import type { ReignReport } from '../../types/game'
import { displayCopy, fmt, fmtAmount, formatDay } from '../../utils/format'
import { completedTechnologyIds, techLabel } from '../../utils/game'
import { bundleHasValues, deficitTradeBatches, maxTradeBatchesFromSurplus, maxTradeBatchesWithDebt, scaleResourceBundle } from '../../utils/trade'
import { ResourceBundle } from '../resources'
import { SectionHeading } from '../layout'
import { InfoToggle } from './InfoToggle'
import { TechnologyCard } from './TechnologyCard'

/* ===================== PalaceReportBlock ===================== */

export interface PalaceReportBlockProps {
  day: number
  lastReignReport: ReignReport | null
  onOpenReport: (report: ReignReport) => void
}

export function PalaceReportBlock({ day, lastReignReport, onOpenReport }: PalaceReportBlockProps) {
  const reportProgress = Math.round((day % gameCalendar.reignMonthDays) / gameCalendar.reignMonthDays * 100)
  const reportRows = lastReignReport
    ? resourceOrder.filter(key => lastReignReport.resourceRows[key])
    : []
  const populationDelta = lastReignReport
    ? `${lastReignReport.populationDelta >= 0 ? '+' : ''}${fmtAmount(lastReignReport.populationDelta)}`
    : '0'

  return (
    <section className="special-content-block palace-report-v2">
      <div className="tech-tree-toolbar">
        <h3><Crown size={18} />{gameCalendar.monthName}报告</h3>
        <span className="tech-tree-scale">{reportProgress}%</span>
        {lastReignReport && <span style={{ color: 'var(--ui-muted)', fontSize: '10px' }}>{formatDay(lastReignReport.startDay)} 至 {formatDay(lastReignReport.endDay)}</span>}
      </div>
      {lastReignReport ? <>
        <div className="policy-status palace-report-kpis">
          <div><span>人口变化</span><strong>{populationDelta}</strong><small>{fmt(lastReignReport.populationEnd)}/{fmtAmount(lastReignReport.housingCapacity)} 人</small></div>
          <div><span>GDP</span><strong>{lastReignReport.gdp.toFixed(1)}</strong><small>{lastReignReport.gdpDelta >= 0 ? '+' : ''}{lastReignReport.gdpDelta.toFixed(1)} 星海货币/日</small></div>
          <div><span>阶段</span><strong>{lastReignReport.monthNumber}</strong><small>{gameCalendar.monthName}</small></div>
        </div>
        <div className="palace-report-actions">
          <button className="primary-action" onClick={() => onOpenReport(lastReignReport)}><BookOpen size={15} />打开完整报告</button>
        </div>
        <div className="palace-report-preview">
          <section>
            <h3>每日产消</h3>
            {reportRows.slice(0, 6).map(key => {
              const row = lastReignReport.resourceRows[key]!
              return (
                <div key={key}>
                  <span>{resourceMeta[key].label}</span>
                  <b>{row.produced ? fmtAmount(row.produced) : '0'}</b>
                  <b>{row.consumed ? fmtAmount(row.consumed) : '0'}</b>
                  <b className={row.net < 0 ? 'negative' : ''}>{row.net >= 0 ? '+' : ''}{fmtAmount(row.net)}</b>
                </div>
              )
            })}
          </section>
          <section>
            <h3>建议</h3>
            <ol>{lastReignReport.suggestions.map(item => <li key={item}>{item}</li>)}</ol>
          </section>
        </div>
      </> : <div className="palace-report-empty"><BookOpen size={22} /><span>尚未形成可复核的{gameCalendar.monthName}报告。</span></div>}
    </section>
  )
}

/* ===================== EcologyPhaseBlock ===================== */

export interface EcologyPhaseBlockProps {
  phaseNotes: { name: string; note: string }[] | undefined
}

export function EcologyPhaseBlock({ phaseNotes }: EcologyPhaseBlockProps) {
  return (
    <section className="special-content-block phase-list">
      <div className="tech-tree-toolbar">
        <h3><Waves size={18} />生态阶段</h3>
      </div>
      {phaseNotes?.map(phase => (
        <p key={phase.name} style={{ border: '1px solid var(--ui-line)', borderRadius: '5px', padding: '.55rem .62rem', background: 'var(--ui-surface)', marginBottom: '.42rem' }}>
          <b style={{ display: 'block', marginBottom: '.18rem', color: 'var(--ui-ink-strong)', fontSize: 'var(--font-card)' }}>{phase.name}</b>
          <span style={{ color: 'var(--ui-muted)', fontSize: 'var(--font-note)', lineHeight: '1.55' }}>{displayCopy(phase.note)}</span>
        </p>
      ))}
    </section>
  )
}

/* ===================== ShipProgressBlock ===================== */

export interface ShipProgressBlockProps {
  shipProgress: number
  shipProjectStages: { id: number; name: string; input: Partial<Resources>; note: string }[]
  activeStage: number
}

export function ShipProgressBlock({ shipProgress, shipProjectStages, activeStage }: ShipProgressBlockProps) {
  return (
    <section className="special-content-block ship-meter">
      <div className="tech-tree-toolbar">
        <h3><Rocket size={18} />御座号建造阶段</h3>
        <span className="tech-tree-scale">{shipProgress}%</span>
      </div>
      <div className="ship-progress-v2">
        <i style={{ width: `${shipProgress}%` }} />
      </div>
      <div className="ship-stage-list">
        {shipProjectStages.map(stage => {
          const isActive = stage.id === activeStage
          return (
          <article key={stage.id} style={{ border: `1px solid ${isActive ? 'var(--ui-line-strong)' : 'var(--ui-line)'}`, borderRadius: '5px', padding: '.52rem .62rem', background: isActive ? 'color-mix(in oklab, var(--ui-brass) 12%, var(--ui-surface))' : 'var(--ui-surface)' }}>
            <b>{stage.id}. {stage.name}{isActive ? <span className="construction-days-pill" style={{ marginLeft: '.4rem' }}>当前阶段</span> : null}</b>
            <ResourceBundle bundle={stage.input} />
            <small>{stage.note}</small>
          </article>
          )
        })}
      </div>
    </section>
  )
}

/* ===================== ResearchTreeBlock ===================== */

export interface ResearchTreeBlockProps {
  techs: string[]
  activeResearch: TechnologyId
  researchProgress: Partial<Record<TechnologyId, number>>
  onResearch: (techId: TechnologyId) => void
}

export function ResearchTreeBlock({ techs, activeResearch, researchProgress, onResearch }: ResearchTreeBlockProps) {
  const completedIds = completedTechnologyIds(techs)

  // Tech tree zoom state
  const treeContainerRef = useRef<HTMLDivElement | null>(null)
  const treeDragRef = useRef({ pointerId: null as number | null, startX: 0, startY: 0, startScrollLeft: 0, startScrollTop: 0, moved: false })
  const suppressTechClickRef = useRef(false)
  const [treeScale, setTreeScale] = useState(1)
  const [treeDragging, setTreeDragging] = useState(false)

  const beginTreeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const scrollNode = treeContainerRef.current
    if (!scrollNode) return
    treeDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: scrollNode.scrollLeft,
      startScrollTop: scrollNode.scrollTop,
      moved: false,
    }
    scrollNode.setPointerCapture(event.pointerId)
    setTreeDragging(true)
  }

  const moveTreeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scrollNode = treeContainerRef.current
    const dragState = treeDragRef.current
    if (!scrollNode || dragState.pointerId !== event.pointerId) return
    const deltaX = event.clientX - dragState.startX
    const deltaY = event.clientY - dragState.startY
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) dragState.moved = true
    if (!dragState.moved) return
    event.preventDefault()
    scrollNode.scrollLeft = dragState.startScrollLeft - deltaX
    scrollNode.scrollTop = dragState.startScrollTop - deltaY
  }

  const endTreeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scrollNode = treeContainerRef.current
    const dragState = treeDragRef.current
    const wasMoved = dragState.pointerId === event.pointerId && dragState.moved
    if (scrollNode?.hasPointerCapture(event.pointerId)) scrollNode.releasePointerCapture(event.pointerId)
    treeDragRef.current.pointerId = null
    setTreeDragging(false)
    if (wasMoved) {
      suppressTechClickRef.current = true
      window.setTimeout(() => { suppressTechClickRef.current = false }, 80)
    }
  }

  const zoomTree = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.08 : 0.08
    setTreeScale(prev => Math.min(1.6, Math.max(0.4, prev + delta)))
  }

  const selectResearch = (techId: TechnologyId) => {
    if (!suppressTechClickRef.current) onResearch(techId)
  }

  // Prevent default zoom on the tree container when ctrl+wheel
  useEffect(() => {
    const node = treeContainerRef.current
    if (!node) return
    const handler = (event: Event) => {
      if (event instanceof WheelEvent && (event.ctrlKey || event.metaKey)) event.preventDefault()
    }
    node.addEventListener('wheel', handler, { passive: false })
    return () => node.removeEventListener('wheel', handler)
  }, [])

  return (
    <section className="special-content-block technology-workbench-v2">
      <div className="tech-tree-toolbar">
        <h3><FlaskConical size={18} />科技树</h3>
        <span className="tech-tree-scale">缩放 {Math.round(treeScale * 100)}%</span>
        <span className="tech-tree-hint">Ctrl+滚轮缩放 · 拖拽平移</span>
      </div>
      <div
        ref={treeContainerRef}
        className={`technology-tree-viewport ${treeDragging ? 'dragging' : ''}`}
        onPointerDown={beginTreeDrag}
        onPointerMove={moveTreeDrag}
        onPointerUp={endTreeDrag}
        onPointerCancel={endTreeDrag}
        onWheel={zoomTree}
      >
        <div className="technology-tree-v2" style={{ transform: `scale(${treeScale})`, transformOrigin: 'top left' }}>
          {researchEraSections.map(section => {
            const techIds = researchableTechIds.filter(id => (technologyCatalog[id].era ?? 'early') === section.id)
            return (
              <section className="tech-era-column-v2" key={section.id}>
                <header><span>{section.label}</span><small>{section.note}</small></header>
                {techIds.map(id => (
                  <TechnologyCard key={id} techId={id} techs={techs} activeResearch={activeResearch} researchProgress={researchProgress} onResearch={selectResearch} />
                ))}
              </section>
            )
          })}
        </div>
      </div>
      <aside className="technology-book">
        <div><BookOpen size={17} /><span>科技书</span><small>已完成 {completedIds.length} 项</small></div>
        <div>{completedIds.map(id => <span key={id}>{techLabel(id)}</span>)}</div>
      </aside>
    </section>
  )
}

/* ===================== TradeBoardBlock ===================== */

export interface TradeBoardBlockProps {
  resources: Resources
  populationProjection: PopulationProjection
  techs: string[]
  autoTradeProtectionEnabled: boolean
  autoTradeEnabled: Partial<Record<ResourceKey, boolean>>
  onProtection: (enabled: boolean) => void
  onTrade: (name: string, input: Partial<Resources>, output: Partial<Resources>) => void
  onAutoTrade: (key: ResourceKey, enabled: boolean) => void
}

export function TradeBoardBlock({
  resources,
  populationProjection,
  techs,
  autoTradeProtectionEnabled,
  autoTradeEnabled,
  onProtection,
  onTrade,
  onAutoTrade,
}: TradeBoardBlockProps) {
  const [tradeBatches, setTradeBatches] = useState<Record<string, number>>({})
  const [tradeSteps, setTradeSteps] = useState<Record<string, number>>({})

  const setOfferBatches = (offerId: string, value: number) =>
    setTradeBatches(previous => ({ ...previous, [offerId]: Math.max(1, Math.min(9999, Math.floor(value) || 1)) }))

  const setOfferStep = (offerId: string, value: number) =>
    setTradeSteps(previous => ({ ...previous, [offerId]: value }))

  return (
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
  )
}
