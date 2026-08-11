import { BookOpen, FlaskConical, Lock } from 'lucide-react'
import { hasTech, technologyCatalog } from '../../economy'
import { displayCopy } from '../../utils/format'
import { hasResearchPrerequisites, techLabel, technologyCategoryLabel } from '../../utils/game'
import type { TechnologyId } from '../../economy'

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
  const categoryLabel = technologyCategoryLabel[tech.category ?? 'global']

  return (
    <button
      className={`tech-card-compact ${completed ? 'completed' : ''} ${active ? 'researching' : ''} ${locked ? 'locked' : ''}`}
      onClick={() => !completed && prerequisitesReady && onResearch(techId)}
      disabled={completed || locked}
    >
      <div className="tech-card-compact-top">
        <TechIcon category={tech.category ?? 'global'} active={active} />
        <div className="tech-card-compact-head">
          <h3>{tech.name}</h3>
          <span>{categoryLabel}</span>
        </div>
      </div>
      <p className="tech-card-compact-note">{displayCopy(tech.note)}</p>
      <div className="tech-card-compact-meta">
        {prerequisites.length > 0 && <small>前置：{prerequisites.map(techLabel).join('、')}</small>}
        <span className="tech-card-compact-cost">
          <FlaskConical size={11} />{requiredKnowledge}
        </span>
        <span className="tech-card-compact-status">
          {locked ? <><Lock size={10} />前置未满足</> : completed ? <><BookOpen size={10} />已完成</> : active ? <>研究中 {progressPercent}%</> : <>可研究</>}
        </span>
      </div>
      <div className="tech-progress-mini"><span style={{ width: `${progressPercent}%` }} /></div>
    </button>
  )
}

function TechIcon({ category, active }: { category: string; active: boolean }) {
  const stroke = active ? 'oklch(54% .11 76)' : 'oklch(52% .09 76)'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
