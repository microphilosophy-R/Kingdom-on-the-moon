import { useRef, useState, useEffect, type CSSProperties, type WheelEvent as ReactWheelEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowDown, ArrowDownUp, ArrowLeftRight, ArrowRight, ArrowUp, ArrowUpToLine, BookOpen, Check, Crown, FlaskConical, Lock, Maximize2, Minus, Plus, Repeat, Rocket, Trash2, Waves, Zap } from 'lucide-react'
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
import { researchLines, researchLineProgress } from '../../data/researchLines'
import type { ReignReport } from '../../types/game'
import { displayCopy, fmtAmount, formatDay } from '../../utils/format'
import { completedTechnologyIds, hasResearchPrerequisites, techLabel, technologyCategoryLabel } from '../../utils/game'
import { scaleResourceBundle } from '../../utils/trade'
import { ResourceAtom, ResourceBundle, ResourceDeltaRows, resourceUiMeta } from '../resources'
import pillStyles from '../resources/ConstructionDaysPill.module.css'
import { SectionHeading } from '../layout'
import { InfoToggle } from './InfoToggle'
import { TechnologyCard } from './TechnologyCard'
import { TrendChart, type TrendSeries } from './TrendChart'
import styles from './SpecialBlocks.module.css'

/* ===================== PalaceReportBlock ===================== */

const REPORT_TREND_RESOURCES = [
  'power', 'water', 'oxygen', 'biomass', 'regolith',
  'alloy', 'currency', 'population', 'knowledge', 'luxury',
] as const
type ReportTrendResource = (typeof REPORT_TREND_RESOURCES)[number]

const RESOURCE_TREND_COLORS: Record<ReportTrendResource, string> = {
  power: 'oklch(55% .13 76)',
  water: 'oklch(58% .12 205)',
  oxygen: 'oklch(52% .10 225)',
  biomass: 'oklch(55% .12 150)',
  regolith: 'oklch(52% .07 70)',
  alloy: 'oklch(58% .16 28)',
  currency: 'oklch(62% .12 85)',
  population: 'oklch(55% .14 142)',
  knowledge: 'oklch(58% .14 296)',
  luxury: 'oklch(58% .13 315)',
}

export interface PalaceReportBlockProps {
  day: number
  lastReignReport: ReignReport | null
  onOpenReport: (report: ReignReport) => void
}

export function PalaceReportBlock({ day, lastReignReport, onOpenReport }: PalaceReportBlockProps) {
  const reportProgress = Math.round((day % gameCalendar.reignMonthDays) / gameCalendar.reignMonthDays * 100)
  const [selectedTrend, setSelectedTrend] = useState<ReportTrendResource>('alloy')

  const populationMiniSeries: TrendSeries[] = [
    { key: 'population', label: '人口', color: 'oklch(55% .14 142)', accessor: p => p.population },
  ]

  const points = lastReignReport?.trendPoints ?? []
  const first = points[0]
  const lastPt = points[points.length - 1]
  const startVal = first ? first[selectedTrend] : null
  const currentVal = lastPt ? lastPt[selectedTrend] : null
  const delta = startVal !== null && currentVal !== null ? currentVal - startVal : null
  const rate = startVal !== null && startVal !== 0 && currentVal !== null ? ((currentVal - startVal) / startVal) * 100 : null

  const fallbackRows = lastReignReport
    ? resourceOrder.filter(key => lastReignReport.resourceRows[key]).map(key => {
        const row = lastReignReport.resourceRows[key]!
        return { label: resourceMeta[key].label, produced: fmtAmount(row.produced), consumed: fmtAmount(row.consumed), net: `${row.net > 0 ? '+' : ''}${fmtAmount(row.net)}`, negative: row.net < 0 }
      })
    : []

  return (
    <section className={`${styles['special-content-block']} ${styles['palace-report-v2']}`}>
      <div className={styles['tech-tree-toolbar']}>
        <h3><Crown size={18} />{gameCalendar.monthName}报告</h3>
        <span className={styles['tech-tree-scale']}>{reportProgress}%</span>
        {lastReignReport && <span style={{ color: 'var(--ui-muted)', fontSize: '10px' }}>{formatDay(lastReignReport.startDay)} 至 {formatDay(lastReignReport.endDay)}</span>}
      </div>
      {lastReignReport ? <>
        <div className={styles['palace-report-preview']}>
          <div className={styles['report-main-col']}>
            <div className={styles['report-chips']} role="group" aria-label="选择趋势资源">
              {REPORT_TREND_RESOURCES.map(key => {
                const meta = resourceUiMeta[key]
                const Icon = meta.icon
                const active = key === selectedTrend
                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles['report-chip']} ${active ? styles.active : ''}`}
                    style={{ '--chip-color': RESOURCE_TREND_COLORS[key] } as CSSProperties}
                    aria-pressed={active}
                    onClick={() => setSelectedTrend(key)}
                  >
                    <Icon size={12} />{meta.label}
                  </button>
                )
              })}
            </div>
            <div className={styles['report-summary']}>
              <div><span>当前值</span><b>{currentVal !== null ? fmtAmount(currentVal) : '—'}</b></div>
              <div><span>本王月变化</span>
                <b className={delta !== null && delta < 0 ? styles.negative : ''}>
                  {delta !== null ? `${delta >= 0 ? '+' : ''}${fmtAmount(delta)}` : '—'}
                </b>
              </div>
              <div><span>变化速率</span>
                <b className={rate !== null && rate < 0 ? styles.negative : ''}>
                  {rate !== null ? `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%` : '—'}
                </b>
              </div>
            </div>
            <TrendChart
              data={lastReignReport.trendPoints}
              series={[{ key: selectedTrend, label: resourceUiMeta[selectedTrend].label, color: RESOURCE_TREND_COLORS[selectedTrend], accessor: p => p[selectedTrend] }]}
              title={`${resourceUiMeta[selectedTrend].label}库存趋势`}
              fallbackRows={fallbackRows}
            />
            {lastReignReport.trendPoints.length > 0 && (
              <section className={styles['report-population-card']}>
                <h3>人口趋势</h3>
                <TrendChart data={lastReignReport.trendPoints} series={populationMiniSeries} mini />
              </section>
            )}
          </div>
          <aside className={styles['report-side-col']}>
            <section className={styles['report-side-card']}>
              <h3>本期建议</h3>
              {lastReignReport.suggestions.length > 0 ? (
                <ol>{lastReignReport.suggestions.slice(0, 2).map(item => <li key={item}>{item}</li>)}</ol>
              ) : (
                <p className={styles['report-suggestions-empty']}>本期无新增建议，各系统运转平稳。</p>
              )}
            </section>
          </aside>
        </div>
        <div className={styles['palace-report-actions']}>
          <button className="primary-action" onClick={() => onOpenReport(lastReignReport)}><BookOpen size={15} />打开完整报告</button>
        </div>
      </> : (
        <div className={styles['palace-report-empty']}>
          <BookOpen size={22} />
          <span>尚未形成可复核的{gameCalendar.monthName}报告</span>
          <div className={styles['report-countdown-bar']}><i style={{ width: `${reportProgress}%` }} /></div>
          <small>
            距首份报告归档还有 {gameCalendar.reignMonthDays - (day % gameCalendar.reignMonthDays)} 御日
            · 已推进 御日 {day % gameCalendar.reignMonthDays} / {gameCalendar.reignMonthDays}
          </small>
        </div>
      )}
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
  knowledge: number
  preUnlockTech: TechnologyId | null
  onUnlockNow: (techId: TechnologyId) => void
  onPreUnlock: (techId: TechnologyId) => void
}

export function ResearchTreeBlock({ techs, knowledge, preUnlockTech, onUnlockNow, onPreUnlock }: ResearchTreeBlockProps) {
  const completedIds = completedTechnologyIds(techs)
  const lineProgress = researchLineProgress(techs)
  const [expandedTechId, setExpandedTechId] = useState<TechnologyId | null>(null)

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
  }

  const moveTreeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scrollNode = treeContainerRef.current
    const dragState = treeDragRef.current
    if (!scrollNode || dragState.pointerId !== event.pointerId) return
    const deltaX = event.clientX - dragState.startX
    const deltaY = event.clientY - dragState.startY
    if (!dragState.moved && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      dragState.moved = true
      // 仅在真正开始拖拽时才捕获指针，避免普通点击的 click 事件被重定向到容器
      scrollNode.setPointerCapture(event.pointerId)
      setTreeDragging(true)
    }
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
      window.setTimeout(() => { suppressTechClickRef.current = false }, 120)
    }
  }

  const zoomTree = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.08 : 0.08
    setTreeScale(prev => Math.min(1.6, Math.max(0.4, prev + delta)))
  }

  const openTechDetail = (techId: TechnologyId) => {
    // 拖拽平移后紧随的一次 click 视为误触，消费掉；其余点击正常打开详情
    if (suppressTechClickRef.current) {
      suppressTechClickRef.current = false
      return
    }
    setExpandedTechId(techId)
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

  const expandedTech = expandedTechId ? technologyCatalog[expandedTechId] : null

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
          {researchLines.map(line => {
            const progress = lineProgress[line.id]
            return (
              <section className={styles['tech-line-column-v2']} key={line.id}>
                <header>
                  <div className={styles['tech-line-head']}>
                    <span>{line.label}</span>
                    <em>{progress.completed}/{progress.total}</em>
                  </div>
                  <div className={styles['tech-line-scopes']}>
                    {line.scopes.map(scope => <b key={scope}>{scope === 'G' ? '全局' : scope}</b>)}
                  </div>
                  <small>{line.note}</small>
                </header>
                {line.techIds.map(id => (
                  <TechnologyCard key={id} techId={id} techs={techs} knowledge={knowledge} preUnlockTech={preUnlockTech} onOpen={openTechDetail} />
                ))}
              </section>
            )
          })}
        </div>
      </div>
      {expandedTech && expandedTechId && (
        <div className={styles['tech-detail-popout']} onClick={() => setExpandedTechId(null)}>
          <div className={styles['tech-detail-card']} onClick={event => event.stopPropagation()}>
            <TechDetailContent
              techId={expandedTechId}
              techs={techs}
              knowledge={knowledge}
              preUnlockTech={preUnlockTech}
              onUnlockNow={onUnlockNow}
              onPreUnlock={onPreUnlock}
              onClose={() => setExpandedTechId(null)}
            />
          </div>
        </div>
      )}
      <aside className={styles['technology-book']}>
        <div><BookOpen size={17} /><span>科技书</span><small>已完成 {completedIds.length} 项</small></div>
        <div>{completedIds.map(id => <span key={id}>{techLabel(id)}</span>)}</div>
      </aside>
    </section>
  )
}

function TechDetailContent({
  techId, techs, knowledge, preUnlockTech, onUnlockNow, onPreUnlock, onClose,
}: {
  techId: TechnologyId
  techs: string[]
  knowledge: number
  preUnlockTech: TechnologyId | null
  onUnlockNow: (techId: TechnologyId) => void
  onPreUnlock: (techId: TechnologyId) => void
  onClose: () => void
}) {
  const tech = technologyCatalog[techId]
  const completed = hasTech(techs, techId)
  const prerequisitesReady = hasResearchPrerequisites(techId, techs)
  const preUnlocked = preUnlockTech === techId && !completed
  const locked = !completed && !prerequisitesReady
  const requiredKnowledge = tech.researchCost ?? 0
  const affordable = knowledge >= requiredKnowledge
  const prerequisites = tech.prerequisites ?? []
  const categoryLabel = technologyCategoryLabel[tech.category ?? 'global']
  const canUnlock = prerequisitesReady && affordable && !completed
  const canPreUnlock = prerequisitesReady && !completed

  return (
    <>
      <div className={styles['tech-detail-head']}>
        <TechDetailIcon category={tech.category ?? 'global'} />
        <div>
          <h3>{tech.name}</h3>
          <span>{categoryLabel}{completed ? ' · 已完成' : preUnlocked ? ' · 已预解锁' : locked ? ' · 前置未满足' : ''}</span>
        </div>
        <button type="button" className={styles['tech-detail-close']} onClick={onClose} aria-label="关闭">×</button>
      </div>
      <div className={styles['tech-detail-facts']}>
        <div className={styles['tech-detail-fact']}>
          <small>知识成本</small>
          <b><FlaskConical size={16} />{requiredKnowledge}</b>
        </div>
        <div className={styles['tech-detail-fact']}>
          <small>前置科技</small>
          <b className={styles['tech-detail-prereq']}>{prerequisites.length ? prerequisites.map(techLabel).join('、') : '无'}</b>
        </div>
      </div>
      <div className={styles['tech-detail-desc']}>{displayCopy(tech.note)}</div>
      <div className={styles['tech-detail-actions']}>
        <button
          type="button"
          className={`${styles['tech-detail-unlock-now']} ${!canUnlock ? styles['tech-detail-btn-disabled'] : ''}`}
          disabled={!canUnlock}
          onClick={() => { onUnlockNow(techId); onClose() }}
        >
          <Zap size={15} />立即解锁{!completed && prerequisitesReady ? `（${requiredKnowledge} 知识）` : ''}
        </button>
        <button
          type="button"
          className={`${styles['tech-detail-preunlock']} ${preUnlocked ? styles['tech-detail-preunlock-on'] : ''} ${!canPreUnlock ? styles['tech-detail-btn-disabled'] : ''}`}
          disabled={!canPreUnlock}
          onClick={() => { onPreUnlock(techId); onClose() }}
        >
          <FlaskConical size={15} />{preUnlocked ? '取消预解锁' : '预解锁'}
        </button>
      </div>
    </>
  )
}

function TechDetailIcon({ category }: { category: string }) {
  const stroke = 'oklch(54% .11 76)'
  return (
    <svg width="42" height="42" viewBox="0 0 28 28" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {category === 'global' && <>
        <circle cx="14" cy="14" r="10" />
        <path d="M14 4v6M14 18v6M4 14h6M18 14h6" />
        <circle cx="14" cy="14" r="3" />
      </>}
      {category === 'production' && <>
        <rect x="4" y="6" width="8" height="7" rx="1" />
        <rect x="16" y="6" width="8" height="7" rx="1" />
        <path d="M8 13v9M20 13v9M4 26h20" />
      </>}
      {category === 'ecology' && <>
        <path d="M4 20c3-6 8-10 10-10s7 4 10 10" />
        <path d="M9 14c2-4 4-6 5-6s3 2 5 6" />
        <line x1="14" y1="20" x2="14" y2="26" />
      </>}
      {category === 'trade' && <>
        <path d="M18 6l4 4-4 4" />
        <path d="M6 22l4-4 4 4" />
        <line x1="22" y1="10" x2="6" y2="10" />
        <line x1="12" y1="18" x2="22" y2="18" />
      </>}
      {category === 'ship' && <>
        <path d="M4 16l8-12h4l8 12" />
        <rect x="8" y="14" width="12" height="10" rx="2" />
        <circle cx="10" cy="24" r="1" />
        <circle cx="18" cy="24" r="1" />
      </>}
      {!['global','production','ecology','trade','ship'].includes(category) && <>
        <circle cx="14" cy="14" r="9" />
        <circle cx="14" cy="14" r="3" />
        <line x1="14" y1="5" x2="14" y2="11" />
      </>}
    </svg>
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
