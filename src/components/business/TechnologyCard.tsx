import { BookOpen, FlaskConical, Lock } from 'lucide-react'
import { hasTech, technologyCatalog } from '../../economy'
import { displayCopy } from '../../utils/format'
import { hasResearchPrerequisites, techLabel, technologyCategoryLabel } from '../../utils/game'
import type { TechnologyId } from '../../economy'
import { TechnologyImagePlaceholder } from './TechnologyImagePlaceholder'
import { TechnologyTags } from './TechnologyTags'

export interface TechnologyCardProps {
  techId: TechnologyId
  techs: string[]
  activeResearch: TechnologyId
  researchProgress: Partial<Record<TechnologyId, number>>
  onResearch: (techId: TechnologyId) => void
}

export function TechnologyCard({ techId, techs, activeResearch, researchProgress, onResearch }: TechnologyCardProps) {
  const tech = technologyCatalog[techId]
  const completed = hasTech(techs, techId)
  const prerequisitesReady = hasResearchPrerequisites(techId, techs)
  const active = activeResearch === techId && !completed
  const locked = !completed && !prerequisitesReady
  const requiredKnowledge = tech.researchCost ?? 0
  const progress = completed ? requiredKnowledge : (researchProgress[techId] ?? 0)
  const progressPercent = requiredKnowledge ? Math.min(100, Math.round(progress / requiredKnowledge * 100)) : 100
  const prerequisites = tech.prerequisites ?? []

  return (
    <button className={`tech-card ${completed ? 'completed' : ''} ${active ? 'researching' : ''} ${locked ? 'locked' : ''}`} onClick={() => !completed && prerequisitesReady && onResearch(techId)} disabled={completed || locked}>
      <div className="tech-card-top">
        <TechnologyImagePlaceholder active={active} />
        <span>{technologyCategoryLabel[tech.category ?? 'global']}</span>
      </div>
      <div className="tech-card-copy">
        <h3>{tech.name}</h3>
        <TechnologyTags tech={tech} />
        <p className="tech-card-note">{displayCopy(tech.note)}</p>
      </div>
      <div className="tech-prerequisites">
        <span>前置</span>
        <small>{prerequisites.length ? prerequisites.map(techLabel).join('、') : '无'}</small>
      </div>
      <div className="tech-cost-row">
        <span><FlaskConical size={13} />需要知识 {requiredKnowledge}</span>
        {locked ? <em><Lock size={12} />前置未满足</em> : completed ? <em><BookOpen size={12} />已入科技书</em> : active ? <em>研究中</em> : <em>可切换研究</em>}
      </div>
      <div className="tech-progress"><span style={{ width: `${progressPercent}%` }} /><small>{progressPercent}%</small></div>
    </button>
  )
}
