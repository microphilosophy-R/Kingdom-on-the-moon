import { useRef, useState, type WheelEvent as ReactWheelEvent, type PointerEvent as ReactPointerEvent, useEffect } from 'react'
import { BookOpen, ChevronLeft, FlaskConical } from 'lucide-react'
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
import type { ProductionMethodId, TechnologyId } from '../../economy'
import { displayCopy, fmtAmount } from '../../utils/format'
import { completedTechnologyIds, techLabel } from '../../utils/game'
import { researchableTechIds, researchEraSections } from '../../data/eraSections'
import type { SpecialFacilityViewModel } from '../../types/game'
import { ResourceDeltaRows, FlowArrowSvg } from '../resources'
import { ProgressLine } from '../ui'
import { TechnologyCard } from './TechnologyCard'

export interface ResearchLabProps {
  facility: SpecialFacilityViewModel
  techs: string[]
  activeResearch: TechnologyId
  researchProgress: Partial<Record<TechnologyId, number>>
  researchThroughput: number
  knowledgeStock: number
  productionMethods: Record<string, ProductionMethodId>
  facilityModifiers: Partial<Record<string, { outputMultiplier?: number; upkeepMultiplier?: number }>>
  onResearch: (techId: TechnologyId) => void
  onMethod: (id: string, methodId: ProductionMethodId) => void
  onBack: () => void
}

export function ResearchLab({
  facility,
  techs,
  activeResearch,
  researchProgress,
  researchThroughput,
  knowledgeStock,
  productionMethods,
  facilityModifiers,
  onResearch,
  onMethod,
  onBack,
}: ResearchLabProps) {
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

  const completedIds = completedTechnologyIds(techs)
  const currentTech = technologyCatalog[activeResearch]
  const currentCost = currentTech.researchCost ?? 0
  const currentProgress = hasTech(techs, activeResearch) ? currentCost : (researchProgress[activeResearch] ?? 0)

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
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault()
    }
    node.addEventListener('wheel', preventBrowserZoom, { passive: false })
    return () => node.removeEventListener('wheel', preventBrowserZoom)
  }, [])

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
            <FlaskConical size={56} />
            <span>{facility.region.id}</span>
          </div>
        </div>
        <section className="detail-command-column">
          <article className="construction-card expand">
            <h3>研究进度</h3>
            <div className="construction-resources">
              <span>知识库存</span>
              <b className="research-stat-big">{fmtAmount(knowledgeStock)}</b>
              <span className="construction-days-pill">吞吐 {researchThroughput}/日</span>
            </div>
            <div className="construction-resources" style={{ marginTop: '.32rem' }}>
              <span>当前课题</span>
              <b className="research-stat-big" style={{ color: 'oklch(48% .085 76)' }}>{currentTech.name}</b>
            </div>
            <ProgressLine value={currentCost ? Math.min(100, Math.round(currentProgress / currentCost * 100)) : 100} label={`${fmtAmount(currentProgress)} / ${fmtAmount(currentCost)}`} />
          </article>
          <article className="construction-card shrink">
            <h3>研究规则</h3>
            <p className="research-rule-text">每次只推进一项研究。日结算后从知识库存中投入当前课题；点击科技卡片切换课题。已完成科技收入下方科技书。</p>
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

      {/* 特殊内容：科技树 */}
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
    </div>
  )
}
