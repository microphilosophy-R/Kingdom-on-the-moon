import { BookOpen, FlaskConical, Lock, Zap } from 'lucide-react'
import { hasTech, technologyCatalog } from '../../economy'
import { displayCopy } from '../../utils/format'
import { hasResearchPrerequisites, techLabel, technologyCategoryLabel } from '../../utils/game'
import type { TechnologyId } from '../../economy'
import styles from './TechnologyCard.module.css'

export interface TechnologyCardProps {
  techId: TechnologyId
  techs: string[]
  knowledge: number
  preUnlockTech: TechnologyId | null
  onOpen: (techId: TechnologyId) => void
}

export function TechnologyCard({ techId, techs, knowledge, preUnlockTech, onOpen }: TechnologyCardProps) {
  const tech = technologyCatalog[techId]
  const completed = hasTech(techs, techId)
  const prerequisitesReady = hasResearchPrerequisites(techId, techs)
  const preUnlocked = preUnlockTech === techId && !completed
  const locked = !completed && !prerequisitesReady
  const requiredKnowledge = tech.researchCost ?? 0
  const affordable = knowledge >= requiredKnowledge
  const prerequisites = tech.prerequisites ?? []
  const categoryLabel = technologyCategoryLabel[tech.category ?? 'global']

  let status: { text: string; icon: React.ReactNode } = { text: '可解锁', icon: <Zap size={10} /> }
  if (locked) status = { text: '前置未满足', icon: <Lock size={10} /> }
  else if (completed) status = { text: '已完成', icon: <BookOpen size={10} /> }
  else if (preUnlocked) status = { text: '已预解锁', icon: <Zap size={10} /> }
  else if (!affordable) status = { text: '知识不足', icon: <FlaskConical size={10} /> }

  return (
    <button
      className={`${styles['tech-card-compact']} ${completed ? styles.completed : ''} ${preUnlocked ? styles.preunlocked : ''} ${locked ? styles.locked : ''}`}
      onClick={() => onOpen(techId)}
    >
      <div className={styles['tech-card-compact-top']}>
        <TechIcon category={tech.category ?? 'global'} active={preUnlocked} />
        <div className={styles['tech-card-compact-head']}>
          <h3>{tech.name}</h3>
          <span>{categoryLabel}</span>
        </div>
      </div>
      <p className={styles['tech-card-compact-note']}>{compactConstructionNote(tech)}</p>
      <div className={styles['tech-card-compact-meta']}>
        <small>{prerequisites.length > 0 ? `前置：${prerequisites.map(techLabel).join('、')}` : '前置：无'}</small>
        <span className={styles['tech-card-compact-cost']}>
          <FlaskConical size={11} />{requiredKnowledge}
        </span>
        <span className={styles['tech-card-compact-status']}>
          {status.icon}{status.text}
        </span>
      </div>
    </button>
  )
}

function compactConstructionNote(tech: { category?: string; note: string }): string {
  // 建造许可类卡片：省略「解锁 X 建造权限」前缀，仅保留功能描述；剥离后为空则保留原文
  if (tech.category !== 'construction') return displayCopy(tech.note)
  return displayCopy(tech.note).replace(/^解锁 [A-Z0-9]+ [^。；]*建造(权限)?(；初始默认具备)?。?/, '').trim() || displayCopy(tech.note)
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
