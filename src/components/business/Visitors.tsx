import { roles } from '../../events'
import { visitorPortraits } from '../../data/visitorPortraits'
import type { Encounter, Role } from '../../events'
import type { Region, RegionId } from '../../types/game'
import styles from './Visitors.module.css'

export interface VisitorsProps {
  roster: Role[]
  assigned: Record<RegionId, string | undefined>
  regions: Region[]
  visitor: Encounter | null
  onSelect: (id: RegionId) => void
  onAssignment: (regionId: RegionId, visitorId: string | undefined) => void
}

export function Visitors({ roster, assigned, regions, visitor, onSelect, onAssignment }: VisitorsProps) {
  const recruitedIds = new Set(roster.map(member => member.id))
  const allMembers = roles.map(role => ({ ...role, recruited: recruitedIds.has(role.id) }))

  return (
    <div className={styles['visitor-layout']}>
      <section className={styles['visitor-hero']}>
        <span className="eyebrow">异客留任簿 · {roster.length}/{roles.length}</span>
        <h2>陌生人不是资源。<br />他们只是懂得让资源更好地工作。</h2>
        <p>每一位来访者都有独立的族群、需求与专长。选择留任后，他们将持续改变一座设施的产出。</p>
        {visitor && (
          <div className={styles['pending-visitor']}>
            <div className={styles['visitor-portrait-frame']}>
              <img src={visitorPortraits[visitor.id]} alt={visitor.name} />
            </div>
            <div><b>{visitor.name} 正在等待</b><small>{visitor.species}，请在外交来函中决定去留。</small></div>
          </div>
        )}
      </section>
      <section className={styles['roster-board']}>
        {allMembers.map(member => {
          const region = regions.find(item => item.id === member.specialty)!
          const RegionIcon = region.icon
          const active = assigned[member.specialty] === member.id
          return (
            <article key={member.id} className={`${styles['retainer']} ${active ? styles['active'] : ''} ${!member.recruited ? styles['locked'] : ''}`}>
              <div className={styles['retainer-portrait']}>
                <img src={visitorPortraits[member.id]} alt={member.name} className={!member.recruited ? styles['greyscale'] : ''} />
              </div>
              <div className={styles['retainer-copy']}>
                <span>{member.recruited ? member.species : '???'}</span>
                <h3>{member.recruited ? member.name : '未识别的来客'}</h3>
                <p>{member.recruited ? member.portrait : '你尚未遇见这位旅者。信标会在恰当的时节抵达月面。'}</p>
                {member.recruited && <button onClick={() => onSelect(member.specialty)}><RegionIcon size={14} />{region.name}</button>}
              </div>
              {member.recruited && (
                <div className={styles['retainer-duty']}>
                  <b>+{Math.round(member.boost * 100)}%</b>
                  <small>专属区域产出</small>
                  <button onClick={() => onAssignment(member.specialty, active ? undefined : member.id)}>{active ? '改为待命' : '安排执勤'}</button>
                </div>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}
