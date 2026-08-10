import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { BookOpen, FlaskConical } from 'lucide-react'
import { hasTech, technologyCatalog } from '../../economy'
import type { TechnologyId } from '../../economy'
import { fmtAmount } from '../../utils/format'
import { completedTechnologyIds, techLabel } from '../../utils/game'
import { researchableTechIds, researchEraSections } from '../../data/eraSections'
import type { SpecialFacilityViewModel } from '../../types/game'
import { SectionHeading } from '../layout'
import { SpecialFacilityPanel } from './SpecialFacilityPanel'
import { TechnologyCard } from './TechnologyCard'

export interface ResearchLabProps {
  facility: SpecialFacilityViewModel
  techs: string[]
  activeResearch: TechnologyId
  researchProgress: Partial<Record<TechnologyId, number>>
  researchThroughput: number
  knowledgeStock: number
  onResearch: (techId: TechnologyId) => void
  onSelectFacility: () => void
}

export function ResearchLab({
  facility,
  techs,
  activeResearch,
  researchProgress,
  researchThroughput,
  knowledgeStock,
  onResearch,
  onSelectFacility,
}: ResearchLabProps) {
  const completedIds = completedTechnologyIds(techs)
  const currentTech = technologyCatalog[activeResearch]
  const currentCost = currentTech.researchCost ?? 0
  const currentProgress = hasTech(techs, activeResearch) ? currentCost : (researchProgress[activeResearch] ?? 0)
  const treeScrollRef = useRef<HTMLDivElement | null>(null)
  const treeDragRef = useRef({ pointerId: null as number | null, startX: 0, startScrollLeft: 0, moved: false })
  const suppressTechClickRef = useRef(false)
  const [treeDragging, setTreeDragging] = useState(false)

  const beginTreeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const scrollNode = treeScrollRef.current
    if (!scrollNode) return
    treeDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: scrollNode.scrollLeft, moved: false }
    scrollNode.setPointerCapture(event.pointerId)
    setTreeDragging(true)
  }

  const moveTreeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scrollNode = treeScrollRef.current
    const dragState = treeDragRef.current
    if (!scrollNode || dragState.pointerId !== event.pointerId) return
    const deltaX = event.clientX - dragState.startX
    if (Math.abs(deltaX) > 4) dragState.moved = true
    if (!dragState.moved) return
    event.preventDefault()
    scrollNode.scrollLeft = dragState.startScrollLeft - deltaX
  }

  const endTreeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scrollNode = treeScrollRef.current
    const dragState = treeDragRef.current
    const wasMoved = dragState.pointerId === event.pointerId && dragState.moved
    if (scrollNode?.hasPointerCapture(event.pointerId)) scrollNode.releasePointerCapture(event.pointerId)
    treeDragRef.current.pointerId = null
    setTreeDragging(false)
    if (wasMoved) {
      suppressTechClickRef.current = true
      window.setTimeout(() => {
        suppressTechClickRef.current = false
      }, 80)
    }
  }

  const selectResearch = (techId: TechnologyId) => {
    if (!suppressTechClickRef.current) onResearch(techId)
  }

  return (
    <div className="special-system-page">
      <SpecialFacilityPanel facility={facility} tone="research" onSelectFacility={onSelectFacility}>
        <div className="research-rule-box">
          <span><FlaskConical size={16} />研究规则</span>
          <p>每次只推进一项研究。日结算后，问天研究实验室从库存知识中投入当前课题；点击可研究卡片会切换课题。</p>
          <div><b>知识库存 {fmtAmount(knowledgeStock)}</b><b>每日投入上限 {researchThroughput}</b><b>当前 {currentTech.name}</b></div>
          <div className="tech-progress"><span style={{ width: `${currentCost ? Math.min(100, Math.round(currentProgress / currentCost * 100)) : 100}%` }} /><small>{fmtAmount(currentProgress)} / {currentCost}</small></div>
        </div>
      </SpecialFacilityPanel>
      <section className="special-system-main technology-workbench">
        <SectionHeading eyebrow="L 问天研究实验室" title="科技树" description="从左到右按阶段推进，卡片只显示玩家需要判断的信息。" />
        <div
          ref={treeScrollRef}
          className={`technology-tree-scroll ${treeDragging ? 'dragging' : ''}`}
          aria-label="横向科技树"
          onPointerDown={beginTreeDrag}
          onPointerMove={moveTreeDrag}
          onPointerUp={endTreeDrag}
          onPointerCancel={endTreeDrag}
        >
          <div className="technology-tree">
            {researchEraSections.map(section => {
              const techIds = researchableTechIds.filter(id => (technologyCatalog[id].era ?? 'early') === section.id)
              return <section className="tech-era-column" key={section.id}>
                <header><span>{section.label}</span><small>{section.note}</small></header>
                {techIds.map(id => <TechnologyCard key={id} techId={id} techs={techs} activeResearch={activeResearch} researchProgress={researchProgress} onResearch={selectResearch} />)}
              </section>
            })}
          </div>
        </div>
        <aside className="technology-book">
          <div><BookOpen size={17} /><span>科技书</span><small>已完成科技使用实线边框；未完成科技保留在树中。</small></div>
          <div>{completedIds.map(id => <span key={id}>{techLabel(id)}</span>)}</div>
        </aside>
      </section>
    </div>
  )
}
