import { useRef, useState, useEffect, type WheelEvent as ReactWheelEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowDown, ArrowDownUp, ArrowLeftRight, ArrowRight, ArrowUp, ArrowUpToLine, BookOpen, Check, Crown, FlaskConical, Lock, Maximize2, Minus, Plus, Repeat, Rocket, Trash2, Waves } from 'lucide-react'
import {
  canExecuteStarportTrade,
  currencyDebtInterestRate,
  defaultReserveFloors,
  emergencyCreditDebtLimit,
  gameCalendar,
  hasTech,
  isDailyTradeResource,
  resourceMeta,
  resourceOrder,
  resourceWeights,
  starportTradeOffers,
  technologyCatalog,
  weightedValue,
} from '../../economy'
import type { PopulationProjection, ResourceKey, Resources, StarportTradeOffer, TechnologyId } from '../../economy'
import { researchableTechIds, researchEraSections } from '../../data/eraSections'
import type { ReignReport } from '../../types/game'
import { displayCopy, fmt, fmtAmount, formatDay } from '../../utils/format'
import { completedTechnologyIds, techLabel } from '../../utils/game'
import { scaleResourceBundle } from '../../utils/trade'
import { ResourceAtom, ResourceBundle, ResourceDeltaRows } from '../resources'
import pillStyles from '../resources/ConstructionDaysPill.module.css'
import { SectionHeading } from '../layout'
import { InfoToggle } from './InfoToggle'
import { TechnologyCard } from './TechnologyCard'
import { TrendChart, type TrendSeries } from './TrendChart'
import styles from './SpecialBlocks.module.css'

/* ===================== PalaceReportBlock ===================== */

export interface PalaceReportBlockProps {
  day: number
  lastReignReport: ReignReport | null
  onOpenReport: (report: ReignReport) => void
}

export function PalaceReportBlock({ day, lastReignReport, onOpenReport }: PalaceReportBlockProps) {
  const reportProgress = Math.round((day % gameCalendar.reignMonthDays) / gameCalendar.reignMonthDays * 100)
  const populationDelta = lastReignReport
    ? `${lastReignReport.populationDelta >= 0 ? '+' : ''}${fmtAmount(lastReignReport.populationDelta)}`
    : '0'

  // Mini trend series for palace preview
  const miniSeries: TrendSeries[] = [
    { key: 'alloy', label: '合金', color: 'oklch(58% .16 28)', accessor: p => p.alloy },
    { key: 'currency', label: '货币', color: 'oklch(62% .12 85)', accessor: p => p.currency },
    { key: 'population', label: '人口', color: 'oklch(55% .14 142)', accessor: p => p.population },
  ]

  return (
    <section className={`${styles['special-content-block']} ${styles['palace-report-v2']}`}>
      <div className={styles['tech-tree-toolbar']}>
        <h3><Crown size={18} />{gameCalendar.monthName}报告</h3>
        <span className={styles['tech-tree-scale']}>{reportProgress}%</span>
        {lastReignReport && <span style={{ color: 'var(--ui-muted)', fontSize: '10px' }}>{formatDay(lastReignReport.startDay)} 至 {formatDay(lastReignReport.endDay)}</span>}
      </div>
      {lastReignReport ? <>
        <div className={styles['policy-status']}>
          <div><span>人口变化</span><strong>{populationDelta}</strong><small>{fmt(lastReignReport.populationEnd)}/{fmtAmount(lastReignReport.housingCapacity)} 人</small></div>
          <div><span>GDP</span><strong>{lastReignReport.gdp.toFixed(1)}</strong><small>{lastReignReport.gdpDelta >= 0 ? '+' : ''}{lastReignReport.gdpDelta.toFixed(1)} 星海货币/日</small></div>
          <div><span>阶段</span><strong>{lastReignReport.monthNumber}</strong><small>{gameCalendar.monthName}</small></div>
        </div>
        <div className={styles['palace-report-actions']}>
          <button className="primary-action" onClick={() => onOpenReport(lastReignReport)}><BookOpen size={15} />打开完整报告</button>
        </div>
        <div className={styles['palace-report-preview']}>
          <section>
            <h3>资源趋势</h3>
            <TrendChart
              data={lastReignReport.trendPoints}
              series={miniSeries}
              mini
            />
          </section>
          <section>
            <h3>建议</h3>
            <ol>{lastReignReport.suggestions.map(item => <li key={item}>{item}</li>)}</ol>
          </section>
        </div>
      </> : <div className={styles['palace-report-empty']}><BookOpen size={22} /><span>尚未形成可复核的{gameCalendar.monthName}报告。</span></div>}
    </section>
  )
}

/* ===================== EcologyPhaseBlock ===================== */

export interface EcologyPhaseBlockProps {
  phases: { id: number; name: string; input: Partial<Resources>; output?: Partial<Resources>; note: string }[]
  progress?: number
  activeStage?: number
}

export function EcologyPhaseBlock({ phases, progress = 0, activeStage = 1 }: EcologyPhaseBlockProps) {
  const pct = Math.max(0, Math.min(100, progress))
  const currentPhase = phases.find(phase => phase.id === activeStage)
  const hasOutput = (phase: { output?: Partial<Resources> }) => Boolean(phase.output && Object.values(phase.output).some(value => value > 0))
  return (
    <section className={`${styles['special-content-block']} ${styles['phase-list']}`}>
      <div className={styles['tech-tree-toolbar']}>
        <h3><Waves size={18} />生态阶段</h3>
        <span className={styles['tech-tree-scale']}>{pct}%</span>
      </div>
      <div className={styles['eco-progress-v2']}><i style={{ width: `${pct}%` }} /></div>
      <p className={styles['ship-progress-note']}>月穹生态环分四阶段改造月面环境：前期吸收多余资源、中期集中投入，进入回报阶段后持续产出。{currentPhase ? `当前阶段：${currentPhase.name}。` : ''}</p>
      <div className={styles['ship-stage-list']}>
        {phases.map(phase => {
          const isActive = phase.id === activeStage
          return (
            <article key={phase.id} style={{ border: `1px solid ${isActive ? 'var(--ui-line-strong)' : 'var(--ui-line)'}`, borderRadius: '5px', padding: '.52rem .62rem', background: isActive ? 'color-mix(in oklab, var(--ui-brass) 12%, var(--ui-surface))' : 'var(--ui-surface)' }}>
              <b>{phase.id}. {phase.name}{isActive ? <span className={pillStyles['construction-days-pill']} style={{ marginLeft: '.4rem' }}>当前阶段</span> : null}</b>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.3rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--ui-muted)', fontSize: 'var(--font-micro)' }}>投入</span>
                <ResourceBundle bundle={phase.input} empty="无消耗" />
              </div>
              {hasOutput(phase) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.15rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--ui-muted)', fontSize: 'var(--font-micro)' }}>产出</span>
                  <ResourceBundle bundle={phase.output ?? {}} empty="无" />
                </div>
              )}
              <small>{displayCopy(phase.note)}</small>
            </article>
          )
        })}
      </div>
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
  const currentStage = shipProjectStages.find(s => s.id === activeStage)
  return (
    <section className={styles['special-content-block']}>
      <div className={styles['tech-tree-toolbar']}>
        <h3><Rocket size={18} />御座号建造阶段</h3>
        <span className={styles['tech-tree-scale']}>{shipProgress}%</span>
      </div>
      <div className={styles['ship-progress-v2']}>
        <i style={{ width: `${shipProgress}%` }} />
      </div>
      <p className={styles['ship-progress-note']}>千日之限将至，御座号的完成度将决定此局国祚。{currentStage ? `当前阶段：${currentStage.name}。` : ''}</p>
      <div className={styles['ship-stage-list']}>
        {shipProjectStages.map(stage => {
          const isActive = stage.id === activeStage
          return (
          <article key={stage.id} style={{ border: `1px solid ${isActive ? 'var(--ui-line-strong)' : 'var(--ui-line)'}`, borderRadius: '5px', padding: '.52rem .62rem', background: isActive ? 'color-mix(in oklab, var(--ui-brass) 12%, var(--ui-surface))' : 'var(--ui-surface)' }}>
            <b>{stage.id}. {stage.name}{isActive ? <span className={pillStyles['construction-days-pill']} style={{ marginLeft: '.4rem' }}>当前阶段</span> : null}</b>
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
    <section className={`${styles['special-content-block']} ${styles['technology-workbench-v2']}`}>
      <div className={styles['tech-tree-toolbar']}>
        <h3><FlaskConical size={18} />科技树</h3>
        <span className={styles['tech-tree-scale']}>缩放 {Math.round(treeScale * 100)}%</span>
        <span className={styles['tech-tree-hint']}>Ctrl+滚轮缩放 · 拖拽平移</span>
      </div>
      <div
        ref={treeContainerRef}
        className={`${styles['technology-tree-viewport']} ${treeDragging ? styles.dragging : ''}`}
        onPointerDown={beginTreeDrag}
        onPointerMove={moveTreeDrag}
        onPointerUp={endTreeDrag}
        onPointerCancel={endTreeDrag}
        onWheel={zoomTree}
      >
        <div className={styles['technology-tree-v2']} style={{ transform: `scale(${treeScale})`, transformOrigin: 'top left' }}>
          {researchEraSections.map(section => {
            const techIds = researchableTechIds.filter(id => (technologyCatalog[id].era ?? 'early') === section.id)
            return (
              <section className={styles['tech-era-column-v2']} key={section.id}>
                <header><span>{section.label}</span><small>{section.note}</small></header>
                {techIds.map(id => (
                  <TechnologyCard key={id} techId={id} techs={techs} activeResearch={activeResearch} researchProgress={researchProgress} onResearch={selectResearch} />
                ))}
              </section>
            )
          })}
        </div>
      </div>
      <aside className={styles['technology-book']}>
        <div><BookOpen size={17} /><span>科技书</span><small>已完成 {completedIds.length} 项</small></div>
        <div>{completedIds.map(id => <span key={id}>{techLabel(id)}</span>)}</div>
      </aside>
    </section>
  )
}

/* ===================== TradeBoardBlock ===================== */


type TradeDirection = 'buy' | 'sell'

const buyPrice = (offer: StarportTradeOffer) => (offer.input.currency ?? 0)
const sellPrice = (offer: StarportTradeOffer) => offer.baseValue * (1 - offer.sellDiscount)
const outputPerBatch = (offer: StarportTradeOffer) => (offer.output[offer.resource] ?? 1)

const stepSizes = [1, 10, 100, 1000]

/** 常规资源：支持单次交易和连续交易 */
const regularTradeResources: ResourceKey[] = ['water', 'oxygen', 'biomass', 'regolith', 'alloy']
/** 高级/特殊资源：仅支持单次交易 */
const advancedTradeResources: ResourceKey[] = ['knowledge', 'quantumCore', 'luxury', 'population']

export interface TradeBoardBlockProps {
  resources: Resources
  populationProjection: PopulationProjection
  techs: string[]
  autoTradeProtectionEnabled: boolean
  autoTradeEnabled: Partial<Record<ResourceKey, boolean>>
  dailyTrades: Partial<Record<ResourceKey, { dir: 'buy' | 'sell'; qty: number }>>
  onProtection: (enabled: boolean) => void
  onTrade: (name: string, input: Partial<Resources>, output: Partial<Resources>) => void
  onScheduleDailyTrade: (key: ResourceKey, dir: 'buy' | 'sell', qty: number, input: Partial<Resources>, output: Partial<Resources>) => void
  onCancelDailyTrade: (key: ResourceKey) => void
  onAutoTrade: (key: ResourceKey, enabled: boolean) => void
}

export function TradeBoardBlock({
  resources,
  populationProjection,
  techs,
  autoTradeProtectionEnabled,
  autoTradeEnabled,
  dailyTrades,
  onProtection,
  onTrade,
  onScheduleDailyTrade,
  onCancelDailyTrade,
  onAutoTrade,
}: TradeBoardBlockProps) {
  const [tradeQty, setTradeQty] = useState<Record<string, number>>({})
  const [tradeDir, setTradeDir] = useState<Record<string, TradeDirection>>({})
  const [tradeStep, setTradeStep] = useState<Record<string, number>>({})

  const getQty = (id: string) => tradeQty[id] ?? 0
  const getDir = (id: string) => tradeDir[id] ?? 'buy'
  const getStep = (id: string) => tradeStep[id] ?? 1

  const addQty = (id: string, delta: number) =>
    setTradeQty(prev => ({ ...prev, [id]: Math.max(0, Math.min(9999, (prev[id] ?? 0) + delta)) }))

  const setQty = (id: string, value: number) =>
    setTradeQty(prev => ({ ...prev, [id]: Math.max(0, Math.min(9999, Math.floor(value))) }))

  const toggleDir = (id: string) =>
    setTradeDir(prev => ({ ...prev, [id]: prev[id] === 'sell' ? 'buy' : 'sell' }))

  const clearTrade = (id: string) => {
    setTradeQty(prev => ({ ...prev, [id]: 0 }))
  }

  const isProtected = (offer: StarportTradeOffer) =>
    offer.automated && autoTradeProtectionEnabled && autoTradeEnabled[offer.resource] !== false

  return (
    <section className={`${styles['special-content-block']} ${styles['trade-board-v4']}`}>
      <SectionHeading eyebrow="S 星海交易港" title="贸易清单">
        <InfoToggle title="贸易规则">
          <p>交易立即结算库存。自动保护只会补足赤字与安全线，不会替玩家出售自产盈余。</p>
          <p style={{ marginTop: '.4rem' }}>信贷日利率 <b>{(currencyDebtInterestRate * 100).toFixed(1)}%</b>（货币为负时每日计息）。紧急信贷上限 <b>{emergencyCreditDebtLimit}</b> 货币。</p>
          <p style={{ marginTop: '.4rem' }}><b>买入溢价 +5~12%、卖出折价 -5~12%。</b>星港价格始终差于本地生产，鼓励自力更生、防止套利。</p>
          <p>受自动保护的商品无法手动买卖，保护关闭后方可操作。</p>
        </InfoToggle>
      </SectionHeading>
      <label className={styles['trade-protection-toggle']}>
        <span><ArrowLeftRight size={16} />自动购入保护</span>
        <input type="checkbox" checked={autoTradeProtectionEnabled} onChange={event => onProtection(event.target.checked)} />
        <i aria-hidden="true" />
      </label>
      <div className={styles['trade-offer-list-v4']}>
        {starportTradeOffers.map(offer => {
          const unlocked = hasTech(techs, offer.unlockTech)
          const popBlocked = offer.resource === 'population' && (populationProjection.availableCapacity < 1 || populationProjection.lifeSupportRatio < 1)
          const dir = getDir(offer.id)
          const qty = getQty(offer.id)
          const step = getStep(offer.id)
          const isBuy = dir === 'buy'
          const canSell = offer.canSell !== false
          const protectionOn = isProtected(offer)
          const disabled = !unlocked || protectionOn || (popBlocked && isBuy)
          const isDaily = isDailyTradeResource(offer.resource)
          const canContinuous = regularTradeResources.includes(offer.resource)
          const activeDailyTrade = dailyTrades[offer.resource]

          const bp = buyPrice(offer)
          const sp = sellPrice(offer)
          const input: Partial<Resources> = isBuy
            ? { currency: bp * qty }
            : { [offer.resource]: qty }
          const output: Partial<Resources> = isBuy
            ? { [offer.resource]: qty * outputPerBatch(offer) }
            : { currency: sp * qty }

          const canAfford = canExecuteStarportTrade(resources, input) && !(popBlocked && isBuy)

          let surplusMax = 0
          let deficitMax = 0
          if (isBuy) {
            const currencySurplus = Math.max(0, resources.currency - defaultReserveFloors.currency)
            surplusMax = bp > 0 ? Math.floor(currencySurplus / bp) : 9999
            const resourceShortage = Math.max(0, defaultReserveFloors[offer.resource] - resources[offer.resource])
            deficitMax = Math.ceil(resourceShortage / outputPerBatch(offer))
          } else {
            surplusMax = Math.max(0, Math.floor((resources[offer.resource] - defaultReserveFloors[offer.resource]) / 1))
          }

          const premiumPct = isBuy ? offer.buyPremium * 100 : -(offer.sellDiscount * 100)

          // Per-unit recipe for resource-delta-stack display
          const recipeInput: Partial<Resources> = isBuy
            ? { currency: bp }
            : { [offer.resource]: 1 }
          const recipeOutput: Partial<Resources> = isBuy
            ? { [offer.resource]: outputPerBatch(offer) }
            : { currency: sp }

          const statusNote = !unlocked
            ? `需要 ${technologyCatalog[offer.unlockTech].name}`
            : popBlocked && isBuy
              ? '住房或生命维持不足'
              : protectionOn
                ? '自动保护中'
                : ''

          return (
            <article key={offer.id} className={`${styles['trade-offer-v4']} ${unlocked ? styles.active : styles.locked} ${protectionOn ? styles.protected : ''}`}>
              <header className={styles['trade-v4-header']}>
                <h3>{offer.name}</h3>
                {activeDailyTrade && (
                  <span className={styles['daily-trade-badge']} title={`每日${activeDailyTrade.dir === 'buy' ? '进口' : '出口'} ${activeDailyTrade.qty} 单位`}>
                    <Lock size={10} />每日 {activeDailyTrade.qty}
                  </span>
                )}
                {canSell && (
                  <div className={styles['trade-direction-toggle']}>
                    <button type="button" className={`${styles['dir-btn']} ${styles.buy} ${isBuy ? styles.active : ''}`} onClick={() => setTradeDir(prev => ({ ...prev, [offer.id]: 'buy' }))} disabled={disabled}>
                      <ArrowDown size={12} />进口
                    </button>
                    <button type="button" className={`${styles['dir-btn']} ${styles.sell} ${!isBuy ? styles.active : ''}`} onClick={() => setTradeDir(prev => ({ ...prev, [offer.id]: 'sell' }))} disabled={disabled}>
                      <ArrowUp size={12} />出口
                    </button>
                  </div>
                )}
                {statusNote && <small className={styles['trade-v4-status']}>{statusNote}</small>}
              </header>

              <div className={styles['trade-v4-grid']}>
                {/* Col 1: Resource identity + premium */}
                <div className={`${styles['trade-v4-col']} ${styles['trade-v4-identity']}`}>
                  <div className={styles['trade-v4-resource-info']}>
                    <ResourceAtom
                      resourceKey={offer.resource}
                      value={resources[offer.resource] ?? 0}
                      signed
                    />
                    <span className={`${styles['premium-badge']} ${isBuy ? styles.buy : styles.sell}`}>
                      {isBuy ? '进口' : '出口'} {premiumPct >= 0 ? '+' : ''}{premiumPct.toFixed(0)}%
                    </span>
                    <span className={styles['premium-detail']}>{offer.note}</span>
                  </div>
                </div>

                {/* Col 2: Trade recipe */}
                <div className={`${styles['trade-v4-col']} ${styles['trade-v4-recipe']}`}>
                  <span className={styles['trade-recipe-label']}>交易配方</span>
                  <ResourceDeltaRows className={styles['recipe-stack']} input={recipeInput} output={recipeOutput} inputEmpty="—" outputEmpty="—" />
                </div>

                {/* Col 3: Quantity controls + execute */}
                <div className={`${styles['trade-v4-col']} ${styles['trade-v4-quantity']}`}>
                  <span className={styles['trade-qty-label']}>数量</span>
                  <div className={styles['trade-qty-stepper']}>
                    <button type="button" className={styles['qty-adj']} onClick={() => addQty(offer.id, -step)} disabled={disabled || qty <= 0}>
                      <Minus size={14} />
                    </button>
                    <strong className={styles['qty-value']}>{qty}</strong>
                    <button type="button" className={styles['qty-adj']} onClick={() => addQty(offer.id, step)} disabled={disabled}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className={styles['trade-qty-steps']}>
                    {stepSizes.map(n => (
                      <button
                        key={n}
                        type="button"
                        className={`${styles['step-btn']} ${step === n ? styles.active : ''}`}
                        onClick={() => setTradeStep(prev => ({ ...prev, [offer.id]: n }))}
                        disabled={disabled}
                      >
                        {n >= 1000 ? `${n / 1000}K` : n}
                      </button>
                    ))}
                  </div>
                  <div className={styles['trade-qty-actions']}>
                    <button type="button" className={styles['action-icon-btn']} onClick={() => setQty(offer.id, surplusMax)} disabled={disabled || surplusMax <= 0} title="最大">
                      <Maximize2 size={13} />
                    </button>
                    {isBuy && (
                      <button type="button" className={styles['action-icon-btn']} onClick={() => setQty(offer.id, deficitMax)} disabled={disabled || deficitMax <= 0} title="补足">
                        <ArrowUpToLine size={13} />
                      </button>
                    )}
                    <button type="button" className={`${styles['action-icon-btn']} ${styles.clear}`} onClick={() => clearTrade(offer.id)} disabled={disabled || qty <= 0} title="清空">
                      <Trash2 size={13} />
                    </button>
                    <button
                      type="button"
                      className={`${styles['action-icon-btn']} ${styles['single-trade']}`}
                      onClick={() => {
                        const dirLabel = isBuy ? '进口' : '出口'
                        onTrade(`${offer.name} ${dirLabel} ×${qty}`, input, output)
                        clearTrade(offer.id)
                      }}
                      disabled={disabled || qty <= 0 || !canAfford}
                      title="单次交易"
                    >
                      <ArrowDownUp size={13} />
                    </button>
                    {canContinuous && (
                      activeDailyTrade ? (
                        <button
                          type="button"
                          className={`${styles['action-icon-btn']} ${styles['cancel-continuous']}`}
                          onClick={() => onCancelDailyTrade(offer.resource)}
                          title="取消连续交易"
                        >
                          <Repeat size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`${styles['action-icon-btn']} ${styles['continuous-trade']}`}
                          onClick={() => {
                            onScheduleDailyTrade(offer.resource, dir, qty, input, output)
                            clearTrade(offer.id)
                          }}
                          disabled={disabled || qty <= 0 || !canAfford}
                          title="连续交易（每日自动执行）"
                        >
                          <Repeat size={13} />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Col 4: Summary */}
                <div className={`${styles['trade-v4-col']} ${styles['trade-v4-summary']}`}>
                  <span className={styles['trade-summary-label']}>总计</span>
                  <ResourceDeltaRows className={styles['summary-stack']} input={input} output={output} inputEmpty="—" outputEmpty="—" />
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
